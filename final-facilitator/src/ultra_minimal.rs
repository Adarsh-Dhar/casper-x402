#![no_std]
#![no_main]

extern crate alloc;

use alloc::string::{String, ToString};
use casper_contract::{
    contract_api::{runtime, storage},
    unwrap_or_revert::UnwrapOrRevert,
};
use casper_types::account::AccountHash;

#[no_mangle]
pub extern "C" fn call() {
    // Get initialization parameters
    let admin: AccountHash = runtime::get_named_arg("admin");
    let fee_recipient: AccountHash = runtime::get_named_arg("fee_recipient");
    let base_fee_rate: u64 = runtime::get_named_arg("base_fee_rate");
    let max_fee_rate: u64 = runtime::get_named_arg("max_fee_rate");

    // Store basic facilitator info
    runtime::put_key("admin", storage::new_uref(admin).into());
    runtime::put_key("fee_recipient", storage::new_uref(fee_recipient).into());
    runtime::put_key("base_fee_rate", storage::new_uref(base_fee_rate).into());
    runtime::put_key("max_fee_rate", storage::new_uref(max_fee_rate).into());

    // Create supported tokens dictionary
    let tokens_uref = storage::new_dictionary("supported_tokens").unwrap_or_revert();
    runtime::put_key("supported_tokens", tokens_uref.into());

    // Create signers dictionary
    let signers_uref = storage::new_dictionary("signers").unwrap_or_revert();
    runtime::put_key("signers", signers_uref.into());
}