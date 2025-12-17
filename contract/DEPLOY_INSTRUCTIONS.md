# Quick Deployment Instructions

## 1️⃣ Get Your Access Token
1. Visit https://cspr.cloud/
2. Sign up or log in
3. Generate an API access token
4. Keep it safe!

## 2️⃣ Deploy to Testnet

### Option A: Using Environment Variables (Recommended)
```bash
cd contract
export CASPER_AUTH_TOKEN="your_access_token_here"
./deploy.sh
```

### Option B: Using Custom Node
```bash
cd contract
export CASPER_NODE_ADDRESS="https://node.testnet.cspr.cloud"
export CASPER_AUTH_TOKEN="your_access_token_here"
./deploy.sh
```

### Option C: Using Mainnet
```bash
cd contract
export CASPER_NODE_ADDRESS="https://node.cspr.cloud"
export CASPER_AUTH_TOKEN="your_access_token_here"
./deploy.sh
```

## 3️⃣ Monitor Deployment
After running the script, you'll get a deploy hash. Track it at:
- **Testnet**: https://testnet.cspr.cloud/
- **Mainnet**: https://cspr.cloud/

## 📋 Available Endpoints

### Testnet
- **RPC**: `https://node.testnet.cspr.cloud`
- **SSE**: `https://node-sse.testnet.cspr.cloud`

### Mainnet
- **RPC**: `https://node.cspr.cloud`
- **SSE**: `https://node-sse.cspr.cloud`

## ✅ What Gets Deployed
- **Contract**: Cep18Permit (CEP-18 token with permit functionality)
- **WASM**: `contract/wasm/Cep18Permit.wasm`
- **Keys**: Generated in `contract/keys/`

## 🔍 Verify Deployment
Once deployed, initialize the contract with:
```bash
casper-client call-contract \
    --node-address https://node.testnet.cspr.cloud \
    --auth-token YOUR_TOKEN \
    --contract-hash <deployed_contract_hash> \
    --entry-point init \
    --payment-amount 5000000000 \
    --secret-key ./keys/secret_key.pem \
    --arg "name:string='MyToken'" \
    --arg "symbol:string='MTK'" \
    --arg "decimals:u8='18'" \
    --arg "total_supply:u256='1000000000000000000000000'"
```

## ⚠️ Important
- Keep your `CASPER_AUTH_TOKEN` secret
- The generated keys in `contract/keys/` are for testing only
- Ensure sufficient CSPR for gas (default: 100 CSPR)
