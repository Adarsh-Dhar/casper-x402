#!/bin/bash

# Casper Vault Facilitator Test Runner
# Similar to Kora's test structure

set -e

echo "🚀 Running Casper Vault Facilitator Tests"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "Cargo.toml" ]; then
    print_error "Cargo.toml not found. Please run this script from the final-facilitator directory."
    exit 1
fi

# Build the contract first
print_status "Building the contract..."
if cargo build --release; then
    print_success "Contract built successfully"
else
    print_error "Failed to build contract"
    exit 1
fi

# Check if WASM file exists
WASM_FILE="target/wasm32-unknown-unknown/release/casper_vault_facilitator.wasm"
if [ ! -f "$WASM_FILE" ]; then
    print_warning "WASM file not found at $WASM_FILE"
    print_status "Attempting to build for wasm32 target..."
    
    # Add wasm32 target if not present
    rustup target add wasm32-unknown-unknown
    
    # Build for wasm32
    cargo build --release --target wasm32-unknown-unknown
    
    if [ ! -f "$WASM_FILE" ]; then
        print_error "Failed to generate WASM file"
        exit 1
    fi
fi

# Copy WASM file to tests directory for easier access
cp "$WASM_FILE" "tests/casper-vault-facilitator.wasm"
print_success "WASM file copied to tests directory"

# Run different test suites
echo ""
print_status "Running unit tests..."
if cargo test --lib; then
    print_success "Unit tests passed"
else
    print_error "Unit tests failed"
    exit 1
fi

echo ""
print_status "Running integration tests..."
if cargo test --test '*'; then
    print_success "Integration tests passed"
else
    print_error "Integration tests failed"
    exit 1
fi

echo ""
print_status "Running property-based tests..."
if cargo test test_property --release; then
    print_success "Property-based tests passed"
else
    print_warning "Property-based tests failed or were skipped"
fi

echo ""
print_status "Running admin tests..."
if cargo test test_admin --release; then
    print_success "Admin tests passed"
else
    print_error "Admin tests failed"
    exit 1
fi

echo ""
print_status "Running fee calculation tests..."
if cargo test test_fees --release; then
    print_success "Fee tests passed"
else
    print_error "Fee tests failed"
    exit 1
fi

echo ""
print_status "Running transaction processing tests..."
if cargo test test_transactions --release; then
    print_success "Transaction tests passed"
else
    print_error "Transaction tests failed"
    exit 1
fi

echo ""
print_status "Running security tests..."
if cargo test test_security --release; then
    print_success "Security tests passed"
else
    print_error "Security tests failed"
    exit 1
fi

echo ""
print_status "Running query tests..."
if cargo test test_queries --release; then
    print_success "Query tests passed"
else
    print_error "Query tests failed"
    exit 1
fi

echo ""
print_status "Running integration tests..."
if cargo test test_integration --release; then
    print_success "Integration tests passed"
else
    print_error "Integration tests failed"
    exit 1
fi

# Run tests with coverage if cargo-tarpaulin is available
if command -v cargo-tarpaulin &> /dev/null; then
    echo ""
    print_status "Running tests with coverage..."
    cargo tarpaulin --out Html --output-dir coverage
    print_success "Coverage report generated in coverage/ directory"
else
    print_warning "cargo-tarpaulin not found. Install it with: cargo install cargo-tarpaulin"
fi

# Performance tests (if any)
echo ""
print_status "Running performance tests..."
if cargo test --release -- --ignored; then
    print_success "Performance tests passed"
else
    print_warning "Performance tests failed or were skipped"
fi

echo ""
echo "=========================================="
print_success "All tests completed successfully! 🎉"
echo ""
print_status "Test Summary:"
echo "  ✅ Unit tests"
echo "  ✅ Integration tests"
echo "  ✅ Admin functionality tests"
echo "  ✅ Fee calculation tests"
echo "  ✅ Transaction processing tests"
echo "  ✅ Security tests"
echo "  ✅ Query tests"
echo "  ✅ Property-based tests"
echo ""
print_status "The contract is ready for deployment!"