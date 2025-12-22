/*!
# Payment Processor Integration Example

This example demonstrates how to integrate the Casper Facilitator into a real-world
payment processing application, showing end-to-end transaction flows.

## Usage:
```bash
cargo run --example payment_processor
```
*/

use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH, Duration};

#[derive(Debug, Clone)]
struct PaymentRequest {
    pub id: String,
    pub from_account: String,
    pub to_account: String,
    pub token_symbol: String,
    pub amount: u64, // In token's smallest unit
    pub deadline: u64, // Unix timestamp
    pub user_signature: String,
}

#[derive(Debug, Clone)]
struct PaymentResult {
    pub request_id: String,
    pub success: bool,
    pub transaction_hash: Option<String>,
    pub fee_paid: Option<u64>,
    pub fee_token: Option<String>,
    pub error_message: Option<String>,
    pub processing_time: Duration,
}

#[derive(Debug)]
struct PaymentProcessor {
    facilitator_contract: String,
    supported_tokens: HashMap<String, TokenInfo>,
    fee_rates: FeeRates,
    admin_account: String,
}

#[derive(Debug, Clone)]
struct TokenInfo {
    pub contract_hash: String,
    pub decimals: u8,
    pub exchange_rate: f64, // To lamports
    pub min_amount: u64,
    pub max_amount: u64,
}

#[derive(Debug)]
struct FeeRates {
    pub base_rate: u64,        // lamports per KB
    pub instruction_rate: u64, // lamports per instruction
    pub priority_multiplier: f64,
}

impl PaymentProcessor {
    fn new(facilitator_contract: String, admin_account: String) -> Self {
        let mut supported_tokens = HashMap::new();
        
        // Add supported tokens
        supported_tokens.insert("USDC".to_string(), TokenInfo {
            contract_hash: "hash-usdc-mainnet".to_string(),
            decimals: 6,
            exchange_rate: 1.0,
            min_amount: 1_000_000, // 1 USDC
            max_amount: 1_000_000_000_000, // 1M USDC
        });
        
        supported_tokens.insert("CSPR".to_string(), TokenInfo {
            contract_hash: "hash-cspr-mainnet".to_string(),
            decimals: 9,
            exchange_rate: 0.05,
            min_amount: 1_000_000_000, // 1 CSPR
            max_amount: 1_000_000_000_000_000, // 1M CSPR
        });
        
        let fee_rates = FeeRates {
            base_rate: 5000,
            instruction_rate: 1000,
            priority_multiplier: 1.5,
        };
        
        Self {
            facilitator_contract,
            supported_tokens,
            fee_rates,
            admin_account,
        }
    }
    
    async fn process_payment(&self, request: PaymentRequest) -> PaymentResult {
        let start_time = SystemTime::now();
        let request_id = request.id.clone();
        
        println!("🔄 Processing payment: {}", request_id);
        
        // Step 1: Validate payment request
        if let Err(error) = self.validate_payment_request(&request) {
            return PaymentResult {
                request_id,
                success: false,
                transaction_hash: None,
                fee_paid: None,
                fee_token: None,
                error_message: Some(error),
                processing_time: start_time.elapsed().unwrap_or_default(),
            };
        }
        
        // Step 2: Calculate fees
        let fee_calculation = match self.calculate_payment_fees(&request) {
            Ok(fees) => fees,
            Err(error) => {
                return PaymentResult {
                    request_id,
                    success: false,
                    transaction_hash: None,
                    fee_paid: None,
                    fee_token: None,
                    error_message: Some(error),
                    processing_time: start_time.elapsed().unwrap_or_default(),
                };
            }
        };
        
        println!("  💰 Calculated fee: {} lamports", fee_calculation.total_fee);
        
        // Step 3: Prepare transaction
        let transaction = match self.prepare_transaction(&request, &fee_calculation) {
            Ok(tx) => tx,
            Err(error) => {
                return PaymentResult {
                    request_id,
                    success: false,
                    transaction_hash: None,
                    fee_paid: None,
                    fee_token: None,
                    error_message: Some(error),
                    processing_time: start_time.elapsed().unwrap_or_default(),
                };
            }
        };
        
        // Step 4: Submit to facilitator
        let submission_result = self.submit_to_facilitator(&transaction).await;
        
        match submission_result {
            Ok(tx_hash) => {
                println!("  ✅ Payment successful: {}", tx_hash);
                PaymentResult {
                    request_id,
                    success: true,
                    transaction_hash: Some(tx_hash),
                    fee_paid: Some(fee_calculation.total_fee),
                    fee_token: Some("lamports".to_string()),
                    error_message: None,
                    processing_time: start_time.elapsed().unwrap_or_default(),
                }
            }
            Err(error) => {
                println!("  ❌ Payment failed: {}", error);
                PaymentResult {
                    request_id,
                    success: false,
                    transaction_hash: None,
                    fee_paid: None,
                    fee_token: None,
                    error_message: Some(error),
                    processing_time: start_time.elapsed().unwrap_or_default(),
                }
            }
        }
    }
    
    fn validate_payment_request(&self, request: &PaymentRequest) -> Result<(), String> {
        // Check if token is supported
        let token_info = self.supported_tokens.get(&request.token_symbol)
            .ok_or_else(|| format!("Token {} not supported", request.token_symbol))?;
        
        // Check amount limits
        if request.amount < token_info.min_amount {
            return Err(format!("Amount below minimum: {} < {}", 
                             request.amount, token_info.min_amount));
        }
        
        if request.amount > token_info.max_amount {
            return Err(format!("Amount above maximum: {} > {}", 
                             request.amount, token_info.max_amount));
        }
        
        // Check deadline
        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        if request.deadline <= current_time {
            return Err("Payment deadline has passed".to_string());
        }
        
        // Validate signature format
        if request.user_signature.len() < 64 {
            return Err("Invalid signature format".to_string());
        }
        
        // Validate account formats
        if !request.from_account.starts_with("account-hash-") {
            return Err("Invalid from_account format".to_string());
        }
        
        if !request.to_account.starts_with("account-hash-") {
            return Err("Invalid to_account format".to_string());
        }
        
        Ok(())
    }
    
    fn calculate_payment_fees(&self, request: &PaymentRequest) -> Result<FeeCalculation, String> {
        // Estimate transaction size based on payment type
        let estimated_size = self.estimate_transaction_size(request);
        let instruction_count = self.estimate_instruction_count(request);
        
        // Calculate base fee
        let base_fee = (estimated_size * self.fee_rates.base_rate) / 1024; // Per KB
        
        // Calculate instruction fee
        let instruction_fee = instruction_count as u64 * self.fee_rates.instruction_rate;
        
        // Calculate priority fee (based on network congestion)
        let network_congestion = self.get_network_congestion_level();
        let priority_multiplier = 1.0 + (network_congestion as f64 * 0.1);
        let priority_fee = ((base_fee + instruction_fee) as f64 * 
                           (priority_multiplier - 1.0)) as u64;
        
        let total_fee = base_fee + instruction_fee + priority_fee;
        
        Ok(FeeCalculation {
            base_fee,
            instruction_fee,
            priority_fee,
            total_fee,
            estimated_size,
            instruction_count,
        })
    }
    
    fn estimate_transaction_size(&self, request: &PaymentRequest) -> u64 {
        // Base transaction size
        let mut size = 512; // Base transaction overhead
        
        // Add size for token transfer instruction
        size += 256;
        
        // Add size for signature
        size += 64;
        
        // Add size for account references
        size += request.from_account.len() as u64;
        size += request.to_account.len() as u64;
        
        size
    }
    
    fn estimate_instruction_count(&self, _request: &PaymentRequest) -> u32 {
        // For a simple token transfer:
        // 1. Token transfer instruction
        // 2. Fee payment instruction
        2
    }
    
    fn get_network_congestion_level(&self) -> u8 {
        // Simulate network congestion level (1-10)
        // In real implementation, this would query network metrics
        5
    }
    
    fn prepare_transaction(&self, request: &PaymentRequest, fee_calc: &FeeCalculation) -> Result<PreparedTransaction, String> {
        let token_info = self.supported_tokens.get(&request.token_symbol)
            .ok_or_else(|| "Token not found".to_string())?;
        
        Ok(PreparedTransaction {
            from_account: request.from_account.clone(),
            to_account: request.to_account.clone(),
            token_contract: token_info.contract_hash.clone(),
            amount: request.amount,
            fee: fee_calc.total_fee,
            deadline: request.deadline,
            signature: request.user_signature.clone(),
            nonce: self.generate_nonce(),
        })
    }
    
    async fn submit_to_facilitator(&self, transaction: &PreparedTransaction) -> Result<String, String> {
        // Simulate facilitator submission
        println!("  📤 Submitting to facilitator contract: {}", self.facilitator_contract);
        println!("    From: {}...", &transaction.from_account[..20]);
        println!("    To: {}...", &transaction.to_account[..20]);
        println!("    Token: {}...", &transaction.token_contract[..20]);
        println!("    Amount: {}", transaction.amount);
        println!("    Fee: {} lamports", transaction.fee);
        
        // Simulate network delay
        tokio::time::sleep(Duration::from_millis(500)).await;
        
        // Simulate success (90% success rate)
        if rand::random::<f64>() < 0.9 {
            Ok(self.generate_transaction_hash())
        } else {
            Err("Network error: Transaction failed".to_string())
        }
    }
    
    fn generate_nonce(&self) -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
    }
    
    fn generate_transaction_hash(&self) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        SystemTime::now().hash(&mut hasher);
        format!("0x{:x}", hasher.finish())
    }
}

#[derive(Debug)]
struct FeeCalculation {
    pub base_fee: u64,
    pub instruction_fee: u64,
    pub priority_fee: u64,
    pub total_fee: u64,
    pub estimated_size: u64,
    pub instruction_count: u32,
}

#[derive(Debug)]
struct PreparedTransaction {
    pub from_account: String,
    pub to_account: String,
    pub token_contract: String,
    pub amount: u64,
    pub fee: u64,
    pub deadline: u64,
    pub signature: String,
    pub nonce: u64,
}

// Mock random module for demonstration
mod rand {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    use std::time::SystemTime;
    
    pub fn random<T>() -> T 
    where 
        T: From<f64>
    {
        let mut hasher = DefaultHasher::new();
        SystemTime::now().hash(&mut hasher);
        let hash = hasher.finish();
        T::from((hash % 1000) as f64 / 1000.0)
    }
}

#[tokio::main]
async fn main() {
    println!("💳 Payment Processor Integration Demo");
    println!("=====================================\n");
    
    // Initialize payment processor
    let processor = PaymentProcessor::new(
        "hash-facilitator-mainnet-v1".to_string(),
        "account-hash-admin-processor".to_string(),
    );
    
    println!("🏗️ Payment processor initialized");
    println!("   Facilitator: {}", processor.facilitator_contract);
    println!("   Supported tokens: {}", processor.supported_tokens.len());
    println!("   Admin: {}...\n", &processor.admin_account[..20]);
    
    // Create sample payment requests
    let payment_requests = create_sample_payments();
    
    println!("📋 Processing {} payment requests...\n", payment_requests.len());
    
    let mut results = Vec::new();
    
    // Process each payment
    for request in payment_requests {
        let result = processor.process_payment(request).await;
        results.push(result);
        
        // Add small delay between payments
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    
    // Generate processing report
    generate_processing_report(&results);
    
    // Demonstrate batch processing
    println!("\n🔄 Batch Processing Demo");
    println!("------------------------");
    
    let batch_requests = create_batch_payments();
    let batch_start = SystemTime::now();
    
    let mut batch_results = Vec::new();
    for request in batch_requests {
        let result = processor.process_payment(request).await;
        batch_results.push(result);
    }
    
    let batch_time = batch_start.elapsed().unwrap_or_default();
    println!("Processed {} payments in {:.2}s", batch_results.len(), batch_time.as_secs_f64());
    
    let batch_success_rate = batch_results.iter().filter(|r| r.success).count() as f64 / 
                            batch_results.len() as f64 * 100.0;
    println!("Batch success rate: {:.1}%", batch_success_rate);
    
    println!("\n✅ Payment processor demo completed!");
}

fn create_sample_payments() -> Vec<PaymentRequest> {
    let current_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    vec![
        PaymentRequest {
            id: "pay_001".to_string(),
            from_account: "account-hash-alice123456789abcdef".to_string(),
            to_account: "account-hash-bob987654321fedcba".to_string(),
            token_symbol: "USDC".to_string(),
            amount: 50_000_000, // 50 USDC
            deadline: current_time + 3600, // 1 hour
            user_signature: "signature_alice_001_".to_string() + &"a".repeat(50),
        },
        PaymentRequest {
            id: "pay_002".to_string(),
            from_account: "account-hash-charlie111222333444".to_string(),
            to_account: "account-hash-diana555666777888".to_string(),
            token_symbol: "CSPR".to_string(),
            amount: 1000_000_000_000, // 1000 CSPR
            deadline: current_time + 1800, // 30 minutes
            user_signature: "signature_charlie_002_".to_string() + &"b".repeat(50),
        },
        PaymentRequest {
            id: "pay_003".to_string(),
            from_account: "account-hash-eve999888777666".to_string(),
            to_account: "account-hash-frank111000999888".to_string(),
            token_symbol: "USDC".to_string(),
            amount: 100_000, // 0.1 USDC (below minimum - should fail)
            deadline: current_time + 7200, // 2 hours
            user_signature: "signature_eve_003_".to_string() + &"c".repeat(50),
        },
        PaymentRequest {
            id: "pay_004".to_string(),
            from_account: "account-hash-grace222333444555".to_string(),
            to_account: "account-hash-henry666777888999".to_string(),
            token_symbol: "INVALID".to_string(), // Invalid token - should fail
            amount: 25_000_000, // 25 units
            deadline: current_time + 900, // 15 minutes
            user_signature: "signature_grace_004_".to_string() + &"d".repeat(50),
        },
    ]
}

fn create_batch_payments() -> Vec<PaymentRequest> {
    let current_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    (1..=10).map(|i| {
        PaymentRequest {
            id: format!("batch_pay_{:03}", i),
            from_account: format!("account-hash-user{:03}_{}", i, "1".repeat(20)),
            to_account: format!("account-hash-merchant{:03}_{}", i % 3 + 1, "2".repeat(20)),
            token_symbol: if i % 2 == 0 { "USDC" } else { "CSPR" }.to_string(),
            amount: if i % 2 == 0 { 10_000_000 } else { 50_000_000_000 }, // 10 USDC or 50 CSPR
            deadline: current_time + 3600,
            user_signature: format!("batch_signature_{:03}_", i) + &"x".repeat(50),
        }
    }).collect()
}

fn generate_processing_report(results: &[PaymentResult]) {
    println!("📊 Payment Processing Report");
    println!("============================");
    
    let total_payments = results.len();
    let successful_payments = results.iter().filter(|r| r.success).count();
    let failed_payments = total_payments - successful_payments;
    
    println!("Total payments: {}", total_payments);
    println!("Successful: {} ({:.1}%)", successful_payments, 
             successful_payments as f64 / total_payments as f64 * 100.0);
    println!("Failed: {} ({:.1}%)", failed_payments,
             failed_payments as f64 / total_payments as f64 * 100.0);
    
    let total_fees: u64 = results.iter()
        .filter_map(|r| r.fee_paid)
        .sum();
    println!("Total fees collected: {} lamports", total_fees);
    
    let avg_processing_time = results.iter()
        .map(|r| r.processing_time.as_millis())
        .sum::<u128>() / total_payments as u128;
    println!("Average processing time: {}ms", avg_processing_time);
    
    println!("\nDetailed Results:");
    for result in results {
        let status = if result.success { "✅" } else { "❌" };
        let time = format!("{}ms", result.processing_time.as_millis());
        println!("  {} {}: {} ({})", status, result.request_id, 
                if result.success { "SUCCESS" } else { "FAILED" }, time);
        
        if let Some(error) = &result.error_message {
            println!("    Error: {}", error);
        }
        
        if let Some(fee) = result.fee_paid {
            println!("    Fee: {} lamports", fee);
        }
    }
}