use alloc::vec::Vec;
use casper_types::{
    account::AccountHash,
    bytesrepr::{FromBytes, ToBytes},
    crypto::PublicKey,
    CLType, CLTyped,
};

/// Signer information for the facilitator pool
#[derive(Clone, Debug)]
pub struct SignerInfo {
    pub account_hash: AccountHash,
    pub public_key: PublicKey,
    pub weight: u32,
    pub is_active: bool,
}

impl ToBytes for SignerInfo {
    fn to_bytes(&self) -> Result<Vec<u8>, casper_types::bytesrepr::Error> {
        let mut result = Vec::new();
        result.append(&mut self.account_hash.to_bytes()?);
        result.append(&mut self.public_key.to_bytes()?);
        result.append(&mut self.weight.to_bytes()?);
        result.append(&mut self.is_active.to_bytes()?);
        Ok(result)
    }

    fn serialized_length(&self) -> usize {
        self.account_hash.serialized_length()
            + self.public_key.serialized_length()
            + self.weight.serialized_length()
            + self.is_active.serialized_length()
    }
}

impl FromBytes for SignerInfo {
    fn from_bytes(bytes: &[u8]) -> Result<(Self, &[u8]), casper_types::bytesrepr::Error> {
        let (account_hash, remainder) = AccountHash::from_bytes(bytes)?;
        let (public_key, remainder) = PublicKey::from_bytes(remainder)?;
        let (weight, remainder) = u32::from_bytes(remainder)?;
        let (is_active, remainder) = bool::from_bytes(remainder)?;
        
        Ok((
            SignerInfo {
                account_hash,
                public_key,
                weight,
                is_active,
            },
            remainder,
        ))
    }
}

impl CLTyped for SignerInfo {
    fn cl_type() -> CLType {
        CLType::Any
    }
}

/// Fee calculation result
#[derive(Clone, Debug)]
pub struct FeeCalculation {
    pub total_fee: u64,
    pub base_fee: u64,
    pub instruction_fee: u64,
    pub lookup_table_fee: u64,
    pub kora_signature_fee: u64,
    pub payment_instruction_fee: u64,
}

impl FeeCalculation {
    pub fn new(
        base_fee: u64,
        instruction_fee: u64,
        lookup_table_fee: u64,
        kora_signature_fee: u64,
        payment_instruction_fee: u64,
    ) -> Self {
        let total_fee = base_fee
            .saturating_add(instruction_fee)
            .saturating_add(lookup_table_fee)
            .saturating_add(kora_signature_fee)
            .saturating_add(payment_instruction_fee);
        
        Self {
            total_fee,
            base_fee,
            instruction_fee,
            lookup_table_fee,
            kora_signature_fee,
            payment_instruction_fee,
        }
    }
}

/// Price calculator configuration
#[derive(Clone, Debug)]
pub struct PriceConfig {
    pub base_fee_lamports: u64,
    pub margin_multiplier: f64,
    pub fixed_fee_override: Option<u64>,
    pub min_fee_lamports: u64,
    pub max_priority_fee_lamports: u64,
}

impl Default for PriceConfig {
    fn default() -> Self {
        Self {
            base_fee_lamports: crate::constants::BASE_FEE_LAMPORTS,
            margin_multiplier: crate::constants::DEFAULT_MARGIN_MULTIPLIER,
            fixed_fee_override: None,
            min_fee_lamports: crate::constants::MIN_FEE_LAMPORTS,
            max_priority_fee_lamports: crate::constants::MAX_PRIORITY_FEE_LAMPORTS,
        }
    }
}

/// Token account initialization info
#[derive(Clone, Debug)]
pub struct TokenAccountInfo {
    pub token_contract: casper_types::ContractHash,
    pub owner: AccountHash,
    pub is_initialized: bool,
}

/// Transaction metadata for processing
#[derive(Clone, Debug)]
pub struct TransactionMetadata {
    pub size: u64,
    pub instruction_count: u32,
    pub uses_lookup_tables: bool,
    pub requires_payment: bool,
    pub fee_token: Option<casper_types::ContractHash>,
}