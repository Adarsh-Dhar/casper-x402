#![no_std]
#![no_main]

use casper_contract::contract_api::{runtime, storage};

#[no_mangle]
pub extern "C" fn call() {
    // Absolutely minimal - just store a simple value
    runtime::put_key("deployed", storage::new_uref(true).into());
}