#!/bin/bash

# Manual deployment command for Casper Vault Facilitator
# Make sure your account is funded first!

# Get account hash from public key
ACCOUNT_HASH=$(casper-client account-address --public-key ./keys/public_key.pem)

echo "🚀 Deploying Casper Vault Facilitator to casper-test"
echo "Account: $ACCOUNT_HASH"
echo "RPC: https://node.testnet.casper.network"
echo ""

casper-client put-deploy \
  --node-address "https://node.testnet.casper.network" \
  --chain-name "casper-test" \
  --secret-key "./keys/secret_key.pem" \
  --payment-amount "300000000000" \
  --session-path "./target/wasm32-unknown-unknown/release/casper_vault_facilitator.wasm" \
  --session-arg "admin:account_hash='$ACCOUNT_HASH'" \
  --session-arg "fee_recipient:account_hash='$ACCOUNT_HASH'" \
  --session-arg "base_fee_rate:u64='1000'" \
  --session-arg "max_fee_rate:u64='10000'"

echo ""
echo "✅ Deployment command executed!"
echo "📋 Copy the deploy_hash from the output above"
echo "🔍 Check status with: python3 check_deployment.py YOUR_DEPLOY_HASH"
echo "🌐 Or visit: https://testnet.cspr.live/deploy/YOUR_DEPLOY_HASH"