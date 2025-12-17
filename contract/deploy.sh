#!/bin/bash

# Casper Testnet Deployment Script for Cep18Permit Contract

# Load .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

# Configuration
NODE_ADDRESS="${CASPER_NODE_ADDRESS:-https://node.testnet.cspr.cloud}"
CHAIN_NAME="casper-test"
PAYMENT_AMOUNT="100000000000"  # 100 CSPR in motes
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

# Check if WASM file exists
if [ ! -f "$WASM_PATH" ]; then
    echo "❌ Error: WASM file not found at $WASM_PATH"
    echo "Please run 'cargo odra build' first"
    exit 1
fi

# Check if secret key exists
if [ ! -f "$SECRET_KEY" ]; then
    echo "❌ Error: Secret key not found at $SECRET_KEY"
    exit 1
fi

# Check for auth token
if [ -z "$AUTH_TOKEN" ]; then
    echo "❌ Error: CASPER_AUTH_TOKEN not set"
    echo "Please set it in .env or as an environment variable"
    exit 1
fi

echo "📝 Creating and signing transaction..."

# Create temporary file for transaction
TEMP_TX=$(mktemp)
trap "rm -f $TEMP_TX" EXIT

# Create and sign the transaction in one step
casper-client put-transaction session \
    --node-address "$NODE_ADDRESS" \
    --chain-name "$CHAIN_NAME" \
    --secret-key "$SECRET_KEY" \
    --wasm-path "$WASM_PATH" \
    --payment-amount "$PAYMENT_AMOUNT" \
    --gas-price-tolerance 1 \
    --standard-payment true \
    --output "$TEMP_TX" 2>&1 | grep -v "^$"

# Send the signed transaction with auth header
echo "🔐 Sending signed transaction with authentication..."

RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: $AUTH_TOKEN" \
    -d @"$TEMP_TX" \
    "$NODE_ADDRESS/rpc")

# Check if response contains an error
if echo "$RESPONSE" | grep -q "error"; then
    echo "❌ Error response:"
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
else
    echo "✅ Transaction submitted successfully!"
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
fi

echo ""
echo "Monitor your deployment at: https://testnet.cspr.cloud/"
