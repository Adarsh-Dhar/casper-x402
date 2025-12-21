mod common;

use casper_types::{runtime_args, ApiError, ContractHash};
use common::*;

#[test]
fn test_full_workflow() {
    let mut context = TestContext::new();

    // 1. Verify initial state
    assert!(!context.is_paused());
    assert_eq!(context.get_supported_tokens().len(), 0);
    assert_eq!(context.get_signer_pool().len(), 0);

    // 2. Add supported tokens
    let token1 = create_dummy_contract_hash(100);
    let token2 = create_dummy_contract_hash(101);

    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token1
        },
    );

    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token2
        },
    );

    assert_eq!(context.get_supported_tokens().len(), 2);

    // 3. Add signers
    let signer1 = create_dummy_public_key(50);
    let signer2 = create_dummy_public_key(51);

    context.call_contract(
        context.admin_account,
        "add_signer",
        runtime_args! {
            "public_key" => signer1,
            "weight" => 100u32
        },
    );

    context.call_contract(
        context.admin_account,
        "add_signer",
        runtime_args! {
            "public_key" => signer2,
            "weight" => 200u32
        },
    );

    assert_eq!(context.get_signer_pool().len(), 2);

    // 4. Process transactions
    context.call_contract(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => "sig1".to_string(),
            "transaction_data" => vec![1, 2, 3],
            "fee_token" => Some(token1),
        },
    );

    context.call_contract(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => "sig2".to_string(),
            "transaction_data" => vec![4, 5, 6],
            "fee_token" => Some(token2),
        },
    );

    // 5. Pause and verify transactions fail
    context.call_contract(
        context.admin_account,
        "pause_contract",
        runtime_args! {},
    );

    assert!(context.is_paused());

    context.call_contract_expect_error(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => "sig3".to_string(),
            "transaction_data" => vec![7, 8, 9],
            "fee_token" => Some(token1),
        },
        ApiError::PermissionDenied as u16,
    );

    // 6. Unpause and verify transactions work again
    context.call_contract(
        context.admin_account,
        "unpause_contract",
        runtime_args! {},
    );

    assert!(!context.is_paused());

    context.call_contract(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => "sig4".to_string(),
            "transaction_data" => vec![10, 11, 12],
            "fee_token" => Some(token1),
        },
    );

    // 7. Remove a token and verify it can't be used
    context.call_contract(
        context.admin_account,
        "remove_supported_token",
        runtime_args! {
            "token_contract" => token1
        },
    );

    assert_eq!(context.get_supported_tokens().len(), 1);

    context.call_contract_expect_error(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => "sig5".to_string(),
            "transaction_data" => vec![13, 14, 15],
            "fee_token" => Some(token1),
        },
        ApiError::InvalidArgument as u16,
    );

    // 8. Remove a signer
    let signer1_account = casper_types::account::AccountHash::from(&signer1);
    context.call_contract(
        context.admin_account,
        "remove_signer",
        runtime_args! {
            "account_hash" => signer1_account
        },
    );

    assert_eq!(context.get_signer_pool().len(), 1);
}

#[test]
fn test_concurrent_operations() {
    let mut context = TestContext::new();

    // Add multiple tokens and signers concurrently (simulated)
    let tokens: Vec<ContractHash> = (100..110).map(create_dummy_contract_hash).collect();
    let signers: Vec<_> = (50..60).map(create_dummy_public_key).collect();

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

    // Add all signers
    for (i, signer) in signers.iter().enumerate() {
        context.call_contract(
            context.admin_account,
            "add_signer",
            runtime_args! {
                "public_key" => *signer,
                "weight" => ((i + 1) * 10) as u32
            },
        );
    }

    // Verify all were added
    assert_eq!(context.get_supported_tokens().len(), 10);
    assert_eq!(context.get_signer_pool().len(), 10);

    // Process multiple transactions
    for (i, token) in tokens.iter().enumerate() {
        context.call_contract(
            context.user_account,
            "process_transaction",
            runtime_args! {
                "user_signature" => format!("sig_{}", i),
                "transaction_data" => vec![i as u8; 100],
                "fee_token" => Some(*token),
            },
        );
    }
}

#[test]
fn test_admin_operations_sequence() {
    let mut context = TestContext::new();

    // Test sequence of admin operations
    let token = create_dummy_contract_hash(100);
    let signer = create_dummy_public_key(50);

    // Add token
    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token
        },
    );

    // Add signer
    context.call_contract(
        context.admin_account,
        "add_signer",
        runtime_args! {
            "public_key" => signer,
            "weight" => 100u32
        },
    );

    // Pause
    context.call_contract(
        context.admin_account,
        "pause_contract",
        runtime_args! {},
    );

    // Try to add token while paused (should succeed - admin operations work when paused)
    let token2 = create_dummy_contract_hash(101);
    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token2
        },
    );

    // Unpause
    context.call_contract(
        context.admin_account,
        "unpause_contract",
        runtime_args! {},
    );

    // Remove token
    context.call_contract(
        context.admin_account,
        "remove_supported_token",
        runtime_args! {
            "token_contract" => token
        },
    );

    // Remove signer
    let signer_account = casper_types::account::AccountHash::from(&signer);
    context.call_contract(
        context.admin_account,
        "remove_signer",
        runtime_args! {
            "account_hash" => signer_account
        },
    );

    // Verify final state
    assert_eq!(context.get_supported_tokens().len(), 1);
    assert_eq!(context.get_signer_pool().len(), 0);
    assert!(!context.is_paused());
}

#[test]
fn test_error_recovery() {
    let mut context = TestContext::new();

    let token = create_dummy_contract_hash(100);

    // Try to remove non-existent token (should fail)
    context.call_contract_expect_error(
        context.admin_account,
        "remove_supported_token",
        runtime_args! {
            "token_contract" => token
        },
        ApiError::InvalidArgument as u16,
    );

    // Add the token (should succeed)
    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token
        },
    );

    // Try to add duplicate (should fail)
    context.call_contract_expect_error(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token
        },
        ApiError::InvalidArgument as u16,
    );

    // Remove the token (should succeed)
    context.call_contract(
        context.admin_account,
        "remove_supported_token",
        runtime_args! {
            "token_contract" => token
        },
    );

    // Verify state is consistent
    assert_eq!(context.get_supported_tokens().len(), 0);
}

#[test]
fn test_boundary_conditions() {
    let mut context = TestContext::new();

    // Test with maximum number of tokens (reasonable limit)
    for i in 0..50 {
        let token = create_dummy_contract_hash(i);
        context.call_contract(
            context.admin_account,
            "add_supported_token",
            runtime_args! {
                "token_contract" => token
            },
        );
    }

    assert_eq!(context.get_supported_tokens().len(), 50);

    // Test with maximum number of signers
    for i in 0..50 {
        let signer = create_dummy_public_key(i);
        context.call_contract(
            context.admin_account,
            "add_signer",
            runtime_args! {
                "public_key" => signer,
                "weight" => 100u32
            },
        );
    }

    assert_eq!(context.get_signer_pool().len(), 50);

    // Process transaction with first and last token
    let first_token = create_dummy_contract_hash(0);
    let last_token = create_dummy_contract_hash(49);

    context.call_contract(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => "sig1".to_string(),
            "transaction_data" => vec![1, 2, 3],
            "fee_token" => Some(first_token),
        },
    );

    context.call_contract(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => "sig2".to_string(),
            "transaction_data" => vec![4, 5, 6],
            "fee_token" => Some(last_token),
        },
    );
}

#[test]
fn test_state_consistency() {
    let mut context = TestContext::new();

    // Perform various operations
    let token1 = create_dummy_contract_hash(100);
    let token2 = create_dummy_contract_hash(101);
    let signer1 = create_dummy_public_key(50);

    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token1
        },
    );

    context.call_contract(
        context.admin_account,
        "add_signer",
        runtime_args! {
            "public_key" => signer1,
            "weight" => 100u32
        },
    );

    context.call_contract(
        context.admin_account,
        "pause_contract",
        runtime_args! {},
    );

    // Verify state is consistent
    assert_eq!(context.get_supported_tokens().len(), 1);
    assert_eq!(context.get_signer_pool().len(), 1);
    assert!(context.is_paused());
    assert_eq!(context.get_admin(), context.admin_account);

    // Add more while paused
    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token2
        },
    );

    // Verify state updated correctly
    assert_eq!(context.get_supported_tokens().len(), 2);
    assert!(context.is_paused());

    // Unpause
    context.call_contract(
        context.admin_account,
        "unpause_contract",
        runtime_args! {},
    );

    // Verify final state
    assert_eq!(context.get_supported_tokens().len(), 2);
    assert_eq!(context.get_signer_pool().len(), 1);
    assert!(!context.is_paused());
}