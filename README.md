# Casper x402 Workshop

A complete implementation of the x402 payment protocol on Casper Network, featuring a Next.js frontend, Express.js server, and Rust-based facilitator.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Server      │    │   Facilitator   │
│   (Next.js)     │◄──►│   (Express)     │◄──►│     (Rust)      │
│   Port 3000     │    │   Port 4402     │    │   Port 8080     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
   User Interface         x402 Middleware        Casper Network
```

## Components

- **`workshop-code/`** - Next.js frontend with Casper wallet integration
- **`server/`** - Express.js server with x402 middleware
- **`final-facilitator/`** - Rust-based Casper payment facilitator

## Quick Start

### Prerequisites

- Node.js 18+
- Rust and Cargo
- pnpm (recommended) or npm

### One-Command Startup

```bash
./start-workshop.sh
```

This script will:
1. Start the Rust facilitator on port 8080
2. Start the Express server on port 4402
3. Start the Next.js frontend on port 3000

### Manual Setup

If you prefer to start services individually:

1. **Start the facilitator:**
```bash
cd final-facilitator
cargo run --bin facilitator-server
```

2. **Start the server:**
```bash
cd server
npm install
npm run dev
```

3. **Start the frontend:**
```bash
cd workshop-code
npm install
npm run dev
```

## Usage

1. Open http://localhost:3000 in your browser
2. Generate or load Casper key pairs
3. Click "Unlock Premium Content" to trigger the x402 payment flow
4. Observe the complete payment protocol in action

## How It Works

### x402 Payment Flow

1. **Frontend Request**: User clicks "Unlock Premium Content"
2. **API Proxy**: Next.js API routes proxy to Express server
3. **Payment Required**: Server returns HTTP 402 with Casper payment requirements
4. **Key Generation**: Frontend generates/loads Casper key pairs
5. **Payment Creation**: Client creates signed payment transaction
6. **Payment Header**: Request retried with X-Payment header
7. **Facilitator Verification**: Server forwards to Rust facilitator for verification
8. **Content Delivery**: Premium content returned after successful verification

### Technical Stack

- **Frontend**: Next.js 16, TypeScript, Ant Design, Tailwind CSS
- **Server**: Express.js, CORS, x402 middleware
- **Facilitator**: Rust, Casper SDK, HTTP server
- **Protocol**: x402 Payment Required standard
- **Blockchain**: Casper Network (casper-test)

## Configuration

### Environment Variables

**Server (`.env`):**
```env
CASPER_PAY_TO=account-hash-0123456789abcdef0123456789abcdef01234567
CASPER_CONTRACT_HASH=6a545487ba47c62bdf02f68a9d8ada590fef2a1d28778dd5b346d63927e61b4a
FACILITATOR_PORT=8080
PORT=4402
```

**Frontend (`.env.local`):**
```env
SERVER_URL=http://localhost:4402
CASPER_NODE_URL=http://localhost:11101/rpc
CASPER_NETWORK_NAME=casper-test
```

## API Endpoints

### Server Endpoints

- `GET /health` - Health check
- `GET /api/info` - Server configuration
- `GET /api/premium-content` - Protected content (requires payment)
- `GET /facilitator/*` - Facilitator proxy endpoints

### Frontend API Routes

- `GET /api/info` - Proxy to server info
- `GET /api/premium-content` - Proxy to protected content

## Development

### Testing the Integration

```bash
cd server
npm run test:integration
```

### Building for Production

```bash
# Build frontend
cd workshop-code
npm run build

# Build server
cd ../server
npm run build

# Build facilitator
cd ../final-facilitator
cargo build --release
```

## Workshop Learning Objectives

- ✅ Understand x402 payment protocol
- ✅ Implement Casper Network integration
- ✅ Create paywall-protected APIs
- ✅ Handle cryptographic signatures
- ✅ Build full-stack payment flows
- ✅ Deploy facilitator services

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 4402, and 8080 are available
2. **Facilitator startup**: Check Rust installation and cargo build
3. **CORS errors**: Verify server CORS configuration
4. **Payment verification**: Check facilitator logs for errors

### Debug Commands

```bash
# Check server health
curl http://localhost:4402/health

# Check facilitator health  
curl http://localhost:8080/health

# View facilitator logs
cd final-facilitator && cargo run --bin facilitator-server
```

## Production Deployment

For production deployment:

1. Configure real Casper mainnet endpoints
2. Set up proper SSL/TLS certificates
3. Use environment-specific configuration
4. Implement proper error handling and monitoring
5. Set up database for payment tracking

## Resources

- [x402 Protocol Specification](https://x402.org)
- [Casper Network Documentation](https://docs.casper.network)
- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Guide](https://expressjs.com)