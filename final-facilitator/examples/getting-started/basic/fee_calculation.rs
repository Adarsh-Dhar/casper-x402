/*!
# Basic Fee Calculation Example

This example demonstrates how to calculate fees for different types of transactions
using the Casper Facilitator contract.

## Usage:
```bash
cargo run --example fee_calculation
```
*/

use std::collections::HashMap;

#[derive(Debug)]
struct FeeCalculation {
    pub base_fee: u64,
    pub instruction_fee: u64,
    pub priority_fee: u64,
    pub total_fee: u64,
}

#[derive(Debug)]
struct TransactionParams {
    pub size_bytes: u64,
    pub instruction_count: u32,
    pub congestion_level: u8, // 1-10 scale
    pub uses_lookup_tables: bool,
}

fn main() {
    println!("💰 Fee Calculation Examples");
    println!("============================\n");

    // Example 1: Simple transfer transaction
    println!("Example 1: Simple Token Transfer");
    let simple_transfer = TransactionParams {
        size_bytes: 512,
        instruction_count: 2,
        congestion_level: 3,
        uses_lookup_tables: false,
    };
    
    let fee1 = calculate_transaction_fee(&simple_transfer);
    print_fee_breakdown("Simple Transfer", &simple_transfer, &fee1);

    // Example 2: Complex multi-token transaction
    println!("\nExample 2: Multi-Token Swap");
    let complex_swap = TransactionParams {
        size_bytes: 1536,
        instruction_count: 8,
        congestion_level: 7,
        uses_lookup_tables: true,
    };
    
    let fee2 = calculate_transaction_fee(&complex_swap);
    print_fee_breakdown("Multi-Token Swap", &complex_swap, &fee2);

    // Example 3: Batch transaction
    println!("\nExample 3: Batch Payment");
    let batch_payment = TransactionParams {
        size_bytes: 2048,
        instruction_count: 15,
        congestion_level: 5,
        uses_lookup_tables: true,
    };
    
    let fee3 = calculate_transaction_fee(&batch_payment);
    print_fee_breakdown("Batch Payment", &batch_payment, &fee3);

    // Example 4: Fee comparison across congestion levels
    println!("\nExample 4: Fee Impact of Network Congestion");
    let base_tx = TransactionParams {
        size_bytes: 1024,
        instruction_count: 5,
        congestion_level: 1, // Will be varied
        uses_lookup_tables: false,
    };

    println!("Congestion Level | Total Fee (lamports)");
    println!("----------------|-----------------");
    for congestion in 1..=10 {
        let mut tx = base_tx.clone();
        tx.congestion_level = congestion;
        let fee = calculate_transaction_fee(&tx);
        println!("       {}        |     {:>8}", congestion, fee.total_fee);
    }

    // Example 5: Token-based fee calculation
    println!("\nExample 5: Fees in Different Tokens");
    demonstrate_token_fees(&fee1);

    println!("\n✅ Fee calculation examples completed!");
}

fn calculate_transaction_fee(params: &TransactionParams) -> FeeCalculation {
    // Base fee: 5 lamports per byte
    let base_fee = params.size_bytes * 5;
    
    // Instruction fee: 1000 lamports per instruction
    let instruction_fee = params.instruction_count as u64 * 1000;
    
    // Lookup table discount: 10% reduction if used
    let lookup_discount = if params.uses_lookup_tables { 0.9 } else { 1.0 };
    
    // Priority fee based on congestion (exponential scaling)
    let congestion_multiplier = 1.0 + (params.congestion_level as f64 * 0.15);
    let priority_fee = ((base_fee + instruction_fee) as f64 * 
                       (congestion_multiplier - 1.0) * lookup_discount) as u64;
    
    let subtotal = ((base_fee + instruction_fee) as f64 * lookup_discount) as u64;
    let total_fee = subtotal + priority_fee;

    FeeCalculation {
        base_fee,
        instruction_fee,
        priority_fee,
        total_fee,
    }
}

fn print_fee_breakdown(name: &str, params: &TransactionParams, fee: &FeeCalculation) {
    println!("{}:", name);
    println!("  Transaction size: {} bytes", params.size_bytes);
    println!("  Instructions: {}", params.instruction_count);
    println!("  Congestion level: {}/10", params.congestion_level);
    println!("  Uses lookup tables: {}", params.uses_lookup_tables);
    println!("  ┌─ Base fee:        {:>8} lamports", fee.base_fee);
    println!("  ├─ Instruction fee: {:>8} lamports", fee.instruction_fee);
    println!("  ├─ Priority fee:    {:>8} lamports", fee.priority_fee);
    println!("  └─ Total fee:       {:>8} lamports", fee.total_fee);
}

fn demonstrate_token_fees(base_fee: &FeeCalculation) {
    // Mock exchange rates (1 token unit = X lamports)
    let mut token_rates = HashMap::new();
    token_rates.insert("USDC", (1.0, 6));    // 1 USDC = 1 lamport, 6 decimals
    token_rates.insert("CSPR", (0.05, 9));   // 1 CSPR = 0.05 lamports, 9 decimals
    token_rates.insert("WETH", (2500.0, 18)); // 1 WETH = 2500 lamports, 18 decimals
    token_rates.insert("SOL", (100.0, 9));   // 1 SOL = 100 lamports, 9 decimals

    println!("Fee of {} lamports in different tokens:", base_fee.total_fee);
    println!("Token | Amount (with decimals) | Human Readable");
    println!("------|----------------------|---------------");

    for (symbol, (rate, decimals)) in token_rates {
        let token_amount = calculate_fee_in_token(base_fee.total_fee, rate, decimals);
        let human_readable = format_token_amount(token_amount, decimals);
        println!("{:>5} | {:>20} | {:>13} {}", 
                symbol, token_amount, human_readable, symbol);
    }
}

fn calculate_fee_in_token(fee_lamports: u64, exchange_rate: f64, decimals: u8) -> u64 {
    let base_units = 10_u64.pow(decimals as u32);
    ((fee_lamports as f64 / exchange_rate) * base_units as f64) as u64
}

fn format_token_amount(amount: u64, decimals: u8) -> String {
    let divisor = 10_u64.pow(decimals as u32);
    let whole = amount / divisor;
    let fraction = amount % divisor;
    
    if fraction == 0 {
        format!("{}", whole)
    } else {
        let fraction_str = format!("{:0width$}", fraction, width = decimals as usize);
        let trimmed = fraction_str.trim_end_matches('0');
        if trimmed.is_empty() {
            format!("{}", whole)
        } else {
            format!("{}.{}", whole, trimmed)
        }
    }
}

#[derive(Clone)]
struct TransactionParams {
    pub size_bytes: u64,
    pub instruction_count: u32,
    pub congestion_level: u8,
    pub uses_lookup_tables: bool,
}