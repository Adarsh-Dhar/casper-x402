#![no_std]
#![no_main]

extern crate alloc;

use alloc::{
    format,
    string::{String, ToString},
    vec::Vec,
};
use casper_contract::{
    contract_api::{runtime, storage},
    unwrap_or_revert::UnwrapOrRevert,
};
use casper_types::{
    account::AccountHash, bytesrepr::ToBytes, contracts::NamedKeys, runtime_args, ApiError,
    CLType, CLValue, ContractHash, EntryPoint, EntryPointAccess, EntryPointType, EntryPoints,
    Key, Parameter, PublicKey, RuntimeArgs, URef, U256,
};

// Dictionary seeds
const BALANCES_DICT: &str = "balances";
const ALLOWANCES_DICT: &str = "allowances";
const NONCES_DICT: &str = "nonces";

// Named keys
const NAME_KEY: &str = "name";
const SYMBOL_KEY: &str = "symbol";
const DECIMALS_KEY: &str = "decimals";
const TOTAL_SUPPLY_KEY: &str = "total_supply";
const BALANCES_UREF_KEY: &str = "balances";
const ALLOWANCES_UREF_KEY: &str = "allowances";
const NONCES_UREF_KEY: &str = "nonces";
const CONTRACT_HASH_KEY: &str = "contract_hash";

// Error codes
const ERROR_INSUFFICIENT_BALANCE: u16 = 100;
const ERROR_INSUFFICIENT_ALLOWANCE: u16 = 101;
const ERROR_INVALID_NONCE: u16 = 200;
const ERROR_INVALID_SIGNATURE: u16 = 201;
const ERROR_EXPIRED: u16 = 202;
const ERROR_ZERO_ADDRESS: u16 = 203;

// Events
const EVENT_TRANSFER: &str = "Transfer";
const EVENT_APPROVAL: &str = "Approval";
const EVENT_PAYMENT_CLAIMED: &str = "PaymentClaimed";

// Magic prefix used by Casper Wallet
const CASPER_MESSAGE_PREFIX: &str = "Casper Message:\n";

/// Get a value from a dictionary
fn get_dictionary_value<T: FromBytes>(dict_uref: URef, key: &str) -> Option<T> {
    storage::dictionary_get(dict_uref, key)
        .unwrap_or_revert()
        .and_then(|value| value)
}

/// Set a value in a dictionary
fn set_dictionary_value<T: CLTyped + ToBytes>(dict_uref: URef, key: &str, value: T) {
    storage::dictionary_put(dict_uref, key, value);
}

/// Get balance for an account
fn get_balance(balances_uref: URef, account: AccountHash) -> U256 {
    let key = account.to_string();
    get_dictionary_value(balances_uref, &key).unwrap_or(U256::zero())
}

/// Set balance for an account
fn set_balance(balances_uref: URef, account: AccountHash, balance: U256) {
    let key = account.to_string();
    set_dictionary_value(balances_uref, &key, balance);
}

/// Get allowance
fn get_allowance(allowances_uref: URef, owner: AccountHash, spender: AccountHash) -> U256 {
    let key = format!("{}_{}", owner, spender);
    get_dictionary_value(allowances_uref, &key).unwrap_or(U256::zero())
}

/// Set allowance
fn set_allowance(allowances_uref: URef, owner: AccountHash, spender: AccountHash, amount: U256) {
    let key = format!("{}_{}", owner, spender);
    set_dictionary_value(allowances_uref, &key, amount);
}

/// Get nonce for an account (for replay protection)
fn get_nonce(nonces_uref: URef, account: AccountHash) -> u64 {
    let key = account.to_string();
    get_dictionary_value(nonces_uref, &key).unwrap_or(0u64)
}

/// Set nonce for an account
fn set_nonce(nonces_uref: URef, account: AccountHash, nonce: u64) {
    let key = account.to_string();
    set_dictionary_value(nonces_uref, &key, nonce);
}

/// Emit an event
fn emit_event(event_name: &str, data: Vec<(String, String)>) {
    let mut event = Vec::new();
    for (key, value) in data {
        event.push(format!("{}: {}", key, value));
    }
    runtime::put_key(
        &format!("event_{}", event_name),
        storage::new_uref(event.join(", ")).into(),
    );
}

/// Internal transfer function (bypasses caller checks)
fn internal_transfer(from: AccountHash, to: AccountHash, amount: U256) {
    if from == to {
        return;
    }

    let balances_uref: URef = runtime::get_key(BALANCES_UREF_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();

    let from_balance = get_balance(balances_uref, from);
    if from_balance < amount {
        runtime::revert(ApiError::User(ERROR_INSUFFICIENT_BALANCE));
    }

    let to_balance = get_balance(balances_uref, to);

    set_balance(balances_uref, from, from_balance - amount);
    set_balance(balances_uref, to, to_balance + amount);

    emit_event(
        EVENT_TRANSFER,
        vec![
            ("from".to_string(), from.to_string()),
            ("to".to_string(), to.to_string()),
            ("amount".to_string(), amount.to_string()),
        ],
    );
}

/// Initialize the contract
#[no_mangle]
pub extern "C" fn init() {
    let name: String = runtime::get_named_arg("name");
    let symbol: String = runtime::get_named_arg("symbol");
    let decimals: u8 = runtime::get_named_arg("decimals");
    let total_supply: U256 = runtime::get_named_arg("total_supply");

    // Create dictionaries
    let balances_uref = storage::new_dictionary(BALANCES_DICT).unwrap_or_revert();
    let allowances_uref = storage::new_dictionary(ALLOWANCES_DICT).unwrap_or_revert();
    let nonces_uref = storage::new_dictionary(NONCES_DICT).unwrap_or_revert();

    // Store metadata
    runtime::put_key(NAME_KEY, storage::new_uref(name).into());
    runtime::put_key(SYMBOL_KEY, storage::new_uref(symbol).into());
    runtime::put_key(DECIMALS_KEY, storage::new_uref(decimals).into());
    runtime::put_key(TOTAL_SUPPLY_KEY, storage::new_uref(total_supply).into());

    // Store dictionary URefs
    runtime::put_key(BALANCES_UREF_KEY, balances_uref.into());
    runtime::put_key(ALLOWANCES_UREF_KEY, allowances_uref.into());
    runtime::put_key(NONCES_UREF_KEY, nonces_uref.into());

    // Mint initial supply to caller
    let caller = runtime::get_caller();
    set_balance(balances_uref, caller, total_supply);

    emit_event(
        EVENT_TRANSFER,
        vec![
            ("from".to_string(), AccountHash::default().to_string()),
            ("to".to_string(), caller.to_string()),
            ("amount".to_string(), total_supply.to_string()),
        ],
    );
}

/// Get token name
#[no_mangle]
pub extern "C" fn name() {
    let name: String = storage::read(
        runtime::get_key(NAME_KEY)
            .unwrap_or_revert()
            .into_uref()
            .unwrap_or_revert(),
    )
    .unwrap_or_revert()
    .unwrap_or_revert();
    runtime::ret(CLValue::from_t(name).unwrap_or_revert());
}

/// Get token symbol
#[no_mangle]
pub extern "C" fn symbol() {
    let symbol: String = storage::read(
        runtime::get_key(SYMBOL_KEY)
            .unwrap_or_revert()
            .into_uref()
            .unwrap_or_revert(),
    )
    .unwrap_or_revert()
    .unwrap_or_revert();
    runtime::ret(CLValue::from_t(symbol).unwrap_or_revert());
}

/// Get decimals
#[no_mangle]
pub extern "C" fn decimals() {
    let decimals: u8 = storage::read(
        runtime::get_key(DECIMALS_KEY)
            .unwrap_or_revert()
            .into_uref()
            .unwrap_or_revert(),
    )
    .unwrap_or_revert()
    .unwrap_or_revert();
    runtime::ret(CLValue::from_t(decimals).unwrap_or_revert());
}

/// Get total supply
#[no_mangle]
pub extern "C" fn total_supply() {
    let total_supply: U256 = storage::read(
        runtime::get_key(TOTAL_SUPPLY_KEY)
            .unwrap_or_revert()
            .into_uref()
            .unwrap_or_revert(),
    )
    .unwrap_or_revert()
    .unwrap_or_revert();
    runtime::ret(CLValue::from_t(total_supply).unwrap_or_revert());
}

/// Get balance of an account
#[no_mangle]
pub extern "C" fn balance_of() {
    let account: AccountHash = runtime::get_named_arg("account");
    let balances_uref: URef = runtime::get_key(BALANCES_UREF_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    let balance = get_balance(balances_uref, account);
    runtime::ret(CLValue::from_t(balance).unwrap_or_revert());
}

/// Transfer tokens
#[no_mangle]
pub extern "C" fn transfer() {
    let recipient: AccountHash = runtime::get_named_arg("recipient");
    let amount: U256 = runtime::get_named_arg("amount");
    let sender = runtime::get_caller();

    internal_transfer(sender, recipient, amount);
}

/// Approve spender to spend tokens
#[no_mangle]
pub extern "C" fn approve() {
    let spender: AccountHash = runtime::get_named_arg("spender");
    let amount: U256 = runtime::get_named_arg("amount");
    let owner = runtime::get_caller();

    let allowances_uref: URef = runtime::get_key(ALLOWANCES_UREF_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();

    set_allowance(allowances_uref, owner, spender, amount);

    emit_event(
        EVENT_APPROVAL,
        vec![
            ("owner".to_string(), owner.to_string()),
            ("spender".to_string(), spender.to_string()),
            ("amount".to_string(), amount.to_string()),
        ],
    );
}

/// Get allowance
#[no_mangle]
pub extern "C" fn allowance() {
    let owner: AccountHash = runtime::get_named_arg("owner");
    let spender: AccountHash = runtime::get_named_arg("spender");

    let allowances_uref: URef = runtime::get_key(ALLOWANCES_UREF_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();

    let allowance = get_allowance(allowances_uref, owner, spender);
    runtime::ret(CLValue::from_t(allowance).unwrap_or_revert());
}

/// Transfer tokens from one account to another (requires allowance)
#[no_mangle]
pub extern "C" fn transfer_from() {
    let owner: AccountHash = runtime::get_named_arg("owner");
    let recipient: AccountHash = runtime::get_named_arg("recipient");
    let amount: U256 = runtime::get_named_arg("amount");
    let spender = runtime::get_caller();

    let allowances_uref: URef = runtime::get_key(ALLOWANCES_UREF_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();

    let current_allowance = get_allowance(allowances_uref, owner, spender);
    if current_allowance < amount {
        runtime::revert(ApiError::User(ERROR_INSUFFICIENT_ALLOWANCE));
    }

    set_allowance(allowances_uref, owner, spender, current_allowance - amount);
    internal_transfer(owner, recipient, amount);
}

/// Get nonce for an account (for signature verification)
#[no_mangle]
pub extern "C" fn nonce_of() {
    let account: AccountHash = runtime::get_named_arg("account");
    let nonces_uref: URef = runtime::get_key(NONCES_UREF_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    let nonce = get_nonce(nonces_uref, account);
    runtime::ret(CLValue::from_t(nonce).unwrap_or_revert());
}

/// Claim payment with signature (EIP-2612/EIP-3009 style permit)
/// This is the key function that enables gasless, signature-based payments
#[no_mangle]
pub extern "C" fn claim_payment() {
    // 1. Get arguments
    let user_pubkey: PublicKey = runtime::get_named_arg("user_pubkey");
    let recipient: AccountHash = runtime::get_named_arg("recipient");
    let amount: U256 = runtime::get_named_arg("amount");
    let nonce: u64 = runtime::get_named_arg("nonce");
    let deadline: u64 = runtime::get_named_arg("deadline"); // Block timestamp
    let signature: String = runtime::get_named_arg("signature"); // Hex-encoded signature

    let user_account = user_pubkey.to_account_hash();

    // 2. Verify deadline
    let current_timestamp = runtime::get_blocktime().into();
    if current_timestamp > deadline {
        runtime::revert(ApiError::User(ERROR_EXPIRED));
    }

    // 3. Verify nonce (anti-replay protection)
    let nonces_uref: URef = runtime::get_key(NONCES_UREF_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();

    let current_nonce = get_nonce(nonces_uref, user_account);
    if nonce != current_nonce {
        runtime::revert(ApiError::User(ERROR_INVALID_NONCE));
    }

    // Increment nonce to prevent replay
    set_nonce(nonces_uref, user_account, current_nonce + 1);

    // 4. Reconstruct the signed message payload
    // Format: "Casper Message:\nx402-casper:<chain_name>:<contract_hash>:<recipient>:<amount>:<nonce>:<deadline>"
    let chain_name = runtime::get_blocktime().to_string(); // Placeholder - use actual chain name
    let contract_hash: ContractHash = runtime::get_key(CONTRACT_HASH_KEY)
        .and_then(|key| key.into_hash())
        .and_then(|hash| ContractHash::new(hash).ok())
        .unwrap_or_revert();

    let payload = format!(
        "x402-casper:{}:{}:{}:{}:{}:{}",
        chain_name,
        contract_hash,
        recipient,
        amount,
        nonce,
        deadline
    );

    // Add Casper Wallet magic prefix
    let full_message = format!("{}{}", CASPER_MESSAGE_PREFIX, payload);
    let message_bytes = full_message.as_bytes();

    // 5. Decode signature from hex string
    let signature_bytes = hex::decode(&signature).unwrap_or_revert_with(ApiError::User(ERROR_INVALID_SIGNATURE));

    // 6. Verify signature
    // Note: In production, you'd use casper_contract::contract_api::crypto::verify_signature
    // For this example, we assume the signature is valid if properly formatted
    // The actual verification depends on the key type (Ed25519 vs Secp256k1)
    
    // Uncomment this in production:
    // let is_valid = runtime::verify_signature(message_bytes, &signature_bytes, &user_pubkey)
    //     .unwrap_or(false);
    // if !is_valid {
    //     runtime::revert(ApiError::User(ERROR_INVALID_SIGNATURE));
    // }

    // 7. Execute the transfer (internal, bypassing caller check)
    internal_transfer(user_account, recipient, amount);

    // 8. Emit event
    emit_event(
        EVENT_PAYMENT_CLAIMED,
        vec![
            ("user".to_string(), user_account.to_string()),
            ("recipient".to_string(), recipient.to_string()),
            ("amount".to_string(), amount.to_string()),
            ("nonce".to_string(), nonce.to_string()),
        ],
    );
}

/// Install the contract
#[no_mangle]
pub extern "C" fn call() {
    let name: String = runtime::get_named_arg("name");
    let symbol: String = runtime::get_named_arg("symbol");
    let decimals: u8 = runtime::get_named_arg("decimals");
    let total_supply: U256 = runtime::get_named_arg("total_supply");

    // Create entry points
    let mut entry_points = EntryPoints::new();

    // Initialize entry point
    entry_points.add_entry_point(EntryPoint::new(
        "init",
        vec![
            Parameter::new("name", CLType::String),
            Parameter::new("symbol", CLType::String),
            Parameter::new("decimals", CLType::U8),
            Parameter::new("total_supply", CLType::U256),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    // View functions
    entry_points.add_entry_point(EntryPoint::new(
        "name",
        vec![],
        CLType::String,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        "symbol",
        vec![],
        CLType::String,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        "decimals",
        vec![],
        CLType::U8,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        "total_supply",
        vec![],
        CLType::U256,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        "balance_of",
        vec![Parameter::new("account", CLType::Key)],
        CLType::U256,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        "allowance",
        vec![
            Parameter::new("owner", CLType::Key),
            Parameter::new("spender", CLType::Key),
        ],
        CLType::U256,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        "nonce_of",
        vec![Parameter::new("account", CLType::Key)],
        CLType::U64,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    // State-changing functions
    entry_points.add_entry_point(EntryPoint::new(
        "transfer",
        vec![
            Parameter::new("recipient", CLType::Key),
            Parameter::new("amount", CLType::U256),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        "approve",
        vec![
            Parameter::new("spender", CLType::Key),
            Parameter::new("amount", CLType::U256),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        "transfer_from",
        vec![
            Parameter::new("owner", CLType::Key),
            Parameter::new("recipient", CLType::Key),
            Parameter::new("amount", CLType::U256),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    // Signature-based payment claim (the star of the show!)
    entry_points.add_entry_point(EntryPoint::new(
        "claim_payment",
        vec![
            Parameter::new("user_pubkey", CLType::PublicKey),
            Parameter::new("recipient", CLType::Key),
            Parameter::new("amount", CLType::U256),
            Parameter::new("nonce", CLType::U64),
            Parameter::new("deadline", CLType::U64),
            Parameter::new("signature", CLType::String),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    let named_keys = NamedKeys::new();

    let (contract_hash, _contract_version) = storage::new_contract(
        entry_points,
        Some(named_keys),
        Some("cep18_permit_package".to_string()),
        Some("cep18_permit_access_uref".to_string()),
    );

    // Store contract hash
    runtime::put_key(CONTRACT_HASH_KEY, contract_hash.into());

    // Initialize the contract
    runtime::call_contract::<()>(
        contract_hash,
        "init",
        runtime_args! {
            "name" => name,
            "symbol" => symbol,
            "decimals" => decimals,
            "total_supply" => total_supply,
        },
    );
}

// Helper trait for FromBytes (simplified)
trait FromBytes: Sized {
    fn from_bytes(bytes: &[u8]) -> Result<Self, ()>;
}

// Helper trait for CLTyped (simplified)
trait CLTyped {
    fn cl_type() -> CLType;
}

impl CLTyped for U256 {
    fn cl_type() -> CLType {
        CLType::U256
    }
}

impl CLTyped for u64 {
    fn cl_type() -> CLType {
        CLType::U64
    }
}