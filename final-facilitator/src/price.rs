use crate::constants::*;
use crate::errors::*;
use crate::types::PriceConfig;

/// Price calculator for handling fee requirements with margins and congestion
pub struct PriceCalculator {
    config: PriceConfig,
}

impl PriceCalculator {
    /// Create a new price calculator with default configuration
    pub fn new(base_fee_lamports: u64) -> Self {
        Self {
            config: PriceConfig {
                base_fee_lamports,
                ..Default::default()
            },
        }
    }
    
    /// Create a price calculator with custom configuration
    pub fn with_config(config: PriceConfig) -> Self {
        Self { config }
    }
    
    /// Set margin multiplier for fee calculation
    pub fn with_margin(mut self, margin_multiplier: f64) -> Result<Self, casper_types::ApiError> {
        if margin_multiplier < 1.0 || margin_multiplier > 5.0 {
            return Err(invalid_fee_rate_error());
        }
        
        self.config.margin_multiplier = margin_multiplier;
        Ok(self)
    }
    
    /// Set a fixed fee override
    pub fn with_fixed_fee(mut self, fixed_fee: u64) -> Self {
        self.config.fixed_fee_override = Some(fixed_fee);
        self
    }
    
    /// Get required lamports with fixed fee calculation
    /// This method applies a fixed fee structure regardless of transaction complexity
    pub fn get_required_lamports_with_fixed(&self) -> Result<u64, casper_types::ApiError> {
        // If fixed fee override is set, use it
        if let Some(fixed_fee) = self.config.fixed_fee_override {
            return Ok(fixed_fee);
        }
        
        // Fall back to base fee with margin
        let fee_with_margin = (self.config.base_fee_lamports as f64 * self.config.margin_multiplier) as u64;
        
        // Apply minimum fee
        let final_fee = fee_with_margin.max(self.config.min_fee_lamports);
        
        Ok(final_fee)
    }
    
    /// Get required lamports with margin applied to minimum transaction fee
    /// This method applies a safety margin to ensure sufficient fee coverage
    pub fn get_required_lamports_with_margin(
        &self,
        min_transaction_fee: u64,
    ) -> Result<u64, casper_types::ApiError> {
        // If fixed fee override is set, use it
        if let Some(fixed_fee) = self.config.fixed_fee_override {
            return Ok(fixed_fee);
        }
        
        // Apply margin to the minimum transaction fee
        let base_fee = min_transaction_fee.max(self.config.base_fee_lamports);
        let fee_with_margin = (base_fee as f64 * self.config.margin_multiplier) as u64;
        
        // Ensure we don't underflow
        if fee_with_margin < base_fee {
            return Err(fee_calculation_overflow_error());
        }
        
        Ok(fee_with_margin)
    }
    
    /// Calculate fee based on token pricing
    pub fn calculate_token_based_fee(
        &self,
        token_amount: u64,
        exchange_rate: f64,
    ) -> Result<u64, casper_types::ApiError> {
        if exchange_rate <= 0.0 {
            return Err(invalid_fee_rate_error());
        }
        
        // Convert token amount to lamports
        let lamports_equivalent = (token_amount as f64 * exchange_rate) as u64;
        
        // Apply margin
        let fee_with_margin = (lamports_equivalent as f64 * self.config.margin_multiplier) as u64;
        
        // Ensure minimum fee
        let final_fee = fee_with_margin.max(self.config.min_fee_lamports);
        
        Ok(final_fee)
    }
    
    /// Get the effective fee rate for a given transaction size
    pub fn get_fee_rate(&self, transaction_size: usize) -> f64 {
        // Base rate per byte
        let base_rate = 100.0; // lamports per byte
        
        // Apply scaling based on transaction complexity
        let complexity_multiplier = if transaction_size > 1000 {
            1.5 // 50% increase for complex transactions
        } else if transaction_size > 500 {
            1.2 // 20% increase for medium transactions
        } else {
            1.0 // No increase for simple transactions
        };
        
        base_rate * complexity_multiplier * self.config.margin_multiplier
    }
    
    /// Calculate priority fee based on network congestion
    pub fn calculate_priority_fee(
        &self,
        network_congestion_level: u8,
    ) -> Result<u64, casper_types::ApiError> {
        if network_congestion_level > 10 {
            return Err(invalid_fee_rate_error());
        }
        
        // Base priority fee
        let base_priority = MIN_FEE_LAMPORTS;
        
        // Scale based on congestion (exponential scaling)
        let congestion_multiplier = 1.0 + (network_congestion_level as f64 * CONGESTION_MULTIPLIER_BASE);
        let priority_fee = (base_priority as f64 * congestion_multiplier) as u64;
        
        // Cap the priority fee to prevent excessive costs
        let capped_fee = priority_fee.min(self.config.max_priority_fee_lamports);
        
        Ok(capped_fee)
    }
    
    /// Estimate total cost including all fees and margins
    pub fn estimate_total_cost(
        &self,
        transaction_size: usize,
        network_congestion_level: u8,
    ) -> Result<u64, casper_types::ApiError> {
        // Calculate base fee with margin
        let base_fee = self.get_required_lamports_with_fixed()?;
        
        // Calculate size-based fee
        let fee_rate = self.get_fee_rate(transaction_size);
        let size_fee = (transaction_size as f64 * fee_rate) as u64;
        
        // Calculate priority fee
        let priority_fee = self.calculate_priority_fee(network_congestion_level)?;
        
        // Sum all components (using saturating arithmetic)
        let total_cost = base_fee
            .saturating_add(size_fee)
            .saturating_add(priority_fee);
        
        Ok(total_cost)
    }
    
    /// Get fee breakdown for transparency
    pub fn get_fee_breakdown(
        &self,
        transaction_size: usize,
        network_congestion_level: u8,
    ) -> Result<FeeBreakdown, casper_types::ApiError> {
        let base_fee = self.get_required_lamports_with_fixed()?;
        let fee_rate = self.get_fee_rate(transaction_size);
        let size_fee = (transaction_size as f64 * fee_rate) as u64;
        let priority_fee = self.calculate_priority_fee(network_congestion_level)?;
        let total_cost = self.estimate_total_cost(transaction_size, network_congestion_level)?;
        
        Ok(FeeBreakdown {
            base_fee,
            size_fee,
            priority_fee,
            margin_applied: self.config.margin_multiplier,
            total_cost,
        })
    }
    
    /// Validate price configuration
    pub fn validate_config(&self) -> Result<(), casper_types::ApiError> {
        if self.config.base_fee_lamports == 0 {
            return Err(invalid_fee_rate_error());
        }
        
        if self.config.margin_multiplier < 1.0 || self.config.margin_multiplier > 5.0 {
            return Err(invalid_fee_rate_error());
        }
        
        if self.config.min_fee_lamports > self.config.base_fee_lamports {
            return Err(invalid_fee_rate_error());
        }
        
        Ok(())
    }
}

/// Detailed fee breakdown for transparency
#[derive(Clone, Debug)]
pub struct FeeBreakdown {
    pub base_fee: u64,
    pub size_fee: u64,
    pub priority_fee: u64,
    pub margin_applied: f64,
    pub total_cost: u64,
}

impl FeeBreakdown {
    /// Check if the fee is within reasonable bounds
    pub fn is_reasonable(&self, max_reasonable_fee: u64) -> bool {
        self.total_cost <= max_reasonable_fee
    }
    
    /// Get the effective fee rate (total cost per byte)
    pub fn get_effective_rate(&self, transaction_size: usize) -> f64 {
        if transaction_size == 0 {
            return 0.0;
        }
        self.total_cost as f64 / transaction_size as f64
    }
    
    /// Calculate the margin percentage
    pub fn get_margin_percentage(&self) -> f64 {
        (self.margin_applied - 1.0) * 100.0
    }
}

/// Create a default price calculator
pub fn create_default_price_calculator() -> PriceCalculator {
    PriceCalculator::new(BASE_FEE_LAMPORTS)
}

/// Create a price calculator with custom base fee and margin
pub fn create_custom_price_calculator(
    base_fee: u64,
    margin: f64,
) -> Result<PriceCalculator, casper_types::ApiError> {
    let calculator = PriceCalculator::new(base_fee);
    calculator.with_margin(margin)
}

/// Calculate dynamic pricing based on network conditions
pub fn calculate_dynamic_pricing(
    base_fee: u64,
    transaction_size: usize,
    congestion_level: u8,
    margin: f64,
) -> Result<u64, casper_types::ApiError> {
    let calculator = create_custom_price_calculator(base_fee, margin)?;
    calculator.estimate_total_cost(transaction_size, congestion_level)
}