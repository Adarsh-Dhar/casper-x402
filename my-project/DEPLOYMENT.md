# Flipper Contract Deployment Guide

This guide explains how to deploy the Flipper smart contract to the Casper testnet using the Odra CLI.

## Prerequisites

1. **Environment Configuration**: Ensure your `.env` file is properly configured:
   ```env
   ODRA_CASPER_NODE_ADDRESS="http://65.21.227.180:7777"
   ODRA_CASPER_LIVENET_NODE_ADDRESS="http://65.21.227.180:7777"
   ODRA_CASPER_CHAIN_NAME="casper-test"
   ODRA_CASPER_LIVENET_CHAIN_NAME="casper-test"
   ODRA_CASPER_LIVENET_EVENTS_URL="http://65.21.227.180:9999/events/main"
   ODRA_CASPER_SECRET_KEY_PATH="keys/secret_key.pem"
   ODRA_CASPER_LIVENET_SECRET_KEY_PATH="keys/secret_key.pem"
   ```

2. **Secret Key**: Make sure you have a valid Casper secret key file at `keys/secret_key.pem`

3. **Dependencies**: Ensure all Rust dependencies are installed:
   ```bash
   cargo build
   ```

## Deployment Commands

### Deploy the Flipper Contract

To deploy the Flipper contract to Casper testnet:

```bash
cargo run --bin odra-cli deploy DeployFlipperScript
```

### Alternative Command Format

You can also use the binary name directly:

```bash
cargo run --bin odra-cli -- deploy DeployFlipperScript
```

## Command Breakdown

- `cargo run --bin odra-cli`: Runs the Odra CLI binary
- `deploy`: Specifies the deployment subcommand
- `DeployFlipperScript`: The name of the deployment script to execute

## Expected Output

When successful, you should see output similar to:

```
🔍 Validating environment configuration...
✓ ODRA_CASPER_NODE_ADDRESS = http://65.21.227.180:7777
✓ ODRA_CASPER_CHAIN_NAME = casper-test
✓ ODRA_CASPER_SECRET_KEY_PATH = keys/secret_key.pem
✓ Environment validation completed
🚀 Initiating Flipper contract deployment...
📡 Connecting to Casper testnet...
✓ Network connection successful
✅ Flipper contract successfully available at: [CONTRACT_ADDRESS]
🎉 Deployment process completed successfully!
📝 Note: load_or_deploy ensures idempotent behavior - existing contracts are reused.
🔧 Gas limit used: 350 CSPR (350,000,000,000 units)
🌐 Network: Casper Testnet
```

## Troubleshooting

If deployment fails, check:

1. **Network Connection**: Ensure you can reach the Casper testnet
2. **Environment Variables**: Verify all required variables are set in `.env`
3. **Secret Key**: Confirm the secret key file exists and is valid
4. **Gas/Funds**: Ensure sufficient balance for deployment
5. **Testnet Status**: Verify the Casper testnet is operational

## Idempotent Deployment

The deployment system uses `load_or_deploy` which means:
- If the contract is already deployed, it will load the existing instance
- If no contract exists, it will deploy a new one
- Running the command multiple times is safe and will not create duplicates

## Gas Configuration

The deployment is configured with:
- **Gas Limit**: 350 CSPR (350,000,000,000 units)
- **Network**: Casper Testnet
- **Initialization**: Uses `NoArgs` (default initialization with `value = false`)

## Testing

The project includes comprehensive tests:

```bash
# Run all tests
cargo test

# Run specific test categories
cargo test dependency_tests
cargo test property_tests
cargo test cli_unit_tests
cargo test environment_unit_tests
```

## Implementation Details

The Odra CLI deployment system includes:

- **Environment Validation**: Checks all required environment variables
- **Error Handling**: Comprehensive error reporting with troubleshooting tips
- **Idempotent Behavior**: Safe to run multiple times
- **Network Connectivity**: Automatic connection verification
- **Gas Management**: Proper gas limit configuration
- **Logging**: Detailed progress and status reporting