# Casper x402 Demo - Quick Start Guide

Get the Casper x402 payment protocol demo running in 5 minutes!

## ⚡ Prerequisites

- Node.js 16+ installed
- Casper testnet account with CSPR tokens
- 10 minutes of your time

## 🚀 Quick Setup (5 Steps)

### 1. Navigate to Demo Directory
```bash
cd final-facilitator/docs/x402/demo
```

### 2. Run Automated Setup
```bash
npm run setup
```
This installs all dependencies and creates the necessary directory structure.

### 3. Generate Keys
```bash
npm run keys:generate
```
This creates new Casper key pairs for the facilitator and payer accounts.

### 4. Configure Environment
```bash
# Copy the example environment file
cp .env.example .env

# Edit with your values (IMPORTANT!)
nano .env
```

**Required Configuration**:
```bash
# Update these values in .env:
FACILITATOR_CONTRACT_HASH=hash-YOUR-DEPLOYED-FACILITATOR-CONTRACT
CEP18_TOKEN_CONTRACT_HASH=hash-YOUR-CEP18-TOKEN-CONTRACT

# These are auto-filled by key generation:
FACILITATOR_PUBLIC_KEY=01...
FACILITATOR_ACCOUNT_HASH=account-hash-...
PAYER_PUBLIC_KEY=01...
PAYER_ACCOUNT_HASH=account-hash-...
```

### 5. Start Services & Run Demo
```bash
# Terminal 1: Start services
npm start

# Terminal 2: Run demo (wait for services to start)
npm run demo
```

## 🎯 Expected Output

When you run `npm run demo`, you should see:

```
🚀 Casper x402 Payment Protocol Demo
====================================

📋 Step 1: Loading payer credentials...
✅ Payer loaded: account-hash-abc123...
   Public Key: 01def456...

📋 Step 2: Checking protected API info...
✅ API Info retrieved:
   Service: casper-x402-protected-api
   Network: casper-test
   Facilitator: account-hash-xyz789...

📋 Step 3: Attempting to access protected endpoint...
❌ Access denied with status: 402
   Error: Payment required
   Payment required: $0.0001

📋 Step 4: Processing payment and retrying...
   💰 Creating payment...
   ✅ Payment created: deploy-hash-123abc...
   🔄 Retrying request with payment...
✅ Access granted with status: 200
   Message: Access granted
   Content received: { ... }

📋 Step 5: Testing multiple protected endpoints...
   Testing GET /premium...
   ✅ /premium: 200 - Access granted
   Testing GET /stream...
   ✅ /stream: 200 - Access granted

📋 Step 6: Testing data processing endpoint...
   💰 Payment required: $0.0002
   ✅ Data processed: Processing completed
   📊 Results: { ... }

🎉 Demo completed successfully!
```

## 🔍 Verify Installation

### Check Service Health
```bash
# Facilitator service
curl http://localhost:3001/health

# Protected API
curl http://localhost:3002/info
```

### Run Integration Tests
```bash
npm test
```

## 🚨 Troubleshooting

### Issue: "Key file not found"
```bash
# Solution: Regenerate keys
npm run keys:generate
```

### Issue: "Contract not found"
```bash
# Solution: Deploy contracts first
cd ../../../  # Go to final-facilitator root
python deploy.py

# Update .env with contract hash
```

### Issue: "Port already in use"
```bash
# Solution: Kill existing processes
lsof -ti:3001 | xargs kill -9
lsof -ti:3002 | xargs kill -9
```

### Issue: "Insufficient balance"
```bash
# Solution: Fund your accounts
# Visit: https://testnet.cspr.live/tools/faucet
# Request tokens for both facilitator and payer accounts
```

## 📋 Available Commands

```bash
# Setup and installation
npm run setup              # Complete environment setup
npm run install:all        # Install all dependencies
npm run keys:generate      # Generate new keys
npm run keys:validate      # Validate existing keys

# Running services
npm start                  # Start facilitator + API
npm run start:facilitator  # Start facilitator only
npm run start:api          # Start API only

# Testing
npm run demo               # Run client demo
npm test                   # Run integration tests

# Maintenance
npm run clean              # Clean all node_modules
```

## 🎓 What's Next?

### Explore the Code
- `facilitator/server.js` - Payment processing logic
- `api/server.js` - Protected API implementation
- `client/demo.js` - Client payment flow
- `casper-sdk/wrapper.js` - Casper blockchain utilities

### Read Documentation
- `README.md` - Complete documentation
- `DEPLOYMENT_GUIDE.md` - Detailed deployment steps
- `DEMO_SUMMARY.md` - Technical overview

### Customize the Demo
1. Add new protected endpoints in `api/server.js`
2. Modify payment logic in `facilitator/services/payment-service.js`
3. Create custom client flows in `client/demo.js`
4. Adjust fee calculations in `facilitator/services/casper-service.js`

## 💡 Tips

### Development Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug
export ENABLE_DEBUG=true
npm start
```

### Testing Without Real Transactions
For testing the API flow without blockchain transactions, you can modify the facilitator service to use mock responses. See `facilitator/services/casper-service.js` for mock implementations.

### Multiple Environments
Create environment-specific config files:
```bash
.env.development
.env.staging
.env.production
```

Load with:
```bash
NODE_ENV=development npm start
```

## 🔗 Useful Links

- **Casper Testnet Explorer**: https://testnet.cspr.live/
- **Testnet Faucet**: https://testnet.cspr.live/tools/faucet
- **Casper Documentation**: https://docs.casper.network/
- **Solana Kora (Reference)**: https://github.com/solana-foundation/kora

## 📞 Need Help?

1. **Check logs**: Services log to console with detailed information
2. **Run tests**: `npm test` to verify everything is working
3. **Read docs**: Check README.md and DEPLOYMENT_GUIDE.md
4. **Community**: Join Casper Discord for support

---

**Ready to go?** Run `npm start` and `npm run demo` to see the x402 payment protocol in action! 🚀