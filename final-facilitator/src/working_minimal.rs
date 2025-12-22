#![no_std]
#![no_main]

use casper_contract::{
    contract_api::{runtime, storage},
    unwrap_or_revert::UnwrapOrRevert,
};
use casper_types::account::AccountHash;

#[no_mangle]
pub extern "C" fn call() {
    // Get initialization parameters - same pattern as successful CEP18
    let admin: AccountHash = runtime::get_named_arg("admin");
    let fee_recipient: AccountHash = runtime::get_named_arg("fee_recipient");
    let base_fee_rate: u64 = runtime::get_named_arg("base_fee_rate");
    let max_fee_rate: u64 = runtime::get_named_arg("max_fee_rate");

    // Store basic facilitator info - exact same pattern as CEP18
    runtime::put_key("admin", storage::new_uref(admin).into());
    runtime::put_key("fee_recipient", storage::new_uref(fee_recipient).into());
    runtime::put_key("base_fee_rate", storage::new_uref(base_fee_rate).into());
    runtime::put_key("max_fee_rate", storage::new_uref(max_fee_rate).into());

    // Create dictionaries - same pattern as CEP18 balances
    let tokens_uref = storage::new_dictionary("tokens").unwrap_or_revert();
    runtime::put_key("tokens", tokens_uref.into());

    // Store deployer - same as CEP18
    let deployer: AccountHash = runtime::get_caller();
    
    // Use simple key like CEP18 does
    storage::dictionary_put(tokens_uref, "deployer", deployer);
    
    // Store deployer address for reference - same as CEP18
    runtime::put_key("deployer", storage::new_uref(deployer).into());
}