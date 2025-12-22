#![no_std]
#![no_main]

use casper_contract::{
    contract_api::{runtime, storage},
    unwrap_or_revert::UnwrapOrRevert,
};
use casper_types::{account::AccountHash, U256};

#[no_mangle]
pub extern "C" fn call() {
    // Try to get parameters with defaults if not provided
    let decimals: u8 = runtime::get_named_arg_with_user_errors("decimals", 100, 101)
        .unwrap_or(18u8);
    let total_supply: U256 = runtime::get_named_arg_with_user_errors("total_supply", 102, 103)
        .unwrap_or(U256::from(1000000u64));

    // Store basic token info
    runtime::put_key("decimals", storage::new_uref(decimals).into());
    runtime::put_key("total_supply", storage::new_uref(total_supply).into());

    // Create balances dictionary
    let balances_uref = storage::new_dictionary("balances").unwrap_or_revert();
    runtime::put_key("balances", balances_uref.into());

    // Give all tokens to deployer
    let deployer: AccountHash = runtime::get_caller();
    
    // Use "deployer" as the key
    storage::dictionary_put(balances_uref, "deployer", total_supply);
    
    // Store deployer address for reference
    runtime::put_key("deployer", storage::new_uref(deployer).into());
}