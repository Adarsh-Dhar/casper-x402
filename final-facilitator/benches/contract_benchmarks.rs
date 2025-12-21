use casper_engine_test_support::{
    ExecuteRequestBuilder, InMemoryWasmTestBuilder, WasmTestBuilder, DEFAULT_ACCOUNT_ADDR,
    DEFAULT_ACCOUNT_INITIAL_BALANCE, DEFAULT_GENESIS_CONFIG, DEFAULT_GENESIS_CONFIG_HASH,
    DEFAULT_PAYMENT, DEFAULT_RUN_GENESIS_REQUEST,
};
use casper_execution_engine::core::engine_state::{
    run_genesis_request::RunGenesisRequest, GenesisAccount,
};
use casper_types::{
    account::AccountHash, runtime_args, ContractHash, PublicKey, RuntimeArgs, U512,
};
use std::path::PathBuf;
use std::time::Instant;

const CONTRACT_WASM: &str = "casper-vault-facilitator.wasm";
const ADMIN_ACCOUNT: [u8; 32] = [1u8; 32];
const FEE_RECIPIENT_ACCOUNT: [u8; 32] = [2u8; 32];

fn setup_test_environment() -> (WasmTestBuilder<InMemoryWasmTestBuilder>, ContractHash, AccountHash) {
    let mut builder = InMemoryWasmTestBuilder::default();
    builder.run_genesis(&DEFAULT_RUN_GENESIS_REQUEST).commit();

    let admin_account = AccountHash::new(ADMIN_ACCOUNT);
    let fee_recipient_account = AccountHash::new(FEE_RECIPIENT_ACCOUNT);

    // Create additional accounts
    let admin_genesis_account = GenesisAccount::account(
        PublicKey::ed25519_from_bytes([1u8; 32]).unwrap(),
        U512::from(DEFAULT_ACCOUNT_INITIAL_BALANCE),
        None,
    );
    let fee_recipient_genesis_account = GenesisAccount::account(
        PublicKey::ed25519_from_bytes([2u8; 32]).unwrap(),
        U512::from(DEFAULT_ACCOUNT_INITIAL_BALANCE),
        None,
    );

    let mut genesis_config = DEFAULT_GENESIS_CONFIG.clone();
    genesis_config.ee_config_mut().push_account(admin_genesis_account);
    genesis_config.ee_config_mut().push_account(fee_recipient_genesis_account);

    let run_genesis_request = RunGenesisRequest::new(
        *DEFAULT_GENESIS_CONFIG_HASH,
        genesis_config.protocol_version(),
        genesis_config.take_ee_config(),
    );

    builder.run_genesis(&run_genesis_request).commit();

    // Deploy the contract
    let session_code = PathBuf::from(CONTRACT_WASM);
    let session_args = runtime_args! {
        "admin" => admin_account,
        "fee_recipient" => fee_recipient_account,
        "base_fee_rate" => 1000u64,
        "max_fee_rate" => 10000u64,
    };

    let deploy_request = ExecuteRequestBuilder::standard(
        admin_account,
        session_code,
        session_args,
    )
    .build();

    builder.exec(deploy_request).expect_success().commit();

    let account = builder
        .get_account(admin_account)
        .expect("should have account");

    let contract_hash = account
        .named_keys()
        .get("contract_hash")
        .expect("should have contract hash key")
        .into_hash()
        .map(ContractHash::new)
        .expect("should be a hash");

    (builder, contract_hash, admin_account)
}

fn create_dummy_contract_hash(seed: u8) -> ContractHash {
    ContractHash::new([seed; 32])
}

#[cfg(test)]
mod benchmarks {
    use super::*;

    #[test]
    #[ignore] // Run with --ignored flag
    fn bench_contract_deployment() {
        let iterations = 10;
        let mut total_time = std::time::Duration::new(0, 0);

        for _ in 0..iterations {
            let start = Instant::now();
            let _ = setup_test_environment();
            total_time += start.elapsed();
        }

        let avg_time = total_time / iterations;
        println!("Average contract deployment time: {:?}", avg_time);
        
        // Assert reasonable deployment time (adjust as needed)
        assert!(avg_time.as_millis() < 5000, "Deployment too slow: {:?}", avg_time);
    }

    #[test]
    #[ignore]
    fn bench_add_supported_tokens() {
        let (mut builder, contract_hash, admin_account) = setup_test_environment();
        let iterations = 100;

        let start = Instant::now();
        
        for i in 0..iterations {
            let token_hash = create_dummy_contract_hash(i as u8);
            let contract_call_request = ExecuteRequestBuilder::contract_call_by_hash(
                admin_account,
                contract_hash,
                "add_supported_token",
                runtime_args! {
                    "token_contract" => token_hash
                },
            )
            .build();

            builder.exec(contract_call_request).expect_success().commit();
        }

        let total_time = start.elapsed();
        let avg_time = total_time / iterations;
        
        println!("Average add_supported_token time: {:?}", avg_time);
        println!("Total time for {} operations: {:?}", iterations, total_time);
        
        // Assert reasonable operation time
        assert!(avg_time.as_millis() < 100, "Add token too slow: {:?}", avg_time);
    }

    #[test]
    #[ignore]
    fn bench_fee_estimation() {
        let (mut builder, contract_hash, admin_account) = setup_test_environment();
        let iterations = 1000;

        let start = Instant::now();
        
        for i in 0..iterations {
            let fee_request = ExecuteRequestBuilder::contract_call_by_hash(
                admin_account,
                contract_hash,
                "estimate_fees",
                runtime_args! {
                    "transaction_size" => (1000 + i) as u64,
                    "instruction_count" => (5 + (i % 10)) as u32,
                    "uses_lookup_tables" => i % 2 == 0,
                    "is_payment_required" => i % 3 == 0,
                },
            )
            .build();

            builder.exec(fee_request).expect_success().commit();
        }

        let total_time = start.elapsed();
        let avg_time = total_time / iterations;
        
        println!("Average fee estimation time: {:?}", avg_time);
        println!("Total time for {} operations: {:?}", iterations, total_time);
        
        // Assert reasonable operation time
        assert!(avg_time.as_millis() < 50, "Fee estimation too slow: {:?}", avg_time);
    }

    #[test]
    #[ignore]
    fn bench_transaction_processing() {
        let (mut builder, contract_hash, admin_account) = setup_test_environment();
        let user_account = AccountHash::new([3u8; 32]);
        let iterations = 100;

        // Add a supported token first
        let token_hash = create_dummy_contract_hash(100);
        let add_token_request = ExecuteRequestBuilder::contract_call_by_hash(
            admin_account,
            contract_hash,
            "add_supported_token",
            runtime_args! {
                "token_contract" => token_hash
            },
        )
        .build();
        builder.exec(add_token_request).expect_success().commit();

        let start = Instant::now();
        
        for i in 0..iterations {
            let process_request = ExecuteRequestBuilder::contract_call_by_hash(
                user_account,
                contract_hash,
                "process_transaction",
                runtime_args! {
                    "user_signature" => format!("signature_{}", i),
                    "transaction_data" => vec![i as u8; 100],
                    "fee_token" => if i % 2 == 0 { Some(token_hash) } else { None },
                },
            )
            .build();

            builder.exec(process_request).expect_success().commit();
        }

        let total_time = start.elapsed();
        let avg_time = total_time / iterations;
        
        println!("Average transaction processing time: {:?}", avg_time);
        println!("Total time for {} operations: {:?}", iterations, total_time);
        
        // Assert reasonable operation time
        assert!(avg_time.as_millis() < 200, "Transaction processing too slow: {:?}", avg_time);
    }

    #[test]
    #[ignore]
    fn bench_query_operations() {
        let (mut builder, contract_hash, admin_account) = setup_test_environment();
        
        // Add some tokens and signers first
        for i in 0..10 {
            let token_hash = create_dummy_contract_hash(i);
            let add_token_request = ExecuteRequestBuilder::contract_call_by_hash(
                admin_account,
                contract_hash,
                "add_supported_token",
                runtime_args! {
                    "token_contract" => token_hash
                },
            )
            .build();
            builder.exec(add_token_request).expect_success().commit();
        }

        let iterations = 1000;
        let start = Instant::now();
        
        for _ in 0..iterations {
            let query_request = ExecuteRequestBuilder::contract_call_by_hash(
                admin_account,
                contract_hash,
                "get_supported_tokens",
                runtime_args! {},
            )
            .build();

            builder.exec(query_request).expect_success().commit();
        }

        let total_time = start.elapsed();
        let avg_time = total_time / iterations;
        
        println!("Average query operation time: {:?}", avg_time);
        println!("Total time for {} operations: {:?}", iterations, total_time);
        
        // Assert reasonable operation time
        assert!(avg_time.as_millis() < 20, "Query operation too slow: {:?}", avg_time);
    }

    #[test]
    #[ignore]
    fn bench_memory_usage() {
        let (mut builder, contract_hash, admin_account) = setup_test_environment();
        
        // Add many tokens to test memory usage
        let token_count = 1000;
        
        println!("Adding {} tokens to test memory usage...", token_count);
        
        let start = Instant::now();
        
        for i in 0..token_count {
            let token_hash = create_dummy_contract_hash((i % 256) as u8);
            let add_token_request = ExecuteRequestBuilder::contract_call_by_hash(
                admin_account,
                contract_hash,
                "add_supported_token",
                runtime_args! {
                    "token_contract" => token_hash
                },
            )
            .build();

            // Some will fail due to duplicates, that's expected
            let _ = builder.exec(add_token_request);
            builder.commit();
        }

        let total_time = start.elapsed();
        println!("Time to add {} tokens: {:?}", token_count, total_time);
        
        // Query to see how many were actually added
        let query_request = ExecuteRequestBuilder::contract_call_by_hash(
            admin_account,
            contract_hash,
            "get_supported_tokens",
            runtime_args! {},
        )
        .build();

        builder.exec(query_request).expect_success().commit();
        
        println!("Memory stress test completed");
    }
}