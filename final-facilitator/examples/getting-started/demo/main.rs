/*!
# Casper Facilitator Demo

This example demonstrates the core functionality of the Casper Facilitator contract,
including fee calculation, token management, and transaction processing.

## Features Demonstrated:
- Fee estimation and calculation
- Token registry management
- Signer pool operations
- Transaction processing simulation
- Admin operations

## Usage:
```bash
cargo run --example demo
```
*/

use casper_types::{ContractHash, U256, account::AccountHash, PublicKey};
use std::collections::HashMap;

// Mock structures for demonstration
#[derive(Debug, Clone)]
struct MockTransaction {
    pub size: u64,
    pub instruction_count: u32,
    pub uses_lookup_tables: bool,
    pub is_payment_required: bool,
}

#[derive(Debug, Clone)]
struct MockSigner {
    pub public_key: String,
    pub weight: u32,
    pub is_active: bool,
}

#[derive(Debug, Clone)]
struct MockToken {
    pub contract_hash: String,
    pub symbol: String,
    pub decimals: u8,
    pub exchange_rate: Option<f64>,
}

fn main() {
    println!("🚀 Casper Facilitator Demo");
    println!("==========================\n");

    // Demo 1: Fee Calculation
    demo_fee_calculation();
    
    // Demo 2: Token Management
    demo_token_management();
    
    // Demo 3: Signer Pool Operations
    demo_signer_operations();
    
    // Demo 4: Transaction Processing
    demo_transaction_processing();
    
    // Demo 5: Admin Operations
    demo_admin_operations();
    
    println!("\n✅ Demo completed successfully!");
    println!("Check the individual example files for more detailed implementations.");
}

fn demo_fee_calculation() {
    println!("📊 Demo 1: Fee Calculation");
    println!("--------------------------");
    
    // Create a mock transaction
    let transaction = MockTransaction {
        size: 1024,
        instruction_count: 5,
        uses_lookup_tables: true,
        is_payment_required: true,
    };
    
    // Base fee calculation
    let base_fee_rate = 5000; // lamports per signature
    let base_fee = calculate_base_fee(transaction.size, base_fee_rate);
    println!("Base fee: {} lamports", base_fee);
    
    // Instruction fee
    let instruction_fee = calculate_instruction_fee(transaction.instruction_count);
    println!("Instruction fee: {} lamports", instruction_fee);
    
    // Priority fee based on network congestion
    let congestion_level = 7; // Scale of 1-10
    let priority_fee = calculate_priority_fee(base_fee, congestion_level);
    println!("Priority fee (congestion {}): {} lamports", congestion_level, priority_fee);
    
    // Total fee calculation
    let total_fee = base_fee + instruction_fee + priority_fee;
    println!("Total estimated fee: {} lamports", total_fee);
    
    // Convert to token equivalent
    let token_exchange_rate = 1.5; // 1 token = 1.5 lamports
    let fee_in_tokens = (total_fee as f64 / token_exchange_rate) as u64;
    println!("Fee in tokens: {} units", fee_in_tokens);
    
    println!();
}

fn demo_token_management() {
    println!("🪙 Demo 2: Token Management");
    println!("---------------------------");
    
    // Create mock supported tokens
    let mut supported_tokens = HashMap::new();
    
    let usdc_token = MockToken {
        contract_hash: "hash-1234567890abcdef".to_string(),
        symbol: "USDC".to_string(),
        decimals: 6,
        exchange_rate: Some(1.0),
    };
    
    let cspr_token = MockToken {
        contract_hash: "hash-abcdef1234567890".to_string(),
        symbol: "CSPR".to_string(),
        decimals: 9,
        exchange_rate: Some(0.05),
    };
    
    supported_tokens.insert("USDC", usdc_token.clone());
    supported_tokens.insert("CSPR", cspr_token.clone());
    
    println!("Supported tokens:");
    for (symbol, token) in &supported_tokens {
        println!("  {} - {} decimals, rate: {:?}", 
                symbol, token.decimals, token.exchange_rate);
    }
    
    // Demonstrate token fee calculation
    let fee_in_lamports = 50000;
    for (symbol, token) in &supported_tokens {
        if let Some(rate) = token.exchange_rate {
            let fee_in_token = calculate_token_fee(fee_in_lamports, rate, token.decimals);
            println!("Fee in {}: {} units", symbol, fee_in_token);
        }
    }
    
    println!();
}

fn demo_signer_operations() {
    println!("✍️ Demo 3: Signer Pool Operations");
    println!("----------------------------------");
    
    // Create mock signer pool
    let mut signers = Vec::new();
    
    signers.push(MockSigner {
        public_key: "01abcd1234567890".to_string(),
        weight: 100,
        is_active: true,
    });
    
    signers.push(MockSigner {
        public_key: "01efgh0987654321".to_string(),
        weight: 75,
        is_active: true,
    });
    
    signers.push(MockSigner {
        public_key: "01ijkl1122334455".to_string(),
        weight: 50,
        is_active: false,
    });
    
    println!("Signer pool status:");
    let total_weight: u32 = signers.iter()
        .filter(|s| s.is_active)
        .map(|s| s.weight)
        .sum();
    
    println!("Total active weight: {}", total_weight);
    println!("Active signers: {}", signers.iter().filter(|s| s.is_active).count());
    
    for (i, signer) in signers.iter().enumerate() {
        let status = if signer.is_active { "ACTIVE" } else { "INACTIVE" };
        println!("  Signer {}: {}... (weight: {}, status: {})", 
                i + 1, &signer.public_key[..10], signer.weight, status);
    }
    
    // Demonstrate signer selection
    let selected_signer = select_signer_by_weight(&signers);
    if let Some(signer) = selected_signer {
        println!("Selected signer: {}... (weight: {})", 
                &signer.public_key[..10], signer.weight);
    }
    
    println!();
}

fn demo_transaction_processing() {
    println!("⚡ Demo 4: Transaction Processing");
    println!("---------------------------------");
    
    // Simulate transaction processing workflow
    let transaction = MockTransaction {
        size: 2048,
        instruction_count: 8,
        uses_lookup_tables: false,
        is_payment_required: true,
    };
    
    println!("Processing transaction:");
    println!("  Size: {} bytes", transaction.size);
    println!("  Instructions: {}", transaction.instruction_count);
    println!("  Uses lookup tables: {}", transaction.uses_lookup_tables);
    println!("  Payment required: {}", transaction.is_payment_required);
    
    // Step 1: Validate transaction
    let is_valid = validate_transaction(&transaction);
    println!("  Validation: {}", if is_valid { "✅ PASSED" } else { "❌ FAILED" });
    
    if !is_valid {
        println!("  Transaction rejected due to validation failure");
        return;
    }
    
    // Step 2: Calculate fees
    let estimated_fee = estimate_transaction_fee(&transaction);
    println!("  Estimated fee: {} lamports", estimated_fee);
    
    // Step 3: Process payment
    let payment_processed = process_fee_payment(estimated_fee);
    println!("  Payment processing: {}", if payment_processed { "✅ SUCCESS" } else { "❌ FAILED" });
    
    // Step 4: Execute transaction
    if payment_processed {
        let execution_result = execute_transaction(&transaction);
        println!("  Execution: {}", if execution_result { "✅ SUCCESS" } else { "❌ FAILED" });
        
        if execution_result {
            println!("  Transaction hash: 0x{}", generate_mock_hash());
        }
    }
    
    println!();
}

fn demo_admin_operations() {
    println!("🔧 Demo 5: Admin Operations");
    println!("---------------------------");
    
    // Demonstrate admin functions
    println!("Admin operations available:");
    
    // Fee rate management
    let current_base_fee = 5000;
    let new_base_fee = 6000;
    println!("  Base fee rate: {} → {} lamports", current_base_fee, new_base_fee);
    
    // Token management
    println!("  Adding new token: WETH");
    let new_token = MockToken {
        contract_hash: "hash-weth123456789".to_string(),
        symbol: "WETH".to_string(),
        decimals: 18,
        exchange_rate: Some(2500.0),
    };
    println!("    Contract: {}", new_token.contract_hash);
    println!("    Decimals: {}", new_token.decimals);
    println!("    Exchange rate: {:?}", new_token.exchange_rate);
    
    // Signer management
    println!("  Adding new signer:");
    let new_signer = MockSigner {
        public_key: "01newkey9876543210".to_string(),
        weight: 80,
        is_active: true,
    };
    println!("    Public key: {}...", &new_signer.public_key[..12]);
    println!("    Weight: {}", new_signer.weight);
    
    // Contract pause/unpause
    let is_paused = false;
    println!("  Contract status: {}", if is_paused { "PAUSED" } else { "ACTIVE" });
    
    // Statistics
    println!("  Current statistics:");
    println!("    Total transactions processed: 1,234");
    println!("    Total fees collected: 567,890 lamports");
    println!("    Active signers: 3");
    println!("    Supported tokens: 4");
    
    println!();
}

// Helper functions for demonstration

fn calculate_base_fee(transaction_size: u64, base_fee_rate: u64) -> u64 {
    (transaction_size * base_fee_rate) / 1000 // Per KB
}

fn calculate_instruction_fee(instruction_count: u32) -> u64 {
    instruction_count as u64 * 1000 // 1000 lamports per instruction
}

fn calculate_priority_fee(base_fee: u64, congestion_level: u8) -> u64 {
    let multiplier = 1.0 + (congestion_level as f64 * 0.1);
    (base_fee as f64 * multiplier) as u64 - base_fee
}

fn calculate_token_fee(fee_in_lamports: u64, exchange_rate: f64, decimals: u8) -> u64 {
    let base_units = 10_u64.pow(decimals as u32);
    ((fee_in_lamports as f64 / exchange_rate) * base_units as f64) as u64
}

fn select_signer_by_weight(signers: &[MockSigner]) -> Option<&MockSigner> {
    signers.iter()
        .filter(|s| s.is_active)
        .max_by_key(|s| s.weight)
}

fn validate_transaction(transaction: &MockTransaction) -> bool {
    transaction.size > 0 && 
    transaction.instruction_count > 0 && 
    transaction.size < 10000 // Max size limit
}

fn estimate_transaction_fee(transaction: &MockTransaction) -> u64 {
    let base_fee = calculate_base_fee(transaction.size, 5000);
    let instruction_fee = calculate_instruction_fee(transaction.instruction_count);
    let priority_fee = calculate_priority_fee(base_fee, 5);
    
    base_fee + instruction_fee + priority_fee
}

fn process_fee_payment(fee_amount: u64) -> bool {
    // Simulate payment processing
    fee_amount > 0 && fee_amount < 1_000_000 // Reasonable fee range
}

fn execute_transaction(transaction: &MockTransaction) -> bool {
    // Simulate transaction execution
    transaction.size > 0 && transaction.instruction_count <= 20 // Max instructions
}

fn generate_mock_hash() -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    let mut hasher = DefaultHasher::new();
    std::time::SystemTime::now().hash(&mut hasher);
    format!("{:x}", hasher.finish())
}