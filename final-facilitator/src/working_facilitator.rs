#![no_std]
#![no_main]

use casper_contract::contract_api::{runtime, storage};
use casper_types::account::AccountHash;

#[no_mangle]
pub extern "C" fn call() {
    // Get facilitator parameters
    let admin: AccountHash = runtime::get_named_arg("admin");
    let fee_recipient: AccountHash = runtime::get_named_arg("fee_recipient");
    let base_fee_rate: u64 = runtime::get_named_arg("base_fee_rate");
    let max_fee_rate: u64 = runtime::get_named_arg("max_fee_rate");

    // Store facilitator configuration
    let admin_uref = storage::new_uref(admin);
    runtime::put_key("admin", admin_uref.into());
    
    let fee_recipient_uref = storage::new_uref(fee_recipient);
    runtime::put_key("fee_recipient", fee_recipient_uref.into());
    
    let base_fee_uref = storage::new_uref(base_fee_rate);
    runtime::put_key("base_fee_rate", base_fee_uref.into());
    
    let max_fee_uref = storage::new_uref(max_fee_rate);
    runtime::put_key("max_fee_rate", max_fee_uref.into());
    
    // Store deployer
    let deployer = runtime::get_caller();
    let deployer_uref = storage::new_uref(deployer);
    runtime::put_key("deployer", deployer_uref.into());
}