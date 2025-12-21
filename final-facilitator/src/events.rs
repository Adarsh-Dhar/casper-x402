use alloc::{format, string::{String, ToString}, vec, vec::Vec};
use casper_contract::{
    contract_api::{runtime, storage as casper_storage},
};

use crate::constants::FACILITATOR_EVENT_PREFIX;

/// Emit a facilitator event with structured data
pub fn emit_facilitator_event(event_name: &str, data: Vec<(String, String)>) {
    let event_key = format!("{}_{}", FACILITATOR_EVENT_PREFIX, event_name);
    let event_data = format_event_data(data);
    let event_uref = casper_storage::new_uref(event_data);
    runtime::put_key(&event_key, event_uref.into());
}

/// Format event data as a structured string
fn format_event_data(data: Vec<(String, String)>) -> String {
    let mut formatted = String::new();
    for (i, (key, value)) in data.iter().enumerate() {
        if i > 0 {
            formatted.push_str(",");
        }
        formatted.push_str(&format!("{}:{}", key, value));
    }
    formatted
}

/// Emit token added event
pub fn emit_token_added_event(token_contract: &casper_types::ContractHash) {
    emit_facilitator_event("TokenAdded", vec![
        ("token".to_string(), format!("{:?}", token_contract)),
        ("timestamp".to_string(), format!("{}", u64::from(runtime::get_blocktime()))),
    ]);
}

/// Emit token removed event
pub fn emit_token_removed_event(token_contract: &casper_types::ContractHash) {
    emit_facilitator_event("TokenRemoved", vec![
        ("token".to_string(), format!("{:?}", token_contract)),
        ("timestamp".to_string(), format!("{}", u64::from(runtime::get_blocktime()))),
    ]);
}

/// Emit signer added event
pub fn emit_signer_added_event(account_hash: &casper_types::account::AccountHash, weight: u32) {
    emit_facilitator_event("SignerAdded", vec![
        ("signer".to_string(), format!("{:?}", account_hash)),
        ("weight".to_string(), weight.to_string()),
        ("timestamp".to_string(), format!("{}", u64::from(runtime::get_blocktime()))),
    ]);
}

/// Emit signer removed event
pub fn emit_signer_removed_event(account_hash: &casper_types::account::AccountHash) {
    emit_facilitator_event("SignerRemoved", vec![
        ("signer".to_string(), format!("{:?}", account_hash)),
        ("timestamp".to_string(), format!("{}", u64::from(runtime::get_blocktime()))),
    ]);
}

/// Emit fee calculated event
pub fn emit_fee_calculated_event(
    transaction_size: u64,
    total_fee: u64,
    fee_breakdown: &crate::types::FeeCalculation,
) {
    emit_facilitator_event("FeeCalculated", vec![
        ("transaction_size".to_string(), transaction_size.to_string()),
        ("total_fee".to_string(), total_fee.to_string()),
        ("base_fee".to_string(), fee_breakdown.base_fee.to_string()),
        ("instruction_fee".to_string(), fee_breakdown.instruction_fee.to_string()),
        ("lookup_table_fee".to_string(), fee_breakdown.lookup_table_fee.to_string()),
        ("kora_signature_fee".to_string(), fee_breakdown.kora_signature_fee.to_string()),
        ("payment_instruction_fee".to_string(), fee_breakdown.payment_instruction_fee.to_string()),
        ("timestamp".to_string(), format!("{}", u64::from(runtime::get_blocktime()))),
    ]);
}

/// Emit transaction processed event
pub fn emit_transaction_processed_event(
    transaction_size: u64,
    fee_paid: u64,
    fee_token: Option<&casper_types::ContractHash>,
) {
    let mut data = vec![
        ("transaction_size".to_string(), transaction_size.to_string()),
        ("fee_paid".to_string(), fee_paid.to_string()),
        ("timestamp".to_string(), format!("{}", u64::from(runtime::get_blocktime()))),
    ];
    
    if let Some(token) = fee_token {
        data.push(("fee_token".to_string(), format!("{:?}", token)));
    }
    
    emit_facilitator_event("TransactionProcessed", data);
}

/// Emit contract paused event
pub fn emit_contract_paused_event() {
    emit_facilitator_event("ContractPaused", vec![
        ("timestamp".to_string(), format!("{}", u64::from(runtime::get_blocktime()))),
    ]);
}

/// Emit contract unpaused event
pub fn emit_contract_unpaused_event() {
    emit_facilitator_event("ContractUnpaused", vec![
        ("timestamp".to_string(), format!("{}", u64::from(runtime::get_blocktime()))),
    ]);
}