#![no_std]
#![no_main]

use casper_contract::{
    contract_api::{runtime, storage},
    unwrap_or_revert::UnwrapOrRevert,
};
use casper_types::U256;

#[no_mangle]
pub extern "C" fn call() {
    // Store hardcoded values - no parameters at all
    let decimals: u8 = 18;
    let total_supply: U256 = U256::from(1000000u64);

    // Store basic info
    runtime::put_key("decimals", storage::new_uref(decimals).into());
    runtime::put_key("total_supply", storage::new_uref(total_supply).into());

    // Create balances dictionary
    let balances_uref = storage::new_dictionary("balances").unwrap_or_revert();
    runtime::put_key("balances", balances_uref.into());

    // Store deployer address
    let deployer = runtime::get_caller();
    runtime::put_key("deployer", storage::new_uref(deployer).into());
    
    // Give all tokens to deployer
    storage::dictionary_put(balances_uref, "deployer", total_supply);
}