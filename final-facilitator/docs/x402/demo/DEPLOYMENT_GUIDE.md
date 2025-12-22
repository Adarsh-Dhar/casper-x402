# Casper x402 Demo Deployment Guide

This guide walks you through deploying and running the complete Casper x402 payment protocol demo, similar to Solana's Kora project.

## 🎯 Prerequisites

### System Requirements
- **Node.js**: Version 16 or higher
- **npm**: Version 8 or higher
- **Git**: For cloning repositories
- **Casper CLI**: For key generation and contract deployment
- **Testnet CSPR**: For funding accounts and transactions

### Casper Network Setup
1. **Install Casper CLI**:
   ```bash
   # macOS
   brew install casper-network/casper/casper-client
   
   # Linux
   wget https://github.com/casper-network/casper-node/releases/download/v1.5.6/casper-client-linux-x64.tar.gz
   tar -xzf casper-client-linux-x64.tar.gz
   sudo mv casper-client /usr/local/bin/
   ```

2. **Get Testnet CSPR**:
   - Visit [Casper Testnet Faucet](https://testnet.cspr.live/tools/faucet)
   - Request testnet tokens for your accounts

## 🚀 Quick Deployment

### Step 1: Environment Setup
```bash
# Navigate to demo directory
cd final-facilitator/docs/x402/demo

# Run automated setup
npm run setup
```

### Step 2: Generate Keys
```bash
# Generate new key pairs
npm run keys:generate

# Validate generated keys
npm run keys:validate
```

### Step 3: Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

### Step 4: Deploy Contracts
```bash
# Deploy CEP18 token contract (if not already deployed)
cd ../../../  # Go to final-facilitator root
python deploy.py

# Note the contract hash for .env configuration
```

### Step 5: Start Services
```bash
# Return to demo directory
cd docs/x402/demo

# Install all dependencies
npm run install:all

# Start facilitator and API services
npm start
```

### Step 6: Run Demo
```bash
# In a new terminal, run the client demo
npm run demo
```

## 🔧 Manual Deployment

### 1. Project Setup
```bash
# Clone or navigate to project
cd final-facilitator/docs/x402/demo

# Create directory structure
mkdir -p keys logs data

# Install root dependencies
npm install
```

### 2. Service Configuration

#### Facilitator Service
```bash
cd facilitator
npm install

# Configure facilitator-specific settings
cp .env.example .env
```

#### Protected API Service
```bash
cd ../api
npm install

# Configure API-specific settings
cp .env.example .env
```

#### Client Demo
```bash
cd ../client
npm install

# Configure client settings
cp .env.example .env
```

### 3. Key Management

#### Generate New Keys
```bash
# Generate facilitator keys
casper-client keygen keys/facilitator/

# Generate payer keys
casper-client keygen keys/payer/

# Or use the automated script
node scripts/generate-keys.js
```

#### Import Existing Keys
```bash
# Copy your existing keys to the keys directory
cp /path/to/your/facilitator-secret.pem keys/
cp /path/to/your/payer-secret.pem keys/

# Update .env with key paths
```

### 4. Contract Deployment

#### Deploy CEP18 Token (if needed)
```bash
# From final-facilitator root
python deploy_cep18_token.py

# Note the contract hash
export CEP18_CONTRACT_HASH="hash-abc123..."
```

#### Deploy Facilitator Contract (if needed)
```bash
# Build the contract
cargo build --release --target wasm32-unknown-unknown

# Deploy using Python script
python deploy.py

# Note the contract hash
export FACILITATOR_CONTRACT_HASH="hash-def456..."
```

### 5. Environment Configuration

Edit `.env` file with your actual values:

```bash
# Casper Network Configuration
CASPER_NODE_ADDRESS=https://node.testnet.casper.network/rpc
CASPER_CHAIN_NAME=casper-test

# Contract Hashes (from deployment)
FACILITATOR_CONTRACT_HASH=hash-YOUR-ACTUAL-FACILITATOR-HASH
CEP18_TOKEN_CONTRACT_HASH=hash-YOUR-ACTUAL-CEP18-HASH

# Account Information (from key generation)
FACILITATOR_PUBLIC_KEY=01YOUR-FACILITATOR-PUBLIC-KEY
FACILITATOR_ACCOUNT_HASH=account-hash-YOUR-FACILITATOR-ACCOUNT
PAYER_PUBLIC_KEY=01YOUR-PAYER-PUBLIC-KEY
PAYER_ACCOUNT_HASH=account-hash-YOUR-PAYER-ACCOUNT

# Key File Paths
FACILITATOR_PRIVATE_KEY_PATH=./keys/facilitator-secret.pem
PAYER_PRIVATE_KEY_PATH=./keys/payer-secret.pem

# Service Configuration
API_PORT=3001
PROTECTED_API_URL=http://localhost:3002
FACILITATOR_URL=http://localhost:3001

# Payment Configuration
BASE_FEE_RATE=5000
GAS_PAYMENT=2500000000
PAYMENT_AMOUNT=1000000000000000000
```

## 🧪 Testing Deployment

### 1. Service Health Checks
```bash
# Test facilitator service
curl http://localhost:3001/health

# Test protected API
curl http://localhost:3002/info

# Expected responses should include service status
```

### 2. Integration Tests
```bash
# Run comprehensive integration tests
npm test

# Run specific test categories
npm run test:unit
```

### 3. Manual Testing
```bash
# Test unauthorized access (should return 402)
curl http://localhost:3002/protected

# Test facilitator info
curl http://localhost:3001/info

# Test fee estimation
curl -X POST http://localhost:3001/estimate-fees \
  -H "Content-Type: application/json" \
  -d '{"transactionSize": 1024, "instructionCount": 2}'
```

## 🔍 Verification Steps

### 1. Account Balances
```bash
# Check facilitator account balance
casper-client get-balance \
  --node-address https://node.testnet.casper.network/rpc \
  --public-key keys/facilitator-public.pem

# Check payer account balance
casper-client get-balance \
  --node-address https://node.testnet.casper.network/rpc \
  --public-key keys/payer-public.pem
```

### 2. Contract Verification
```bash
# Verify facilitator contract
casper-client query-global-state \
  --node-address https://node.testnet.casper.network/rpc \
  --key hash-YOUR-FACILITATOR-CONTRACT-HASH \
  --state-root-hash $(casper-client get-state-root-hash --node-address https://node.testnet.casper.network/rpc)

# Verify CEP18 token contract
casper-client query-global-state \
  --node-address https://node.testnet.casper.network/rpc \
  --key hash-YOUR-CEP18-CONTRACT-HASH \
  --state-root-hash $(casper-client get-state-root-hash --node-address https://node.testnet.casper.network/rpc)
```

### 3. Payment Flow Test
```bash
# Run the complete demo
npm run demo

# Should show:
# ✅ Payer loaded
# ✅ API Info retrieved
# ❌ Access denied with 402
# ✅ Payment processed
# ✅ Access granted
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Key Loading Errors
```bash
# Error: Key file not found
# Solution: Regenerate keys
npm run keys:generate

# Error: Invalid key format
# Solution: Check key file permissions and format
chmod 600 keys/*.pem
```

#### 2. Network Connection Issues
```bash
# Error: Connection refused
# Solution: Check node address and network connectivity
curl https://node.testnet.casper.network/rpc

# Error: Chain name mismatch
# Solution: Verify CASPER_CHAIN_NAME in .env
```

#### 3. Contract Deployment Issues
```bash
# Error: Insufficient balance
# Solution: Fund your account from testnet faucet

# Error: Contract not found
# Solution: Verify contract hash in .env
```

#### 4. Service Startup Issues
```bash
# Error: Port already in use
# Solution: Kill existing processes or change ports
lsof -ti:3001 | xargs kill -9
lsof -ti:3002 | xargs kill -9

# Error: Module not found
# Solution: Reinstall dependencies
npm run clean && npm run install:all
```

### Debug Mode

Enable detailed logging:
```bash
export LOG_LEVEL=debug
export ENABLE_DEBUG=true
npm start
```

### Log Analysis
```bash
# View facilitator logs
tail -f logs/facilitator.log

# View API logs
tail -f logs/api.log

# View client logs
tail -f logs/client.log
```

## 🔒 Security Considerations

### Production Deployment

1. **Key Management**:
   - Use hardware security modules (HSM) for production keys
   - Implement key rotation policies
   - Never commit private keys to version control

2. **Network Security**:
   - Use HTTPS for all API endpoints
   - Implement proper CORS policies
   - Add rate limiting and DDoS protection

3. **Environment Security**:
   - Use environment-specific configurations
   - Implement proper secret management
   - Regular security audits

### Monitoring

1. **Service Monitoring**:
   ```bash
   # Add health check endpoints to monitoring
   curl http://localhost:3001/health
   curl http://localhost:3002/info
   ```

2. **Transaction Monitoring**:
   ```bash
   # Monitor deploy status
   curl http://localhost:3001/status/DEPLOY_HASH
   ```

3. **Performance Monitoring**:
   - Monitor response times
   - Track payment success rates
   - Monitor blockchain transaction costs

## 📊 Performance Optimization

### 1. Caching
- Implement Redis for payment verification caching
- Cache contract state queries
- Use CDN for static assets

### 2. Database Optimization
- Index frequently queried fields
- Implement connection pooling
- Use read replicas for scaling

### 3. Network Optimization
- Use connection keep-alive
- Implement request batching
- Optimize payload sizes

## 🔄 Maintenance

### Regular Tasks

1. **Key Rotation**:
   ```bash
   # Generate new keys monthly
   npm run keys:generate
   
   # Update contract with new keys
   # Deploy updated configuration
   ```

2. **Contract Updates**:
   ```bash
   # Deploy contract updates
   cargo build --release --target wasm32-unknown-unknown
   python deploy.py
   
   # Update .env with new contract hash
   ```

3. **Dependency Updates**:
   ```bash
   # Update npm dependencies
   npm update
   npm audit fix
   
   # Update Rust dependencies
   cargo update
   ```

### Backup Procedures

1. **Key Backup**:
   ```bash
   # Backup keys securely
   tar -czf keys-backup-$(date +%Y%m%d).tar.gz keys/
   
   # Store in secure location
   ```

2. **Configuration Backup**:
   ```bash
   # Backup configuration
   cp .env .env.backup.$(date +%Y%m%d)
   ```

## 📞 Support

### Getting Help

1. **Documentation**: Check the README.md and inline code comments
2. **Logs**: Review service logs for error details
3. **Community**: Join Casper Discord for community support
4. **Issues**: Report bugs on GitHub issues

### Useful Commands

```bash
# Quick status check
npm run test

# Full system restart
npm run clean && npm run install:all && npm start

# Generate new deployment
npm run keys:generate && npm run setup
```

---

**Note**: This deployment guide assumes a testnet environment. For mainnet deployment, ensure proper security measures and thorough testing.