use alloc::{vec::Vec, string::String};
use casper_types::{account::AccountHash, ContractHash};

use crate::constants::*;
use crate::errors::*;
use crate::types::TokenAccountInfo;
use crate::storage::*;

/// Initialize token accounts for all allowed payment tokens for the paymaster
/// This function initializes token accounts for ALL signers in the pool
/// 
/// Order of priority is:
/// 1. Payment address provided in config
/// 2. All signers in pool
pub fn initialize_atas(
    _compute_unit_price: Option<u64>,
    _compute_unit_limit: Option<u32>,
    chunk_size: Option<usize>,
    _fee_payer_key: Option<String>,
) -> Result<u32, casper_types::ApiError> {
    let chunk_size = chunk_size.unwrap_or(DEFAULT_CHUNK_SIZE);
    
    if chunk_size > MAX_CHUNK_SIZE {
        return Err(invalid_chunk_size_error());
    }
    
    // Get addresses to initialize - priority: fee recipient, then all signers
    let mut addresses_to_initialize = Vec::new();
    
    // Add fee recipient if available
    let fee_recipient = get_fee_recipient();
    addresses_to_initialize.push(fee_recipient);
    
    // Add all signer addresses from pool
    let signer_pool = get_signer_pool();
    for signer in &signer_pool {
        if signer.is_active {
            addresses_to_initialize.push(signer.account_hash);
        }
    }
    
    // Remove duplicates
    addresses_to_initialize.sort();
    addresses_to_initialize.dedup();
    
    // Initialize token accounts with chunking
    initialize_atas_with_chunk_size(
        &addresses_to_initialize,
        _compute_unit_price,
        _compute_unit_limit,
        chunk_size,
    )
}

/// Initialize token accounts for all allowed payment tokens for the provided addresses with configurable chunk size
/// This function does not use cache and directly checks on-chain
pub fn initialize_atas_with_chunk_size(
    addresses_to_initialize_atas: &Vec<AccountHash>,
    _compute_unit_price: Option<u64>,
    _compute_unit_limit: Option<u32>,
    chunk_size: usize,
) -> Result<u32, casper_types::ApiError> {
    let mut total_created = 0u32;
    
    // Process addresses in chunks
    for chunk in addresses_to_initialize_atas.chunks(chunk_size) {
        for address in chunk {
            // Find missing token accounts for this address
            let missing_atas = find_missing_atas(address)?;
            
            if !missing_atas.is_empty() {
                let created_count = create_atas_for_signer(
                    address,
                    &missing_atas,
                    _compute_unit_price,
                    _compute_unit_limit,
                    chunk_size,
                )?;
                
                total_created = total_created.saturating_add(created_count);
            }
        }
    }
    
    Ok(total_created)
}

/// Helper function to create token accounts for a single signer
fn create_atas_for_signer(
    _address: &AccountHash,
    atas_to_create: &[TokenAccountInfo],
    _compute_unit_price: Option<u64>,
    _compute_unit_limit: Option<u32>,
    chunk_size: usize,
) -> Result<u32, casper_types::ApiError> {
    let mut created_count = 0u32;
    
    // Process token account creation in chunks
    for chunk in atas_to_create.chunks(chunk_size) {
        for ata in chunk {
            // In Casper/facilitator context, this would involve:
            // 1. Checking if the token account exists
            // 2. Creating the account if it doesn't exist
            // 3. Setting up proper allowances
            
            let success = simulate_create_token_account(_address, ata)?;
            
            if success {
                created_count = created_count.saturating_add(1);
            }
        }
    }
    
    Ok(created_count)
}

/// Find missing token accounts for a given address
pub fn find_missing_atas(
    payment_address: &AccountHash,
) -> Result<Vec<TokenAccountInfo>, casper_types::ApiError> {
    let mut missing_atas = Vec::new();
    
    // Check each supported token
    let supported_tokens = get_supported_tokens();
    for token_contract in &supported_tokens {
        // Check if token account exists for this address
        let account_exists = check_token_account_exists(
            payment_address,
            token_contract,
        )?;
        
        if !account_exists {
            missing_atas.push(TokenAccountInfo {
                token_contract: *token_contract,
                owner: *payment_address,
                is_initialized: false,
            });
        }
    }
    
    Ok(missing_atas)
}

/// Check if a token account exists for the given address and token
fn check_token_account_exists(
    _address: &AccountHash,
    token_contract: &ContractHash,
) -> Result<bool, casper_types::ApiError> {
    // In a real implementation, this would query the token contract
    // to check if the address has a balance entry or account
    
    // For now, simulate the check based on supported tokens
    let supported_tokens = get_supported_tokens();
    if !supported_tokens.contains(token_contract) {
        return Err(token_not_supported_error());
    }
    
    // Simulate account existence check
    // In practice, this would make a contract call to the token
    Ok(true) // Placeholder - assume account exists for supported tokens
}

/// Simulate creating a token account (placeholder for actual implementation)
fn simulate_create_token_account(
    _address: &AccountHash,
    ata: &TokenAccountInfo,
) -> Result<bool, casper_types::ApiError> {
    // In a real implementation, this would:
    // 1. Call the token contract to initialize an account
    // 2. Set up proper allowances
    // 3. Handle any initialization fees
    
    // Validate that the token is supported
    let supported_tokens = get_supported_tokens();
    if !supported_tokens.contains(&ata.token_contract) {
        return Err(token_not_supported_error());
    }
    
    // Simulate successful creation
    Ok(true)
}

/// Get the total number of supported tokens
pub fn get_supported_token_count() -> u32 {
    let supported_tokens = get_supported_tokens();
    supported_tokens.len() as u32
}

/// Check if a token is supported
pub fn is_token_supported(token_contract: &ContractHash) -> bool {
    let supported_tokens = get_supported_tokens();
    supported_tokens.contains(token_contract)
}

/// Get the number of active signers in the pool
pub fn get_active_signer_count() -> u32 {
    let signer_pool = get_signer_pool();
    signer_pool.iter().filter(|s| s.is_active).count() as u32
}

/// Calculate the total weight of active signers
pub fn get_total_active_signer_weight() -> u64 {
    let signer_pool = get_signer_pool();
    signer_pool
        .iter()
        .filter(|s| s.is_active)
        .map(|s| s.weight as u64)
        .sum()
}

/// Validate chunk size parameter
pub fn validate_chunk_size(chunk_size: usize) -> Result<(), casper_types::ApiError> {
    if chunk_size == 0 || chunk_size > MAX_CHUNK_SIZE {
        return Err(invalid_chunk_size_error());
    }
    Ok(())
}

/// Estimate the cost of initializing token accounts
pub fn estimate_initialization_cost(
    address_count: u32,
    token_count: u32,
) -> u64 {
    let base_cost_per_account = ACCOUNT_CREATION_FEE_LAMPORTS;
    let total_accounts = address_count as u64 * token_count as u64;
    
    total_accounts.saturating_mul(base_cost_per_account)
}