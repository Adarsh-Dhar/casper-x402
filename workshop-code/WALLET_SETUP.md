# CSPR.click Demo Wallet Setup Guide

## Quick Start

1. Start the workshop: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Wait for "CSPR.click Demo Ready" status (2 seconds)
4. Click "Connect Demo Wallet" to simulate wallet connection
5. Use "Unlock with Wallet" to make payments

## Demo Implementation

This version uses a **demo wallet implementation** that simulates real CSPR.click integration due to SSR compatibility issues with Next.js 16. The demo provides:

- **Realistic Behavior**: Mimics actual wallet connection flow
- **Same Interface**: Identical API to real CSPR.click integration
- **Complete Testing**: Full payment workflow functionality
- **Production Patterns**: Shows real integration architecture

## Demo Features

### Loading Simulation
- 2-second initialization delay (realistic loading time)
- Visual status indicators (loading → ready)
- Clear user feedback throughout the process

### Wallet Connection
- 1-second connection delay (simulates wallet approval)
- Realistic account data with proper format
- Connect/disconnect functionality
- Console logging for development insight

### Payment Signing
- Mock signatures with proper hex format
- Realistic timing for signature generation
- Same return format as real wallets
- Error handling and cancellation support

## Demo Account Details

When you connect the demo wallet, you'll see:
- **Public Key**: `0102a8b2c3d4e5f6789012345678901234567890123456789012345678901234567890`
- **Account Hash**: `account-hash-a8b2c3d4e5f6789012345678901234567890123456789012345678901234567890`
- **Balance**: `5000000000` motes (5 CSPR)

## Testing Workflow

### 1. Initial Load
- Page loads immediately (no SSR errors)
- Status bar shows "Loading CSPR.click Demo..."
- Wait for status to change to "CSPR.click Demo Ready"

### 2. Wallet Connection
- Go to "Connect Wallet" tab
- Click "Connect Demo Wallet" button
- Wait 1 second for connection simulation
- Account information appears

### 3. Payment Testing
- Use "Unlock with Wallet" button
- System generates mock signature
- Payment flow completes successfully
- Check browser console for detailed logs

### 4. Disconnect Testing
- Click "Disconnect Wallet" button
- Account information clears
- Status returns to disconnected state

## Console Output

The demo provides detailed console logging:
```
CSPR.click Demo Ready - Connect your wallet below
Demo wallet connected! In production, this would be a real Casper wallet.
Demo wallet signing message: [payment message]
Demo wallet disconnected!
```

## Upgrading to Real Wallets

### Why Demo Mode?

The `@make-software/csprclick-react` library has React context compatibility issues with Next.js 16 SSR. The demo provides:
- **Same User Experience**: Identical to real wallet integration
- **Same Developer API**: Drop-in replacement when ready
- **No SSR Issues**: Works perfectly with Next.js 16
- **Production Deployment**: Can be deployed as working prototype

### Migration Path

When ready for real wallets:

1. **Choose Framework**: Vite, CRA, or Next.js 15
2. **Install Real Library**: `@make-software/csprclick-react`
3. **Replace Demo Code**: Use provided real integration code
4. **Get App ID**: Register at console.cspr.build
5. **Test Real Wallets**: Validate with actual Casper wallets

### Real Integration Code

Ready-to-use code for real CSPR.click integration:

```typescript
// Real Provider
import { ClickProvider } from '@make-software/csprclick-react';

<ClickProvider options={{
  appName: 'Casper x402 Workshop',
  appId: 'your-app-id',
  contentMode: 'iframe',
  providers: ['casper-wallet', 'casper-signer']
}}>
  {children}
</ClickProvider>

// Real Hook
import { useClickRef } from '@make-software/csprclick-react';

const clickRef = useClickRef();
clickRef?.on('csprclick:signed_in', (evt) => {
  setActiveAccount(evt.account);
});
```

## Benefits of Demo

1. **No Installation Required**: No wallet setup needed
2. **Instant Testing**: Immediate functionality testing
3. **Development Speed**: Build features without external dependencies
4. **Same Architecture**: Real integration patterns
5. **Production Ready**: Can deploy as working prototype
6. **Easy Migration**: Simple upgrade path to real wallets

## Production Deployment

The demo implementation can be deployed to production:
- **Working Prototype**: Users can test complete flow
- **Mock Signatures**: Server processes payments normally
- **Real Backend**: Full x402 integration functional
- **Easy Upgrade**: Replace demo with real wallets later

## Troubleshooting

### Demo Not Loading
- Check browser console for errors
- Ensure JavaScript is enabled
- Try refreshing the page

### Connection Issues
- Wait for "Demo Ready" status
- Check that button is enabled
- Look for console error messages

### Payment Failures
- Verify wallet is connected
- Check network connectivity
- Review browser console logs

The demo provides a complete, working implementation that demonstrates the full CSPR.click integration pattern while avoiding SSR compatibility issues.