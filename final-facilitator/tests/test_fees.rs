mod common;

use casper_types::{runtime_args, ContractHash};
use common::*;

#[test]
fn test_estimate_fees_basic() {
    let mut context = TestContext::new();

    // Test basic fee estimation
    let transaction_size = 1000u64;
    let instruction_count = 5u32;
    let uses_lookup_tables = false;
    let is_payment_required = false;

    let fee_request = casper_engine_test_support::ExecuteRequestBuilder::contract_call_by_hash(
        context.admin_account,
        context.contract_hash,
        "estimate_fees",
        runtime_args! {
            "transaction_size" => transaction_size,
            "instruction_count" => instruction_count,
            "uses_lookup_tables" => uses_lookup_tables,
            "is_payment_required" => is_payment_required,
        },
    )
    .build();

    context.builder.exec(fee_request).expect_success().commit();

    // Get the result from the last execution
    let result = context.builder.get_exec_result(0).expect("should have result");
    let fee = result[0]
        .as_success()
        .expect("should be success")
        .effect()
        .transforms
        .iter()
        .find_map(|(_, transform)| {
            if let casper_types::Transform::Write(casper_types::StoredValue::CLValue(cl_value)) = transform {
                cl_value.clone().into_t::<u64>().ok()
            } else {
                None
            }
        })
        .expect("should find fee result");

    assert!(fee > 0, "Fee should be greater than 0");
}

#[test]
fn test_estimate_fees_with_payment() {
    let mut context = TestContext::new();

    // Test fee estimation with payment required
    let transaction_size = 1000u64;
    let instruction_count = 5u32;
    let uses_lookup_tables = false;
    let is_payment_required = true;

    let fee_request = casper_engine_test_support::ExecuteRequestBuilder::contract_call_by_hash(
        context.admin_account,
        context.contract_hash,
        "estimate_fees",
        runtime_args! {
            "transaction_size" => transaction_size,
            "instruction_count" => instruction_count,
            "uses_lookup_tables" => uses_lookup_tables,
            "is_payment_required" => is_payment_required,
        },
    )
    .build();

    context.builder.exec(fee_request).expect_success().commit();

    // Get the result
    let result = context.builder.get_exec_result(0).expect("should have result");
    let fee_with_payment = result[0]
        .as_success()
        .expect("should be success")
        .effect()
        .transforms
        .iter()
        .find_map(|(_, transform)| {
            if let casper_types::Transform::Write(casper_types::StoredValue::CLValue(cl_value)) = transform {
                cl_value.clone().into_t::<u64>().ok()
            } else {
                None
            }
        })
        .expect("should find fee result");

    // Now test without payment
    let fee_request_no_payment = casper_engine_test_support::ExecuteRequestBuilder::contract_call_by_hash(
        context.admin_account,
        context.contract_hash,
        "estimate_fees",
        runtime_args! {
            "transaction_size" => transaction_size,
            "instruction_count" => instruction_count,
            "uses_lookup_tables" => uses_lookup_tables,
            "is_payment_required" => false,
        },
    )
    .build();

    context.builder.exec(fee_request_no_payment).expect_success().commit();

    let result_no_payment = context.builder.get_exec_result(1).expect("should have result");
    let fee_without_payment = result_no_payment[0]
        .as_success()
        .expect("should be success")
        .effect()
        .transforms
        .iter()
        .find_map(|(_, transform)| {
            if let casper_types::Transform::Write(casper_types::StoredValue::CLValue(cl_value)) = transform {
                cl_value.clone().into_t::<u64>().ok()
            } else {
                None
            }
        })
        .expect("should find fee result");

    // Fee with payment should be higher
    assert!(fee_with_payment >= fee_without_payment, 
           "Fee with payment should be >= fee without payment");
}

#[test]
fn test_estimate_fees_scaling() {
    let mut context = TestContext::new();

    // Test that fees scale with transaction size
    let base_size = 500u64;
    let large_size = 2000u64;
    let instruction_count = 3u32;

    // Get fee for base size
    let fee_request_base = casper_engine_test_support::ExecuteRequestBuilder::contract_call_by_hash(
        context.admin_account,
        context.contract_hash,
        "estimate_fees",
        runtime_args! {
            "transaction_size" => base_size,
            "instruction_count" => instruction_count,
            "uses_lookup_tables" => false,
            "is_payment_required" => false,
        },
    )
    .build();

    context.builder.exec(fee_request_base).expect_success().commit();

    let result_base = context.builder.get_exec_result(0).expect("should have result");
    let fee_base = result_base[0]
        .as_success()
        .expect("should be success")
        .effect()
        .transforms
        .iter()
        .find_map(|(_, transform)| {
            if let casper_types::Transform::Write(casper_types::StoredValue::CLValue(cl_value)) = transform {
                cl_value.clone().into_t::<u64>().ok()
            } else {
                None
            }
        })
        .expect("should find fee result");

    // Get fee for large size
    let fee_request_large = casper_engine_test_support::ExecuteRequestBuilder::contract_call_by_hash(
        context.admin_account,
        context.contract_hash,
        "estimate_fees",
        runtime_args! {
            "transaction_size" => large_size,
            "instruction_count" => instruction_count,
            "uses_lookup_tables" => false,
            "is_payment_required" => false,
        },
    )
    .build();

    context.builder.exec(fee_request_large).expect_success().commit();

    let result_large = context.builder.get_exec_result(1).expect("should have result");
    let fee_large = result_large[0]
        .as_success()
        .expect("should be success")
        .effect()
        .transforms
        .iter()
        .find_map(|(_, transform)| {
            if let casper_types::Transform::Write(casper_types::StoredValue::CLValue(cl_value)) = transform {
                cl_value.clone().into_t::<u64>().ok()
            } else {
                None
            }
        })
        .expect("should find fee result");

    // Larger transaction should have higher fee
    assert!(fee_large > fee_base, "Larger transaction should have higher fee");
}

#[test]
fn test_estimate_fees_with_lookup_tables() {
    let mut context = TestContext::new();

    let transaction_size = 1000u64;
    let instruction_count = 5u32;

    // Test without lookup tables
    let fee_request_no_lut = casper_engine_test_support::ExecuteRequestBuilder::contract_call_by_hash(
        context.admin_account,
        context.contract_hash,
        "estimate_fees",
        runtime_args! {
            "transaction_size" => transaction_size,
            "instruction_count" => instruction_count,
            "uses_lookup_tables" => false,
            "is_payment_required" => false,
        },
    )
    .build();

    context.builder.exec(fee_request_no_lut).expect_success().commit();

    // Test with lookup tables
    let fee_request_with_lut = casper_engine_test_support::ExecuteRequestBuilder::contract_call_by_hash(
        context.admin_account,
        context.contract_hash,
        "estimate_fees",
        runtime_args! {
            "transaction_size" => transaction_size,
            "instruction_count" => instruction_count,
            "uses_lookup_tables" => true,
            "is_payment_required" => false,
        },
    )
    .build();

    context.builder.exec(fee_request_with_lut).expect_success().commit();

    // Both should succeed (specific fee comparison depends on implementation)
    assert!(context.builder.get_exec_result(0).is_some());
    assert!(context.builder.get_exec_result(1).is_some());
}

#[test]
fn test_estimate_fees_instruction_count_scaling() {
    let mut context = TestContext::new();

    let transaction_size = 1000u64;
    let low_instruction_count = 1u32;
    let high_instruction_count = 10u32;

    // Test with low instruction count
    let fee_request_low = casper_engine_test_support::ExecuteRequestBuilder::contract_call_by_hash(
        context.admin_account,
        context.contract_hash,
        "estimate_fees",
        runtime_args! {
            "transaction_size" => transaction_size,
            "instruction_count" => low_instruction_count,
            "uses_lookup_tables" => false,
            "is_payment_required" => false,
        },
    )
    .build();

    context.builder.exec(fee_request_low).expect_success().commit();

    let result_low = context.builder.get_exec_result(0).expect("should have result");
    let fee_low = result_low[0]
        .as_success()
        .expect("should be success")
        .effect()
        .transforms
        .iter()
        .find_map(|(_, transform)| {
            if let casper_types::Transform::Write(casper_types::StoredValue::CLValue(cl_value)) = transform {
                cl_value.clone().into_t::<u64>().ok()
            } else {
                None
            }
        })
        .expect("should find fee result");

    // Test with high instruction count
    let fee_request_high = casper_engine_test_support::ExecuteRequestBuilder::contract_call_by_hash(
        context.admin_account,
        context.contract_hash,
        "estimate_fees",
        runtime_args! {
            "transaction_size" => transaction_size,
            "instruction_count" => high_instruction_count,
            "uses_lookup_tables" => false,
            "is_payment_required" => false,
        },
    )
    .build();

    context.builder.exec(fee_request_high).expect_success().commit();

    let result_high = context.builder.get_exec_result(1).expect("should have result");
    let fee_high = result_high[0]
        .as_success()
        .expect("should be success")
        .effect()
        .transforms
        .iter()
        .find_map(|(_, transform)| {
            if let casper_types::Transform::Write(casper_types::StoredValue::CLValue(cl_value)) = transform {
                cl_value.clone().into_t::<u64>().ok()
            } else {
                None
            }
        })
        .expect("should find fee result");

    // Higher instruction count should result in higher fee
    assert!(fee_high >= fee_low, "Higher instruction count should result in higher or equal fee");
}

#[test]
fn test_fee_estimation_edge_cases() {
    let mut context = TestContext::new();

    // Test with zero transaction size
    let fee_request_zero = casper_engine_test_support::ExecuteRequestBuilder::contract_call_by_hash(
        context.admin_account,
        context.contract_hash,
        "estimate_fees",
        runtime_args! {
            "transaction_size" => 0u64,
            "instruction_count" => 1u32,
            "uses_lookup_tables" => false,
            "is_payment_required" => false,
        },
    )
    .build();

    context.builder.exec(fee_request_zero).expect_success().commit();

    // Test with maximum reasonable values
    let fee_request_max = casper_engine_test_support::ExecuteRequestBuilder::contract_call_by_hash(
        context.admin_account,
        context.contract_hash,
        "estimate_fees",
        runtime_args! {
            "transaction_size" => 100000u64,
            "instruction_count" => 100u32,
            "uses_lookup_tables" => true,
            "is_payment_required" => true,
        },
    )
    .build();

    context.builder.exec(fee_request_max).expect_success().commit();

    // Both should succeed
    assert!(context.builder.get_exec_result(0).is_some());
    assert!(context.builder.get_exec_result(1).is_some());
}