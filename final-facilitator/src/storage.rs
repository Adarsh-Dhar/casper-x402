use alloc::vec::Vec;
use casper_contract::{
    contract_api::{runtime, storage as casper_storage},
    unwrap_or_revert::UnwrapOrRevert,
};
use casper_types::{ContractHash, account::AccountHash};

use crate::constants::*;
use crate::types::SignerInfo;

/// Get supported tokens list
pub fn get_supported_tokens() -> Vec<ContractHash> {
    let uref = runtime::get_key(SUPPORTED_TOKENS_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    casper_storage::read(uref).unwrap_or_revert().unwrap_or_revert()
}

/// Set supported tokens list
pub fn set_supported_tokens(tokens: Vec<ContractHash>) {
    let uref = runtime::get_key(SUPPORTED_TOKENS_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    casper_storage::write(uref, tokens);
}

/// Get signer pool
pub fn get_signer_pool() -> Vec<SignerInfo> {
    let uref = runtime::get_key(SIGNER_POOL_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    casper_storage::read(uref).unwrap_or_revert().unwrap_or_revert()
}

/// Set signer pool
pub fn set_signer_pool(signers: Vec<SignerInfo>) {
    let uref = runtime::get_key(SIGNER_POOL_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    casper_storage::write(uref, signers);
}

/// Get base fee rate
pub fn get_base_fee_rate() -> u64 {
    let uref = runtime::get_key(BASE_FEE_RATE_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    casper_storage::read(uref).unwrap_or_revert().unwrap_or_revert()
}

/// Set base fee rate
pub fn set_base_fee_rate(rate: u64) {
    let uref = runtime::get_key(BASE_FEE_RATE_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    casper_storage::write(uref, rate);
}

/// Get max fee rate
pub fn get_max_fee_rate() -> u64 {
    let uref = runtime::get_key(MAX_FEE_RATE_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    casper_storage::read(uref).unwrap_or_revert().unwrap_or_revert()
}

/// Check if contract is paused
pub fn is_paused() -> bool {
    let uref = runtime::get_key(IS_PAUSED_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    casper_storage::read(uref).unwrap_or_revert().unwrap_or_revert()
}

/// Set paused state
pub fn set_paused(paused: bool) {
    let uref = runtime::get_key(IS_PAUSED_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    casper_storage::write(uref, paused);
}

/// Get fee recipient
pub fn get_fee_recipient() -> AccountHash {
    let uref = runtime::get_key(FEE_RECIPIENT_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    casper_storage::read(uref).unwrap_or_revert().unwrap_or_revert()
}