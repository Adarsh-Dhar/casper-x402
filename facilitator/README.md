# Transaction Relay Server

A comprehensive Express.js-based HTTP API server that facilitates gasless payment settlements on the Casper blockchain. The server acts as an intermediary between client applications and the blockchain, handling gas payments and transaction complexity on behalf of users.

## Features

- **Express.js HTTP API** with comprehensive middleware stack
- **Request validation** with field format checking and sanitization
- **CLValue conversion** for Casper blockchain compatibility
- **Facilitator integration** for automatic gas fee payment
- **Transaction monitoring** with real-time status updates
- **Security features** including signature verification and replay attack prevention
- **Comprehensive error handling** with standardized responses
- **Configuration management** with environment variable support
- **Property-based testing** for thorough correctness validation

## API Endpoints

### POST /settle
Submit a payment settlement request.

**Request Body:**
```json
{
  "owner_public_key": "01abc123...",
  "amount": "1000000000",
  "nonce": 12345,
  "signature": "def456..."
}
```

**Response:**
```json
{
  "success": true,
  "deployHash": "abc123...",
  "cost": "4000000000",
  "processingTimeMs": 150,
  "message": "Settlement processed successfully"
}
```

### GET /status/:deployHash
Monitor transaction status.

**Response:**
```json
{
  "success": true,
  "deployHash": "abc123...",
  "status": "completed",
  "cost": "4000000000",
  "monitoringTimeMs": 50
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "transaction-relay-server",
  "version": "1.0.0",
  "timestamp": "2025-12-16T21:00:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file or set environment variables:

```env
PORT=3001
NODE_ENV=development
CASPER_NODE_ADDRESS=http://136.243.187.84:7777
CASPER_CHAIN_NAME=casper-test
CONTRACT_HASH=hash-YOUR-CONTRACT-HASH
FACILITATOR_KEY_PATH=./keys/facilitator-secret.pem
GAS_PAYMENT=2500000000
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Testing
```bash
npm test
```

## Architecture

The server follows a layered architecture:

1. **HTTP Layer** - Express.js with security middleware
2. **Validation Layer** - Request validation and sanitization
3. **Conversion Layer** - CLValue type conversion
4. **Integration Layer** - Facilitator service integration
5. **Security Layer** - Signature verification and replay prevention
6. **Error Handling Layer** - Comprehensive error management

## Security Features

- **Input Sanitization** - Prevents injection attacks
- **Signature Verification** - Validates cryptographic signatures
- **Nonce Tracking** - Prevents replay attacks
- **Rate Limiting** - Protects against abuse
- **CORS Configuration** - Controls cross-origin requests
- **Helmet Security** - Standard security headers

## Testing

The project includes comprehensive testing:

- **Unit Tests** - Individual component testing
- **Property-Based Tests** - Correctness validation across input ranges
- **Integration Tests** - End-to-end functionality testing
- **Error Handling Tests** - Comprehensive error scenario coverage

Run tests with:
```bash
npm test
```

## Deployment

1. Set up environment variables
2. Ensure facilitator key file exists
3. Configure Casper network settings
4. Start the server

## License

MIT