# Movement x402 Workshop Guide

## Overview

This workshop teaches you how to build pay-per-request APIs using the x402 protocol on Movement Network. You'll create a paywall that charges 1 MOVE token to unlock premium content using a simulated payment flow.

## Workshop Steps

### Step 1: Understanding x402 Protocol

The x402 protocol uses HTTP status code 402 (Payment Required) to request payment for API access. Here's how it works:

1. Client makes a request to a protected endpoint
2. Server responds with 402 and payment requirements
3. Client creates and signs a payment transaction
4. Client retries with payment proof in headers
5. Server verifies payment and returns content

### Step 2: Simulated Wallet Integration

For educational purposes, this workshop uses a simulated wallet connection:

```typescript
// Simulated wallet connection
const connectWallet = () => {
  if (walletAddress.trim()) {
    setConnected(true);
    setError('');
  }
};
```

In production, you would integrate with real Movement Network wallets like Nightly or Petra.

### Step 3: Payment Flow Implementation

The payment flow demonstrates the x402 protocol:

1. **Initial Request**: Try accessing the premium content endpoint
2. **Payment Detection**: Server returns 402 with payment requirements
3. **Mock Payment**: Create simulated payment data
4. **Payment Header**: Include payment proof in X-Payment header
5. **Retry**: Make the request again with payment proof

### Step 4: Server-Side Verification

The API endpoint `/api/premium-content` demonstrates:

1. **Payment Check**: Look for X-Payment header
2. **Mock Verification**: Simulate payment validation
3. **Content Delivery**: Return premium content after "verification"

## Key Files

- `src/app/page.tsx` - Main workshop interface with simulated wallet
- `src/app/api/premium-content/route.ts` - Protected API endpoint
- `src/app/layout.tsx` - Application layout with Ant Design

## Running the Workshop

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Open http://localhost:3000
4. Enter a wallet address to simulate connection
5. Try unlocking premium content

## Learning Objectives

By completing this workshop, you will:

- ✅ Understand the x402 payment protocol
- ✅ Learn HTTP 402 status code implementation
- ✅ See paywall-protected endpoint patterns
- ✅ Understand payment verification concepts
- ✅ Experience educational payment flows

## Code Walkthrough

### 1. Protected API Endpoint

```typescript
export async function GET(request: NextRequest) {
  const xPaymentHeader = request.headers.get('x-payment');
  
  if (!xPaymentHeader) {
    // Return 402 Payment Required
    return NextResponse.json(
      { payment_requirements: PAYMENT_REQUIREMENTS },
      { status: 402 }
    );
  }
  
  // Verify payment and return content
  return NextResponse.json({ content: PREMIUM_CONTENT });
}
```

### 2. Client Payment Flow

```typescript
const unlockContent = async () => {
  // First request - expect 402
  const response = await fetch('/api/premium-content');
  
  if (response.status === 402) {
    // Create mock payment
    const mockPayment = { /* payment data */ };
    
    // Retry with payment header
    const paymentResponse = await fetch('/api/premium-content', {
      headers: { 'X-Payment': JSON.stringify(mockPayment) }
    });
  }
};
```

## Next Steps

1. **Real Wallet Integration**: Connect actual Movement Network wallets
2. **Blockchain Verification**: Implement real transaction verification
3. **Multiple Endpoints**: Add more protected API routes
4. **Error Handling**: Improve payment failure scenarios
5. **Production Setup**: Deploy with real facilitator

## Production Considerations

When moving to production:

1. **Real Wallets**: Integrate Movement Network wallet adapters
2. **Transaction Signing**: Use actual blockchain transaction signing
3. **Payment Verification**: Verify transactions on-chain
4. **Security**: Implement proper signature validation
5. **Error Handling**: Handle network failures and payment errors

## Troubleshooting

### Common Issues

1. **Wallet Connection**: In this demo, just enter any valid-looking address
2. **Payment Simulation**: The demo uses mock payments for education
3. **Network Errors**: Check browser console for detailed messages

### Debug Tips

- Open browser dev tools to see network requests
- Check the Network tab for the 402 response and retry
- Examine the X-Payment header in the second request
- Review console logs for payment processing details

## Resources

- [x402 Protocol Specification](https://x402.org)
- [Movement Network Documentation](https://docs.movementlabs.xyz)
- [HTTP 402 Status Code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/402)