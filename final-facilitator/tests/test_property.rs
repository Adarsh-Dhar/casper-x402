mod common;

use casper_types::{runtime_args, ContractHash, PublicKey};
use common::*;
use proptest::prelude::*;

// Property-based test strategies
prop_compose! {
    fn arb_contract_hash()(bytes in prop::array::uniform32(any::<u8>())) -> ContractHash {
        ContractHash::new(bytes)
    }
}

prop_compose! {
    fn arb_public_key()(bytes in prop::array::uniform32(any::<u8>())) -> PublicKey {
        PublicKey::ed25519_from_bytes(bytes).unwrap()
    }
}

prop_compose! {
    fn arb_transaction_data()(
        len in 1usize..1000,
        data in prop::collection::vec(any::<u8>(), 1..1000)
    ) -> Vec<u8> {
        data.into_iter().take(len).collect()
    }
}

proptest! {
    #[test]
    fn test_add_remove_tokens_property(tokens in prop::collection::vec(arb_contract_hash(), 1..20)) {
        let mut context = TestContext::new();
        
        // Add all tokens
        for token in &tokens {
            context.call_contract(
                context.admin_account,
                "add_supported_token",
                runtime_args! {
                    "token_contract" => *token
                },
            );
        }
        
        // Verify all tokens are present
        let supported_tokens = context.get_supported_tokens();
        prop_assert_eq!(supported_tokens.len(), tokens.len());
        
        for token in &tokens {
            prop_assert!(supported_tokens.contains(token));
        }
        
        // Remove all tokens
        for token in &tokens {
            context.call_contract(
                context.admin_account,
                "remove_supported_token",
                runtime_args! {
                    "token_contract" => *token
                },
            );
        }
        
        // Verify all tokens are removed
        let supported_tokens = context.get_supported_tokens();
        prop_assert_eq!(supported_tokens.len(), 0);
    }

    #[test]
    fn test_add_remove_signers_property(
        signers in prop::collection::vec(arb_public_key(), 1..20),
        weights in prop::collection::vec(1u32..1000, 1..20)
    ) {
        let mut context = TestContext::new();
        let signer_weight_pairs: Vec<_> = signers.into_iter().zip(weights.into_iter()).collect();
        
        // Add all signers
        for (signer, weight) in &signer_weight_pairs {
            context.call_contract(
                context.admin_account,
                "add_signer",
                runtime_args! {
                    "public_key" => *signer,
                    "weight" => *weight
                },
            );
        }
        
        // Verify all signers are present
        let signer_pool = context.get_signer_pool();
        prop_assert_eq!(signer_pool.len(), signer_weight_pairs.len());
        
        for (signer, weight) in &signer_weight_pairs {
            let found_signer = signer_pool.iter().find(|s| s.public_key == *signer);
            prop_assert!(found_signer.is_some());
            prop_assert_eq!(found_signer.unwrap().weight, *weight);
            prop_assert!(found_signer.unwrap().is_active);
        }
        
        // Remove all signers
        for (signer, _) in &signer_weight_pairs {
            let account_hash = casper_types::account::AccountHash::from(signer);
            context.call_contract(
                context.admin_account,
                "remove_signer",
                runtime_args! {
                    "account_hash" => account_hash
                },
            );
        }
        
        // Verify all signers are removed
        let signer_pool = context.get_signer_pool();
        prop_assert_eq!(signer_pool.len(), 0);
    }

    #[test]
    fn test_transaction_processing_property(
        transaction_data in arb_transaction_data(),
        signature in "[a-zA-Z0-9]{1,100}"
    ) {
        let mut context = TestContext::new();
        
        // Process transaction without fee token
        context.call_contract(
            context.user_account,
            "process_transaction",
            runtime_args! {
                "user_signature" => signature,
                "transaction_data" => transaction_data,
                "fee_token" => None::<ContractHash>,
            },
        );
        
        // Should always succeed for valid non-empty data
    }

    #[test]
    fn test_fee_estimation_property(
        transaction_size in 1u64..100000,
        instruction_count in 1u32..100,
        uses_lookup_tables in any::<bool>(),
        is_payment_required in any::<bool>()
    ) {
        let mut context = TestContext::new();
        
        let fee_request = casper_engine_test_support::ExecuteRequestBuilder::contract_call_by_hash(
            context.admin_account,
            context.contract_hash,
            "estimate_fees",
            runtime_args! {
                "transaction_size" => transaction_size,
                "instruction_count" => instruction_count,
                "uses_lookup_tables" => uses_lookup_tables,
                "is_payment_required" => is_payment_required,
            },
        )
        .build();

        context.builder.exec(fee_request).expect_success().commit();
        
        // Fee estimation should always succeed for valid inputs
        let result = context.builder.get_exec_result(0);
        prop_assert!(result.is_some());
    }

    #[test]
    fn test_pause_unpause_property(operations in prop::collection::vec(any::<bool>(), 1..20)) {
        let mut context = TestContext::new();
        let mut expected_paused = false;
        
        for should_pause in operations {
            if should_pause && !expected_paused {
                context.call_contract(
                    context.admin_account,
                    "pause_contract",
                    runtime_args! {},
                );
                expected_paused = true;
            } else if !should_pause && expected_paused {
                context.call_contract(
                    context.admin_account,
                    "unpause_contract",
                    runtime_args! {},
                );
                expected_paused = false;
            }
            
            prop_assert_eq!(context.is_paused(), expected_paused);
        }
    }

    #[test]
    fn test_token_operations_order_independence(
        mut tokens in prop::collection::vec(arb_contract_hash(), 2..10)
    ) {
        // Test that the order of adding tokens doesn't affect the final state
        let mut context1 = TestContext::new();
        let mut context2 = TestContext::new();
        
        // Add tokens in original order to context1
        for token in &tokens {
            context1.call_contract(
                context1.admin_account,
                "add_supported_token",
                runtime_args! {
                    "token_contract" => *token
                },
            );
        }
        
        // Add tokens in reverse order to context2
        tokens.reverse();
        for token in &tokens {
            context2.call_contract(
                context2.admin_account,
                "add_supported_token",
                runtime_args! {
                    "token_contract" => *token
                },
            );
        }
        
        // Both contexts should have the same tokens (order may differ)
        let tokens1 = context1.get_supported_tokens();
        let tokens2 = context2.get_supported_tokens();
        
        prop_assert_eq!(tokens1.len(), tokens2.len());
        
        for token in &tokens1 {
            prop_assert!(tokens2.contains(token));
        }
        
        for token in &tokens2 {
            prop_assert!(tokens1.contains(token));
        }
    }

    #[test]
    fn test_signer_weight_invariant(
        signers in prop::collection::vec(arb_public_key(), 1..10),
        weights in prop::collection::vec(1u32..1000, 1..10)
    ) {
        let mut context = TestContext::new();
        let signer_weight_pairs: Vec<_> = signers.into_iter().zip(weights.into_iter()).collect();
        
        // Add all signers
        for (signer, weight) in &signer_weight_pairs {
            context.call_contract(
                context.admin_account,
                "add_signer",
                runtime_args! {
                    "public_key" => *signer,
                    "weight" => *weight
                },
            );
        }
        
        let signer_pool = context.get_signer_pool();
        
        // Invariant: All signers should be active and have positive weight
        for signer_info in &signer_pool {
            prop_assert!(signer_info.is_active);
            prop_assert!(signer_info.weight > 0);
        }
        
        // Invariant: Total number of signers should match input
        prop_assert_eq!(signer_pool.len(), signer_weight_pairs.len());
        
        // Invariant: Sum of weights should be preserved
        let expected_total_weight: u32 = signer_weight_pairs.iter().map(|(_, w)| w).sum();
        let actual_total_weight: u32 = signer_pool.iter().map(|s| s.weight).sum();
        prop_assert_eq!(actual_total_weight, expected_total_weight);
    }

    #[test]
    fn test_state_consistency_after_random_operations(
        operations in prop::collection::vec(0u8..4, 10..50)
    ) {
        let mut context = TestContext::new();
        let mut expected_tokens = std::collections::HashSet::new();
        let mut expected_signers = std::collections::HashSet::new();
        let mut is_paused = false;
        
        for (i, op) in operations.iter().enumerate() {
            match op % 4 {
                0 => {
                    // Add token
                    let token = create_dummy_contract_hash(i as u8);
                    if !expected_tokens.contains(&token) {
                        context.call_contract(
                            context.admin_account,
                            "add_supported_token",
                            runtime_args! {
                                "token_contract" => token
                            },
                        );
                        expected_tokens.insert(token);
                    }
                }
                1 => {
                    // Add signer
                    let signer = create_dummy_public_key(i as u8);
                    let account_hash = casper_types::account::AccountHash::from(&signer);
                    if !expected_signers.contains(&account_hash) {
                        context.call_contract(
                            context.admin_account,
                            "add_signer",
                            runtime_args! {
                                "public_key" => signer,
                                "weight" => ((i % 100) + 1) as u32
                            },
                        );
                        expected_signers.insert(account_hash);
                    }
                }
                2 => {
                    // Pause/unpause
                    if is_paused {
                        context.call_contract(
                            context.admin_account,
                            "unpause_contract",
                            runtime_args! {},
                        );
                        is_paused = false;
                    } else {
                        context.call_contract(
                            context.admin_account,
                            "pause_contract",
                            runtime_args! {},
                        );
                        is_paused = true;
                    }
                }
                3 => {
                    // Process transaction (if not paused)
                    if !is_paused {
                        context.call_contract(
                            context.user_account,
                            "process_transaction",
                            runtime_args! {
                                "user_signature" => format!("sig_{}", i),
                                "transaction_data" => vec![i as u8; 10],
                                "fee_token" => None::<ContractHash>,
                            },
                        );
                    }
                }
                _ => unreachable!(),
            }
        }
        
        // Verify final state consistency
        let actual_tokens = context.get_supported_tokens();
        let actual_signers: std::collections::HashSet<_> = context.get_signer_pool()
            .iter()
            .map(|s| s.account_hash)
            .collect();
        
        prop_assert_eq!(actual_tokens.len(), expected_tokens.len());
        prop_assert_eq!(actual_signers.len(), expected_signers.len());
        prop_assert_eq!(context.is_paused(), is_paused);
        
        for token in &actual_tokens {
            prop_assert!(expected_tokens.contains(token));
        }
        
        for signer in &actual_signers {
            prop_assert!(expected_signers.contains(signer));
        }
    }
}