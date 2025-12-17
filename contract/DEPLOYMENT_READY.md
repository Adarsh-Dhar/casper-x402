# ✅ Contract Ready for Deployment

Your Cep18Permit contract has been successfully built and is ready to deploy to Casper Testnet!

## 📦 Deployment Artifacts

- **WASM Contract**: `./wasm/Cep18Permit.wasm` (331 KB)
- **Secret Key**: `./keys/secret_key.pem`
- **Public Key**: `./keys/public_key_hex`
- **Auth Token**: Stored in `.env` file

## 🚀 Deployment Options

### Option 1: Using Casper Web UI (Easiest)
1. Go to https://cspr.cloud/
2. Log in with your account
3. Navigate to "Deploy"
4. Upload `./wasm/Cep18Permit.wasm`
5. Set payment amount to 100 CSPR
6. Click "Deploy"

### Option 2: Using Casper CLI with Node.js Wrapper

Create a file `deploy-wrapper.js`:

```javascript
const { CasperClient, CLPublicKey, Contracts } = require("casper-js-sdk");
const fs = require("fs");
const path = require("path");

async function deploy() {
  const nodeAddress = "https://node.testnet.cspr.cloud";
  const authToken = process.env.CASPER_AUTH_TOKEN;
  
  if (!authToken) {
    console.error("❌ CASPER_AUTH_TOKEN not set");
    process.exit(1);
  }

  const client = new CasperClient({
    nodeAddress,
    headers: {
      Authorization: authToken
    }
  });

  const wasmPath = "./wasm/Cep18Permit.wasm";
  const secretKeyPath = "./keys/secret_key.pem";
  
  const wasmBuffer = fs.readFileSync(wasmPath);
  const secretKey = fs.readFileSync(secretKeyPath, "utf8");

  console.log("🚀 Deploying contract...");
  
  // Deploy logic here
  // This is a template - refer to casper-js-sdk documentation
}

deploy().catch(console.error);
```

### Option 3: Manual RPC Call

```bash
# Get your public key
PUBLIC_KEY=$(cat keys/public_key_hex)

# Create and send deploy via RPC
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: $CASPER_AUTH_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "method": "account_put_deploy",
    "params": {
      "deploy": {
        "header": {
          "account": "'$PUBLIC_KEY'",
          "timestamp": "'$(date -u +'%Y-%m-%dT%H:%M:%S.000Z')'",
          "ttl": "30min",
          "gas_price": 1,
          "chain_name": "casper-test"
        },
        "payment": {
          "ModuleBytes": {
            "module_bytes": "",
            "args": [["amount", {"cl_type": "U512", "parsed": "100000000000"}]]
          }
        },
        "session": {
          "ModuleBytes": {
            "module_bytes": "'$(xxd -p -c 256 wasm/Cep18Permit.wasm | tr -d '\n')'",
            "args": []
          }
        },
        "approvals": []
      }
    },
    "id": 1
  }' \
  https://node.testnet.cspr.cloud/rpc
```

### Option 4: Using Casper Client (v5.0+)

The casper-client CLI v5.0 doesn't natively support auth tokens in the command line. However, you can:

1. Create the transaction locally
2. Sign it with your secret key
3. Send it via RPC with the auth header

```bash
# Create transaction
casper-client put-transaction session \
  --node-address http://localhost:7777 \
  --chain-name casper-test \
  --secret-key ./keys/secret_key.pem \
  --wasm-path ./wasm/Cep18Permit.wasm \
  --payment-amount 100000000000 \
  --gas-price-tolerance 1 \
  --standard-payment true \
  --output deploy.json

# Send with auth
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: $CASPER_AUTH_TOKEN" \
  -d @deploy.json \
  https://node.testnet.cspr.cloud/rpc
```

## 📋 Contract Details

- **Name**: Cep18Permit
- **Type**: CEP-18 Token with Permit Functionality
- **Features**:
  - Standard token operations (transfer, approve, transferFrom)
  - Signature-based payments (claim_payment)
  - Nonce-based replay protection
  - Event emissions

## 🔍 After Deployment

Once deployed, you'll receive a deploy hash. Track it at:
- **Testnet Explorer**: https://testnet.cspr.cloud/
- Search for your deploy hash or public key

## 💡 Next Steps

1. Initialize the contract with token parameters:
   - name: "MyToken"
   - symbol: "MTK"
   - decimals: 18
   - total_supply: 1000000000000000000000000

2. Test the contract functions:
   - `transfer()` - Transfer tokens
   - `approve()` - Approve spender
   - `claim_payment()` - Signature-based payment

## ⚠️ Important Notes

- Keep your secret key (`./keys/secret_key.pem`) secure
- The auth token in `.env` should not be committed to version control
- Ensure you have sufficient CSPR for gas fees (default: 100 CSPR)
- The contract uses Odra framework v2.4.0

## 🆘 Troubleshooting

**401 Unauthorized**: Your auth token is invalid or expired
- Get a new token from https://cspr.cloud/

**Insufficient balance**: You need CSPR to pay for gas
- Request testnet CSPR from the faucet

**Deploy failed**: Check the deploy hash on the testnet explorer for details

## 📚 Resources

- [Casper Documentation](https://docs.cspr.cloud/)
- [Casper CLI Guide](https://docs.cspr.cloud/developers/cli)
- [Odra Framework](https://docs.odra.dev/)
- [CEP-18 Standard](https://github.com/casper-ecosystem/cep-18)
