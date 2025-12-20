//! Storage helper functions for the CEP-18 Permit Token Contract
//! 
//! This module provides generic dictionary operations and specific functions
//! for managing balances, allowances, and nonces with proper error handling.

use alloc::{format, string::ToString};
use casper_contract::{
    contract_api::{runtime, storage},
    unwrap_or_revert::UnwrapOrRevert,
};
use casper_types::{
    account::AccountHash, 
    bytesrepr::{FromBytes, ToBytes}, 
    CLTyped,
    URef, 
    U256
};

use crate::constants::*;

/// Generic function to get a value from a dictionary
/// Returns None if the key doesn't exist
pub fn dict_get<T>(dict_seed: &str, key: &str) -> Option<T>
where
    T: FromBytes + Clone + CLTyped,
{
    let dict_uref = get_dictionary_uref(dict_seed);
    storage::dictionary_get::<T>(dict_uref, key)
        .unwrap_or_revert()
}

/// Generic function to set a value in a dictionary
pub fn dict_set<T>(dict_seed: &str, key: &str, value: T)
where
    T: ToBytes + Clone + CLTyped,
{
    let dict_uref = get_dictionary_uref(dict_seed);
    storage::dictionary_put(dict_uref, key, value);
}

/// Get or create a dictionary URef for the given seed
fn get_dictionary_uref(dict_seed: &str) -> URef {
    match runtime::get_key(dict_seed) {
        Some(key) => key.into_uref().unwrap_or_revert(),
        None => {
            let dict_uref = storage::new_dictionary(dict_seed).unwrap_or_revert();
            runtime::put_key(dict_seed, dict_uref.into());
            dict_uref
        }
    }
}

/// Get balance for an account
/// Returns 0 if the account has no balance entry
pub fn get_balance(account: &AccountHash) -> U256 {
    let key = account.to_string();
    dict_get::<U256>(BALANCES_DICT, &key).unwrap_or_else(|| U256::zero())
}

/// Set balance for an account
pub fn set_balance(account: &AccountHash, balance: U256) {
    let key = account.to_string();
    dict_set(BALANCES_DICT, &key, balance);
}

/// Get allowance between owner and spender
/// Returns 0 if no allowance has been set
pub fn get_allowance(owner: &AccountHash, spender: &AccountHash) -> U256 {
    let key = format!("{}_{}", owner.to_string(), spender.to_string());
    dict_get::<U256>(ALLOWANCES_DICT, &key).unwrap_or_else(|| U256::zero())
}

/// Set allowance between owner and spender
pub fn set_allowance(owner: &AccountHash, spender: &AccountHash, amount: U256) {
    let key = format!("{}_{}", owner.to_string(), spender.to_string());
    dict_set(ALLOWANCES_DICT, &key, amount);
}

/// Get nonce for an account
/// Returns 0 if the account has no nonce entry
pub fn get_nonce(account: &AccountHash) -> u64 {
    let key = account.to_string();
    dict_get::<u64>(NONCES_DICT, &key).unwrap_or_else(|| 0u64)
}

/// Set nonce for an account
pub fn set_nonce(account: &AccountHash, nonce: u64) {
    let key = account.to_string();
    dict_set(NONCES_DICT, &key, nonce);
}

/// Increment nonce for an account and return the new value
pub fn increment_nonce(account: &AccountHash) -> u64 {
    let current_nonce = get_nonce(account);
    let new_nonce = current_nonce + 1;
    set_nonce(account, new_nonce);
    new_nonce
}

#[cfg(test)]
mod tests {
    use super::*;
    use casper_types::account::AccountHash;

    // Note: These tests would require a mock Casper runtime environment
    // For now, they serve as documentation of expected behavior
    
    #[test]
    fn test_balance_operations() {
        // This test would verify:
        // 1. get_balance returns 0 for new accounts
        // 2. set_balance stores the correct value
        // 3. get_balance retrieves the stored value
    }

    #[test]
    fn test_allowance_operations() {
        // This test would verify:
        // 1. get_allowance returns 0 for new owner-spender pairs
        // 2. set_allowance stores the correct value
        // 3. get_allowance retrieves the stored value
    }

    #[test]
    fn test_nonce_operations() {
        // This test would verify:
        // 1. get_nonce returns 0 for new accounts
        // 2. set_nonce stores the correct value
        // 3. increment_nonce increases by 1 and returns new value
    }
}