#![no_std]
#![no_main]

use casper_contract::contract_api::{runtime, storage};
use casper_types::U256;

#[no_mangle]
pub extern "C" fn call() {
    // Just store a simple value to test deployment
    let total_supply = U256::from(1000000u64);
    runtime::put_key("total_supply", storage::new_uref(total_supply).into());
}