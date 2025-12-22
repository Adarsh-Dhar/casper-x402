# Casper Facilitator Integration

This server integrates directly with the `final-facilitator` Rust contracts instead of using the `x402plus` package.

## Architecture

```
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────────┐
│   Client App    │─────▶│  Express Server      │─────▶│  Facilitator    │
│  (Frontend)     │◀─────│  (Node.js/TS)        │◀─────│  (Rust/Warp)    │
└─────────────────┘      └──────────────────────┘      └─────────────────┘
                                    │                            │
                                    │                            │
                                    ▼                            ▼
                         ┌──────────────────┐      ┌─────────────────────┐
                         │  X402 Middleware │      │  Casper Contract    │
                         │  Payment Logic   │      │  (Smart Contract)   │
                         └──────────────────┘      └─────────────────────┘
```

## Environment Variables

```env
CASPER_PAY_TO=account-hash-0123456789abcdef0123456789abcdef01234567
CASPER_CONTRACT_HASH=6a545487ba47c62bdf02f68a9d8ada590fef2a1d28778dd5b346d63927e61b4a
FACILITATOR_PORT=8080
PORT=4402
RUST_LOG=info
```

## Key Features

### 1. Automatic Facilitator Startup
The server automatically spawns the Rust facilitator process on startup:
- Runs `cargo run --bin facilitator-server` in the `final-facilitator` directory
- Passes environment variables for configuration
- Captures logs and errors

### 2. Custom X402 Middleware
Implements the X402 payment protocol for Casper:
- Returns 402 status with payment challenge when no payment header is present
- Verifies payments with the facilitator
- Allows access to protected endpoints after successful verification

### 3. Facilitator Proxy Endpoints
Provides convenient proxy endpoints to the facilitator:
- `GET /facilitator/health` - Check facilitator status
- `GET /facilitator/supported-tokens` - Get supported tokens
- `POST /facilitator/estimate-fees` - Estimate transaction fees

### 4. Protected Endpoints
Example protected endpoint:
- `GET /api/premium-content` - Requires payment to access

## API Endpoints

### Public Endpoints

#### `GET /health`
Server health check
```json
{
  "status": "ok",
  "facilitator_url": "http://localhost:8080",
  "contract_hash": "6a545487ba47c62bdf02f68a9d8ada590fef2a1d28778dd5b346d63927e61b4a"
}
```

#### `GET /api/info`
Server and facilitator configuration
```json
{
  "server": "X402 Casper Workshop Server",
  "network": "casper-test",
  "contract_hash": "...",
  "facilitator_url": "http://localhost:8080",
  "supported_tokens": ["CSPR"],
  "endpoints": {
    "premium_content": "/api/premium-content",
    "health": "/health",
    "info": "/api/info"
  }
}
```

### Protected Endpoints

#### `GET /api/premium-content`
Requires payment header. Returns 402 if no payment provided.

**Without Payment:**
```
Status: 402 Payment Required
Headers:
  X-PAYMENT-REQUIRED: {"network":"casper-test","contract_hash":"...","pay_to":"...","amount":"1000000000","description":"Premium workshop content access","facilitator_url":"http://localhost:8080"}
```

**With Valid Payment:**
```json
{
  "message": "🎉 Welcome to premium content!",
  "content": "This is exclusive content that requires payment to access.",
  "redirect": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "timestamp": "2025-12-22T..."
}
```

## Running the Server

### Development Mode
```bash
# Start both server and facilitator
npm run dev

# Or start facilitator separately
npm run facilitator:dev
```

### Production Mode
```bash
# Build TypeScript
npm run build

# Build facilitator
npm run facilitator:build

# Start server
npm start
```

## Payment Flow

1. **Client requests protected resource** without payment header
2. **Server responds with 402** and payment challenge in `X-PAYMENT-REQUIRED` header
3. **Client creates payment** using Casper SDK and facilitator
4. **Client retries request** with payment data in `X-PAYMENT` header
5. **Server verifies payment** with facilitator
6. **Server grants access** if payment is valid

## Facilitator Integration

The server communicates with the facilitator using these endpoints:

- `POST /verify_payment` - Verify payment signature and validity
- `GET /get_config` - Get facilitator configuration
- `GET /get_supported_tokens` - Get supported token list
- `POST /estimate_tx_fees` - Estimate transaction fees

## Differences from x402plus

| Feature | x402plus | This Integration |
|---------|----------|------------------|
| Network | Movement/Aptos | Casper |
| Facilitator | Remote (stableyard.fi) | Local Rust process |
| Payment Token | MOVE | CSPR |
| Contract | Movement contract | Casper contract |
| Middleware | Built-in | Custom implementation |
| Control | Limited | Full control |

## Next Steps

1. **Implement payment verification** - Add actual verification logic in middleware
2. **Add payment storage** - Track successful payments
3. **Implement rate limiting** - Prevent abuse
4. **Add more protected endpoints** - Expand the API
5. **Deploy facilitator** - Deploy to production environment
6. **Add client SDK** - Create client library for easy integration
