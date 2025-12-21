// Fee calculation logic and tests

#[derive(Debug, Clone, PartialEq)]
pub struct FeeCalculation {
    pub base_fee: u64,
    pub instruction_fee: u64,
    pub priority_fee: u64,
    pub payment_fee: u64,
    pub total_fee: u64,
}

impl FeeCalculation {
    pub fn new(base_fee: u64, instruction_fee: u64, priority_fee: u64, payment_fee: u64) -> Self {
        let total_fee = base_fee + instruction_fee + priority_fee + payment_fee;
        Self {
            base_fee,
            instruction_fee,
            priority_fee,
            payment_fee,
            total_fee,
        }
    }

    pub fn validate(&self) -> bool {
        self.total_fee == self.base_fee + self.instruction_fee + self.priority_fee + self.payment_fee
    }
}

pub fn calculate_base_fee(transaction_size: u64, base_fee_rate: u64) -> u64 {
    base_fee_rate * transaction_size
}

pub fn calculate_instruction_fee(instruction_count: u32) -> u64 {
    (instruction_count as u64) * 100 // 100 units per instruction
}

pub fn calculate_priority_fee(base_fee: u64, congestion_level: u8) -> u64 {
    let multiplier = 1.0 + (congestion_level as f64 * 0.1);
    ((base_fee as f64) * (multiplier - 1.0)) as u64
}

pub fn calculate_total_fees(
    transaction_size: u64,
    instruction_count: u32,
    uses_lookup_tables: bool,
    is_payment_required: bool,
    base_fee_rate: u64,
) -> FeeCalculation {
    let base_fee = calculate_base_fee(transaction_size, base_fee_rate);
    let instruction_fee = calculate_instruction_fee(instruction_count);
    
    // Lookup tables provide a discount
    let lookup_discount = if uses_lookup_tables { 0.9 } else { 1.0 };
    let discounted_base = (base_fee as f64 * lookup_discount) as u64;
    
    let priority_fee = 0; // Simplified for now
    let payment_fee = if is_payment_required { 200 } else { 0 };
    
    FeeCalculation::new(discounted_base, instruction_fee, priority_fee, payment_fee)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_base_fee_calculation() {
        let fee = calculate_base_fee(1000, 1000);
        assert_eq!(fee, 1000000);
        
        let zero_fee = calculate_base_fee(0, 1000);
        assert_eq!(zero_fee, 0);
        
        let large_fee = calculate_base_fee(10000, 2000);
        assert_eq!(large_fee, 20000000);
    }

    #[test]
    fn test_instruction_fee_calculation() {
        let fee = calculate_instruction_fee(5);
        assert_eq!(fee, 500);
        
        let zero_fee = calculate_instruction_fee(0);
        assert_eq!(zero_fee, 0);
        
        let large_fee = calculate_instruction_fee(100);
        assert_eq!(large_fee, 10000);
    }

    #[test]
    fn test_priority_fee_calculation() {
        let base_fee = 1000u64;
        
        let no_congestion = calculate_priority_fee(base_fee, 0);
        assert_eq!(no_congestion, 0);
        
        let medium_congestion = calculate_priority_fee(base_fee, 5);
        assert_eq!(medium_congestion, 500);
        
        let high_congestion = calculate_priority_fee(base_fee, 10);
        assert_eq!(high_congestion, 1000);
    }

    #[test]
    fn test_total_fee_calculation() {
        let fee_calc = calculate_total_fees(1000, 5, false, false, 1000);
        
        assert_eq!(fee_calc.base_fee, 1000000);
        assert_eq!(fee_calc.instruction_fee, 500);
        assert_eq!(fee_calc.priority_fee, 0);
        assert_eq!(fee_calc.payment_fee, 0);
        assert_eq!(fee_calc.total_fee, 1000500);
        assert!(fee_calc.validate());
    }

    #[test]
    fn test_fee_with_lookup_tables() {
        let without_lut = calculate_total_fees(1000, 5, false, false, 1000);
        let with_lut = calculate_total_fees(1000, 5, true, false, 1000);
        
        // With lookup tables should have lower base fee
        assert!(with_lut.base_fee < without_lut.base_fee);
        assert_eq!(with_lut.base_fee, 900000); // 90% of 1000000
    }

    #[test]
    fn test_fee_with_payment() {
        let without_payment = calculate_total_fees(1000, 5, false, false, 1000);
        let with_payment = calculate_total_fees(1000, 5, false, true, 1000);
        
        assert_eq!(with_payment.payment_fee, 200);
        assert_eq!(with_payment.total_fee, without_payment.total_fee + 200);
    }

    #[test]
    fn test_fee_scaling() {
        let small_tx = calculate_total_fees(500, 3, false, false, 1000);
        let large_tx = calculate_total_fees(2000, 3, false, false, 1000);
        
        assert!(large_tx.total_fee > small_tx.total_fee);
        assert_eq!(small_tx.base_fee, 500000);
        assert_eq!(large_tx.base_fee, 2000000);
    }

    #[test]
    fn test_instruction_scaling() {
        let few_instructions = calculate_total_fees(1000, 1, false, false, 1000);
        let many_instructions = calculate_total_fees(1000, 10, false, false, 1000);
        
        assert!(many_instructions.total_fee > few_instructions.total_fee);
        assert_eq!(few_instructions.instruction_fee, 100);
        assert_eq!(many_instructions.instruction_fee, 1000);
    }

    #[test]
    fn test_edge_cases() {
        // Zero transaction size
        let zero_size = calculate_total_fees(0, 1, false, false, 1000);
        assert_eq!(zero_size.base_fee, 0);
        assert!(zero_size.total_fee > 0); // Still has instruction fee
        
        // Zero instructions
        let zero_instructions = calculate_total_fees(1000, 0, false, false, 1000);
        assert_eq!(zero_instructions.instruction_fee, 0);
        assert!(zero_instructions.total_fee > 0); // Still has base fee
        
        // All options enabled
        let full_featured = calculate_total_fees(1000, 5, true, true, 1000);
        assert!(full_featured.total_fee > 0);
        assert_eq!(full_featured.payment_fee, 200);
        assert_eq!(full_featured.base_fee, 900000); // With LUT discount
    }

    #[test]
    fn test_fee_calculation_validation() {
        let fee_calc = calculate_total_fees(1000, 5, true, true, 1000);
        assert!(fee_calc.validate());
        
        // Test invalid fee calculation
        let invalid_calc = FeeCalculation {
            base_fee: 1000,
            instruction_fee: 500,
            priority_fee: 100,
            payment_fee: 200,
            total_fee: 1000, // Wrong total
        };
        assert!(!invalid_calc.validate());
    }
}