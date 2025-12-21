# Casper Vault Facilitator Contract

A comprehensive smart contract for the Casper blockchain that provides transaction facilitation services with fee management, signer pools, and token support.

## Overview

The Vault Facilitator contract is designed to:
- Facilitate transactions with configurable fee structures
- Manage a pool of authorized signers
- Support multiple payment tokens
- Provide fee estimation and calculation services
- Maintain admin controls and security features

## Features

### Core Functionality
- **Transaction Processing**: Process facilitated transactions with signature verification
- **Fee Management**: Dynamic fee calculation based on transaction complexity
- **Token Support**: Multi-token payment system with configurable supported tokens
- **Signer Pool**: Manage authorized signers with weights and activation status
- **Admin Controls**: Pause/unpause functionality and configuration management

### Fee Structure
- Base fee calculation based on transaction size
- Instruction-based fees for complex transactions
- Lookup table fees for advanced transaction types
- Kora signature fees for payment-required transactions
- Configurable fee rates and margins

### Security Features
- Admin-only functions for critical operations
- Contract pause/unpause mechanism
- Input validation and error handling
- Comprehensive event logging

## Contract Architecture

### Modules
- `lib.rs` - Main contract logic and entry points
- `storage.rs` - Storage management functions
- `types.rs` - Custom data types and structures
- `constants.rs` - Contract constants and configuration
- `errors.rs` - Error definitions and handling
- `events.rs` - Event emission functions
- `admin.rs` - Admin utility functions
- `fee.rs` - Fee calculation logic
- `price.rs` - Price calculation and margin handling

### Entry Points

#### Admin Functions
- `add_supported_token(token_contract)` - Add a supported payment token
- `remove_supported_token(token_contract)` - Remove a supported payment token
- `add_signer(public_key, weight)` - Add a signer to the pool
- `remove_signer(account_hash)` - Remove a signer from the pool
- `pause_contract()` - Pause contract operations
- `unpause_contract()` - Resume contract operations

#### Query Functions
- `get_supported_tokens()` - Get list of supported tokens
- `estimate_fees(transaction_size, instruction_count, uses_lookup_tables, is_payment_required)` - Estimate transaction fees

#### Transaction Processing
- `process_transaction(user_signature, transaction_data, fee_token)` - Process a facilitated transaction

## Building and Deployment

### Prerequisites
- Rust toolchain with `wasm32-unknown-unknown` target
- Casper client tools
- Python 3.x for deployment scripts

### Building the Contract
```bash
# Install the required target
rustup target add wasm32-unknown-unknown

# Build the contract
cargo build --release --target wasm32-unknown-unknown
```

The compiled WASM file will be located at:
`target/wasm32-unknown-unknown/release/casper_vault_facilitator.wasm`

### Deployment

#### Using the Deployment Script
```bash
# Set environment variables (optional)
export CASPER_NODE_ADDRESS="http://your-node:7777"
export CASPER_CHAIN_NAME="casper-test"
export CASPER_SECRET_KEY="path/to/secret_key.pem"
export BASE_FEE_RATE="100000"  # 0.0001 CSPR in motes
export MAX_FEE_RATE="10000000"  # 0.01 CSPR in motes

# Run deployment
./deploy_facilitator.py
```

#### Manual Deployment
```bash
casper-client put-deploy \
  --node-address http://your-node:7777 \
  --chain-name casper-test \
  --secret-key path/to/secret_key.pem \
  --payment-amount 200000000000 \
  --session-path target/wasm32-unknown-unknown/release/casper_vault_facilitator.wasm \
  --session-arg "admin:account_hash='account-hash-hex...'" \
  --session-arg "fee_recipient:account_hash='account-hash-hex...'" \
  --session-arg "base_fee_rate:u64='100000'" \
  --session-arg "max_fee_rate:u64='10000000'"
```

## Testing

### Running Tests
```bash
# Set the contract hash after deployment
export CONTRACT_HASH="hash-1234567890abcdef..."

# Run tests
./test_facilitator.py
```

### Test Coverage
- Contract deployment verification
- Supported tokens query
- Fee estimation functionality
- Basic contract interaction

## Configuration

### Environment Variables
- `CASPER_NODE_ADDRESS` - Casper node RPC endpoint (default: http://65.109.222.111:7777)
- `CASPER_CHAIN_NAME` - Chain name (default: casper-test)
- `CASPER_SECRET_KEY` - Path to secret key file
- `ADMIN_ACCOUNT` - Admin account hash (defaults to deployer)
- `FEE_RECIPIENT_ACCOUNT` - Fee recipient account hash (defaults to deployer)
- `BASE_FEE_RATE` - Base fee rate in motes (default: 100000)
- `MAX_FEE_RATE` - Maximum fee rate in motes (default: 10000000)
- `PAYMENT_AMOUNT` - Deployment payment amount (default: 200000000000)

### Fee Configuration
The contract uses a multi-component fee structure:

- **Base Fee**: 100,000 motes (0.0001 CSPR)
- **Instruction Fee**: 10,000 motes per instruction
- **Lookup Table Fee**: 50,000 motes for transactions using lookup tables
- **Kora Signature Fee**: 5,000 motes for payment-required transactions
- **Payment Instruction Fee**: 2,000 motes for payment instructions

## Usage Examples

### Adding a Supported Token
```bash
casper-client put-deploy \
  --node-address http://your-node:7777 \
  --chain-name casper-test \
  --secret-key path/to/secret_key.pem \
  --payment-amount 5000000000 \
  --session-hash hash-of-facilitator-contract \
  --session-entry-point "add_supported_token" \
  --session-arg "token_contract:key='hash-of-token-contract'"
```

### Estimating Fees
```bash
casper-client put-deploy \
  --node-address http://your-node:7777 \
  --chain-name casper-test \
  --secret-key path/to/secret_key.pem \
  --payment-amount 5000000000 \
  --session-hash hash-of-facilitator-contract \
  --session-entry-point "estimate_fees" \
  --session-arg "transaction_size:u64='1000'" \
  --session-arg "instruction_count:u32='10'" \
  --session-arg "uses_lookup_tables:bool='false'" \
  --session-arg "is_payment_required:bool='false'"
```

### Processing a Transaction
```bash
casper-client put-deploy \
  --node-address http://your-node:7777 \
  --chain-name casper-test \
  --secret-key path/to/secret_key.pem \
  --payment-amount 10000000000 \
  --session-hash hash-of-facilitator-contract \
  --session-entry-point "process_transaction" \
  --session-arg "user_signature:string='signature-hex'" \
  --session-arg "transaction_data:list_u8='[1,2,3,4,5]'" \
  --session-arg "fee_token:opt_key='hash-of-fee-token'"
```

## Events

The contract emits the following events:
- `VaultFacilitator_Initialized` - Contract initialization
- `VaultFacilitator_TokenAdded` - Token added to supported list
- `VaultFacilitator_TokenRemoved` - Token removed from supported list
- `VaultFacilitator_SignerAdded` - Signer added to pool
- `VaultFacilitator_SignerRemoved` - Signer removed from pool
- `VaultFacilitator_FeeCalculated` - Fee calculation performed
- `VaultFacilitator_TransactionProcessed` - Transaction processed
- `VaultFacilitator_ContractPaused` - Contract paused
- `VaultFacilitator_ContractUnpaused` - Contract unpaused

## Error Codes

- `1000` - Unauthorized access
- `1001` - Contract is paused
- `1002` - Invalid token
- `1003` - Invalid signer
- `1004` - Insufficient fee
- `1005` - Invalid transaction data
- `1006` - Fee calculation overflow
- `1007` - Token not supported
- `1008` - Signer already exists
- `1009` - Signer not found
- `1010` - Invalid fee rate
- `1011` - Invalid chunk size
- `1012` - Token account creation failed

## Development

### Project Structure
```
final-facilitator/
├── src/
│   ├── lib.rs              # Main contract logic
│   ├── storage.rs          # Storage functions
│   ├── types.rs            # Type definitions
│   ├── constants.rs        # Constants
│   ├── errors.rs           # Error handling
│   ├── events.rs           # Event emission
│   ├── admin.rs            # Admin utilities
│   ├── fee.rs              # Fee calculation
│   └── price.rs            # Price calculation
├── target/                 # Build artifacts
├── Cargo.toml             # Rust configuration
├── deploy_facilitator.py  # Deployment script
├── test_facilitator.py    # Test script
└── README.md              # This file
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the Casper documentation: https://docs.casper.network/
- Join the Casper community: https://discord.gg/casperblockchain