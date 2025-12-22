#![no_std]
#![no_main]

use casper_contract::contract_api::{runtime, storage};

#[no_mangle]
pub extern "C" fn call() {
    // Store just one simple u64 value - the most basic operation possible
    let value: u64 = 1000;
    let uref = storage::new_uref(value);
    runtime::put_key("value", uref.into());
}