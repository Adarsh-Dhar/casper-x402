use crate::constants::*;
use crate::errors::*;
use crate::types::FeeCalculation;

/// Calculate total fees for a transaction with Kora's pricing model
pub fn calculate_total_fees(
    transaction_size: u64,
    instruction_count: u32,
    uses_lookup_tables: bool,
    is_payment_required: bool,
    base_fee_rate: u64,
) -> FeeCalculation {
    // Calculate base fee
    let base_fee = calculate_base_fee(transaction_size, base_fee_rate);
    
    // Calculate instruction-based fees
    let instruction_fee = calculate_instruction_fee(instruction_count);
    
    // Calculate lookup table fees
    let lookup_table_fee = if uses_lookup_tables {
        LOOKUP_TABLE_FEE_LAMPORTS
    } else {
        0
    };
    
    // Calculate Kora signature fee
    let kora_signature_fee = if is_payment_required {
        KORA_SIGNATURE_FEE_LAMPORTS
    } else {
        0
    };
    
    // Calculate payment instruction fee
    let payment_instruction_fee = if is_payment_required {
        PAYMENT_INSTRUCTION_FEE_LAMPORTS
    } else {
        0
    };
    
    FeeCalculation::new(
        base_fee,
        instruction_fee,
        lookup_table_fee,
        kora_signature_fee,
        payment_instruction_fee,
    )
}

/// Calculate base fee based on transaction size and rate
fn calculate_base_fee(transaction_size: u64, base_fee_rate: u64) -> u64 {
    // Base fee calculation: size * rate + minimum base fee
    let size_based_fee = transaction_size.saturating_mul(base_fee_rate);
    size_based_fee.saturating_add(BASE_FEE_LAMPORTS)
}

/// Calculate instruction-based fees
fn calculate_instruction_fee(instruction_count: u32) -> u64 {
    (instruction_count as u64).saturating_mul(INSTRUCTION_FEE_LAMPORTS)
}

/// Estimate Kora fee with all components
pub fn estimate_kora_fee(
    transaction_size: u64,
    instruction_count: u32,
    uses_lookup_tables: bool,
    is_payment_required: bool,
    base_fee_rate: u64,
    fee_multiplier: Option<f64>,
) -> Result<FeeCalculation, casper_types::ApiError> {
    // Calculate base fees
    let mut fee_calc = calculate_total_fees(
        transaction_size,
        instruction_count,
        uses_lookup_tables,
        is_payment_required,
        base_fee_rate,
    );
    
    // Apply fee multiplier if provided
    if let Some(multiplier) = fee_multiplier {
        if multiplier < 0.0 || multiplier > 10.0 {
            return Err(invalid_fee_rate_error());
        }
        
        let adjusted_total = (fee_calc.total_fee as f64 * multiplier) as u64;
        
        // Recalculate with adjusted total
        fee_calc = FeeCalculation {
            total_fee: adjusted_total,
            base_fee: (fee_calc.base_fee as f64 * multiplier) as u64,
            instruction_fee: (fee_calc.instruction_fee as f64 * multiplier) as u64,
            lookup_table_fee: (fee_calc.lookup_table_fee as f64 * multiplier) as u64,
            kora_signature_fee: (fee_calc.kora_signature_fee as f64 * multiplier) as u64,
            payment_instruction_fee: (fee_calc.payment_instruction_fee as f64 * multiplier) as u64,
        };
    }
    
    // Apply minimum fee
    if fee_calc.total_fee < MIN_FEE_LAMPORTS {
        fee_calc.total_fee = MIN_FEE_LAMPORTS;
    }
    
    Ok(fee_calc)
}

/// Calculate fee in a specific token using exchange rate
pub fn calculate_fee_in_token(
    fee_in_lamports: u64,
    exchange_rate: Option<f64>,
) -> Result<Option<u64>, casper_types::ApiError> {
    if let Some(rate) = exchange_rate {
        if rate <= 0.0 {
            return Err(invalid_fee_rate_error());
        }
        
        let token_amount = (fee_in_lamports as f64 / rate) as u64;
        Ok(Some(token_amount))
    } else {
        Ok(None)
    }
}

/// Calculate fee payer outflow for transaction analysis
pub fn calculate_fee_payer_outflow(
    transaction_size: u64,
    creates_accounts: bool,
    transfer_count: u32,
) -> u64 {
    let mut total_outflow = 0u64;
    
    // Base outflow based on transaction size
    total_outflow = total_outflow.saturating_add(transaction_size.saturating_mul(100));
    
    // Account creation costs
    if creates_accounts {
        total_outflow = total_outflow.saturating_add(ACCOUNT_CREATION_FEE_LAMPORTS);
    }
    
    // Transfer-based costs
    let transfer_costs = (transfer_count as u64).saturating_mul(1000);
    total_outflow = total_outflow.saturating_add(transfer_costs);
    
    total_outflow
}

/// Get fee estimate for a simple transaction
pub fn get_estimate_fee(instruction_count: u32) -> u64 {
    let base_fee = BASE_FEE_LAMPORTS;
    let instruction_fee = calculate_instruction_fee(instruction_count);
    
    base_fee.saturating_add(instruction_fee)
}

/// Get fee estimate for a resolved transaction with lookup tables
pub fn get_estimate_fee_resolved(
    instruction_count: u32,
    uses_lookup_tables: bool,
) -> u64 {
    let base_fee = BASE_FEE_LAMPORTS;
    let instruction_fee = calculate_instruction_fee(instruction_count);
    let lookup_table_fee = if uses_lookup_tables {
        LOOKUP_TABLE_FEE_LAMPORTS
    } else {
        0
    };
    
    base_fee
        .saturating_add(instruction_fee)
        .saturating_add(lookup_table_fee)
}

/// Validate fee parameters
pub fn validate_fee_parameters(
    transaction_size: u64,
    instruction_count: u32,
    base_fee_rate: u64,
) -> Result<(), casper_types::ApiError> {
    // Check transaction size limits
    if transaction_size == 0 || transaction_size > 1_000_000 {
        return Err(invalid_transaction_error());
    }
    
    // Check instruction count limits
    if instruction_count > 10_000 {
        return Err(invalid_transaction_error());
    }
    
    // Check fee rate limits
    if base_fee_rate > 1_000_000 {
        return Err(invalid_fee_rate_error());
    }
    
    Ok(())
}

/// Calculate priority fee based on network congestion
pub fn calculate_priority_fee(
    base_fee: u64,
    congestion_level: u8,
) -> Result<u64, casper_types::ApiError> {
    if congestion_level > 10 {
        return Err(invalid_fee_rate_error());
    }
    
    let congestion_multiplier = 1.0 + (congestion_level as f64 * CONGESTION_MULTIPLIER_BASE);
    let priority_fee = (base_fee as f64 * congestion_multiplier) as u64;
    
    // Cap the priority fee
    let capped_fee = priority_fee.min(MAX_PRIORITY_FEE_LAMPORTS);
    
    Ok(capped_fee)
}

/// Convert lamports to token amount using exchange rate
pub fn convert_lamports_to_token(
    lamports: u64,
    exchange_rate: f64,
) -> Result<u64, casper_types::ApiError> {
    if exchange_rate <= 0.0 {
        return Err(invalid_fee_rate_error());
    }
    
    let token_amount = (lamports as f64 / exchange_rate) as u64;
    Ok(token_amount)
}

/// Convert token amount to lamports using exchange rate
pub fn convert_token_to_lamports(
    token_amount: u64,
    exchange_rate: f64,
) -> Result<u64, casper_types::ApiError> {
    if exchange_rate <= 0.0 {
        return Err(invalid_fee_rate_error());
    }
    
    let lamports = (token_amount as f64 * exchange_rate) as u64;
    Ok(lamports)
}