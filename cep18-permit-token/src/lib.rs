#![no_std]
#![no_main]

extern crate alloc;

use alloc::{
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
    bytesrepr::FromBytes,
    crypto::{PublicKey, Signature},
    ApiError,
    ContractHash,
    U256,
};

mod constants;
mod storage;

pub use constants::*;
pub use storage::*;

// Event emission functions

/// Generic event emission function with structured data formatting
/// Emits an event using Casper's runtime event system
pub fn emit_event(event_name: &str, data: Vec<(String, String)>) {
    // In Casper, events are typically emitted by storing them in the contract's context
    // For now, we'll use a simple approach that stores event data
    // This can be enhanced later with proper event emission mechanisms
    let event_key = format!("event_{}", event_name);
    let event_data_json = format_event_data(data);
    let event_uref = casper_storage::new_uref(event_data_json);
    runtime::put_key(&event_key, event_uref.into());
}

/// Format event data as a structured string
fn format_event_data(data: Vec<(String, String)>) -> String {
    let mut formatted = String::new();
    for (i, (key, value)) in data.iter().enumerate() {
        if i > 0 {
            formatted.push_str(",");
        }
        formatted.push_str(&format!("{}:{}", key, value));
    }
    formatted
}

/// Emit Transfer event with from, to, and amount parameters
/// Requirements: 5.1 - Transfer events with proper parameters
pub fn emit_transfer_event(from: &AccountHash, to: &AccountHash, amount: &U256) {
    let data = vec![
        ("from".to_string(), format!("{:?}", from)),
        ("to".to_string(), format!("{:?}", to)),
        ("amount".to_string(), amount.to_string()),
    ];
    emit_event(TRANSFER_EVENT, data);
}

/// Emit Approval event with owner, spender, and amount parameters
/// Requirements: 5.2 - Approval events with proper parameters
pub fn emit_approval_event(owner: &AccountHash, spender: &AccountHash, amount: &U256) {
    let data = vec![
        ("owner".to_string(), format!("{:?}", owner)),
        ("spender".to_string(), format!("{:?}", spender)),
        ("amount".to_string(), amount.to_string()),
    ];
    emit_event(APPROVAL_EVENT, data);
}

/// Emit PaymentClaimed event with user, recipient, amount, and nonce parameters
/// Requirements: 5.3 - PaymentClaimed events with proper parameters
pub fn emit_payment_claimed_event(user: &AccountHash, recipient: &AccountHash, amount: &U256, nonce: u64) {
    let data = vec![
        ("user".to_string(), format!("{:?}", user)),
        ("recipient".to_string(), format!("{:?}", recipient)),
        ("amount".to_string(), amount.to_string()),
        ("nonce".to_string(), nonce.to_string()),
    ];
    emit_event(PAYMENT_CLAIMED_EVENT, data);
}

// Core token functionality

/// Initialize the contract with token metadata and mint initial supply to deployer
/// Requirements: 1.1, 1.2, 1.4 - Token initialization with metadata and initial supply
pub fn initialize_contract(name: String, symbol: String, decimals: u8, total_supply: U256) {
    // Store token metadata
    runtime::put_key(NAME_KEY, casper_storage::new_uref(name).into());
    runtime::put_key(SYMBOL_KEY, casper_storage::new_uref(symbol).into());
    runtime::put_key(DECIMALS_KEY, casper_storage::new_uref(decimals).into());
    runtime::put_key(TOTAL_SUPPLY_KEY, casper_storage::new_uref(total_supply).into());
    
    // Mint initial supply to deployer
    let deployer = runtime::get_caller();
    set_balance(&deployer, total_supply);
    
    // Emit transfer event from zero address to deployer
    let zero_account = AccountHash::new([0u8; 32]);
    emit_transfer_event(&zero_account, &deployer, &total_supply);
}

/// Get token name
/// Requirements: 1.2 - Token metadata queries
pub fn get_name() -> String {
    let uref = runtime::get_key(NAME_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    casper_storage::read(uref).unwrap_or_revert().unwrap_or_revert()
}

/// Get token symbol
/// Requirements: 1.2 - Token metadata queries
pub fn get_symbol() -> String {
    let uref = runtime::get_key(SYMBOL_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    casper_storage::read(uref).unwrap_or_revert().unwrap_or_revert()
}

/// Get token decimals
/// Requirements: 1.2 - Token metadata queries
pub fn get_decimals() -> u8 {
    let uref = runtime::get_key(DECIMALS_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    casper_storage::read(uref).unwrap_or_revert().unwrap_or_revert()
}

/// Get total supply
/// Requirements: 1.2 - Token metadata queries
pub fn get_total_supply() -> U256 {
    let uref = runtime::get_key(TOTAL_SUPPLY_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    casper_storage::read(uref).unwrap_or_revert().unwrap_or_revert()
}

/// Get balance of an account
/// Requirements: 1.3 - Balance queries with proper account hash handling
pub fn get_balance_of(account: &AccountHash) -> U256 {
    get_balance(account)
}

/// Internal transfer function with balance validation and updates
/// Requirements: 1.5, 2.1 - Transfer with balance validation and updates
pub fn internal_transfer(from: &AccountHash, to: &AccountHash, amount: &U256) -> Result<(), ApiError> {
    // Check if from and to are the same (no-op)
    if from == to {
        return Ok(());
    }
    
    // Get current balances
    let from_balance = get_balance(from);
    let to_balance = get_balance(to);
    
    // Check sufficient balance
    if from_balance < *amount {
        return Err(insufficient_balance_error());
    }
    
    // Update balances
    let new_from_balance = from_balance - amount;
    let new_to_balance = to_balance + amount;
    
    set_balance(from, new_from_balance);
    set_balance(to, new_to_balance);
    
    // Emit transfer event
    emit_transfer_event(from, to, amount);
    
    Ok(())
}

// Standard CEP-18 transfer operations

/// Transfer tokens from caller to recipient
/// Requirements: 2.1 - Transfer with caller validation and balance checks
pub fn do_transfer(to: &AccountHash, amount: &U256) -> Result<(), ApiError> {
    let from = runtime::get_caller();
    internal_transfer(&from, to, amount)
}

/// Approve spender to spend tokens on behalf of caller
/// Requirements: 2.2 - Allowance setting with event emission
pub fn do_approve(spender: &AccountHash, amount: &U256) -> Result<(), ApiError> {
    let owner = runtime::get_caller();
    
    // Set allowance
    set_allowance(&owner, spender, *amount);
    
    // Emit approval event
    emit_approval_event(&owner, spender, amount);
    
    Ok(())
}

/// Get allowance between owner and spender
/// Requirements: 2.3 - Allowance query for owner-spender pairs
pub fn get_allowance_amount(owner: &AccountHash, spender: &AccountHash) -> U256 {
    get_allowance(owner, spender)
}

/// Transfer tokens from owner to recipient using allowance
/// Requirements: 2.4, 2.5 - Transfer_from with allowance validation and deduction
pub fn do_transfer_from(owner: &AccountHash, to: &AccountHash, amount: &U256) -> Result<(), ApiError> {
    let spender = runtime::get_caller();
    
    // Get current allowance
    let current_allowance = get_allowance(owner, &spender);
    
    // Check sufficient allowance
    if current_allowance < *amount {
        return Err(insufficient_allowance_error());
    }
    
    // Execute the transfer
    internal_transfer(owner, to, amount)?;
    
    // Deduct from allowance
    let new_allowance = current_allowance - amount;
    set_allowance(owner, &spender, new_allowance);
    
    // Emit approval event for the updated allowance
    emit_approval_event(owner, &spender, &new_allowance);
    
    Ok(())
}

// Signature verification and message construction

/// Construct a standardized message for signature verification
/// Requirements: 3.1 - Standardized message format with chain name, contract hash, recipient, amount, nonce, and deadline
pub fn construct_message(
    chain_name: &str,
    contract_hash: &ContractHash,
    recipient: &AccountHash,
    amount: &U256,
    nonce: u64,
    deadline: u64,
) -> String {
    format!(
        "{}:{}:{}:{}:{}:{}:{}",
        CASPER_MESSAGE_PREFIX,
        chain_name,
        contract_hash,
        recipient,
        amount,
        nonce,
        deadline
    )
}

/// Verify a signature against a reconstructed message using the provided public key
/// Requirements: 3.2 - Signature verification against reconstructed message using public key
pub fn verify_signature(
    message: &str,
    signature_hex: &str,
    public_key: &PublicKey,
) -> Result<bool, ApiError> {
    // Decode hex signature
    let signature_bytes = hex::decode(signature_hex)
        .map_err(|_| invalid_signature_error())?;
    
    // Create signature from bytes
    let signature = Signature::from_bytes(&signature_bytes)
        .map_err(|_| invalid_signature_error())?;
    
    // Verify signature
    let message_bytes = message.as_bytes();
    casper_types::crypto::verify(message_bytes, &signature.0, public_key)
        .map_err(|_| invalid_signature_error())?;
    
    Ok(true)
}

/// Validate that the payment deadline has not expired
/// Requirements: 3.5 - Deadline validation with block timestamp comparison
pub fn validate_deadline(deadline: u64) -> Result<(), ApiError> {
    let current_timestamp: u64 = runtime::get_blocktime().into();
    
    if current_timestamp > deadline {
        return Err(expired_error());
    }
    
    Ok(())
}

/// Get the current contract hash for signature verification
/// Requirements: 6.3 - Contract hash storage for signature verification
pub fn get_contract_hash() -> ContractHash {
    let uref = runtime::get_key(CONTRACT_HASH_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    casper_storage::read(uref).unwrap_or_revert().unwrap_or_revert()
}

/// Get nonce for an account (public interface)
/// Requirements: 4.1 - Nonce query for account nonce retrieval
pub fn get_nonce_of(account: &AccountHash) -> u64 {
    get_nonce(account)
}

/// Validate nonce for signature-based payments
/// Requirements: 4.2, 4.4 - Nonce validation for replay protection
pub fn validate_nonce(account: &AccountHash, provided_nonce: u64) -> Result<(), ApiError> {
    let current_nonce = get_nonce(account);
    
    if provided_nonce != current_nonce {
        return Err(invalid_nonce_error());
    }
    
    Ok(())
}

/// Atomically increment nonce after successful payment
/// Requirements: 4.3 - Atomic nonce increment after successful payments
pub fn increment_account_nonce(account: &AccountHash) -> u64 {
    increment_nonce(account)
}

/// Comprehensive replay attack prevention logic
/// Validates nonce and increments it atomically to prevent replay attacks
/// Requirements: 4.5 - Comprehensive replay attack prevention
pub fn process_nonce_for_payment(account: &AccountHash, provided_nonce: u64) -> Result<(), ApiError> {
    // First validate the nonce
    validate_nonce(account, provided_nonce)?;
    
    // If validation passes, increment the nonce atomically
    increment_account_nonce(account);
    
    Ok(())
}

/// Claim payment using signature-based authorization (permit functionality)
/// Requirements: 3.2, 3.3, 3.4, 3.5, 5.3 - Complete permit functionality with signature verification
pub fn do_claim_payment(
    user_pubkey: PublicKey,
    recipient: AccountHash,
    amount: U256,
    nonce: u64,
    deadline: u64,
    signature: String,
) -> Result<(), ApiError> {
    // Validate deadline first
    validate_deadline(deadline)?;
    
    // Get user account hash from public key
    let user_account = AccountHash::from(&user_pubkey);
    
    // Process nonce (validate and increment atomically)
    process_nonce_for_payment(&user_account, nonce)?;
    
    // Get contract hash and chain name for message construction
    let contract_hash = get_contract_hash();
    let chain_name = "casper"; // This could be made configurable
    
    // Construct the message that should have been signed
    let message = construct_message(
        chain_name,
        &contract_hash,
        &recipient,
        &amount,
        nonce,
        deadline,
    );
    
    // Verify the signature
    verify_signature(&message, &signature, &user_pubkey)?;
    
    // Execute the transfer
    internal_transfer(&user_account, &recipient, &amount)?;
    
    // Emit PaymentClaimed event
    emit_payment_claimed_event(&user_account, &recipient, &amount, nonce);
    
    Ok(())
}

/// Create all required entry points for the contract
/// Requirements: 6.1, 6.4 - Create all required entry points with proper parameter types
fn create_entry_points() -> casper_types::EntryPoints {
    let mut entry_points = casper_types::EntryPoints::new();
    
    // CEP-18 standard entry points
    
    // Token metadata query entry points
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "name",
        vec![],
        casper_types::CLType::String,
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "symbol",
        vec![],
        casper_types::CLType::String,
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "decimals",
        vec![],
        casper_types::CLType::U8,
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "total_supply",
        vec![],
        casper_types::CLType::U256,
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    // Balance and allowance query entry points
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "balance_of",
        vec![casper_types::Parameter::new("account", casper_types::CLType::Key)],
        casper_types::CLType::U256,
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "allowance",
        vec![
            casper_types::Parameter::new("owner", casper_types::CLType::Key),
            casper_types::Parameter::new("spender", casper_types::CLType::Key),
        ],
        casper_types::CLType::U256,
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    // Token transfer entry points
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "transfer",
        vec![
            casper_types::Parameter::new("to", casper_types::CLType::Key),
            casper_types::Parameter::new("amount", casper_types::CLType::U256),
        ],
        casper_types::CLType::Unit,
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "approve",
        vec![
            casper_types::Parameter::new("spender", casper_types::CLType::Key),
            casper_types::Parameter::new("amount", casper_types::CLType::U256),
        ],
        casper_types::CLType::Unit,
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "transfer_from",
        vec![
            casper_types::Parameter::new("owner", casper_types::CLType::Key),
            casper_types::Parameter::new("to", casper_types::CLType::Key),
            casper_types::Parameter::new("amount", casper_types::CLType::U256),
        ],
        casper_types::CLType::Unit,
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    // Permit functionality entry points
    
    // Nonce management entry point
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "nonce_of",
        vec![casper_types::Parameter::new("account", casper_types::CLType::Key)],
        casper_types::CLType::U64,
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    // Signature-based payment entry point
    entry_points.add_entry_point(casper_types::EntryPoint::new(
        "claim_payment",
        vec![
            casper_types::Parameter::new("user_pubkey", casper_types::CLType::PublicKey),
            casper_types::Parameter::new("recipient", casper_types::CLType::Key),
            casper_types::Parameter::new("amount", casper_types::CLType::U256),
            casper_types::Parameter::new("nonce", casper_types::CLType::U64),
            casper_types::Parameter::new("deadline", casper_types::CLType::U64),
            casper_types::Parameter::new("signature", casper_types::CLType::String),
        ],
        casper_types::CLType::Unit,
        casper_types::EntryPointAccess::Public,
        casper_types::EntryPointType::Contract,
    ));
    
    entry_points
}

/// Entry point for contract installation
/// Requirements: 6.1, 6.4, 6.5 - Contract installation with proper entry points and initialization
#[no_mangle]
pub extern "C" fn call() {
    // Get deployment parameters
    let name: String = runtime::get_named_arg("name");
    let symbol: String = runtime::get_named_arg("symbol");
    let decimals: u8 = runtime::get_named_arg("decimals");
    let total_supply: U256 = runtime::get_named_arg("total_supply");
    
    // Initialize the contract with deployment parameters
    initialize_contract(name, symbol, decimals, total_supply);
    
    // Create all required entry points with proper parameter types
    let entry_points = create_entry_points();
    
    // Store the contract with entry points and package name
    let (contract_hash, _version) = casper_storage::new_contract(
        entry_points,
        None,
        Some("cep18_permit_token_contract_package".to_string()),
        None,
    );
    
    // Store contract hash for signature verification (Requirements: 6.3)
    runtime::put_key(CONTRACT_HASH_KEY, casper_storage::new_uref(contract_hash).into());
    
    // Store contract hash as a named key for external access
    runtime::put_key("contract_hash", contract_hash.into());
}

/// Entry point for token name query
#[no_mangle]
pub extern "C" fn name() {
    let result = get_name();
    runtime::ret(casper_types::CLValue::from_t(result).unwrap_or_revert());
}

/// Entry point for token symbol query
#[no_mangle]
pub extern "C" fn symbol() {
    let result = get_symbol();
    runtime::ret(casper_types::CLValue::from_t(result).unwrap_or_revert());
}

/// Entry point for token decimals query
#[no_mangle]
pub extern "C" fn decimals() {
    let result = get_decimals();
    runtime::ret(casper_types::CLValue::from_t(result).unwrap_or_revert());
}

/// Entry point for total supply query
#[no_mangle]
pub extern "C" fn total_supply() {
    let result = get_total_supply();
    runtime::ret(casper_types::CLValue::from_t(result).unwrap_or_revert());
}

/// Entry point for balance query
#[no_mangle]
pub extern "C" fn balance_of() {
    let account: AccountHash = runtime::get_named_arg("account");
    let result = get_balance_of(&account);
    runtime::ret(casper_types::CLValue::from_t(result).unwrap_or_revert());
}

/// Entry point for token transfer
#[no_mangle]
pub extern "C" fn transfer() {
    let to: AccountHash = runtime::get_named_arg("to");
    let amount: U256 = runtime::get_named_arg("amount");
    
    do_transfer(&to, &amount).unwrap_or_revert();
}

/// Entry point for allowance approval
#[no_mangle]
pub extern "C" fn approve() {
    let spender: AccountHash = runtime::get_named_arg("spender");
    let amount: U256 = runtime::get_named_arg("amount");
    
    do_approve(&spender, &amount).unwrap_or_revert();
}

/// Entry point for allowance query
#[no_mangle]
pub extern "C" fn allowance() {
    let owner: AccountHash = runtime::get_named_arg("owner");
    let spender: AccountHash = runtime::get_named_arg("spender");
    
    let result = get_allowance_amount(&owner, &spender);
    runtime::ret(casper_types::CLValue::from_t(result).unwrap_or_revert());
}

/// Entry point for transfer from allowance
#[no_mangle]
pub extern "C" fn transfer_from() {
    let owner: AccountHash = runtime::get_named_arg("owner");
    let to: AccountHash = runtime::get_named_arg("to");
    let amount: U256 = runtime::get_named_arg("amount");
    
    do_transfer_from(&owner, &to, &amount).unwrap_or_revert();
}

/// Entry point for nonce query
#[no_mangle]
pub extern "C" fn nonce_of() {
    let account: AccountHash = runtime::get_named_arg("account");
    let result = get_nonce_of(&account);
    runtime::ret(casper_types::CLValue::from_t(result).unwrap_or_revert());
}

/// Entry point for signature-based payment claiming (permit functionality)
/// Requirements: 3.2, 3.3, 3.4, 3.5, 5.3 - Complete permit functionality with signature verification
#[no_mangle]
pub extern "C" fn claim_payment() {
    let user_pubkey: PublicKey = runtime::get_named_arg("user_pubkey");
    let recipient: AccountHash = runtime::get_named_arg("recipient");
    let amount: U256 = runtime::get_named_arg("amount");
    let nonce: u64 = runtime::get_named_arg("nonce");
    let deadline: u64 = runtime::get_named_arg("deadline");
    let signature: String = runtime::get_named_arg("signature");
    
    do_claim_payment(user_pubkey, recipient, amount, nonce, deadline, signature).unwrap_or_revert();
}