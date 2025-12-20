#![cfg_attr(not(test), no_std)]
#![cfg_attr(not(test), no_main)]

extern crate alloc;

use casper_contract::{
    contract_api::{runtime, storage},
};
use casper_types::{Key, URef};

// Global allocator for no_std
extern crate wee_alloc;
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// Panic handler for no_std
#[cfg(not(test))]
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    core::arch::wasm32::unreachable()
}

const KEY_NAME: &str = "my_value";

#[no_mangle]
pub extern "C" fn call() {
    // Create a new URef to store a value
    let value: u64 = 0;
    let value_ref: URef = storage::new_uref(value);
    
    // Store the URef in the named keys
    runtime::put_key(KEY_NAME, Key::from(value_ref));
}

#[no_mangle]
pub extern "C" fn init() {
    call();
}