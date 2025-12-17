# Cep18Permit Contract Deployment Guide

## ✅ Build Status
The contract has been successfully built and compiled to WebAssembly:
- **WASM File**: `./wasm/Cep18Permit.wasm`
- **Build Status**: ✓ Complete

## 🔑 Generated Keys
Random keys have been generated for deployment:
- **Secret Key**: `./keys/secret_key.pem`
- **Public Key**: `./keys/public_key.pem`
- **Public Key Hex**: `./keys/public_key_hex`

## 🚀 Deployment Options

### Option 1: Using the Deploy Script (Recommended)
```bash
cd contract
./deploy.sh
```

### Option 2: Manual Deployment with casper-client
```bash
casper-client put-deploy \
    --node-address http://NODE_IP:7777 \
    --chain-name casper-test \
    --secret-key ./keys/secret_key.pem \
    --payment-amount 100000000000 \
    --session-path ./wasm/Cep18Permit.wasm
```

## 📍 Available Testnet Nodes
Find active RPC nodes at: https://docs.cspr.cloud/

Common testnet endpoints:
- `http://65.21.227.180:7777`
- `http://3.208.91.63:7777`
- Check https://testnet.cspr.cloud/ for current active nodes

## 📊 Contract Details
- **Contract Name**: Cep18Permit
- **Type**: CEP-18 Token with Permit functionality
- **Features**:
  - Standard token operations (transfer, approve, transferFrom)
  - Signature-based payments (claim_payment)
  - Nonce-based replay protection
  - Event emissions (Transfer, Approval, PaymentClaimed)

## 🔍 Monitoring Deployment
After deployment, monitor your transaction at:
- **Testnet Explorer**: https://testnet.cspr.cloud/
- Search for your public key or transaction hash

## 💡 Next Steps
1. Verify the contract is deployed on testnet
2. Initialize the contract with token parameters:
   - name: Token name
   - symbol: Token symbol
   - decimals: Decimal places
   - total_supply: Initial supply

## ⚠️ Important Notes
- The generated keys are for testing only
- Keep your secret key secure in production
- Ensure you have sufficient CSPR for gas fees (payment-amount)
- The contract uses the Odra framework v2.4.0
