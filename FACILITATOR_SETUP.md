# Facilitator Service Setup for x402 Transactions

## Overview

The facilitator service is now configured and running to process x402 transactions between the frontend and the CEP18 permit token contract deployed on Casper testnet.

## What's Been Set Up

### 1. Facilitator Service Configuration

✅ **Environment Configuration** (`.env` file created in `facilitator/`)
- Connected to Casper testnet: `https://node.testnet.casper.network/rpc`
- Contract hash: `hash-937627b2d99b08199fad92f566495f4979e4fa5b8f4ecefba632be9b310c6cbb`
- Chain: `casper-test`
- Port: `3001`

✅ **Facilitator Keys Generated**
- Private key: `facilitator/keys/facilitator-secret.pem`
- Public key: `facilitator/keys/facilitator-public.pem`
- Account hash: `account-hash-3a087a863734f1b0f585472ff35c594ba5c6249a964a5bc6c9e6f71c d86bca8b`

✅ **Dependencies Installed**
- casper-js-sdk
- express, cors, helmet
- dotenv, axios
- All security and validation middleware

### 2. Service Endpoints

The facilitator service exposes the following endpoints:

#### Health Check
```bash
GET http://localhost:3001/health
```
Returns service status and configuration.

#### Settlement Processing (x402 Transactions)
```bash
POST http://localhost:3001/settle
Content-Type: application/json

{
  "owner_public_key": "01...",  // User's Ed25519 public key (66 chars hex)
  "recipient": "account-hash-...",  // Recipient account hash
  "amount": "1000000000000000000",  // Amount in smallest unit (string)
  "nonce": 1766267234,  // Current timestamp
  "deadline": 1766270834,  // Expiry timestamp
  "signature": "1a2b3c...",  // User's signature (hex string, min 64 chars)
  "chainName": "casper-test",
  "contractHash": "hash-937627b2d99b08199fad92f566495f4979e4fa5b8f4ecefba632be9b310c6cbb"
}
```

#### Deploy Status Monitoring
```bash
GET http://localhost:3001/status/:deployHash
```
Check the status of a submitted deploy.

### 3. Security Features

✅ **Signature Verification** - Validates user signatures
✅ **Replay Attack Prevention** - Nonce tracking to prevent duplicate transactions
✅ **Rate Limiting** - 100 requests per 15 minutes
✅ **Input Sanitization** - Prevents injection attacks
✅ **CORS Protection** - Configurable allowed origins

### 4. Test Suite

Created comprehensive test suite (`facilitator/test-x402.js`):
- Network connectivity test
- Health endpoint test
- Settlement processing test
- Deploy status monitoring test

## Running the Facilitator

### Option 1: Using the Start Script
```bash
cd facilitator
./start.sh
```

### Option 2: Using npm
```bash
cd facilitator
npm start
```

### Option 3: Development Mode (with auto-reload)
```bash
cd facilitator
npm run dev
```

## Testing the Facilitator

### Run All Tests
```bash
cd facilitator
node test-x402.js
```

### Run Individual Tests
```bash
# Test health endpoint only
node test-x402.js --health

# Test network connectivity only
node test-x402.js --network

# Test settlement processing only
node test-x402.js --settlement
```

## Current Status

✅ **Service Running**: The facilitator is running on port 3001
✅ **Network Connected**: Successfully connected to Casper testnet
✅ **Health Check**: Passing
✅ **Contract Deployed**: CEP18 permit token is deployed and accessible
✅ **Keys Generated**: Facilitator has valid Ed25519 key pair

⚠️ **Known Issues**:
- Deploy creation needs refinement for the Casper JS SDK version
- The facilitator account needs CSPR tokens for gas fees

## Next Steps

### 1. Fund the Facilitator Account
The facilitator needs CSPR tokens to pay for gas fees:
```
Account: account-hash-3a087a863734f1b0f585472ff35c594ba5c6249a964a5bc6c9e6f71cd86bca8b
```

You can get testnet CSPR from the faucet:
- https://testnet.cspr.live/tools/faucet

### 2. Connect Frontend to Facilitator

Update your frontend configuration to point to the facilitator:
```javascript
const FACILITATOR_URL = 'http://localhost:3001';

// Submit x402 transaction
const response = await fetch(`${FACILITATOR_URL}/settle`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    owner_public_key: userPublicKey,
    recipient: recipientAccountHash,
    amount: amountInSmallestUnit,
    nonce: Math.floor(Date.now() / 1000),
    deadline: Math.floor(Date.now() / 1000) + 3600,
    signature: userSignature,
    chainName: 'casper-test',
    contractHash: 'hash-937627b2d99b08199fad92f566495f4979e4fa5b8f4ecefba632be9b310c6cbb'
  })
});
```

### 3. Deploy to Production

For production deployment:
1. Update `.env` with production values
2. Set `NODE_ENV=production`
3. Configure proper CORS origins
4. Use a process manager like PM2
5. Set up SSL/TLS certificates
6. Configure proper logging and monitoring

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│   Frontend  │────────▶│  Facilitator │────────▶│  Casper Testnet │
│  (Browser)  │  HTTP   │   Service    │  RPC    │   (Blockchain)  │
└─────────────┘         └──────────────┘         └─────────────────┘
                              │
                              │ Reads
                              ▼
                        ┌──────────────┐
                        │  CEP18 Token │
                        │   Contract   │
                        └──────────────┘
```

## Files Created

- `facilitator/.env` - Environment configuration
- `facilitator/keys/facilitator-secret.pem` - Private key
- `facilitator/keys/facilitator-public.pem` - Public key
- `facilitator/start.sh` - Startup script
- `facilitator/test-x402.js` - Test suite
- `facilitator/generate-keys.js` - Key generation utility
- `FACILITATOR_SETUP.md` - This documentation

## Troubleshooting

### Service Won't Start
- Check if port 3001 is available
- Verify `.env` file exists
- Ensure all dependencies are installed: `npm install`

### Connection Errors
- Verify Casper testnet is accessible
- Check firewall settings
- Ensure correct node address in `.env`

### Transaction Failures
- Verify facilitator account has sufficient CSPR
- Check contract hash is correct
- Ensure user signatures are valid
- Verify nonce is current timestamp

## Support

For issues or questions:
1. Check the logs: The facilitator outputs detailed logs
2. Run the test suite: `node test-x402.js`
3. Verify configuration: Check `.env` file
4. Check Casper testnet status: https://testnet.cspr.live/

## Resources

- Casper Documentation: https://docs.casper.network/
- Casper JS SDK: https://github.com/casper-ecosystem/casper-js-sdk
- CEP-18 Standard: https://github.com/casper-network/ceps/blob/master/ceps/cep-18.md
- Testnet Explorer: https://testnet.cspr.live/