# Casper Facilitator Examples

This directory contains comprehensive examples demonstrating how to use the Casper Facilitator contract in various scenarios.

## 📁 Directory Structure

```
examples/
├── getting-started/
│   ├── demo/                 # Main demonstration of all features
│   └── basic/               # Basic usage examples
│       ├── fee_calculation.rs
│       └── token_management.rs
├── advanced/
│   └── integration_test.rs  # Comprehensive testing suite
├── integration/
│   └── payment_processor.rs # Real-world payment processing
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites

- Rust 1.70+ installed
- Casper development environment set up
- Basic understanding of Casper smart contracts

### Running Examples

Each example can be run using Cargo:

```bash
# Main demo (recommended starting point)
cargo run --example demo

# Basic examples
cargo run --example fee_calculation
cargo run --example token_management

# Advanced examples
cargo run --example integration_test
cargo run --example payment_processor
```

## 📚 Example Descriptions

### 1. Main Demo (`getting-started/demo/main.rs`)

**Purpose**: Comprehensive overview of all facilitator features
**What it demonstrates**:
- Fee calculation for different transaction types
- Token registry management
- Signer pool operations
- Transaction processing workflow
- Admin operations

**Best for**: First-time users wanting to understand the full scope of the facilitator

```bash
cargo run --example demo
```

### 2. Fee Calculation (`getting-started/basic/fee_calculation.rs`)

**Purpose**: Deep dive into fee calculation mechanisms
**What it demonstrates**:
- Base fee calculation
- Instruction fees
- Priority fees based on network congestion
- Fee calculation in different tokens
- Impact of transaction size and complexity

**Best for**: Developers implementing fee estimation in their applications

```bash
cargo run --example fee_calculation
```

### 3. Token Management (`getting-started/basic/token_management.rs`)

**Purpose**: Token registry operations and management
**What it demonstrates**:
- Adding and removing tokens
- Exchange rate management
- Token validation
- Cross-token fee calculations
- Error handling for invalid tokens

**Best for**: Administrators managing supported tokens

```bash
cargo run --example token_management
```

### 4. Integration Test (`advanced/integration_test.rs`)

**Purpose**: Comprehensive testing suite for the facilitator
**What it demonstrates**:
- End-to-end testing workflows
- Performance benchmarking
- Error condition testing
- Concurrent operation testing
- Test reporting and metrics

**Best for**: Developers implementing automated testing

```bash
cargo run --example integration_test
```

### 5. Payment Processor (`integration/payment_processor.rs`)

**Purpose**: Real-world payment processing integration
**What it demonstrates**:
- Complete payment processing workflow
- Request validation
- Fee calculation and payment
- Batch processing
- Error handling and reporting
- Async/await patterns

**Best for**: Developers building payment applications

```bash
cargo run --example payment_processor
```

## 🔧 Key Concepts Demonstrated

### Fee Calculation
- **Base Fees**: Calculated per transaction size (lamports per KB)
- **Instruction Fees**: Fixed cost per instruction in the transaction
- **Priority Fees**: Dynamic fees based on network congestion
- **Token Fees**: Converting lamport fees to token equivalents

### Token Management
- **Token Registry**: Adding/removing supported tokens
- **Exchange Rates**: Managing token-to-lamport conversion rates
- **Validation**: Ensuring token parameters are valid
- **Limits**: Setting minimum and maximum transfer amounts

### Signer Pool
- **Weight-based Selection**: Choosing signers based on their weights
- **Active/Inactive Status**: Managing signer availability
- **Pool Management**: Adding and removing signers

### Transaction Processing
- **Validation**: Checking transaction parameters
- **Fee Payment**: Processing fees in various tokens
- **Execution**: Submitting transactions to the blockchain
- **Monitoring**: Tracking transaction status

### Error Handling
- **Validation Errors**: Invalid parameters or formats
- **Authorization Errors**: Unauthorized access attempts
- **Network Errors**: Blockchain connectivity issues
- **Business Logic Errors**: Application-specific failures

## 🎯 Usage Patterns

### For Application Developers

1. **Start with the main demo** to understand overall functionality
2. **Study fee calculation** to implement accurate fee estimation
3. **Review payment processor** for integration patterns
4. **Use integration test** as a template for your own tests

### For Contract Administrators

1. **Focus on token management** for adding new tokens
2. **Review admin operations** in the main demo
3. **Study error handling** for operational procedures

### For Testing and QA

1. **Use integration test** as a comprehensive test suite
2. **Study error handling** examples for edge cases
3. **Review performance testing** patterns

## 🔍 Code Structure

Each example follows a consistent structure:

```rust
/*!
# Example Title
Description of what the example demonstrates
## Usage:
```bash
cargo run --example example_name
```
*/

// Imports and type definitions
use std::collections::HashMap;

// Main demonstration function
fn main() {
    println!("Example Title");
    
    // Demo sections
    demo_feature_1();
    demo_feature_2();
    // ...
    
    println!("Example completed!");
}

// Helper functions and implementations
fn demo_feature_1() {
    // Implementation
}
```

## 🧪 Testing the Examples

All examples include built-in validation and error handling. They use mock data and simulated operations, so they're safe to run without affecting any real blockchain state.

### Expected Output

Each example produces detailed console output showing:
- Step-by-step execution
- Calculated values and results
- Success/failure indicators
- Performance metrics (where applicable)
- Error messages and handling

### Customization

You can modify the examples to:
- Change token configurations
- Adjust fee parameters
- Test different transaction sizes
- Simulate various error conditions

## 📖 Additional Resources

- [Casper Documentation](https://docs.casper.network/)
- [CEP-18 Token Standard](https://github.com/casper-network/ceps/blob/master/ceps/cep-18.md)
- [Facilitator Contract Documentation](../README.md)
- [Integration Guide](../INTEGRATION_GUIDE.md)

## 🤝 Contributing

To add new examples:

1. Create a new `.rs` file in the appropriate directory
2. Follow the existing code structure and documentation format
3. Add the example to `Cargo.toml` if it needs special dependencies
4. Update this README with the new example description
5. Test the example thoroughly

## 🐛 Troubleshooting

### Common Issues

1. **Compilation Errors**: Ensure you have the latest Rust version
2. **Missing Dependencies**: Run `cargo build` to install dependencies
3. **Runtime Errors**: Check that you're using the correct example name

### Getting Help

- Check the main project README for setup instructions
- Review the inline documentation in each example
- Look at the error messages for specific guidance

## 📝 License

These examples are part of the Casper Facilitator project and follow the same license terms.