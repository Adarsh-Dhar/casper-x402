# Examples Integration Guide

This guide shows how to integrate the Casper Facilitator examples into your development workflow and use them as templates for your own applications.

## 🚀 Quick Start

### 1. Run the Main Demo

Start with the comprehensive demo to understand all features:

```bash
cd final-facilitator
cargo run --example demo
```

This will show you:
- Fee calculation for different transaction types
- Token management operations
- Signer pool management
- Transaction processing workflow
- Admin operations

### 2. Explore Specific Features

Run individual examples to dive deeper into specific areas:

```bash
# Fee calculation deep dive
cargo run --example fee_calculation

# Token management operations
cargo run --example token_management

# Comprehensive testing
cargo run --example integration_test

# Real-world payment processing
cargo run --example payment_processor
```

## 🔧 Using Examples as Templates

### For Fee Calculation

Use `fee_calculation.rs` as a template for implementing fee estimation in your application:

```rust
// Copy the fee calculation logic
fn calculate_transaction_fee(params: &TransactionParams) -> FeeCalculation {
    let base_fee = params.size_bytes * 5;
    let instruction_fee = params.instruction_count as u64 * 1000;
    // ... rest of the logic
}

// Integrate into your application
let fee = calculate_transaction_fee(&your_transaction_params);
println!("Estimated fee: {} lamports", fee.total_fee);
```

### For Token Management

Use `token_management.rs` as a template for managing supported tokens:

```rust
// Copy the TokenRegistry structure
struct TokenRegistry {
    tokens: HashMap<String, Token>,
    admin: String,
}

// Implement in your contract
impl TokenRegistry {
    fn add_token(&mut self, token: Token) -> Result<(), String> {
        // Validation logic from example
    }
}
```

### For Payment Processing

Use `payment_processor.rs` as a template for building payment applications:

```rust
// Copy the PaymentProcessor structure
struct PaymentProcessor {
    facilitator_contract: String,
    supported_tokens: HashMap<String, TokenInfo>,
    // ... other fields
}

// Implement payment processing
impl PaymentProcessor {
    async fn process_payment(&self, request: PaymentRequest) -> PaymentResult {
        // Complete workflow from example
    }
}
```

## 🧪 Testing Integration

### 1. Use Integration Test as Template

The `integration_test.rs` example provides a comprehensive testing framework:

```rust
// Copy test structure
fn run_basic_operations_tests(env: &TestEnvironment) -> Vec<TestResult> {
    let mut results = Vec::new();
    
    // Add your specific tests
    let start = Instant::now();
    let success = test_your_feature(env);
    results.push(TestResult {
        test_name: "Your Feature Test".to_string(),
        success,
        execution_time: start.elapsed(),
        // ... other fields
    });
    
    results
}
```

### 2. Create Your Own Test Suite

```bash
# Copy the integration test example
cp examples/advanced/integration_test.rs examples/your_app_test.rs

# Modify for your specific needs
# Add to Cargo.toml:
[[example]]
name = "your_app_test"
path = "examples/your_app_test.rs"
```

## 📦 Integrating with Real Contracts

### 1. Replace Mock Functions

The examples use mock functions for demonstration. Replace them with real contract calls:

```rust
// Example mock function
fn test_add_token(_env: &TestEnvironment) -> bool {
    std::thread::sleep(Duration::from_millis(120));
    true // Mock success
}

// Replace with real contract interaction
fn test_add_token(env: &TestEnvironment) -> bool {
    // Real contract call
    let result = contract_client.add_supported_token(
        token_contract_hash,
        token_symbol,
        decimals
    );
    result.is_ok()
}
```

### 2. Add Real Network Calls

```rust
// Replace mock network operations
async fn submit_to_facilitator(&self, transaction: &PreparedTransaction) -> Result<String, String> {
    // Real Casper network call
    let deploy = create_deploy(transaction);
    let client = CasperClient::new(&self.node_address);
    
    match client.put_deploy(deploy).await {
        Ok(deploy_hash) => Ok(deploy_hash),
        Err(e) => Err(format!("Network error: {}", e)),
    }
}
```

## 🔄 Development Workflow

### 1. Start with Examples

1. Run the relevant example to understand the feature
2. Copy the code structure to your project
3. Modify for your specific requirements
4. Test with your own data

### 2. Iterative Development

```bash
# 1. Understand the feature
cargo run --example fee_calculation

# 2. Copy and modify
cp examples/getting-started/basic/fee_calculation.rs src/my_fee_calculator.rs

# 3. Integrate into your project
# Edit src/lib.rs to include your module

# 4. Test your implementation
cargo test
```

### 3. Performance Testing

Use the integration test example for performance benchmarking:

```rust
// Copy performance testing patterns
fn run_performance_tests(env: &TestEnvironment) -> Vec<TestResult> {
    // Batch operations test
    let start = Instant::now();
    let batch_success = test_batch_operations(env);
    let batch_time = start.elapsed();
    
    // Your performance criteria
    let success = batch_success && batch_time < Duration::from_secs(5);
    // ... rest of the logic
}
```

## 🛠️ Customization Guide

### 1. Modify Fee Calculation

```rust
// Customize fee rates
struct FeeRates {
    pub base_rate: u64,        // Change this
    pub instruction_rate: u64, // And this
    pub priority_multiplier: f64, // And this
}

// Add your own fee types
enum FeeType {
    Standard,
    Priority,
    Express,
    YourCustomType, // Add custom fee types
}
```

### 2. Add New Token Types

```rust
// Extend token information
#[derive(Debug, Clone)]
struct TokenInfo {
    pub contract_hash: String,
    pub decimals: u8,
    pub exchange_rate: f64,
    // Add your custom fields
    pub your_custom_field: String,
    pub another_field: u64,
}
```

### 3. Custom Validation

```rust
// Add your validation rules
fn validate_payment_request(&self, request: &PaymentRequest) -> Result<(), String> {
    // Existing validation...
    
    // Add your custom validation
    if request.amount > self.your_custom_limit {
        return Err("Exceeds custom limit".to_string());
    }
    
    // Your business logic validation
    if !self.is_valid_business_rule(request) {
        return Err("Business rule violation".to_string());
    }
    
    Ok(())
}
```

## 📚 Advanced Integration Patterns

### 1. Event-Driven Architecture

```rust
// Add event handling from examples
enum FacilitatorEvent {
    PaymentProcessed { request_id: String, amount: u64 },
    TokenAdded { symbol: String },
    FeeCalculated { amount: u64 },
    // Your custom events
}

// Event handler
fn handle_event(&self, event: FacilitatorEvent) {
    match event {
        FacilitatorEvent::PaymentProcessed { request_id, amount } => {
            // Your handling logic
        }
        // ... other events
    }
}
```

### 2. Configuration Management

```rust
// Extend configuration from examples
#[derive(Debug)]
struct FacilitatorConfig {
    // From examples
    pub facilitator_contract: String,
    pub supported_tokens: HashMap<String, TokenInfo>,
    
    // Your additions
    pub your_api_endpoint: String,
    pub your_timeout_ms: u64,
    pub your_retry_count: u32,
}
```

### 3. Error Handling Patterns

```rust
// Use error handling patterns from examples
#[derive(Debug)]
enum YourAppError {
    // From examples
    ValidationError(String),
    NetworkError(String),
    
    // Your custom errors
    YourCustomError(String),
    AnotherError { code: u32, message: String },
}

// Error conversion
impl From<FacilitatorError> for YourAppError {
    fn from(err: FacilitatorError) -> Self {
        YourAppError::ValidationError(err.to_string())
    }
}
```

## 🔍 Debugging and Monitoring

### 1. Add Logging

```rust
// Add logging to example patterns
use log::{info, warn, error, debug};

async fn process_payment(&self, request: PaymentRequest) -> PaymentResult {
    info!("Processing payment: {}", request.id);
    
    // Validation
    debug!("Validating payment request");
    if let Err(error) = self.validate_payment_request(&request) {
        warn!("Validation failed for {}: {}", request.id, error);
        return PaymentResult { /* ... */ };
    }
    
    // Processing
    info!("Payment {} validated successfully", request.id);
    // ... rest of the logic
}
```

### 2. Metrics Collection

```rust
// Add metrics from examples
struct Metrics {
    pub total_payments: u64,
    pub successful_payments: u64,
    pub total_fees_collected: u64,
    pub average_processing_time: Duration,
}

impl Metrics {
    fn record_payment(&mut self, result: &PaymentResult) {
        self.total_payments += 1;
        if result.success {
            self.successful_payments += 1;
            if let Some(fee) = result.fee_paid {
                self.total_fees_collected += fee;
            }
        }
    }
}
```

## 🚀 Deployment Considerations

### 1. Environment Configuration

```rust
// Environment-specific configuration
impl FacilitatorConfig {
    fn for_environment(env: &str) -> Self {
        match env {
            "development" => Self::development_config(),
            "staging" => Self::staging_config(),
            "production" => Self::production_config(),
            _ => panic!("Unknown environment: {}", env),
        }
    }
}
```

### 2. Health Checks

```rust
// Add health check endpoints
async fn health_check(&self) -> HealthStatus {
    HealthStatus {
        facilitator_accessible: self.test_facilitator_connection().await,
        supported_tokens_count: self.supported_tokens.len(),
        last_successful_payment: self.get_last_payment_time(),
    }
}
```

## 📖 Next Steps

1. **Start Simple**: Begin with the basic examples and gradually add complexity
2. **Test Thoroughly**: Use the integration test patterns for comprehensive testing
3. **Monitor Performance**: Implement the performance testing patterns
4. **Add Logging**: Include comprehensive logging for debugging
5. **Handle Errors**: Implement robust error handling based on the examples
6. **Scale Gradually**: Start with single transactions, then move to batch processing

## 🤝 Contributing Back

If you create useful extensions or improvements:

1. Consider contributing them back to the examples
2. Share your integration patterns with the community
3. Report any issues or suggestions for improvement

The examples are designed to be living templates that evolve with real-world usage!