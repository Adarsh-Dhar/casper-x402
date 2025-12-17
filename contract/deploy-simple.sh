#!/bin/bash

# Simple Casper Deployment - Create transaction locally, send with auth

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

echo "📝 Creating and signing transaction..."

# Create temporary file
TEMP_TX=$(mktemp)
trap "rm -f $TEMP_TX" EXIT

# Try to create transaction (will fail on node connection but creates the file)
casper-client put-transaction session \
    --node-address "$NODE_ADDRESS" \
    --chain-name "$CHAIN_NAME" \
    --secret-key "$SECRET_KEY" \
    --wasm-path "$WASM_PATH" \
    --payment-amount "$PAYMENT_AMOUNT" \
    --gas-price-tolerance 1 \
    --standard-payment true \
    --output "$TEMP_TX" 2>&1 | grep -v "^$" || true

# Check if transaction file was created
if [ ! -f "$TEMP_TX" ] || [ ! -s "$TEMP_TX" ]; then
    echo "❌ Failed to create transaction file"
    exit 1
fi

echo "✅ Transaction created and signed"
echo ""
echo "🔐 Sending signed transaction with authentication..."

# Send the transaction with auth header
RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: $AUTH_TOKEN" \
    -d @"$TEMP_TX" \
    "$NODE_ADDRESS/rpc")

# Parse response
if echo "$RESPONSE" | jq . 2>/dev/null | grep -q '"result"'; then
    echo "✅ Deploy submitted successfully!"
    echo ""
    echo "$RESPONSE" | jq .
    DEPLOY_HASH=$(echo "$RESPONSE" | jq -r '.result' 2>/dev/null)
    echo ""
    echo "📋 Deploy Hash: $DEPLOY_HASH"
elif echo "$RESPONSE" | jq . 2>/dev/null | grep -q '"error"'; then
    echo "❌ Error response:"
    echo "$RESPONSE" | jq .
    exit 1
else
    echo "Response:"
    echo "$RESPONSE"
fi

echo ""
echo "Monitor your deployment at: https://testnet.cspr.cloud/"
