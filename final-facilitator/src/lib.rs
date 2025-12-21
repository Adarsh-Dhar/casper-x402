#![no_std]
#![no_main]

extern crate alloc;

use alloc::{
    boxed::Box,
    format,
    string::{String, ToString},
    vec,
    vec::Vec,
};

use casper_contract::{
    contract_api::{runtime, storage as casper_storage},
    unwrap_or_revert::UnwrapOrRevert,
};

use casper_types::{
    account::AccountHash,
    crypto::PublicKey,
    ApiError,
    ContractHash,
};

// Module declarations
pub mod constants;
pub mod storage;
pub mod errors;
pub mod types;
pub mod admin;
pub mod fee;
pub mod price;
pub mod events;

// Re-exports
pub use constants::*;
pub use storage::*;
pub use errors::*;
pub use types::*;
pub use events::*;

/// Initialize the vault facilitator contract
pub fn initialize_contract(
    admin: AccountHash,
    fee_recipient: AccountHash,
    base_fee_rate: u64,
    max_fee_rate: u64,
) {
    // Store contract configuration
    runtime::put_key(ADMIN_KEY, casper_storage::new_uref(admin).into());
    runtime::put_key(FEE_RECIPIENT_KEY, casper_storage::new_uref(fee_recipient).into());
    runtime::put_key(BASE_FEE_RATE_KEY, casper_storage::new_uref(base_fee_rate).into());
    runtime::put_key(MAX_FEE_RATE_KEY, casper_storage::new_uref(max_fee_rate).into());
    runtime::put_key(IS_PAUSED_KEY, casper_storage::new_uref(false).into());
    
    // Initialize supported tokens registry
    let supported_tokens: Vec<ContractHash> = Vec::new();
    runtime::put_key(SUPPORTED_TOKENS_KEY, casper_storage::new_uref(supported_tokens).into());
    
    // Initialize signer pool
    let signer_pool: Vec<SignerInfo> = Vec::new();
    runtime::put_key(SIGNER_POOL_KEY, casper_storage::new_uref(signer_pool).into());
    
    // Emit initialization event
    emit_facilitator_event("Initialized", vec![
        ("admin".to_string(), format!("{:?}", admin)),
        ("fee_recipient".to_string(), format!("{:?}", fee_recipient)),
        ("base_fee_rate".to_string(), base_fee_rate.to_string()),
    ]);
}

/// Get the current admin
pub fn get_admin() -> AccountHash {
    let uref = runtime::get_key(ADMIN_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    casper_storage::read(uref).unwrap_or_revert().unwrap_or_revert()
}

/// Check if caller is admin
pub fn require_admin() {
    let admin = get_admin();
    let caller = runtime::get_caller();
    if caller != admin {
        runtime::revert(ApiError::PermissionDenied);
    }
}

/// Add a supported token
pub fn do_add_supported_token(token_contract: ContractHash) -> Result<(), ApiError> {
    require_admin();
    
    let mut supported_tokens = storage::get_supported_tokens();
    
    // Check if token is already supported
    if supported_tokens.contains(&token_contract) {
        return Err(ApiError::InvalidArgument);
    }
    
    supported_tokens.push(token_contract);
    storage::set_supported_tokens(supported_tokens);
    
    emit_facilitator_event("TokenAdded", vec![
        ("token".to_string(), format!("{:?}", token_contract)),
    ]);
    
    Ok(())
}

/// Remove a supported token
pub fn do_remove_supported_token(token_contract: ContractHash) -> Result<(), ApiError> {
    require_admin();
    
    let mut supported_tokens = storage::get_supported_tokens();
    
    // Find and remove the token
    if let Some(pos) = supported_tokens.iter().position(|&x| x == token_contract) {
        supported_tokens.remove(pos);
        storage::set_supported_tokens(supported_tokens);
        
        emit_facilitator_event("TokenRemoved", vec![
            ("token".to_string(), format!("{:?}", token_contract)),
        ]);
        
        Ok(())
    } else {
        Err(ApiError::InvalidArgument)
    }
}

/// Add a signer to the pool
pub fn do_add_signer(public_key: PublicKey, weight: u32) -> Result<(), ApiError> {
    require_admin();
    
    let account_hash = AccountHash::from(&public_key);
    let signer_info = SignerInfo {
        account_hash,
        public_key,
        weight,
        is_active: true,
    };
    
    let mut signer_pool = storage::get_signer_pool();
    
    // Check if signer already exists
    if signer_pool.iter().any(|s| s.account_hash == account_hash) {
        return Err(ApiError::InvalidArgument);
    }
    
    signer_pool.push(signer_info);
    storage::set_signer_pool(signer_pool);
    
    emit_facilitator_event("SignerAdded", vec![
        ("signer".to_string(), format!("{:?}", account_hash)),
        ("weight".to_string(), weight.to_string()),
    ]);
    
    Ok(())
}

/// Remove a signer from the pool
pub fn do_remove_signer(account_hash: AccountHash) -> Result<(), ApiError> {
    require_admin();
    
    let mut signer_pool = storage::get_signer_pool();
    
    if let Some(pos) = signer_pool.iter().position(|s| s.account_hash == account_hash) {
        signer_pool.remove(pos);
        storage::set_signer_pool(signer_pool);
        
        emit_facilitator_event("SignerRemoved", vec![
            ("signer".to_string(), format!("{:?}", account_hash)),
        ]);
        
        Ok(())
    } else {
        Err(ApiError::InvalidArgument)
    }
}

/// Pause the contract
pub fn do_pause_contract() -> Result<(), ApiError> {
    require_admin();
    
    storage::set_paused(true);
    
    emit_facilitator_event("ContractPaused", vec![]);
    
    Ok(())
}

/// Unpause the contract
pub fn do_unpause_contract() -> Result<(), ApiError> {
    require_admin();
    
    storage::set_paused(false);
    
    emit_facilitator_event("ContractUnpaused", vec![]);
    
    Ok(())
}

/// Check if contract is paused
pub fn require_not_paused() {
    if storage::is_paused() {
        runtime::revert(ApiError::PermissionDenied);
    }
}

/// Estimate transaction fees
pub fn estimate_transaction_fees(
    transaction_size: u64,
    instruction_count: u32,
    uses_lookup_tables: bool,
    is_payment_required: bool,
) -> FeeCalculation {
    require_not_paused();
    
    let base_fee_rate = storage::get_base_fee_rate();
    
    fee::calculate_total_fees(
        transaction_size,
        instruction_count,
        uses_lookup_tables,
        is_payment_required,
        base_fee_rate,
    )
}

/// Process a facilitated transaction
pub fn do_process_transaction(
    _user_signature: String,
    transaction_data: Vec<u8>,
    fee_token: Option<ContractHash>,
) -> Result<(), ApiError> {
    require_not_paused();
    
    // Validate transaction data
    if transaction_data.is_empty() {
        return Err(ApiError::InvalidArgument);
    }
    
    // Calculate fees
    let fee_calc = estimate_transaction_fees(
        transaction_data.len() as u64,
        1, // Simplified instruction count
        false,
        fee_token.is_some(),
    );
    
    // Process fee payment if required
    if let Some(token_contract) = fee_token {
        process_fee_payment(token_contract, fee_calc.total_fee)?;
    }
    
    // Emit transaction processed event
    emit_facilitator_event("TransactionProcessed", vec![
        ("fee".to_string(), fee_calc.total_fee.to_string()),
        ("size".to_string(), transaction_data.len().to_string()),
    ]);
    
    Ok(())
}

/// Process fee payment in tokens
fn process_fee_payment(token_contract: ContractHash, _fee_amount: u64) -> Result<(), ApiError> {
    let supported_tokens = storage::get_supported_tokens();
    
    if !supported_tokens.contains(&token_contract) {
        return Err(ApiError::InvalidArgument);
    }
    
    // In a real implementation, this would interact with the token contract
    // to transfer fees from the user to the fee recipient
    
    Ok(())
}

/// Create entry points for the contract
fn create_entry_points() -> casper_types::EntryPoints {
    let mut entry_points = casper_types::EntryPoints::new();
    
    // Admin functions
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "add_supported_token",
        vec![casper_types::Parameter::new("token_contract", casper_types::CLType::Key)],
        casper_types::CLType::Unit,
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "remove_supported_token",
        vec![casper_types::Parameter::new("token_contract", casper_types::CLType::Key)],
        casper_types::CLType::Unit,
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "add_signer",
        vec![
            casper_types::Parameter::new("public_key", casper_types::CLType::PublicKey),
            casper_types::Parameter::new("weight", casper_types::CLType::U32),
        ],
        casper_types::CLType::Unit,
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "remove_signer",
        vec![casper_types::Parameter::new("account_hash", casper_types::CLType::Key)],
        casper_types::CLType::Unit,
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "pause_contract",
        vec![],
        casper_types::CLType::Unit,
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "unpause_contract",
        vec![],
        casper_types::CLType::Unit,
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    // Query functions
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "get_supported_tokens",
        vec![],
        casper_types::CLType::List(Box::new(casper_types::CLType::Key)),
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "estimate_fees",
        vec![
            casper_types::Parameter::new("transaction_size", casper_types::CLType::U64),
            casper_types::Parameter::new("instruction_count", casper_types::CLType::U32),
            casper_types::Parameter::new("uses_lookup_tables", casper_types::CLType::Bool),
            casper_types::Parameter::new("is_payment_required", casper_types::CLType::Bool),
        ],
        casper_types::CLType::U64,
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    // Transaction processing
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "process_transaction",
        vec![
            casper_types::Parameter::new("user_signature", casper_types::CLType::String),
            casper_types::Parameter::new("transaction_data", casper_types::CLType::List(Box::new(casper_types::CLType::U8))),
            casper_types::Parameter::new("fee_token", casper_types::CLType::Option(Box::new(casper_types::CLType::Key))),
        ],
        casper_types::CLType::Unit,
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    entry_points
}

/// Contract installation entry point
#[no_mangle]
pub extern "C" fn call() {
    let admin: AccountHash = runtime::get_named_arg("admin");
    let fee_recipient: AccountHash = runtime::get_named_arg("fee_recipient");
    let base_fee_rate: u64 = runtime::get_named_arg("base_fee_rate");
    let max_fee_rate: u64 = runtime::get_named_arg("max_fee_rate");
    
    // Initialize the contract
    initialize_contract(admin, fee_recipient, base_fee_rate, max_fee_rate);
    
    // Create entry points
    let entry_points = create_entry_points();
    
    // Install the contract
    let (contract_hash, _version) = casper_storage::new_contract(
        entry_points,
        None,
        Some("vault_facilitator_contract_package".to_string()),
        None,
    );
    
    // Store contract hash
    runtime::put_key(CONTRACT_HASH_KEY, casper_storage::new_uref(contract_hash).into());
    runtime::put_key("contract_hash", contract_hash.into());
}

// Entry point implementations

#[no_mangle]
pub extern "C" fn add_supported_token() {
    let token_contract: ContractHash = runtime::get_named_arg("token_contract");
    do_add_supported_token(token_contract).unwrap_or_revert();
}

#[no_mangle]
pub extern "C" fn remove_supported_token() {
    let token_contract: ContractHash = runtime::get_named_arg("token_contract");
    do_remove_supported_token(token_contract).unwrap_or_revert();
}

#[no_mangle]
pub extern "C" fn add_signer() {
    let public_key: PublicKey = runtime::get_named_arg("public_key");
    let weight: u32 = runtime::get_named_arg("weight");
    do_add_signer(public_key, weight).unwrap_or_revert();
}

#[no_mangle]
pub extern "C" fn remove_signer() {
    let account_hash: AccountHash = runtime::get_named_arg("account_hash");
    do_remove_signer(account_hash).unwrap_or_revert();
}

#[no_mangle]
pub extern "C" fn pause_contract() {
    do_pause_contract().unwrap_or_revert();
}

#[no_mangle]
pub extern "C" fn unpause_contract() {
    do_unpause_contract().unwrap_or_revert();
}

#[no_mangle]
pub extern "C" fn get_supported_tokens() {
    let result = storage::get_supported_tokens();
    runtime::ret(casper_types::CLValue::from_t(result).unwrap_or_revert());
}

#[no_mangle]
pub extern "C" fn estimate_fees() {
    let transaction_size: u64 = runtime::get_named_arg("transaction_size");
    let instruction_count: u32 = runtime::get_named_arg("instruction_count");
    let uses_lookup_tables: bool = runtime::get_named_arg("uses_lookup_tables");
    let is_payment_required: bool = runtime::get_named_arg("is_payment_required");
    
    let result = estimate_transaction_fees(
        transaction_size,
        instruction_count,
        uses_lookup_tables,
        is_payment_required,
    );
    
    runtime::ret(casper_types::CLValue::from_t(result.total_fee).unwrap_or_revert());
}

#[no_mangle]
pub extern "C" fn process_transaction() {
    let user_signature: String = runtime::get_named_arg("user_signature");
    let transaction_data: Vec<u8> = runtime::get_named_arg("transaction_data");
    let fee_token: Option<ContractHash> = runtime::get_named_arg("fee_token");
    
    do_process_transaction(user_signature, transaction_data, fee_token).unwrap_or_revert();
}