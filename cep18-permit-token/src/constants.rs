//! Constants for the CEP-18 Permit Token Contract
//! 
//! This module defines all constants used throughout the contract including:
//! - Dictionary seeds for storage
//! - Named key constants for metadata
//! - Error codes for different failure conditions
//! - Event names for consistent emission
//! - Message prefix for signature compatibility

use casper_types::ApiError;

// Dictionary seeds for storage
pub const BALANCES_DICT: &str = "balances";
pub const ALLOWANCES_DICT: &str = "allowances";
pub const NONCES_DICT: &str = "nonces";

// Named key constants for contract metadata storage
pub const NAME_KEY: &str = "name";
pub const SYMBOL_KEY: &str = "symbol";
pub const DECIMALS_KEY: &str = "decimals";
pub const TOTAL_SUPPLY_KEY: &str = "total_supply";
pub const CONTRACT_HASH_KEY: &str = "contract_hash";

// Error code constants with proper numbering
pub const ERROR_INSUFFICIENT_BALANCE: u16 = 100;
pub const ERROR_INSUFFICIENT_ALLOWANCE: u16 = 101;
pub const ERROR_INVALID_NONCE: u16 = 200;
pub const ERROR_INVALID_SIGNATURE: u16 = 201;
pub const ERROR_EXPIRED: u16 = 202;
pub const ERROR_ZERO_ADDRESS: u16 = 203;

// Event name constants for consistent event emission
pub const TRANSFER_EVENT: &str = "Transfer";
pub const APPROVAL_EVENT: &str = "Approval";
pub const PAYMENT_CLAIMED_EVENT: &str = "PaymentClaimed";

// Casper message prefix constant for signature compatibility
pub const CASPER_MESSAGE_PREFIX: &str = "Casper Message:\nx402-casper";

// Helper functions to create ApiError instances
pub fn insufficient_balance_error() -> ApiError {
    ApiError::User(ERROR_INSUFFICIENT_BALANCE)
}

pub fn insufficient_allowance_error() -> ApiError {
    ApiError::User(ERROR_INSUFFICIENT_ALLOWANCE)
}

pub fn invalid_nonce_error() -> ApiError {
    ApiError::User(ERROR_INVALID_NONCE)
}

pub fn invalid_signature_error() -> ApiError {
    ApiError::User(ERROR_INVALID_SIGNATURE)
}

pub fn expired_error() -> ApiError {
    ApiError::User(ERROR_EXPIRED)
}

pub fn zero_address_error() -> ApiError {
    ApiError::User(ERROR_ZERO_ADDRESS)
}