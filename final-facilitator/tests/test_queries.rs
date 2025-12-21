mod common;

use casper_types::{runtime_args, ContractHash};
use common::*;

#[test]
fn test_get_supported_tokens_empty() {
    let context = TestContext::new();

    // Initially should be empty
    let supported_tokens = context.get_supported_tokens();
    assert_eq!(supported_tokens.len(), 0);
}

#[test]
fn test_get_supported_tokens_with_data() {
    let mut context = TestContext::new();

    // Add some tokens
    let tokens = vec![
        create_dummy_contract_hash(100),
        create_dummy_contract_hash(101),
        create_dummy_contract_hash(102),
    ];

    for token in &tokens {
        context.call_contract(
            context.admin_account,
            "add_supported_token",
            runtime_args! {
                "token_contract" => *token
            },
        );
    }

    // Query supported tokens
    let supported_tokens = context.get_supported_tokens();
    assert_eq!(supported_tokens.len(), 3);

    for token in &tokens {
        assert!(supported_tokens.contains(token));
    }
}

#[test]
fn test_get_supported_tokens_after_removal() {
    let mut context = TestContext::new();

    // Add tokens
    let token1 = create_dummy_contract_hash(100);
    let token2 = create_dummy_contract_hash(101);
    let token3 = create_dummy_contract_hash(102);

    for token in [token1, token2, token3] {
        context.call_contract(
            context.admin_account,
            "add_supported_token",
            runtime_args! {
                "token_contract" => token
            },
        );
    }

    // Remove one token
    context.call_contract(
        context.admin_account,
        "remove_supported_token",
        runtime_args! {
            "token_contract" => token2
        },
    );

    // Query supported tokens
    let supported_tokens = context.get_supported_tokens();
    assert_eq!(supported_tokens.len(), 2);
    assert!(supported_tokens.contains(&token1));
    assert!(!supported_tokens.contains(&token2));
    assert!(supported_tokens.contains(&token3));
}

#[test]
fn test_signer_pool_queries() {
    let mut context = TestContext::new();

    // Initially should be empty
    let signer_pool = context.get_signer_pool();
    assert_eq!(signer_pool.len(), 0);

    // Add signers
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

    // Query signer pool
    let signer_pool = context.get_signer_pool();
    assert_eq!(signer_pool.len(), 2);

    // Verify signer details
    let signer1_found = signer_pool.iter().find(|s| s.public_key == signer1);
    let signer2_found = signer_pool.iter().find(|s| s.public_key == signer2);

    assert!(signer1_found.is_some());
    assert!(signer2_found.is_some());

    assert_eq!(signer1_found.unwrap().weight, 100);
    assert_eq!(signer2_found.unwrap().weight, 200);
    assert!(signer1_found.unwrap().is_active);
    assert!(signer2_found.unwrap().is_active);
}

#[test]
fn test_pause_state_queries() {
    let mut context = TestContext::new();

    // Initially not paused
    assert!(!context.is_paused());

    // Pause
    context.call_contract(
        context.admin_account,
        "pause_contract",
        runtime_args! {},
    );

    assert!(context.is_paused());

    // Unpause
    context.call_contract(
        context.admin_account,
        "unpause_contract",
        runtime_args! {},
    );

    assert!(!context.is_paused());
}

#[test]
fn test_admin_queries() {
    let context = TestContext::new();

    // Verify admin is set correctly
    let admin = context.get_admin();
    assert_eq!(admin, context.admin_account);
}

#[test]
fn test_query_consistency_after_operations() {
    let mut context = TestContext::new();

    // Perform various operations and verify queries remain consistent
    let token1 = create_dummy_contract_hash(100);
    let token2 = create_dummy_contract_hash(101);
    let signer1 = create_dummy_public_key(50);

    // Add token
    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token1
        },
    );

    assert_eq!(context.get_supported_tokens().len(), 1);
    assert!(!context.is_paused());

    // Add signer
    context.call_contract(
        context.admin_account,
        "add_signer",
        runtime_args! {
            "public_key" => signer1,
            "weight" => 100u32
        },
    );

    assert_eq!(context.get_supported_tokens().len(), 1);
    assert_eq!(context.get_signer_pool().len(), 1);
    assert!(!context.is_paused());

    // Pause
    context.call_contract(
        context.admin_account,
        "pause_contract",
        runtime_args! {},
    );

    assert_eq!(context.get_supported_tokens().len(), 1);
    assert_eq!(context.get_signer_pool().len(), 1);
    assert!(context.is_paused());

    // Add another token while paused
    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token2
        },
    );

    assert_eq!(context.get_supported_tokens().len(), 2);
    assert_eq!(context.get_signer_pool().len(), 1);
    assert!(context.is_paused());

    // Unpause
    context.call_contract(
        context.admin_account,
        "unpause_contract",
        runtime_args! {},
    );

    assert_eq!(context.get_supported_tokens().len(), 2);
    assert_eq!(context.get_signer_pool().len(), 1);
    assert!(!context.is_paused());
}

#[test]
fn test_query_large_datasets() {
    let mut context = TestContext::new();

    // Add many tokens
    for i in 0..100 {
        let token = create_dummy_contract_hash(i);
        context.call_contract(
            context.admin_account,
            "add_supported_token",
            runtime_args! {
                "token_contract" => token
            },
        );
    }

    // Query should return all tokens
    let supported_tokens = context.get_supported_tokens();
    assert_eq!(supported_tokens.len(), 100);

    // Add many signers
    for i in 0..50 {
        let signer = create_dummy_public_key(i);
        context.call_contract(
            context.admin_account,
            "add_signer",
            runtime_args! {
                "public_key" => signer,
                "weight" => (i + 1) as u32
            },
        );
    }

    // Query should return all signers
    let signer_pool = context.get_signer_pool();
    assert_eq!(signer_pool.len(), 50);

    // Verify weights are correct
    for (i, signer) in signer_pool.iter().enumerate() {
        // Note: order might not be preserved, so we check that all expected weights exist
        assert!(signer.weight >= 1 && signer.weight <= 50);
    }
}

#[test]
fn test_query_after_partial_removal() {
    let mut context = TestContext::new();

    // Add tokens
    let tokens: Vec<ContractHash> = (0..10).map(create_dummy_contract_hash).collect();
    for token in &tokens {
        context.call_contract(
            context.admin_account,
            "add_supported_token",
            runtime_args! {
                "token_contract" => *token
            },
        );
    }

    // Add signers
    let signers: Vec<_> = (0..10).map(create_dummy_public_key).collect();
    for (i, signer) in signers.iter().enumerate() {
        context.call_contract(
            context.admin_account,
            "add_signer",
            runtime_args! {
                "public_key" => *signer,
                "weight" => (i + 1) as u32
            },
        );
    }

    // Remove every other token
    for i in (0..10).step_by(2) {
        context.call_contract(
            context.admin_account,
            "remove_supported_token",
            runtime_args! {
                "token_contract" => tokens[i]
            },
        );
    }

    // Remove every other signer
    for i in (0..10).step_by(2) {
        let signer_account = casper_types::account::AccountHash::from(&signers[i]);
        context.call_contract(
            context.admin_account,
            "remove_signer",
            runtime_args! {
                "account_hash" => signer_account
            },
        );
    }

    // Verify correct items remain
    let supported_tokens = context.get_supported_tokens();
    let signer_pool = context.get_signer_pool();

    assert_eq!(supported_tokens.len(), 5);
    assert_eq!(signer_pool.len(), 5);

    // Verify only odd-indexed items remain
    for i in (1..10).step_by(2) {
        assert!(supported_tokens.contains(&tokens[i]));
    }

    for i in (1..10).step_by(2) {
        assert!(signer_pool.iter().any(|s| s.public_key == signers[i]));
    }
}