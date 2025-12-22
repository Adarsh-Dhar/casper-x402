#![no_std]
#![no_main]

extern crate alloc;
use alloc::vec::Vec;
use alloc::string::ToString;

use casper_contract::{
    contract_api::{runtime, storage},
    unwrap_or_revert::UnwrapOrRevert,
};
use casper_types::{
    contracts::{EntryPoint, EntryPointAccess, EntryPointType, EntryPoints},
    CLType, CLValue, account::AccountHash,
};

const ADMIN_KEY: &str = "admin";
const FEE_RECIPIENT_KEY: &str = "fee_recipient";
const BASE_FEE_RATE_KEY: &str = "base_fee_rate";
const MAX_FEE_RATE_KEY: &str = "max_fee_rate";

#[no_mangle]
pub extern "C" fn call() {
    let admin: AccountHash = runtime::get_named_arg("admin");
    let fee_recipient: AccountHash = runtime::get_named_arg("fee_recipient");
    let base_fee_rate: u64 = runtime::get_named_arg("base_fee_rate");
    let max_fee_rate: u64 = runtime::get_named_arg("max_fee_rate");

    // Store initial values
    runtime::put_key(ADMIN_KEY, storage::new_uref(admin).into());
    runtime::put_key(FEE_RECIPIENT_KEY, storage::new_uref(fee_recipient).into());
    runtime::put_key(BASE_FEE_RATE_KEY, storage::new_uref(base_fee_rate).into());
    runtime::put_key(MAX_FEE_RATE_KEY, storage::new_uref(max_fee_rate).into());

    // Create minimal entry points
    let mut entry_points = EntryPoints::new();
    
    entry_points.add_entry_point(EntryPoint::new(
        "get_admin",
        Vec::new(),
        CLType::Key,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    // Install the contract
    let (contract_hash, _version) = storage::new_contract(
        entry_points,
        None,
        None,
        None,
    );

    runtime::put_key("casper_vault_facilitator", contract_hash.into());
}

#[no_mangle]
pub extern "C" fn get_admin() {
    let admin_uref = runtime::get_key(ADMIN_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    let admin: AccountHash = storage::read(admin_uref).unwrap_or_revert().unwrap_or_revert();
    runtime::ret(CLValue::from_t(admin).unwrap_or_revert());
}