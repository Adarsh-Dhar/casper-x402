#![no_std]
#![no_main]

use casper_contract::{
    contract_api::{runtime, storage},
    unwrap_or_revert::UnwrapOrRevert,
};

#[no_mangle]
pub extern "C" fn call() {
    // Store just one simple value
    let admin_value: u64 = runtime::get_named_arg("base_fee_rate");
    runtime::put_key("fee_rate", storage::new_uref(admin_value).into());
}