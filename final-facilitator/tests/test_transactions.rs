mod common;

use casper_types::{runtime_args, ApiError, ContractHash};
use common::*;

#[test]
fn test_process_transaction_basic() {
    let mut context = TestContext::new();

    let user_signature = "test_signature".to_string();
    let transaction_data = vec![1, 2, 3, 4, 5];
    let fee_token: Option<ContractHash> = None;

    // Process transaction without fee token
    context.call_contract(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => user_signature,
            "transaction_data" => transaction_data,
            "fee_token" => fee_token,
        },
    );

    // Should succeed without errors
}

#[test]
fn test_process_transaction_with_fee_token() {
    let mut context = TestContext::new();
    let token_hash = create_dummy_contract_hash(100);

    // First add the token as supported
    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token_hash
        },
    );

    let user_signature = "test_signature".to_string();
    let transaction_data = vec![1, 2, 3, 4, 5];
    let fee_token = Some(token_hash);

    // Process transaction with fee token
    context.call_contract(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => user_signature,
            "transaction_data" => transaction_data,
            "fee_token" => fee_token,
        },
    );

    // Should succeed
}

#[test]
fn test_process_transaction_unsupported_fee_token() {
    let mut context = TestContext::new();
    let unsupported_token = create_dummy_contract_hash(200);

    let user_signature = "test_signature".to_string();
    let transaction_data = vec![1, 2, 3, 4, 5];
    let fee_token = Some(unsupported_token);

    // Try to process transaction with unsupported fee token
    context.call_contract_expect_error(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => user_signature,
            "transaction_data" => transaction_data,
            "fee_token" => fee_token,
        },
        ApiError::InvalidArgument as u16,
    );
}

#[test]
fn test_process_transaction_empty_data() {
    let mut context = TestContext::new();

    let user_signature = "test_signature".to_string();
    let transaction_data: Vec<u8> = vec![];
    let fee_token: Option<ContractHash> = None;

    // Try to process transaction with empty data
    context.call_contract_expect_error(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => user_signature,
            "transaction_data" => transaction_data,
            "fee_token" => fee_token,
        },
        ApiError::InvalidArgument as u16,
    );
}

#[test]
fn test_process_transaction_when_paused() {
    let mut context = TestContext::new();

    // Pause the contract
    context.call_contract(
        context.admin_account,
        "pause_contract",
        runtime_args! {},
    );

    let user_signature = "test_signature".to_string();
    let transaction_data = vec![1, 2, 3, 4, 5];
    let fee_token: Option<ContractHash> = None;

    // Try to process transaction when paused
    context.call_contract_expect_error(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => user_signature,
            "transaction_data" => transaction_data,
            "fee_token" => fee_token,
        },
        ApiError::PermissionDenied as u16,
    );
}

#[test]
fn test_process_transaction_large_data() {
    let mut context = TestContext::new();

    let user_signature = "test_signature".to_string();
    let transaction_data = vec![0u8; 10000]; // Large transaction
    let fee_token: Option<ContractHash> = None;

    // Process large transaction
    context.call_contract(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => user_signature,
            "transaction_data" => transaction_data,
            "fee_token" => fee_token,
        },
    );

    // Should succeed
}

#[test]
fn test_process_multiple_transactions() {
    let mut context = TestContext::new();
    let token_hash = create_dummy_contract_hash(100);

    // Add supported token
    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token_hash
        },
    );

    // Process multiple transactions
    for i in 0..5 {
        let user_signature = format!("signature_{}", i);
        let transaction_data = vec![i as u8; 100];
        let fee_token = if i % 2 == 0 { Some(token_hash) } else { None };

        context.call_contract(
            context.user_account,
            "process_transaction",
            runtime_args! {
                "user_signature" => user_signature,
                "transaction_data" => transaction_data,
                "fee_token" => fee_token,
            },
        );
    }

    // All should succeed
}

#[test]
fn test_process_transaction_different_users() {
    let mut context = TestContext::new();

    let transaction_data = vec![1, 2, 3, 4, 5];
    let fee_token: Option<ContractHash> = None;

    // Process transactions from different users
    let users = [context.user_account, context.signer_account, context.fee_recipient_account];

    for (i, &user) in users.iter().enumerate() {
        let user_signature = format!("signature_user_{}", i);

        context.call_contract(
            user,
            "process_transaction",
            runtime_args! {
                "user_signature" => user_signature,
                "transaction_data" => transaction_data.clone(),
                "fee_token" => fee_token,
            },
        );
    }

    // All should succeed
}

#[test]
fn test_process_transaction_with_different_fee_tokens() {
    let mut context = TestContext::new();

    // Add multiple supported tokens
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

    let user_signature = "test_signature".to_string();
    let transaction_data = vec![1, 2, 3, 4, 5];

    // Process transactions with different fee tokens
    for token in [token1, token2, token3] {
        context.call_contract(
            context.user_account,
            "process_transaction",
            runtime_args! {
                "user_signature" => user_signature.clone(),
                "transaction_data" => transaction_data.clone(),
                "fee_token" => Some(token),
            },
        );
    }

    // All should succeed
}

#[test]
fn test_process_transaction_after_token_removal() {
    let mut context = TestContext::new();
    let token_hash = create_dummy_contract_hash(100);

    // Add token
    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token_hash
        },
    );

    // Process transaction successfully
    context.call_contract(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => "test_signature".to_string(),
            "transaction_data" => vec![1, 2, 3, 4, 5],
            "fee_token" => Some(token_hash),
        },
    );

    // Remove token
    context.call_contract(
        context.admin_account,
        "remove_supported_token",
        runtime_args! {
            "token_contract" => token_hash
        },
    );

    // Try to process transaction with removed token
    context.call_contract_expect_error(
        context.user_account,
        "process_transaction",
        runtime_args! {
            "user_signature" => "test_signature2".to_string(),
            "transaction_data" => vec![1, 2, 3, 4, 5],
            "fee_token" => Some(token_hash),
        },
        ApiError::InvalidArgument as u16,
    );
}