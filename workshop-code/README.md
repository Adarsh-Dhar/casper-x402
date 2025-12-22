# Movement x402 Workshop

A Next.js application demonstrating pay-per-request APIs using the x402 protocol on Movement Network.

## Features

- 🔗 Simulated Movement Network wallet integration
- 💰 x402 payment protocol implementation
- 🔐 Premium content paywall
- ⚡ Educational payment flow demonstration
- 🎨 Modern UI with Ant Design and Tailwind CSS

## Prerequisites

- Node.js 18+
- Basic understanding of blockchain concepts
- Movement Network wallet address (for simulation)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and configure:
```
NEXT_PUBLIC_MOVEMENT_PAY_TO=0x<your_address>
```

## Running the Application

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### x402 Payment Flow

1. **Client Request**: User clicks "Unlock Premium Content"
2. **Payment Required**: Server returns HTTP 402 with payment requirements
3. **Payment Simulation**: Client creates mock payment data
4. **Payment Header**: Client retries request with payment proof in X-PAYMENT header
5. **Verification**: Server validates payment data (simulated)
6. **Content Delivery**: Premium content is unlocked and displayed

### Key Components

- **`/src/app/page.tsx`**: Main workshop interface with simulated wallet
- **`/src/app/api/premium-content/route.ts`**: Protected API endpoint demonstrating x402
- **`/src/app/layout.tsx`**: Application layout with Ant Design theming

## Usage

1. Open the application in your browser
2. Enter a Movement wallet address in the input field
3. Click "Connect Wallet" to simulate wallet connection
4. Click "Unlock Premium Content (1 MOVE)" to trigger the payment flow
5. Observe the x402 protocol in action as premium content unlocks

## Educational Value

This workshop demonstrates:

- **HTTP 402 Status Code**: How to implement payment-required responses
- **Payment Headers**: Using X-Payment header for payment proof
- **API Protection**: Securing endpoints behind paywalls
- **User Experience**: Creating smooth payment flows
- **Error Handling**: Managing payment failures gracefully

## Workshop Learning Objectives

- ✅ Understand the x402 payment protocol
- ✅ Learn HTTP 402 status code usage
- ✅ Implement paywall-protected endpoints
- ✅ Handle payment verification flows
- ✅ Create educational payment demonstrations

## Next Steps

1. **Real Wallet Integration**: Connect actual Movement Network wallets
2. **Blockchain Verification**: Implement real transaction verification
3. **Multiple Endpoints**: Add more protected API routes
4. **Payment History**: Track successful payments
5. **Production Deployment**: Deploy with real facilitator integration

## File Structure

```
workshop-code/
├── src/
│   ├── app/
│   │   ├── api/premium-content/route.ts  # Protected API endpoint
│   │   ├── globals.css                   # Styling
│   │   ├── layout.tsx                    # App layout
│   │   └── page.tsx                      # Main interface
│   └── ...
├── README.md                             # This file
├── WORKSHOP.md                           # Detailed workshop guide
└── package.json                          # Dependencies
```

## Troubleshooting

### Common Issues

1. **Build Errors**: Run `npm install` to ensure all dependencies are installed
2. **Styling Issues**: Verify Ant Design CSS is properly imported
3. **API Errors**: Check browser console for detailed error messages

### Debug Tips

- Use browser dev tools to inspect network requests
- Check the Network tab to see the 402 response and retry with payment
- Examine the X-Payment header in the second request
- Review server logs for payment processing details

## Resources

- [x402 Protocol Specification](https://x402.org)
- [Movement Network Documentation](https://docs.movementlabs.xyz)
- [Next.js Documentation](https://nextjs.org/docs)
- [Ant Design Components](https://ant.design/components/overview/)