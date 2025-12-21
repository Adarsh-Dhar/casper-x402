#![no_std]
extern crate alloc;

use alloc::{
    string::{String, ToString},
    vec::Vec,
};

use casper_types::{ContractHash, U256, PublicKey};

// Simple types for the facilitator
#[derive(Clone, Debug)]
pub struct Address([u8; 32]);

impl Address {
    pub fn new(bytes: [u8; 32]) -> Self {
        Self(bytes)
    }
    
    pub fn zero() -> Self {
        Self([0u8; 32])
    }
}

#[derive(Clone, Debug)]
pub struct Config {
    pub payment_address: Option<Address>,
    pub signer_pool: Vec<SignerInfo>,
    pub supported_tokens: Vec<TokenConfig>,
    pub kora_signature_fee_lamports: Option<u64>,
    pub payment_instruction_fee_lamports: Option<u64>,
    pub fee_multiplier: Option<f64>,
    pub minimum_fee_lamports: Option<u64>,
    pub fixed_fee_lamports: Option<u64>,
    pub account_creation_fee_lamports: Option<u64>,
    pub base_priority_fee_lamports: Option<u64>,
    pub max_priority_fee_lamports: Option<u64>,
}

#[derive(Clone, Debug)]
pub struct SignerInfo {
    pub address: Address,
    pub public_key: PublicKey,
    pub is_active: bool,
    pub weight: u32,
}

#[derive(Clone, Debug)]
pub struct TokenConfig {
    pub contract_hash: ContractHash,
    pub symbol: String,
    pub decimals: u8,
    pub is_active: bool,
    pub cspr_exchange_rate: Option<f64>,
    pub min_transfer_amount: Option<U256>,
    pub max_transfer_amount: Option<U256>,
}

// Admin token utilities
pub mod admin {
    use super::*;
    
    #[derive(Clone, Debug)]
    pub struct ATAToCreate {
        pub token_contract: ContractHash,
        pub owner: Address,
        pub mint_address: ContractHash,
    }
    
    /// Initialize token accounts for all allowed payment tokens for the paymaster
    pub fn initialize_atas(
        compute_unit_price: Option<u64>,
        compute_unit_limit: Option<u32>,
        chunk_size: Option<usize>,
        fee_payer_key: Option<String>,
    ) -> bool {
        // Implementation placeholder
        true
    }
    
    /// Initialize token accounts with chunk size
    pub fn initialize_atas_with_chunk_size(
        addresses_to_initialize_atas: &Vec<Address>,
        compute_unit_price: Option<u64>,
        compute_unit_limit: Option<u32>,
        chunk_size: usize,
    ) -> bool {
        // Implementation placeholder
        true
    }
    
    /// Find missing token accounts for a given address
    pub fn find_missing_atas(payment_address: &Address) -> Vec<ATAToCreate> {
        // Implementation placeholder
        Vec::new()
    }
}

// Fee calculation utilities
pub mod fee {
    use super::*;
    
    #[derive(Clone, Debug)]
    pub struct TotalFeeCalculation {
        pub total_fee_lamports: u64,
        pub base_fee: u64,
        pub kora_signature_fee: u64,
        pub fee_payer_outflow: u64,
        pub payment_instruction_fee: u64,
        pub transfer_fee_amount: u64,
    }
    
    impl TotalFeeCalculation {
        pub fn new(
            total_fee_lamports: u64,
            base_fee: u64,
            kora_signature_fee: u64,
            fee_payer_outflow: u64,
            payment_instruction_fee: u64,
            transfer_fee_amount: u64,
        ) -> Self {
            Self {
                total_fee_lamports,
                base_fee,
                kora_signature_fee,
                fee_payer_outflow,
                payment_instruction_fee,
                transfer_fee_amount,
            }
        }
        
        pub fn new_fixed(total_fee_lamports: u64) -> Self {
            Self {
                total_fee_lamports,
                base_fee: 0,
                kora_signature_fee: 0,
                fee_payer_outflow: 0,
                payment_instruction_fee: 0,
                transfer_fee_amount: 0,
            }
        }
        
        pub fn get_total_fee_lamports(&self) -> Option<u64> {
            self.base_fee
                .checked_add(self.kora_signature_fee)
                .and_then(|sum| sum.checked_add(self.fee_payer_outflow))
                .and_then(|sum| sum.checked_add(self.payment_instruction_fee))
                .and_then(|sum| sum.checked_add(self.transfer_fee_amount))
        }
    }
    
    /// Main entry point for fee calculation
    pub fn estimate_kora_fee(
        transaction_size: usize,
        is_payment_required: bool,
        base_fee_lamports: u64,
    ) -> TotalFeeCalculation {
        let base_fee = base_fee_lamports;
        let kora_signature_fee = if is_payment_required { 5000 } else { 0 };
        let size_fee = (transaction_size as u64) * 10;
        let payment_instruction_fee = if is_payment_required { 2000 } else { 0 };
        
        let total_fee_lamports = base_fee
            .saturating_add(kora_signature_fee)
            .saturating_add(size_fee)
            .saturating_add(payment_instruction_fee);
        
        TotalFeeCalculation::new(
            total_fee_lamports,
            base_fee,
            kora_signature_fee,
            size_fee,
            payment_instruction_fee,
            0,
        )
    }
    
    /// Calculate fee in a specific token
    pub fn calculate_fee_in_token(
        fee_in_lamports: u64,
        exchange_rate: Option<f64>,
    ) -> Option<u64> {
        if let Some(rate) = exchange_rate {
            Some((fee_in_lamports as f64 / rate) as u64)
        } else {
            None
        }
    }
    
    /// Calculate fee payer outflow
    pub fn calculate_fee_payer_outflow(
        transaction_size: usize,
        creates_accounts: bool,
    ) -> u64 {
        let mut total_outflow = (transaction_size as u64) * 100;
        if creates_accounts {
            total_outflow = total_outflow.saturating_add(1000000);
        }
        total_outflow
    }
    
    /// Get fee estimate
    pub fn get_estimate_fee(instruction_count: usize) -> u64 {
        let base_fee: u64 = 100000;
        let instruction_fee: u64 = instruction_count as u64 * 10000;
        base_fee.saturating_add(instruction_fee)
    }
    
    /// Get fee estimate for resolved transaction
    pub fn get_estimate_fee_resolved(
        instruction_count: usize,
        uses_lookup_tables: bool,
    ) -> u64 {
        let base_fee: u64 = 100000;
        let instruction_fee: u64 = instruction_count as u64 * 10000;
        let complexity_fee: u64 = if uses_lookup_tables { 50000 } else { 0 };
        
        base_fee
            .saturating_add(instruction_fee)
            .saturating_add(complexity_fee)
    }
}

// Price calculation utilities
pub mod price {
    use super::*;
    
    #[derive(Clone, Debug)]
    pub struct PriceCalculator {
        pub base_fee_lamports: u64,
        pub token_contract: Option<ContractHash>,
        pub token_amount: Option<U256>,
        pub margin_multiplier: f64,
        pub fixed_fee_override: Option<u64>,
    }
    
    impl PriceCalculator {
        pub fn new(base_fee_lamports: u64) -> Self {
            Self {
                base_fee_lamports,
                token_contract: None,
                token_amount: None,
                margin_multiplier: 1.1,
                fixed_fee_override: None,
            }
        }
        
        pub fn with_token(mut self, token_contract: ContractHash, token_amount: U256) -> Self {
            self.token_contract = Some(token_contract);
            self.token_amount = Some(token_amount);
            self
        }
        
        pub fn with_margin(mut self, margin_multiplier: f64) -> Self {
            self.margin_multiplier = margin_multiplier;
            self
        }
        
        pub fn with_fixed_fee(mut self, fixed_fee: u64) -> Self {
            self.fixed_fee_override = Some(fixed_fee);
            self
        }
        
        pub fn get_required_lamports_with_fixed(&self) -> u64 {
            if let Some(fixed_fee) = self.fixed_fee_override {
                return fixed_fee;
            }
            
            if let (Some(_token_contract), Some(token_amount)) = (&self.token_contract, &self.token_amount) {
                return self.calculate_token_based_fee(token_amount);
            }
            
            let fee_with_margin = (self.base_fee_lamports as f64 * self.margin_multiplier) as u64;
            let min_fee = 1000u64;
            fee_with_margin.max(min_fee)
        }
        
        pub fn get_required_lamports_with_margin(&self, min_transaction_fee: u64) -> u64 {
            if let Some(fixed_fee) = self.fixed_fee_override {
                return fixed_fee;
            }
            
            let base_fee = min_transaction_fee.max(self.base_fee_lamports);
            let fee_with_margin = (base_fee as f64 * self.margin_multiplier) as u64;
            fee_with_margin.max(base_fee)
        }
        
        fn calculate_token_based_fee(&self, token_amount: &U256) -> u64 {
            let exchange_rate = 1.0;
            let token_amount_u64 = token_amount.as_u64();
            let lamports_equivalent = (token_amount_u64 as f64 * exchange_rate) as u64;
            let fee_with_margin = (lamports_equivalent as f64 * self.margin_multiplier) as u64;
            let min_fee = 1000u64;
            fee_with_margin.max(min_fee)
        }
        
        pub fn get_fee_rate(&self, transaction_size: usize) -> f64 {
            let base_rate = 100.0;
            let complexity_multiplier = if transaction_size > 1000 {
                1.5
            } else if transaction_size > 500 {
                1.2
            } else {
                1.0
            };
            base_rate * complexity_multiplier * self.margin_multiplier
        }
        
        pub fn calculate_priority_fee(&self, network_congestion_level: u8) -> u64 {
            if network_congestion_level > 10 {
                return 0;
            }
            
            let base_priority = 1000u64;
            let congestion_multiplier = 1.0 + (network_congestion_level as f64 * 0.2);
            let priority_fee = (base_priority as f64 * congestion_multiplier) as u64;
            let max_priority = 100000u64;
            priority_fee.min(max_priority)
        }
        
        pub fn estimate_total_cost(
            &self,
            transaction_size: usize,
            network_congestion_level: u8,
        ) -> u64 {
            let base_fee = self.get_required_lamports_with_fixed();
            let fee_rate = self.get_fee_rate(transaction_size);
            let size_fee = (transaction_size as f64 * fee_rate) as u64;
            let priority_fee = self.calculate_priority_fee(network_congestion_level);
            
            base_fee
                .saturating_add(size_fee)
                .saturating_add(priority_fee)
        }
    }
    
    #[derive(Clone, Debug)]
    pub struct FeeBreakdown {
        pub base_fee: u64,
        pub size_fee: u64,
        pub priority_fee: u64,
        pub margin_applied: f64,
        pub total_cost: u64,
    }
    
    impl FeeBreakdown {
        pub fn to_string(&self) -> String {
            format!(
                "Fee Breakdown:\n  Base Fee: {} lamports\n  Size Fee: {} lamports\n  Priority Fee: {} lamports\n  Margin: {:.1}%\n  Total: {} lamports",
                self.base_fee,
                self.size_fee,
                self.priority_fee,
                (self.margin_applied - 1.0) * 100.0,
                self.total_cost
            )
        }
        
        pub fn is_reasonable(&self, max_reasonable_fee: u64) -> bool {
            self.total_cost <= max_reasonable_fee
        }
        
        pub fn get_effective_rate(&self, transaction_size: usize) -> f64 {
            if transaction_size == 0 {
                return 0.0;
            }
            self.total_cost as f64 / transaction_size as f64
        }
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            payment_address: None,
            signer_pool: Vec::new(),
            supported_tokens: Vec::new(),
            kora_signature_fee_lamports: Some(5000),
            payment_instruction_fee_lamports: Some(2000),
            fee_multiplier: Some(1.1),
            minimum_fee_lamports: Some(1000),
            fixed_fee_lamports: None,
            account_creation_fee_lamports: Some(1000000),
            base_priority_fee_lamports: Some(1000),
            max_priority_fee_lamports: Some(100000),
        }
    }
}