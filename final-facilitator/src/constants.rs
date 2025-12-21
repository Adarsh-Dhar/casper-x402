/// Storage keys for the vault facilitator contract
pub const ADMIN_KEY: &str = "admin";
pub const FEE_RECIPIENT_KEY: &str = "fee_recipient";
pub const BASE_FEE_RATE_KEY: &str = "base_fee_rate";
pub const MAX_FEE_RATE_KEY: &str = "max_fee_rate";
pub const IS_PAUSED_KEY: &str = "is_paused";
pub const SUPPORTED_TOKENS_KEY: &str = "supported_tokens";
pub const SIGNER_POOL_KEY: &str = "signer_pool";
pub const CONTRACT_HASH_KEY: &str = "contract_hash";

/// Fee calculation constants
pub const BASE_FEE_LAMPORTS: u64 = 100_000; // 0.0001 CSPR
pub const INSTRUCTION_FEE_LAMPORTS: u64 = 10_000; // 0.00001 CSPR per instruction
pub const LOOKUP_TABLE_FEE_LAMPORTS: u64 = 50_000; // 0.00005 CSPR for lookup tables
pub const KORA_SIGNATURE_FEE_LAMPORTS: u64 = 5_000; // 0.000005 CSPR for Kora signatures
pub const PAYMENT_INSTRUCTION_FEE_LAMPORTS: u64 = 2_000; // 0.000002 CSPR for payment instructions

/// Price calculation constants
pub const DEFAULT_MARGIN_MULTIPLIER: f64 = 1.1; // 10% margin
pub const MIN_FEE_LAMPORTS: u64 = 1_000; // 0.000001 CSPR minimum
pub const MAX_PRIORITY_FEE_LAMPORTS: u64 = 100_000; // 0.0001 CSPR maximum priority fee
pub const CONGESTION_MULTIPLIER_BASE: f64 = 0.2; // 20% per congestion level

/// Admin token utility constants
pub const DEFAULT_CHUNK_SIZE: usize = 10;
pub const MAX_CHUNK_SIZE: usize = 100;
pub const ACCOUNT_CREATION_FEE_LAMPORTS: u64 = 1_000_000; // 0.001 CSPR

/// Event names
pub const FACILITATOR_EVENT_PREFIX: &str = "VaultFacilitator";

/// Error messages
pub const ERROR_UNAUTHORIZED: &str = "Unauthorized access";
pub const ERROR_CONTRACT_PAUSED: &str = "Contract is paused";
pub const ERROR_INVALID_TOKEN: &str = "Invalid or unsupported token";
pub const ERROR_INVALID_SIGNER: &str = "Invalid signer";
pub const ERROR_INSUFFICIENT_FEE: &str = "Insufficient fee payment";
pub const ERROR_INVALID_TRANSACTION: &str = "Invalid transaction data";