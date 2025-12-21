# Testing Guide for Casper Vault Facilitator

This document describes the comprehensive test suite for the Casper Vault Facilitator contract, modeled after the Kora testing framework.

## Test Structure

The test suite is organized into several categories:

### 1. Unit Tests (`src/lib.rs` and modules)
- Basic functionality tests for individual functions
- Error handling and edge cases
- Input validation

### 2. Integration Tests (`tests/`)

#### Admin Tests (`test_admin.rs`)
- Adding and removing supported tokens
- Managing signer pool
- Pausing and unpausing contract
- Access control verification

#### Fee Tests (`test_fees.rs`)
- Fee estimation with various parameters
- Fee scaling with transaction size and complexity
- Payment-required vs payment-optional scenarios

#### Transaction Tests (`test_transactions.rs`)
- Basic transaction processing
- Transaction processing with fee tokens
- Error handling for invalid transactions
- Paused contract behavior

#### Security Tests (`test_security.rs`)
- Unauthorized access attempts
- Input validation and sanitization
- State isolation and consistency
- Reentrancy protection

#### Query Tests (`test_queries.rs`)
- Supported tokens queries
- Signer pool queries
- Contract state queries
- Large dataset handling

#### Integration Tests (`test_integration.rs`)
- Full workflow scenarios
- Complex multi-step operations
- State consistency across operations
- Error recovery scenarios

#### Property-Based Tests (`test_property.rs`)
- Randomized input testing using proptest
- Invariant checking
- Order independence verification
- State consistency under random operations

## Running Tests

### Quick Test Run
```bash
cargo test
```

### Comprehensive Test Suite
```bash
./run_tests.sh
```

### Individual Test Categories
```bash
# Admin functionality
cargo test test_admin

# Fee calculations
cargo test test_fees

# Transaction processing
cargo test test_transactions

# Security features
cargo test test_security

# Query operations
cargo test test_queries

# Integration scenarios
cargo test test_integration

# Property-based tests
cargo test test_property
```

### Release Mode Tests (Recommended)
```bash
cargo test --release
```

## Test Configuration

### Environment Variables
- `RUST_BACKTRACE=1`: Enable detailed error traces
- `RUST_LOG=debug`: Enable debug logging
- `CASPER_TEST_TIMEOUT=300`: Set test timeout (seconds)
- `CASPER_TEST_VERBOSE=1`: Enable verbose test output

### Test Dependencies
The test suite requires:
- `casper-engine-test-support`: For contract testing framework
- `casper-execution-engine`: For execution environment
- `proptest`: For property-based testing
- `tokio`: For async test support

## Test Scenarios Covered

### Admin Operations
- ✅ Add supported tokens
- ✅ Remove supported tokens
- ✅ Add signers with weights
- ✅ Remove signers
- ✅ Pause/unpause contract
- ✅ Access control enforcement

### Fee Management
- ✅ Basic fee estimation
- ✅ Fee scaling with transaction size
- ✅ Fee scaling with instruction count
- ✅ Payment-required scenarios
- ✅ Lookup table usage impact

### Transaction Processing
- ✅ Basic transaction processing
- ✅ Fee token validation
- ✅ Empty transaction rejection
- ✅ Large transaction handling
- ✅ Multiple transaction processing

### Security Features
- ✅ Unauthorized access prevention
- ✅ Input validation
- ✅ State isolation
- ✅ Pause functionality
- ✅ Malicious input handling

### Query Operations
- ✅ Supported tokens retrieval
- ✅ Signer pool information
- ✅ Contract state queries
- ✅ Large dataset handling
- ✅ State consistency verification

### Integration Scenarios
- ✅ Full workflow execution
- ✅ Concurrent operations simulation
- ✅ Error recovery
- ✅ Boundary condition testing
- ✅ State consistency maintenance

### Property-Based Testing
- ✅ Random token operations
- ✅ Random signer operations
- ✅ Transaction processing invariants
- ✅ Fee estimation properties
- ✅ State consistency under random operations

## Test Data and Fixtures

### Test Accounts
- `ADMIN_ACCOUNT`: Contract administrator
- `FEE_RECIPIENT_ACCOUNT`: Fee collection account
- `USER_ACCOUNT`: Regular user account
- `SIGNER_ACCOUNT`: Transaction signer account

### Test Utilities
- `create_dummy_contract_hash(seed)`: Generate test contract hashes
- `create_dummy_public_key(seed)`: Generate test public keys
- `TestContext`: Comprehensive test environment setup

## Coverage Goals

The test suite aims for:
- **Line Coverage**: >90%
- **Branch Coverage**: >85%
- **Function Coverage**: 100%

## Performance Testing

Performance tests verify:
- Contract deployment time
- Transaction processing throughput
- Fee estimation performance
- Query operation efficiency
- Memory usage patterns

## Continuous Integration

The test suite is designed to run in CI/CD environments:
- All tests must pass for deployment
- Property-based tests run with extended iterations
- Performance benchmarks are tracked
- Coverage reports are generated

## Debugging Tests

### Common Issues
1. **WASM file not found**: Run `cargo build --release --target wasm32-unknown-unknown`
2. **Test timeout**: Increase `CASPER_TEST_TIMEOUT` environment variable
3. **Memory issues**: Check contract memory usage and stack size

### Debug Commands
```bash
# Run with debug output
RUST_LOG=debug cargo test test_name

# Run single test with backtrace
RUST_BACKTRACE=1 cargo test test_name -- --exact

# Run tests with stdout
cargo test test_name -- --nocapture
```

## Contributing to Tests

When adding new functionality:
1. Add unit tests for the new function
2. Add integration tests for the feature
3. Update property-based tests if applicable
4. Ensure all existing tests still pass
5. Update this documentation

### Test Naming Convention
- `test_<functionality>_<scenario>`
- `test_<functionality>_<error_condition>`
- Property tests: `test_<property>_property`

## Test Maintenance

Regular maintenance tasks:
- Update test dependencies
- Review and update test scenarios
- Optimize slow-running tests
- Maintain test documentation
- Monitor test coverage metrics