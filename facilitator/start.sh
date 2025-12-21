#!/bin/bash

# Facilitator Service Startup Script
# This script starts the facilitator service for x402 transactions

echo "🚀 Starting Facilitator Service for x402 Transactions"
echo "=================================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create a .env file with the required configuration"
    exit 1
fi

# Check if facilitator key exists
if [ ! -f keys/facilitator-secret.pem ]; then
    echo "❌ Error: Facilitator key not found at keys/facilitator-secret.pem"
    echo "Generating a new facilitator key..."
    mkdir -p keys
    openssl genpkey -algorithm Ed25519 -out keys/facilitator-secret.pem
    echo "✅ Facilitator key generated"
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🔧 Configuration:"
echo "   - Contract: hash-937627b2d99b08199fad92f566495f4979e4fa5b8f4ecefba632be9b310c6cbb"
echo "   - Network: Casper Testnet (casper-test)"
echo "   - Node: https://node.testnet.casper.network/rpc"
echo "   - Port: 3001"
echo ""
echo "📡 Endpoints:"
echo "   - Health Check: http://localhost:3001/health"
echo "   - Settlement: POST http://localhost:3001/settle"
echo "   - Status: GET http://localhost:3001/status/:deployHash"
echo ""
echo "🎯 Starting server..."
echo ""

# Start the server
npm start
