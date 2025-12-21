# Odra Vault Facilitator - Implementation Notes

## Overview

This project implements a vault facilitator system for Casper blockchain using the Odra framework. The implementation includes three main functional areas as requested:

1. **Admin Token Utilities** (`src/admin/token_util.rs`)
2. **Fee Calculation** (`src/fee/fee.rs`)
3. **Price Calculation** (`src/fee/price.rs`)

## Standalone Library

Due to complexity with Odra's type system and event handling, a standalone implementation is provided in `src/simple_lib.rs` that contains all the requested functionality without Odra dependencies.

### Usage

```rust
use odra_vault_facilitator::simple_lib::*;

// Admin token utilities
let success = admin::initialize_atas(
    Some(1000),   // compute_unit_price
    Some(200000), // compute_unit_limit
    Some(10),     // chunk_size
    None,         // fee_payer_key
);

// Fee calculation
let fee_calc = fee::estimate_kora_fee(
    1024,   // transaction_size
    true,   // is_payment_required
    100000, // base_fee_lamports
);

// Price calculation
let calculator = price::PriceCalculator::new(50000)
    .with_margin(1.2)
    .with_fixed_fee(75000);

let total_cost = calculator.estimate_total_cost(1024, 5);
```

## Module Structure

### 1. Admin Token Utilities (`admin` module)

Functions for managing token accounts:

- `initialize_atas()` - Initialize token accounts for all signers in the pool
- `initialize_atas_with_chunk_size()` - Initialize with configurable chunk processing
- `find_missing_atas()` - Find missing token accounts for an address

Priority order:
1. Payment address from config
2. All signers in the pool

### 2. Fee Calculation (`fee` module)

Comprehensive fee calculation system:

- `estimate_kora_fee()` - Main entry point for fee calculation with Kora's pricing model
- `calculate_fee_in_token()` - Convert fees to specific token amounts
- `calculate_fee_payer_outflow()` - Calculate total outflow for fee payer
- `get_estimate_fee()` - Get base fee estimate
- `get_estimate_fee_resolved()` - Get fee estimate for resolved transactions

Fee components:
- Base fee
- Kora signature fee
- Fee payer outflow
- Payment instruction fee
- Transfer fee amount

### 3. Price Calculation (`price` module)

Advanced pricing with margins and congestion handling:

- `PriceCalculator` - Main pricing calculator with builder pattern
- `get_required_lamports_with_fixed()` - Fixed fee calculation
- `get_required_lamports_with_margin()` - Fee with safety margin
- `calculate_priority_fee()` - Network congestion-based priority fees
- `estimate_total_cost()` - Complete cost estimation
- `get_fee_breakdown()` - Detailed fee breakdown for transparency

Features:
- Configurable margin multipliers (default 10%)
- Token-based pricing
- Network congestion scaling (0-10 scale)
- Transaction size-based fees
- Fee breakdown for transparency

## Implementation Notes

### Casper/Odra Adaptations

The original Solana-inspired code has been adapted for Casper:

1. **No Async/Await**: Odra doesn't support async, so all functions are synchronous
2. **Lamports → Motes**: Fee calculations use "lamports" terminology but represent Casper motes
3. **Account Model**: Adapted from Solana's account model to Casper's contract-based model
4. **Token Accounts**: Simplified from Solana's ATA (Associated Token Account) model

### Key Differences from Solana

- **No SPL Tokens**: Uses CEP-18 token standard instead
- **No Lookup Tables**: Casper doesn't have address lookup tables
- **Contract Calls**: Different execution model than Solana programs
- **Fee Structure**: Adapted to Casper's gas-based fee model

## Building

The standalone library (`simple_lib`) compiles independently:

```bash
cd final-facilitator
cargo check --lib
```

## Example

See `examples/usage.rs` for a complete usage example:

```bash
cargo run --example usage
```

## Future Work

To complete the full Odra integration:

1. Fix event system compatibility with Odra's `OdraEvent` trait
2. Implement proper type serialization for `SystemConfig` and `VaultEvent`
3. Add contract deployment scripts
4. Implement actual token contract interactions
5. Add comprehensive testing suite

## Notes

- The `simple_lib` module is fully functional and can be used independently
- The main Odra contract structure is in place but requires additional work for full compilation
- All requested functions are implemented with appropriate signatures and logic
- Fee calculations use saturating arithmetic to prevent overflows
- Priority fees scale exponentially with network congestion

## References

- Odra Framework: https://odra.dev
- Casper CEP-18: https://github.com/casper-network/ceps/blob/master/text/0018-token-standard.md
- Original Solana inspiration adapted for Casper blockchain