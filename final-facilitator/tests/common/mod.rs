use casper_engine_test_support::{
    ExecuteRequestBuilder, InMemoryWasmTestBuilder, WasmTestBuilder, DEFAULT_ACCOUNT_ADDR,
    DEFAULT_ACCOUNT_INITIAL_BALANCE, DEFAULT_GENESIS_CONFIG, DEFAULT_GENESIS_CONFIG_HASH,
    DEFAULT_PAYMENT, DEFAULT_RUN_GENESIS_REQUEST,
};
use casper_execution_engine::core::engine_state::{
    run_genesis_request::RunGenesisRequest, GenesisAccount,
};
use casper_types::{
    account::AccountHash, bytesrepr::FromBytes, runtime_args, CLTyped, ContractHash, Key,
    PublicKey, RuntimeArgs, SecretKey, U256, U512,
};
use std::path::PathBuf;

pub const CONTRACT_WASM: &str = "casper-vault-facilitator.wasm";
pub const ADMIN_ACCOUNT: [u8; 32] = [1u8; 32];
pub const FEE_RECIPIENT_ACCOUNT: [u8; 32] = [2u8; 32];
pub const USER_ACCOUNT: [u8; 32] = [3u8; 32];
pub const SIGNER_ACCOUNT: [u8; 32] = [4u8; 32];

pub struct TestContext {
    pub builder: WasmTestBuilder<InMemoryWasmTestBuilder>,
    pub admin_account: AccountHash,
    pub fee_recipient_account: AccountHash,
    pub user_account: AccountHash,
    pub signer_account: AccountHash,
    pub contract_hash: ContractHash,
}

impl TestContext {
    pub fn new() -> Self {
        let mut builder = InMemoryWasmTestBuilder::default();
        builder.run_genesis(&DEFAULT_RUN_GENESIS_REQUEST).commit();

        let admin_account = AccountHash::new(ADMIN_ACCOUNT);
        let fee_recipient_account = AccountHash::new(FEE_RECIPIENT_ACCOUNT);
        let user_account = AccountHash::new(USER_ACCOUNT);
        let signer_account = AccountHash::new(SIGNER_ACCOUNT);

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
        let user_genesis_account = GenesisAccount::account(
            PublicKey::ed25519_from_bytes([3u8; 32]).unwrap(),
            U512::from(DEFAULT_ACCOUNT_INITIAL_BALANCE),
            None,
        );
        let signer_genesis_account = GenesisAccount::account(
            PublicKey::ed25519_from_bytes([4u8; 32]).unwrap(),
            U512::from(DEFAULT_ACCOUNT_INITIAL_BALANCE),
            None,
        );

        let mut genesis_config = DEFAULT_GENESIS_CONFIG.clone();
        genesis_config.ee_config_mut().push_account(admin_genesis_account);
        genesis_config.ee_config_mut().push_account(fee_recipient_genesis_account);
        genesis_config.ee_config_mut().push_account(user_genesis_account);
        genesis_config.ee_config_mut().push_account(signer_genesis_account);

        let run_genesis_request = RunGenesisRequest::new(
            *DEFAULT_GENESIS_CONFIG_HASH,
            genesis_config.protocol_version(),
            genesis_config.take_ee_config(),
        );

        builder.run_genesis(&run_genesis_request).commit();

        // Deploy the contract
        let contract_hash = Self::deploy_contract(&mut builder, admin_account);

        TestContext {
            builder,
            admin_account,
            fee_recipient_account,
            user_account,
            signer_account,
            contract_hash,
        }
    }

    fn deploy_contract(
        builder: &mut WasmTestBuilder<InMemoryWasmTestBuilder>,
        admin_account: AccountHash,
    ) -> ContractHash {
        let session_code = PathBuf::from(CONTRACT_WASM);
        let session_args = runtime_args! {
            "admin" => admin_account,
            "fee_recipient" => AccountHash::new(FEE_RECIPIENT_ACCOUNT),
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

        account
            .named_keys()
            .get("contract_hash")
            .expect("should have contract hash key")
            .into_hash()
            .map(ContractHash::new)
            .expect("should be a hash")
    }

    pub fn call_contract(
        &mut self,
        sender: AccountHash,
        entry_point: &str,
        args: RuntimeArgs,
    ) -> &mut Self {
        let contract_call_request = ExecuteRequestBuilder::contract_call_by_hash(
            sender,
            self.contract_hash,
            entry_point,
            args,
        )
        .build();

        self.builder.exec(contract_call_request).expect_success().commit();
        self
    }

    pub fn call_contract_expect_error(
        &mut self,
        sender: AccountHash,
        entry_point: &str,
        args: RuntimeArgs,
        expected_error: u16,
    ) -> &mut Self {
        let contract_call_request = ExecuteRequestBuilder::contract_call_by_hash(
            sender,
            self.contract_hash,
            entry_point,
            args,
        )
        .build();

        self.builder.exec(contract_call_request).expect_failure();
        
        let error = self.builder.get_error().expect("should have error");
        assert_eq!(error.into_user_error().unwrap_or_default(), expected_error);
        
        self
    }

    pub fn query_contract<T: CLTyped + FromBytes>(&self, key_name: &str) -> T {
        let contract = self
            .builder
            .get_contract(self.contract_hash)
            .expect("should have contract");

        let key = contract
            .named_keys()
            .get(key_name)
            .expect("should have key")
            .into_uref()
            .expect("should be uref");

        self.builder
            .query(None, key, &[])
            .expect("should query")
            .as_cl_value()
            .expect("should be cl value")
            .clone()
            .into_t()
            .expect("should convert")
    }

    pub fn get_supported_tokens(&self) -> Vec<ContractHash> {
        self.query_contract("supported_tokens")
    }

    pub fn get_signer_pool(&self) -> Vec<casper_vault_facilitator::SignerInfo> {
        self.query_contract("signer_pool")
    }

    pub fn is_paused(&self) -> bool {
        self.query_contract("is_paused")
    }

    pub fn get_admin(&self) -> AccountHash {
        self.query_contract("admin")
    }
}

pub fn create_dummy_contract_hash(seed: u8) -> ContractHash {
    ContractHash::new([seed; 32])
}

pub fn create_dummy_public_key(seed: u8) -> PublicKey {
    PublicKey::ed25519_from_bytes([seed; 32]).unwrap()
}