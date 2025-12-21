# Casper Vault Facilitator Tests

Comprehensive test suite for the Casper Vault Facilitator smart contract.

## Test Structure

```
tests/
├── common/
│   └── mod.rs              # Shared test utilities and fixtures
├── test_admin.rs           # Admin functionality tests
├── test_fees.rs            # Fee calculation tests
├── test_transactions.rs    # Transaction processing tests
├── test_security.rs        # Security and access control tests
├── test_queries.rs         # Query operation tests
├── test_integration.rs     # Integration and workflow tests
├── test_property.rs        # Property-based tests
└── lib.rs                  # Test library entry point
```

## Running Tests

### All Tests
```bash
cargo test
```

### Specific Test Suite
```bash
cargo test test_admin
cargo test test_fees
cargo test test_transactions
cargo test test_security
cargo test test_queries
cargo test test_integration
cargo test test_property
```

### With Test Script
```bash
./run_tests.sh
```

## Test Categories

### 1. Admin Tests
- Token management (add/remove)
- Signer management (add/remove)
- Contract pause/unpause
- Access control

### 2. Fee Tests
- Basic fee estimation
- Fee scaling
- Payment scenarios
- Edge cases

### 3. Transaction Tests
- Basic processing
- Fee token validation
- Error handling
- Paused state behavior

### 4. Security Tests
- Unauthorized access
- Input validation
- State isolation
- Malicious input handling

### 5. Query Tests
- Token queries
- Signer queries
- State queries
- Large dataset handling

### 6. Integration Tests
- Full workflows
- Complex scenarios
- Error recovery
- State consistency

### 7. Property-Based Tests
- Random operations
- Invariant checking
- Order independence
- State consistency

## Test Utilities

The `common` module provides:
- `TestContext`: Test environment setup
- `create_dummy_contract_hash()`: Generate test hashes
- `create_dummy_public_key()`: Generate test keys
- Helper functions for contract interaction

## Requirements

- Rust 1.70+
- wasm32-unknown-unknown target
- casper-engine-test-support
- proptest (for property-based tests)

## Notes

- Tests require the compiled WASM file
- Run `cargo build --release --target wasm32-unknown-unknown` first
- Property-based tests may take longer to run
- Use `--release` flag for faster test execution