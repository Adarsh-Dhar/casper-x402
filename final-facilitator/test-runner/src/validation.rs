// Validation logic and tests

pub fn validate_transaction_size(size: u64) -> Result<(), &'static str> {
    if size == 0 {
        Err("Transaction size cannot be zero")
    } else if size > 1_000_000 {
        Err("Transaction size too large")
    } else {
        Ok(())
    }
}

pub fn validate_instruction_count(count: u32) -> Result<(), &'static str> {
    if count == 0 {
        Err("Instruction count cannot be zero")
    } else if count > 1000 {
        Err("Too many instructions")
    } else {
        Ok(())
    }
}

pub fn validate_signer_weight(weight: u32) -> Result<(), &'static str> {
    if weight == 0 {
        Err("Signer weight cannot be zero")
    } else if weight > 10000 {
        Err("Signer weight too large")
    } else {
        Ok(())
    }
}

pub fn validate_fee_rate(rate: u64) -> Result<(), &'static str> {
    if rate == 0 {
        Err("Fee rate cannot be zero")
    } else if rate > 100_000 {
        Err("Fee rate too high")
    } else {
        Ok(())
    }
}

pub fn validate_transaction_data(data: &[u8]) -> Result<(), &'static str> {
    if data.is_empty() {
        Err("Transaction data cannot be empty")
    } else if data.len() > 100_000 {
        Err("Transaction data too large")
    } else {
        Ok(())
    }
}

pub fn validate_signature(signature: &str) -> Result<(), &'static str> {
    if signature.is_empty() {
        Err("Signature cannot be empty")
    } else if signature.len() > 1000 {
        Err("Signature too long")
    } else {
        Ok(())
    }
}

pub fn validate_congestion_level(level: u8) -> Result<(), &'static str> {
    if level > 10 {
        Err("Congestion level too high")
    } else {
        Ok(())
    }
}

pub fn validate_percentage(percentage: u16) -> Result<(), &'static str> {
    if percentage > 10000 {
        Err("Percentage cannot exceed 100%")
    } else {
        Ok(())
    }
}

pub fn validate_account_hash(hash: &[u8; 32]) -> Result<(), &'static str> {
    // Check for all-zero hash (invalid)
    if hash.iter().all(|&b| b == 0) {
        Err("Account hash cannot be all zeros")
    } else {
        Ok(())
    }
}

pub fn validate_contract_hash(hash: &[u8; 32]) -> Result<(), &'static str> {
    // Check for all-zero hash (invalid)
    if hash.iter().all(|&b| b == 0) {
        Err("Contract hash cannot be all zeros")
    } else {
        Ok(())
    }
}

// Comprehensive validation for transaction processing
pub struct TransactionValidation {
    pub signature: String,
    pub transaction_data: Vec<u8>,
    pub transaction_size: u64,
    pub instruction_count: u32,
    pub congestion_level: u8,
}

impl TransactionValidation {
    pub fn validate(&self) -> Result<(), &'static str> {
        validate_signature(&self.signature)?;
        validate_transaction_data(&self.transaction_data)?;
        validate_transaction_size(self.transaction_size)?;
        validate_instruction_count(self.instruction_count)?;
        validate_congestion_level(self.congestion_level)?;
        
        // Cross-validation: transaction size should match data length
        if self.transaction_size != self.transaction_data.len() as u64 {
            return Err("Transaction size mismatch");
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transaction_size_validation() {
        // Valid sizes
        assert!(validate_transaction_size(1).is_ok());
        assert!(validate_transaction_size(1000).is_ok());
        assert!(validate_transaction_size(1_000_000).is_ok());
        
        // Invalid sizes
        assert!(validate_transaction_size(0).is_err());
        assert!(validate_transaction_size(1_000_001).is_err());
    }

    #[test]
    fn test_instruction_count_validation() {
        // Valid counts
        assert!(validate_instruction_count(1).is_ok());
        assert!(validate_instruction_count(100).is_ok());
        assert!(validate_instruction_count(1000).is_ok());
        
        // Invalid counts
        assert!(validate_instruction_count(0).is_err());
        assert!(validate_instruction_count(1001).is_err());
    }

    #[test]
    fn test_signer_weight_validation() {
        // Valid weights
        assert!(validate_signer_weight(1).is_ok());
        assert!(validate_signer_weight(1000).is_ok());
        assert!(validate_signer_weight(10000).is_ok());
        
        // Invalid weights
        assert!(validate_signer_weight(0).is_err());
        assert!(validate_signer_weight(10001).is_err());
    }

    #[test]
    fn test_fee_rate_validation() {
        // Valid rates
        assert!(validate_fee_rate(1).is_ok());
        assert!(validate_fee_rate(1000).is_ok());
        assert!(validate_fee_rate(100_000).is_ok());
        
        // Invalid rates
        assert!(validate_fee_rate(0).is_err());
        assert!(validate_fee_rate(100_001).is_err());
    }

    #[test]
    fn test_transaction_data_validation() {
        // Valid data
        assert!(validate_transaction_data(&[1]).is_ok());
        assert!(validate_transaction_data(&vec![0u8; 1000]).is_ok());
        assert!(validate_transaction_data(&vec![0u8; 100_000]).is_ok());
        
        // Invalid data
        assert!(validate_transaction_data(&[]).is_err());
        assert!(validate_transaction_data(&vec![0u8; 100_001]).is_err());
    }

    #[test]
    fn test_signature_validation() {
        // Valid signatures
        assert!(validate_signature("valid_signature").is_ok());
        assert!(validate_signature(&"a".repeat(1000)).is_ok());
        
        // Invalid signatures
        assert!(validate_signature("").is_err());
        assert!(validate_signature(&"a".repeat(1001)).is_err());
    }

    #[test]
    fn test_congestion_level_validation() {
        // Valid levels
        assert!(validate_congestion_level(0).is_ok());
        assert!(validate_congestion_level(5).is_ok());
        assert!(validate_congestion_level(10).is_ok());
        
        // Invalid levels
        assert!(validate_congestion_level(11).is_err());
        assert!(validate_congestion_level(255).is_err());
    }

    #[test]
    fn test_percentage_validation() {
        // Valid percentages
        assert!(validate_percentage(0).is_ok());
        assert!(validate_percentage(5000).is_ok()); // 50%
        assert!(validate_percentage(10000).is_ok()); // 100%
        
        // Invalid percentages
        assert!(validate_percentage(10001).is_err());
        assert!(validate_percentage(65535).is_err());
    }

    #[test]
    fn test_account_hash_validation() {
        // Valid hashes
        assert!(validate_account_hash(&[1u8; 32]).is_ok());
        assert!(validate_account_hash(&[255u8; 32]).is_ok());
        
        // Invalid hash (all zeros)
        assert!(validate_account_hash(&[0u8; 32]).is_err());
    }

    #[test]
    fn test_contract_hash_validation() {
        // Valid hashes
        assert!(validate_contract_hash(&[1u8; 32]).is_ok());
        assert!(validate_contract_hash(&[255u8; 32]).is_ok());
        
        // Invalid hash (all zeros)
        assert!(validate_contract_hash(&[0u8; 32]).is_err());
    }

    #[test]
    fn test_comprehensive_transaction_validation() {
        // Valid transaction
        let valid_tx = TransactionValidation {
            signature: "valid_signature".to_string(),
            transaction_data: vec![1, 2, 3, 4, 5],
            transaction_size: 5,
            instruction_count: 3,
            congestion_level: 5,
        };
        assert!(valid_tx.validate().is_ok());
        
        // Invalid signature
        let invalid_sig = TransactionValidation {
            signature: "".to_string(),
            transaction_data: vec![1, 2, 3],
            transaction_size: 3,
            instruction_count: 1,
            congestion_level: 1,
        };
        assert!(invalid_sig.validate().is_err());
        
        // Size mismatch
        let size_mismatch = TransactionValidation {
            signature: "valid".to_string(),
            transaction_data: vec![1, 2, 3],
            transaction_size: 5, // Doesn't match data length
            instruction_count: 1,
            congestion_level: 1,
        };
        assert!(size_mismatch.validate().is_err());
        
        // Empty transaction data
        let empty_data = TransactionValidation {
            signature: "valid".to_string(),
            transaction_data: vec![],
            transaction_size: 0,
            instruction_count: 1,
            congestion_level: 1,
        };
        assert!(empty_data.validate().is_err());
        
        // Invalid instruction count
        let invalid_instructions = TransactionValidation {
            signature: "valid".to_string(),
            transaction_data: vec![1, 2, 3],
            transaction_size: 3,
            instruction_count: 0,
            congestion_level: 1,
        };
        assert!(invalid_instructions.validate().is_err());
        
        // Invalid congestion level
        let invalid_congestion = TransactionValidation {
            signature: "valid".to_string(),
            transaction_data: vec![1, 2, 3],
            transaction_size: 3,
            instruction_count: 1,
            congestion_level: 15,
        };
        assert!(invalid_congestion.validate().is_err());
    }

    #[test]
    fn test_edge_case_validations() {
        // Minimum valid values
        assert!(validate_transaction_size(1).is_ok());
        assert!(validate_instruction_count(1).is_ok());
        assert!(validate_signer_weight(1).is_ok());
        assert!(validate_fee_rate(1).is_ok());
        assert!(validate_congestion_level(0).is_ok());
        assert!(validate_percentage(0).is_ok());
        
        // Maximum valid values
        assert!(validate_transaction_size(1_000_000).is_ok());
        assert!(validate_instruction_count(1000).is_ok());
        assert!(validate_signer_weight(10000).is_ok());
        assert!(validate_fee_rate(100_000).is_ok());
        assert!(validate_congestion_level(10).is_ok());
        assert!(validate_percentage(10000).is_ok());
        
        // Just over the limit
        assert!(validate_transaction_size(1_000_001).is_err());
        assert!(validate_instruction_count(1001).is_err());
        assert!(validate_signer_weight(10001).is_err());
        assert!(validate_fee_rate(100_001).is_err());
        assert!(validate_congestion_level(11).is_err());
        assert!(validate_percentage(10001).is_err());
    }

    #[test]
    fn test_validation_error_messages() {
        // Test that error messages are descriptive
        assert_eq!(validate_transaction_size(0).unwrap_err(), "Transaction size cannot be zero");
        assert_eq!(validate_instruction_count(0).unwrap_err(), "Instruction count cannot be zero");
        assert_eq!(validate_signer_weight(0).unwrap_err(), "Signer weight cannot be zero");
        assert_eq!(validate_fee_rate(0).unwrap_err(), "Fee rate cannot be zero");
        assert_eq!(validate_transaction_data(&[]).unwrap_err(), "Transaction data cannot be empty");
        assert_eq!(validate_signature("").unwrap_err(), "Signature cannot be empty");
        assert_eq!(validate_congestion_level(11).unwrap_err(), "Congestion level too high");
        assert_eq!(validate_percentage(10001).unwrap_err(), "Percentage cannot exceed 100%");
        assert_eq!(validate_account_hash(&[0u8; 32]).unwrap_err(), "Account hash cannot be all zeros");
        assert_eq!(validate_contract_hash(&[0u8; 32]).unwrap_err(), "Contract hash cannot be all zeros");
    }
}