#!/bin/bash

# Direct Casper Deployment using RPC with Auth Token

# Load .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

# Configuration
NODE_ADDRESS="${CASPER_NODE_ADDRESS:-https://node.testnet.cspr.cloud}"
CHAIN_NAME="casper-test"
PAYMENT_AMOUNT="100000000000"
SECRET_KEY="./keys/secret_key.pem"
WASM_PATH="./wasm/Cep18Permit.wasm"
AUTH_TOKEN="${CASPER_AUTH_TOKEN:-}"

echo "🚀 Deploying Cep18Permit Contract to Casper Testnet"
echo "=================================================="
echo "Node Address: $NODE_ADDRESS"
echo "Chain Name: $CHAIN_NAME"
echo "Payment Amount: $PAYMENT_AMOUNT motes"
echo "WASM Path: $WASM_PATH"
echo ""

# Validation
if [ ! -f "$WASM_PATH" ]; then
    echo "❌ Error: WASM file not found at $WASM_PATH"
    exit 1
fi

if [ ! -f "$SECRET_KEY" ]; then
    echo "❌ Error: Secret key not found at $SECRET_KEY"
    exit 1
fi

if [ -z "$AUTH_TOKEN" ]; then
    echo "❌ Error: CASPER_AUTH_TOKEN not set"
    exit 1
fi

echo "📝 Reading WASM file..."
WASM_HEX=$(xxd -p -c 256 "$WASM_PATH" | tr -d '\n')
WASM_SIZE=$(stat -f%z "$WASM_PATH" 2>/dev/null || stat -c%s "$WASM_PATH")

echo "✅ WASM file size: $WASM_SIZE bytes"
echo ""

# Get public key
PUBLIC_KEY=$(cat keys/public_key_hex)
echo "📋 Account: $PUBLIC_KEY"
echo ""

# Create the deploy JSON
echo "📝 Creating deploy transaction..."

DEPLOY_JSON=$(cat <<EOF
{
  "jsonrpc": "2.0",
  "method": "account_put_deploy",
  "params": {
    "deploy": {
      "hash": "0000000000000000000000000000000000000000000000000000000000000000",
      "header": {
        "account": "$PUBLIC_KEY",
        "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%S.000Z')",
        "ttl": "30min",
        "gas_price": 1,
        "body_hash": "0000000000000000000000000000000000000000000000000000000000000000",
        "dependencies": [],
        "chain_name": "$CHAIN_NAME"
      },
      "payment": {
        "ModuleBytes": {
          "module_bytes": "",
          "args": [
            [
              "amount",
              {
                "cl_type": "U512",
                "bytes": "80969800",
                "parsed": "$PAYMENT_AMOUNT"
              }
            ]
          ]
        }
      },
      "session": {
        "ModuleBytes": {
          "module_bytes": "$WASM_HEX",
          "args": []
        }
      },
      "approvals": []
    }
  },
  "id": 1
}
EOF
)

echo "🔐 Sending deploy with authentication..."

RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: $AUTH_TOKEN" \
    -d "$DEPLOY_JSON" \
    "$NODE_ADDRESS/rpc")

echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q '"result"'; then
    echo ""
    echo "✅ Deploy submitted successfully!"
    DEPLOY_HASH=$(echo "$RESPONSE" | jq -r '.result' 2>/dev/null)
    echo "📋 Deploy Hash: $DEPLOY_HASH"
else
    echo ""
    echo "⚠️  Check the response above for details"
fi

echo ""
echo "Monitor your deployment at: https://testnet.cspr.cloud/"
