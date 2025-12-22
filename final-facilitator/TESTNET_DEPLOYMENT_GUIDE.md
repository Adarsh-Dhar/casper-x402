# Casper Vault Facilitator - Testnet Deployment Guide

This guide will help you deploy the Casper Vault Facilitator contract to the Casper testnet using the working RPC endpoint.

## Prerequisites

### 1. Install Casper Client
```bash
# On macOS
brew install casper-client

# On Ubuntu/Debian
wget https://github.com/casper-network/casper-node/releases/download/v1.5.6/casper-client-linux-x64.tar.gz
tar -xzf casper-client-linux-x64.tar.gz
sudo mv casper-client /usr/local/bin/

# Verify installation
casper-client --version
```

### 2. Fund Your Account
1. Get your account hash:
   ```bash
   casper-client account-address --secret-key ./keys/secret_key.pem
   ```

2. Fund your account using the testnet faucet:
   - Visit: https://testnet.cspr.live/tools/faucet
   - Enter your account hash
   - Request 1000 CSPR (you need at least 300 CSPR for deployment)

### 3. Verify Prerequisites
```bash
# Check if you have the required tools
which casper-client
which cargo
which rustc

# Check if you have the wasm32 target
rustup target list --installed | grep wasm32-unknown-unknown
# If not installed:
rustup target add wasm32-unknown-unknown
```

## Deployment Steps

### Step 1: Build the Contract
```bash
cd final-facilitator
cargo build --release --target wasm32-unknown-unknown
```

### Step 2: Deploy to Testnet
```bash
# Using the comprehensive deployment script
python3 deploy_to_testnet.py

# Or using the basic deployment script
python3 deploy_facilitator.py
```

### Step 3: Monitor Deployment
The script will:
1. ✅ Test RPC connection
2. 🔨 Build the contract
3. 💰 Check account balance
4. 📋 Show deployment parameters
5. 🚀 Deploy the contract
6. ⏳ Wait for completion (up to 10 minutes)

### Step 4: Verify Deployment
After successful deployment, you'll get a deploy hash. Verify it on:
- **Casper Explorer**: https://testnet.cspr.live/deploy/YOUR_DEPLOY_HASH

## Configuration Options

You can customize the deployment using environment variables:

```bash
# Custom RPC endpoint (if needed)
export CASPER_NODE_ADDRESS="https://node.testnet.casper.network/rpc"

# Custom chain name
export CASPER_CHAIN_NAME="casper-test"

# Custom secret key path
export CASPER_SECRET_KEY="./keys/secret_key.pem"

# Custom admin account (defaults to deployer)
export ADMIN_ACCOUNT="account-hash-hex..."

# Custom fee recipient (defaults to deployer)
export FEE_RECIPIENT_ACCOUNT="account-hash-hex..."

# Custom fee rates
export BASE_FEE_RATE="1000"      # Base fee rate
export MAX_FEE_RATE="10000"      # Maximum fee rate

# Custom payment amount (in motes)
export PAYMENT_AMOUNT="300000000000"  # 300 CSPR
```

## Testing the Deployed Contract

### 1. Run Basic Tests
```bash
python3 test_facilitator.py
```

### 2. Test Fee Estimation
```bash
# The test script will automatically test:
# - Fee estimation functionality
# - Query supported tokens
# - Contract state verification
```

### 3. Manual Testing with Casper Client

#### Get Contract Hash
```bash
# After deployment, get the contract hash from the deploy result
casper-client get-deploy --node-address https://node.testnet.casper.network/rpc YOUR_DEPLOY_HASH
```

#### Query Supported Tokens
```bash
casper-client query-global-state \
  --node-address https://node.testnet.casper.network/rpc \
  --state-root-hash LATEST_STATE_ROOT_HASH \
  --key CONTRACT_HASH \
  --path "supported_tokens"
```

#### Add a Supported Token (Admin Only)
```bash
casper-client put-deploy \
  --node-address https://node.testnet.casper.network/rpc \
  --chain-name casper-test \
  --secret-key ./keys/secret_key.pem \
  --payment-amount 5000000000 \
  --session-hash CONTRACT_HASH \
  --session-entry-point "add_supported_token" \
  --session-arg "token_contract:key='contract-hash-hex...'"
```

#### Add a Signer (Admin Only)
```bash
casper-client put-deploy \
  --node-address https://node.testnet.casper.network/rpc \
  --chain-name casper-test \
  --secret-key ./keys/secret_key.pem \
  --payment-amount 5000000000 \
  --session-hash CONTRACT_HASH \
  --session-entry-point "add_signer" \
  --session-arg "public_key:public_key='01abc123...'" \
  --session-arg "weight:u32='100'"
```

## Troubleshooting

### Common Issues

#### 1. RPC Connection Failed
```
❌ RPC connection failed
```
**Solution**: The script uses the working testnet RPC endpoint. If it fails:
- Check your internet connection
- Try alternative endpoints:
  - `http://34.220.83.153:7777/rpc`
  - `http://52.35.59.254:7777/rpc`

#### 2. Insufficient Balance
```
❌ Insufficient balance for deployment (need at least 300 CSPR)
```
**Solution**: 
- Visit https://testnet.cspr.live/tools/faucet
- Request more CSPR tokens
- Wait for the transaction to complete

#### 3. Build Failed
```
❌ Failed to build contract
```
**Solution**:
```bash
# Install wasm32 target
rustup target add wasm32-unknown-unknown

# Clean and rebuild
cargo clean
cargo build --release --target wasm32-unknown-unknown
```

#### 4. Deploy Hash Not Found
```
❌ Deploy not found yet, waiting...
```
**Solution**: This is normal. The script waits up to 10 minutes for deployment completion.

#### 5. Permission Denied
```
❌ Deployment failed: Permission denied
```
**Solution**: Make sure you're using the correct secret key and have sufficient balance.

### Getting Help

1. **Check the logs**: The deployment script provides detailed output
2. **Verify on explorer**: Use https://testnet.cspr.live to check your account and deploys
3. **Community support**: Ask in the Casper Discord or Telegram

## Network Information

- **Testnet RPC**: https://node.testnet.casper.network/rpc
- **Chain Name**: casper-test
- **Explorer**: https://testnet.cspr.live
- **Faucet**: https://testnet.cspr.live/tools/faucet

## Contract Features

After deployment, your Casper Vault Facilitator contract will support:

### Admin Functions
- ✅ Add/remove supported tokens
- ✅ Add/remove signers with weights
- ✅ Pause/unpause contract
- ✅ Update fee parameters

### User Functions
- ✅ Estimate transaction fees
- ✅ Process facilitated transactions
- ✅ Query supported tokens
- ✅ Query contract state

### Fee Management
- ✅ Dynamic fee calculation
- ✅ Token-based fee payments
- ✅ Congestion-based pricing
- ✅ Lookup table optimizations

## Next Steps

1. **Deploy the contract** using this guide
2. **Add supported tokens** for your use case
3. **Configure signers** for transaction facilitation
4. **Test the functionality** with the provided scripts
5. **Integrate** with your application

## Security Notes

- 🔐 Keep your secret key secure
- 🔐 Use different keys for mainnet
- 🔐 Test thoroughly on testnet before mainnet deployment
- 🔐 Consider multi-sig for production admin operations

---

**Happy Deploying! 🚀**