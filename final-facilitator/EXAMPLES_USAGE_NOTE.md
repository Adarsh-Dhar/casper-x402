# Examples Usage Note

## 🚨 Important: Rust Toolchain Requirement

The Casper Facilitator examples require **nightly Rust** due to Casper smart contract dependencies. The examples won't compile with stable Rust.

### Quick Setup

```bash
# Install nightly Rust
rustup install nightly

# Set nightly as default for this project
cd final-facilitator
rustup override set nightly

# Now you can run the examples
cargo run --example demo
```

### Alternative: Use Rust Nightly for Specific Commands

```bash
# Run examples with nightly without changing default
cargo +nightly run --example demo
cargo +nightly run --example fee_calculation
cargo +nightly run --example token_management
cargo +nightly run --example integration_test
cargo +nightly run --example payment_processor
```

## 🎯 Examples Overview

### 1. Main Demo (`demo`)
```bash
cargo +nightly run --example demo
```
**What it shows**: Complete overview of all facilitator features including fee calculation, token management, signer operations, transaction processing, and admin operations.

### 2. Fee Calculation (`fee_calculation`)
```bash
cargo +nightly run --example fee_calculation
```
**What it shows**: Deep dive into fee calculation mechanisms, including base fees, instruction fees, priority fees, and cross-token conversions.

### 3. Token Management (`token_management`)
```bash
cargo +nightly run --example token_management
```
**What it shows**: Token registry operations, exchange rate management, validation, and error handling.

### 4. Integration Test (`integration_test`)
```bash
cargo +nightly run --example integration_test
```
**What it shows**: Comprehensive testing suite with performance benchmarking, error condition testing, and automated validation.

### 5. Payment Processor (`payment_processor`)
```bash
cargo +nightly run --example payment_processor
```
**What it shows**: Real-world payment processing integration with async operations, batch processing, and complete workflow.

## 🔧 Development Workflow

### 1. Set Up Environment
```bash
# Clone and navigate to project
cd final-facilitator

# Set nightly Rust
rustup override set nightly

# Verify setup
rustc --version  # Should show nightly
```

### 2. Explore Examples
```bash
# Start with the main demo
cargo run --example demo

# Then explore specific features
cargo run --example fee_calculation
cargo run --example token_management
```

### 3. Use as Templates
```bash
# Copy example code to your project
cp examples/getting-started/basic/fee_calculation.rs src/my_fee_calculator.rs

# Modify for your needs
# Edit src/my_fee_calculator.rs
```

### 4. Test Your Implementation
```bash
# Use integration test patterns
cargo run --example integration_test

# Run your own tests
cargo test
```

## 📚 Learning Path

### For Beginners
1. **Start here**: `cargo run --example demo`
2. **Understand fees**: `cargo run --example fee_calculation`
3. **Learn tokens**: `cargo run --example token_management`

### For Developers
1. **See integration**: `cargo run --example payment_processor`
2. **Learn testing**: `cargo run --example integration_test`
3. **Use as templates**: Copy relevant code to your project

### For Advanced Users
1. **Study all examples** for comprehensive understanding
2. **Modify examples** to match your specific requirements
3. **Contribute improvements** back to the project

## 🛠️ Troubleshooting

### Compilation Issues
```bash
# Ensure nightly Rust
rustup override set nightly

# Clean and rebuild
cargo clean
cargo build

# Check for missing dependencies
cargo check
```

### Runtime Issues
```bash
# Run with debug output
RUST_LOG=debug cargo run --example demo

# Run specific example
cargo run --example fee_calculation
```

### Performance Issues
```bash
# Run in release mode
cargo run --release --example integration_test

# Profile performance
cargo run --example integration_test --features profiling
```

## 📖 Documentation

- **Examples README**: `examples/README.md` - Complete guide to all examples
- **Integration Guide**: `EXAMPLES_INTEGRATION_GUIDE.md` - How to use examples in your project
- **Examples Summary**: `EXAMPLES_SUMMARY.md` - Overview of what's been created

## 🎉 Success Indicators

When everything is working correctly, you should see:

### Demo Example Output
```
🚀 Casper Facilitator Demo
==========================

📊 Demo 1: Fee Calculation
--------------------------
Base fee: 5120 lamports
Instruction fee: 5000 lamports
Priority fee (congestion 7): 7084 lamports
Total estimated fee: 17204 lamports
Fee in tokens: 11469 units
```

### Fee Calculation Example Output
```
💰 Fee Calculation Examples
============================

Example 1: Simple Token Transfer
Simple Transfer:
  Transaction size: 512 bytes
  Instructions: 2
  Congestion level: 3/10
  Uses lookup tables: false
  ┌─ Base fee:        2560 lamports
  ├─ Instruction fee: 2000 lamports
  ├─ Priority fee:    1368 lamports
  └─ Total fee:       5928 lamports
```

## 🚀 Next Steps

1. **Set up nightly Rust** as described above
2. **Run the main demo** to see all features
3. **Explore specific examples** based on your interests
4. **Use examples as templates** for your own development
5. **Contribute improvements** back to the project

The examples are comprehensive and ready to use once you have the correct Rust toolchain! 🎉