#![no_std]
#![no_main]

use casper_contract::contract_api::{runtime, storage};
use casper_types::{account::AccountHash, U256};

#[no_mangle]
pub extern "C" fn call() {
    // Hardcode everything - no parameters at all
    let decimals: u8 = 18;
    let total_supply = U256::from(1000000u64);

    // Store values
    runtime::put_key("decimals", storage::new_uref(decimals).into());
    runtime::put_key("total_supply", storage::new_uref(total_supply).into());
    
    // Store deployer
    let deployer: AccountHash = runtime::get_caller();
    runtime::put_key("deployer", storage::new_uref(deployer).into());
    
    // Store success flag
    runtime::put_key("deployed", storage::new_uref(true).into());
}