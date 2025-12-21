mod common;

use casper_types::{runtime_args, ApiError, ContractHash};
use common::*;

#[test]
fn test_unauthorized_admin_operations() {
    let mut context = TestContext::new();
    let token = create_dummy_contract_hash(100);
    let signer = create_dummy_public_key(50);

    // Try admin operations as non-admin user
    context.call_contract_expect_error(
        context.user_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token
        },
        ApiError::PermissionDenied as u16,
    );

    context.call_contract_expect_error(
        context.user_account,
        "remove_supported_token",
        runtime_args! {
            "token_contract" => token
        },
        ApiError::PermissionDenied as u16,
    );

    context.call_contract_expect_error(
        context.user_account,
        "add_signer",
        runtime_args! {
            "public_key" => signer,
            "weight" => 100u32
        },
        ApiError::PermissionDenied as u16,
    );

    context.call_contract_expect_error(
        context.user_account,
        "remove_signer",
        runtime_args! {
            "account_hash" => context.user_account
        },
        ApiError::PermissionDenied as u16,
    );

    context.call_contract_expect_error(
        context.user_account,
        "pause_contract",
        runtime_args! {},
        ApiError::PermissionDenied as u16,
    );

    context.call_contract_expect_error(
        context.user_account,
        "unpause_contract",
        runtime_args! {},
        ApiError::PermissionDenied as u16,
    );
}

#[test]
fn test_admin_only_operations() {
    let mut context = TestContext::new();
    let token = create_dummy_contract_hash(100);
    let signer = create_dummy_public_key(50);

    // Verify admin can perform all operations
    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token
        },
    );

    context.call_contract(
        context.admin_account,
        "add_signer",
        runtime_args! {
            "public_key" => signer,
            "weight" => 100u32
        },
    );

    context.call_contract(
        context.admin_account,
        "pause_contract",
        runtime_args! {},
    );

    context.call_contract(
        context.admin_account,
        "unpause_contract",
        runtime_args! {},
    );

    context.call_contract(
        context.admin_account,
        "remove_supported_token",
        runtime_args! {
            "token_contract" => token
        },
    );

    let signer_account = casper_types::account::AccountHash::from(&signer);
    context.call_contract(
        context.admin_account,
        "remove_signer",
        runtime_args! {
            "account_hash" => signer_account
        },
    );

    // All operations should succeed
}

#[test]
fn test_pause_security() {
    let mut context = TestContext::new();
    let token = create_dummy_contract_hash(100);

    // Add token first
    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token
        },
    );

    // Pause contract
    context.call_contract(
        context.admin_account,
        "pause_contract",
        runtime_args! {},
    );

    // User operations should fail when paused
    context.call_contract_expect_error(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => "test".to_string(),
            "transaction_data" => vec![1, 2, 3],
            "fee_token" => Some(token),
        },
        ApiError::PermissionDenied as u16,
    );

    // Fee estimation should also fail when paused
    context.call_contract_expect_error(
        context.user_account,
        "estimate_fees",
        runtime_args! {
            "transaction_size" => 1000u64,
            "instruction_count" => 5u32,
            "uses_lookup_tables" => false,
            "is_payment_required" => false,
        },
        ApiError::PermissionDenied as u16,
    );

    // Admin operations should still work when paused
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

    // User operations should work again
    context.call_contract(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => "test".to_string(),
            "transaction_data" => vec![1, 2, 3],
            "fee_token" => Some(token),
        },
    );
}

#[test]
fn test_input_validation() {
    let mut context = TestContext::new();

    // Test empty transaction data
    context.call_contract_expect_error(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => "test".to_string(),
            "transaction_data" => Vec::<u8>::new(),
            "fee_token" => None::<ContractHash>,
        },
        ApiError::InvalidArgument as u16,
    );

    // Test unsupported fee token
    let unsupported_token = create_dummy_contract_hash(999);
    context.call_contract_expect_error(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => "test".to_string(),
            "transaction_data" => vec![1, 2, 3],
            "fee_token" => Some(unsupported_token),
        },
        ApiError::InvalidArgument as u16,
    );

    // Test duplicate token addition
    let token = create_dummy_contract_hash(100);
    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token
        },
    );

    context.call_contract_expect_error(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token
        },
        ApiError::InvalidArgument as u16,
    );

    // Test duplicate signer addition
    let signer = create_dummy_public_key(50);
    context.call_contract(
        context.admin_account,
        "add_signer",
        runtime_args! {
            "public_key" => signer,
            "weight" => 100u32
        },
    );

    context.call_contract_expect_error(
        context.admin_account,
        "add_signer",
        runtime_args! {
            "public_key" => signer,
            "weight" => 200u32
        },
        ApiError::InvalidArgument as u16,
    );
}

#[test]
fn test_state_isolation() {
    let mut context = TestContext::new();

    // Add tokens and signers
    let token1 = create_dummy_contract_hash(100);
    let token2 = create_dummy_contract_hash(101);
    let signer1 = create_dummy_public_key(50);
    let signer2 = create_dummy_public_key(51);

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

    // Remove one token
    context.call_contract(
        context.admin_account,
        "remove_supported_token",
        runtime_args! {
            "token_contract" => token1
        },
    );

    // Verify only the correct token was removed
    let supported_tokens = context.get_supported_tokens();
    assert_eq!(supported_tokens.len(), 1);
    assert!(supported_tokens.contains(&token2));
    assert!(!supported_tokens.contains(&token1));

    // Remove one signer
    let signer1_account = casper_types::account::AccountHash::from(&signer1);
    context.call_contract(
        context.admin_account,
        "remove_signer",
        runtime_args! {
            "account_hash" => signer1_account
        },
    );

    // Verify only the correct signer was removed
    let signer_pool = context.get_signer_pool();
    assert_eq!(signer_pool.len(), 1);
    assert_eq!(signer_pool[0].public_key, signer2);
}

#[test]
fn test_reentrancy_protection() {
    let mut context = TestContext::new();
    let token = create_dummy_contract_hash(100);

    // Add token
    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token
        },
    );

    // Process multiple transactions rapidly (simulating potential reentrancy)
    for i in 0..10 {
        context.call_contract(
            context.user_account,
            "process_transaction",
            runtime_args! {
                "user_signature" => format!("sig_{}", i),
                "transaction_data" => vec![i as u8; 10],
                "fee_token" => Some(token),
            },
        );
    }

    // All should succeed without state corruption
    let supported_tokens = context.get_supported_tokens();
    assert_eq!(supported_tokens.len(), 1);
    assert!(supported_tokens.contains(&token));
}

#[test]
fn test_access_control_consistency() {
    let mut context = TestContext::new();

    // Verify admin is set correctly
    assert_eq!(context.get_admin(), context.admin_account);

    // Test that admin status doesn't change unexpectedly
    let token = create_dummy_contract_hash(100);
    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token
        },
    );

    // Admin should still be the same
    assert_eq!(context.get_admin(), context.admin_account);

    // Pause and unpause
    context.call_contract(
        context.admin_account,
        "pause_contract",
        runtime_args! {},
    );

    context.call_contract(
        context.admin_account,
        "unpause_contract",
        runtime_args! {},
    );

    // Admin should still be the same
    assert_eq!(context.get_admin(), context.admin_account);
}

#[test]
fn test_malicious_input_handling() {
    let mut context = TestContext::new();

    // Test with very large transaction data
    let large_data = vec![0u8; 100000];
    context.call_contract(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => "test".to_string(),
            "transaction_data" => large_data,
            "fee_token" => None::<ContractHash>,
        },
    );

    // Test with very long signature
    let long_signature = "a".repeat(10000);
    context.call_contract(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => long_signature,
            "transaction_data" => vec![1, 2, 3],
            "fee_token" => None::<ContractHash>,
        },
    );

    // Test with zero weight signer
    let signer = create_dummy_public_key(50);
    context.call_contract(
        context.admin_account,
        "add_signer",
        runtime_args! {
            "public_key" => signer,
            "weight" => 0u32
        },
    );

    // Should succeed (weight validation is implementation-dependent)
}