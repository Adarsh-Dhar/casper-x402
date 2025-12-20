#![no_std]
#![no_main]

extern crate alloc;

use alloc::string::{String, ToString};
use casper_contract::{
    contract_api::{runtime, storage},
    unwrap_or_revert::UnwrapOrRevert,
};
use casper_types::U256;

#[no_mangle]
pub extern "C" fn call() {
    // Get initialization parameters
    let name: String = runtime::get_named_arg("name");
    let symbol: String = runtime::get_named_arg("symbol");
    let decimals: u8 = runtime::get_named_arg("decimals");
    let total_supply: U256 = runtime::get_named_arg("total_supply");

    // Store basic token info
    runtime::put_key("name", storage::new_uref(name).into());
    runtime::put_key("symbol", storage::new_uref(symbol).into());
    runtime::put_key("decimals", storage::new_uref(decimals).into());
    runtime::put_key("total_supply", storage::new_uref(total_supply).into());

    // Create balances dictionary
    let balances_uref = storage::new_dictionary("balances").unwrap_or_revert();
    runtime::put_key("balances", balances_uref.into());

    // Give all tokens to deployer
    let deployer = runtime::get_caller();
    storage::dictionary_put(balances_uref, &deployer.to_string(), total_supply);
}