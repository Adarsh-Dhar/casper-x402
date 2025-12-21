mod common;

use casper_types::{runtime_args, ApiError, ContractHash, PublicKey};
use common::*;

#[test]
fn test_add_supported_token() {
    let mut context = TestContext::new();
    let token_hash = create_dummy_contract_hash(100);

    // Add token as admin
    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token_hash
        },
    );

    // Verify token was added
    let supported_tokens = context.get_supported_tokens();
    assert!(supported_tokens.contains(&token_hash));
}

#[test]
fn test_add_supported_token_unauthorized() {
    let mut context = TestContext::new();
    let token_hash = create_dummy_contract_hash(100);

    // Try to add token as non-admin
    context.call_contract_expect_error(
        context.user_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token_hash
        },
        ApiError::PermissionDenied as u16,
    );

    // Verify token was not added
    let supported_tokens = context.get_supported_tokens();
    assert!(!supported_tokens.contains(&token_hash));
}

#[test]
fn test_add_duplicate_token() {
    let mut context = TestContext::new();
    let token_hash = create_dummy_contract_hash(100);

    // Add token first time
    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token_hash
        },
    );

    // Try to add same token again
    context.call_contract_expect_error(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token_hash
        },
        ApiError::InvalidArgument as u16,
    );
}

#[test]
fn test_remove_supported_token() {
    let mut context = TestContext::new();
    let token_hash = create_dummy_contract_hash(100);

    // Add token first
    context.call_contract(
        context.admin_account,
        "add_supported_token",
        runtime_args! {
            "token_contract" => token_hash
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

    // Verify token was removed
    let supported_tokens = context.get_supported_tokens();
    assert!(!supported_tokens.contains(&token_hash));
}

#[test]
fn test_remove_nonexistent_token() {
    let mut context = TestContext::new();
    let token_hash = create_dummy_contract_hash(100);

    // Try to remove non-existent token
    context.call_contract_expect_error(
        context.admin_account,
        "remove_supported_token",
        runtime_args! {
            "token_contract" => token_hash
        },
        ApiError::InvalidArgument as u16,
    );
}

#[test]
fn test_add_signer() {
    let mut context = TestContext::new();
    let public_key = create_dummy_public_key(50);
    let weight = 100u32;

    // Add signer
    context.call_contract(
        context.admin_account,
        "add_signer",
        runtime_args! {
            "public_key" => public_key,
            "weight" => weight
        },
    );

    // Verify signer was added
    let signer_pool = context.get_signer_pool();
    assert_eq!(signer_pool.len(), 1);
    assert_eq!(signer_pool[0].public_key, public_key);
    assert_eq!(signer_pool[0].weight, weight);
    assert!(signer_pool[0].is_active);
}

#[test]
fn test_add_duplicate_signer() {
    let mut context = TestContext::new();
    let public_key = create_dummy_public_key(50);
    let weight = 100u32;

    // Add signer first time
    context.call_contract(
        context.admin_account,
        "add_signer",
        runtime_args! {
            "public_key" => public_key,
            "weight" => weight
        },
    );

    // Try to add same signer again
    context.call_contract_expect_error(
        context.admin_account,
        "add_signer",
        runtime_args! {
            "public_key" => public_key,
            "weight" => weight
        },
        ApiError::InvalidArgument as u16,
    );
}

#[test]
fn test_remove_signer() {
    let mut context = TestContext::new();
    let public_key = create_dummy_public_key(50);
    let weight = 100u32;

    // Add signer first
    context.call_contract(
        context.admin_account,
        "add_signer",
        runtime_args! {
            "public_key" => public_key,
            "weight" => weight
        },
    );

    let account_hash = casper_types::account::AccountHash::from(&public_key);

    // Remove signer
    context.call_contract(
        context.admin_account,
        "remove_signer",
        runtime_args! {
            "account_hash" => account_hash
        },
    );

    // Verify signer was removed
    let signer_pool = context.get_signer_pool();
    assert_eq!(signer_pool.len(), 0);
}

#[test]
fn test_pause_unpause_contract() {
    let mut context = TestContext::new();

    // Initially not paused
    assert!(!context.is_paused());

    // Pause contract
    context.call_contract(
        context.admin_account,
        "pause_contract",
        runtime_args! {},
    );

    // Verify paused
    assert!(context.is_paused());

    // Unpause contract
    context.call_contract(
        context.admin_account,
        "unpause_contract",
        runtime_args! {},
    );

    // Verify unpaused
    assert!(!context.is_paused());
}

#[test]
fn test_pause_contract_unauthorized() {
    let mut context = TestContext::new();

    // Try to pause as non-admin
    context.call_contract_expect_error(
        context.user_account,
        "pause_contract",
        runtime_args! {},
        ApiError::PermissionDenied as u16,
    );

    // Verify not paused
    assert!(!context.is_paused());
}

#[test]
fn test_multiple_signers() {
    let mut context = TestContext::new();

    // Add multiple signers
    for i in 1..=5 {
        let public_key = create_dummy_public_key(i);
        let weight = (i as u32) * 10;

        context.call_contract(
            context.admin_account,
            "add_signer",
            runtime_args! {
                "public_key" => public_key,
                "weight" => weight
            },
        );
    }

    // Verify all signers were added
    let signer_pool = context.get_signer_pool();
    assert_eq!(signer_pool.len(), 5);

    // Verify weights are correct
    for (i, signer) in signer_pool.iter().enumerate() {
        assert_eq!(signer.weight, ((i + 1) as u32) * 10);
    }
}

#[test]
fn test_multiple_tokens() {
    let mut context = TestContext::new();

    // Add multiple tokens
    let mut token_hashes = Vec::new();
    for i in 1..=10 {
        let token_hash = create_dummy_contract_hash(i);
        token_hashes.push(token_hash);

        context.call_contract(
            context.admin_account,
            "add_supported_token",
            runtime_args! {
                "token_contract" => token_hash
            },
        );
    }

    // Verify all tokens were added
    let supported_tokens = context.get_supported_tokens();
    assert_eq!(supported_tokens.len(), 10);

    for token_hash in &token_hashes {
        assert!(supported_tokens.contains(token_hash));
    }

    // Remove some tokens
    for i in 1..=5 {
        let token_hash = create_dummy_contract_hash(i);
        context.call_contract(
            context.admin_account,
            "remove_supported_token",
            runtime_args! {
                "token_contract" => token_hash
            },
        );
    }

    // Verify correct tokens remain
    let supported_tokens = context.get_supported_tokens();
    assert_eq!(supported_tokens.len(), 5);

    for i in 6..=10 {
        let token_hash = create_dummy_contract_hash(i);
        assert!(supported_tokens.contains(&token_hash));
    }
}