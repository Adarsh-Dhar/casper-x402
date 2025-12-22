# Casper x402 Payment Protocol Demo

A comprehensive demonstration of the x402 payment protocol implementation on the Casper blockchain, similar to Solana's Kora project. This demo showcases how to build payment-gated APIs using real Casper network transactions.

## 🌟 Overview

The x402 payment protocol enables micropayments for API access, where clients pay small amounts of cryptocurrency to access protected endpoints. This implementation uses the Casper blockchain for payment processing and includes:

- **Facilitator Service**: Handles payment verification and transaction signing
- **Protected API**: Demonstrates payment-gated endpoints
- **Client Demo**: Shows complete payment flow from client perspective
- **Real Transactions**: Uses actual Casper network for payment processing

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Demo   │    │ Protected API   │    │ Facilitator     │
│                 │    │                 │    │ Service         │
│ • Payment Flow  │◄──►│ • x402 Checks   │◄──►│ • Casper SDK    │
│ • API Requests  │    │ • Content Gate  │    │ • Signing       │
│ • Casper Wallet │    │ • Fee Calc      │    │ • Validation    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Casper Network  │
                    │                 │
                    │ • CEP18 Token   │
                    │ • Facilitator   │
                    │ • Transactions  │
                    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn
- Casper testnet account with CSPR tokens
- Deployed CEP18 token contract
- Deployed facilitator contract

### Installation

1. **Clone and setup**:
   ```bash
   cd final-facilitator/docs/x402/demo
   npm run setup
   ```

2. **Generate keys**:
   ```bash
   node scripts/generate-keys.js
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Install dependencies**:
   ```bash
   npm run install:all
   ```

### Running the Demo

1. **Start all services**:
   ```bash
   npm start
   ```

2. **Run the client demo**:
   ```bash
   npm run demo
   ```

3. **Run integration tests**:
   ```bash
   npm test
   ```

## 📁 Project Structure

```
casper-x402-demo/
├── facilitator/           # Payment facilitator service
│   ├── server.js         # Main server
│   ├── services/         # Business logic
│   └── package.json      # Dependencies
├── api/                  # Protected API service
│   ├── server.js         # API server
│   ├── middleware/       # x402 middleware
│   └── services/         # API services
├── client/               # Demo client
│   ├── demo.js           # Main demo script
│   ├── services/         # Client services
│   └── package.json      # Dependencies
├── casper-sdk/           # Casper SDK wrapper
│   └── wrapper.js        # Simplified SDK interface
├── scripts/              # Utility scripts
│   ├── setup.sh          # Environment setup
│   ├── generate-keys.js  # Key generation
│   └── test-integration.js # Integration tests
├── keys/                 # Cryptographic keys
└── .env                  # Environment configuration
```

## 🔧 Configuration

### Environment Variables

Edit `.env` file with your configuration:

```bash
# Casper Network
CASPER_NODE_ADDRESS=https://node.testnet.casper.network/rpc
CASPER_CHAIN_NAME=casper-test

# Contracts
FACILITATOR_CONTRACT_HASH=hash-YOUR-FACILITATOR-CONTRACT
CEP18_TOKEN_CONTRACT_HASH=hash-YOUR-CEP18-TOKEN-CONTRACT

# Keys
FACILITATOR_PRIVATE_KEY_PATH=./keys/facilitator-secret.pem
PAYER_PRIVATE_KEY_PATH=./keys/payer-secret.pem

# Services
API_PORT=3001
PROTECTED_API_URL=http://localhost:3002
FACILITATOR_URL=http://localhost:3001
```

### Key Management

Generate new keys:
```bash
node scripts/generate-keys.js
```

Validate existing keys:
```bash
node scripts/generate-keys.js validate
```

## 🔄 Payment Flow

### 1. Client Attempts Access
```javascript
// Client tries to access protected endpoint
const response = await fetch('/protected');
// Receives 402 Payment Required
```

### 2. Payment Creation
```javascript
// Client creates payment through facilitator
const payment = await paymentClient.createPayment({
    amount: '1000000000',  // 1 CSPR in motes
    tokenSymbol: 'CSPR',
    endpoint: '/protected'
});
```

### 3. Transaction Signing
```javascript
// Facilitator signs the transaction
const signedTx = await facilitator.signTransaction({
    userPublicKey: clientPublicKey,
    amount: payment.amount,
    nonce: payment.nonce,
    deadline: payment.deadline
});
```

### 4. Payment Verification
```javascript
// API verifies payment and grants access
const verifiedPayment = await middleware.verifyPayment(paymentHeader);
if (verifiedPayment.valid) {
    // Grant access to protected content
}
```

## 🛡️ Security Features

- **Nonce Protection**: Prevents replay attacks
- **Deadline Validation**: Time-limited payments
- **Signature Verification**: Cryptographic authentication
- **Rate Limiting**: Prevents abuse
- **Input Sanitization**: Protects against injection attacks

## 🧪 Testing

### Unit Tests
```bash
cd facilitator && npm test
cd api && npm test
cd client && npm test
```

### Integration Tests
```bash
npm run test
# or
node scripts/test-integration.js
```

### Manual Testing
```bash
# Start services
npm start

# In another terminal, run demo
npm run demo
```

## 📊 API Endpoints

### Facilitator Service (Port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/info` | Facilitator information |
| POST | `/estimate-fees` | Estimate transaction fees |
| POST | `/sign-transaction` | Sign transaction |
| POST | `/send-transaction` | Send signed transaction |
| POST | `/process-payment` | Complete payment flow |
| GET | `/status/:hash` | Transaction status |

### Protected API (Port 3002)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/info` | API information |
| GET | `/protected` | Basic protected content |
| GET | `/premium` | Premium protected content |
| GET | `/stream` | Streaming protected content |
| POST | `/data` | Data processing endpoint |

## 💰 Fee Structure

- **Base Fee**: 5 lamports per byte
- **Instruction Fee**: 1000 lamports per instruction
- **Priority Fee**: Dynamic based on network congestion
- **Token Conversion**: Automatic conversion for non-CSPR tokens

## 🔍 Monitoring

### Transaction Status
```bash
curl http://localhost:3001/status/YOUR_DEPLOY_HASH
```

### Service Health
```bash
curl http://localhost:3001/health
curl http://localhost:3002/info
```

### Logs
Services log to console with structured JSON format:
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "service": "facilitator",
  "message": "Payment processed",
  "deployHash": "abc123...",
  "amount": "1000000000"
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Key Loading Errors**:
   ```bash
   # Regenerate keys
   node scripts/generate-keys.js
   ```

2. **Network Connection Issues**:
   ```bash
   # Check node connectivity
   curl https://node.testnet.casper.network/rpc
   ```

3. **Contract Not Found**:
   - Verify contract hashes in `.env`
   - Ensure contracts are deployed on correct network

4. **Insufficient Balance**:
   - Fund accounts on Casper testnet
   - Check balance: `casper-client get-balance`

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=debug
export ENABLE_DEBUG=true
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Related Projects

- [Solana Kora](https://github.com/solana-foundation/kora) - Original x402 implementation
- [Casper CEP18](https://github.com/casper-network/cep-18) - Token standard
- [Casper SDK](https://github.com/casper-network/casper-js-sdk) - JavaScript SDK

## 📞 Support

- [Casper Documentation](https://docs.casper.network/)
- [Discord Community](https://discord.gg/caspernetwork)
- [GitHub Issues](https://github.com/your-repo/issues)

---

**Note**: This is a demonstration project for educational purposes. Use appropriate security measures for production deployments.