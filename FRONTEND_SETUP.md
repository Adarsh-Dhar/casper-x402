# 🚀 Frontend Setup & Contract Integration Guide

## Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Contract Hash

Edit `frontend/src/config/contractConfig.ts`:

```typescript
export const CONTRACT_CONFIG = {
  testnet: {
    nodeAddress: 'https://node.testnet.cspr.cloud',
    contractHash: 'hash-YOUR_DEPLOYED_CONTRACT_HASH', // ← Add your hash here
    chainName: 'casper-test'
  }
};
```

### 3. Start Development Server

```bash
npm start
```

The app will open at `http://localhost:3000`

### 4. Access Test Page

- Click the blue "🧪 Go to Contract Test Page" button
- Or navigate directly to `http://localhost:3000/test`

## 📋 What's New

### New Components
- **Cep18PermitTest** (`src/components/Cep18PermitTest.tsx`)
  - Comprehensive contract testing interface
  - 11 test functions (6 read-only, 5 write)
  - Real-time execution logs
  - Configuration panel

### New Hooks
- **useCep18Permit** (`src/hooks/useCep18Permit.ts`)
  - Contract interaction methods
  - Wallet integration
  - Error handling

### New Configuration
- **contractConfig** (`src/config/contractConfig.ts`)
  - Testnet/Mainnet/Local configs
  - Dummy test values
  - Error messages

### Updated Files
- **App.tsx** - Added test page routing and navigation

## 🧪 Test Page Features

### Read-Only Tests (No Gas)
```
✓ name()           - Get token name
✓ symbol()         - Get token symbol
✓ decimals()       - Get decimal places
✓ totalSupply()    - Get total supply
✓ balanceOf()      - Get wallet balance
✓ nonceOf()        - Get signature nonce
```

### Write Tests (With Dummy Values)
```
✓ transfer()       - Transfer tokens
✓ approve()        - Approve spender
✓ allowance()      - Check allowance
✓ transferFrom()   - Transfer from approved account
✓ claimPayment()   - Signature-based payment
```

## 🔧 Configuration

### Contract Hash

Get from:
1. Deployment output: `Deploy Hash: hash-abc123...`
2. Block explorer: https://testnet.cspr.cloud/
3. Deployment logs

Format: `hash-abc123def456...`

### Node Address

- **Testnet**: `https://node.testnet.cspr.cloud`
- **Mainnet**: `https://node.cspr.cloud`
- **Local**: `http://localhost:7777`

### Chain Name

- **Testnet**: `casper-test`
- **Mainnet**: `casper`

## 📱 UI Layout

```
Home Page
├─ Welcome Section
├─ Getting Started
├─ X402 Demo
└─ [🧪 Go to Contract Test Page] ← Click here

Test Page (/test)
├─ [← Back to Home]
├─ Wallet Connection
├─ Configuration Panel
│  ├─ Node Address
│  ├─ Contract Hash
│  └─ Chain Name
├─ Read-Only Functions (6 tests)
├─ Write Functions (5 tests)
├─ Test Results Grid
└─ Execution Logs
```

## 🔐 Wallet Setup

### Requirements
1. Install CSPRClick wallet extension
2. Create or import account
3. Switch to Casper Testnet
4. Request testnet CSPR from faucet

### Connection
1. Click wallet icon in top bar
2. Select "Connect"
3. Approve connection in wallet
4. Account will appear in top bar

## 🧪 Running Tests

### Read-Only Tests
1. Configure contract hash
2. Click test button
3. View result immediately

### Write Tests
1. Connect wallet
2. Configure contract hash
3. Click test button
4. Approve in wallet (if needed)
5. View result in logs

## 📊 Test Results

Each test shows:
- **Function Name**: What was tested
- **Result**: Return value or error
- **Type**: Success (green), Error (red), Info (blue)

Results are also logged with timestamps.

## 🐛 Troubleshooting

### "Wallet not connected"
```
→ Click wallet icon and connect CSPRClick
```

### "Contract hash not found"
```
→ Verify contract hash is correct
→ Check contract is deployed on network
```

### "HTTP 401 Unauthorized"
```
→ Auth token is invalid or expired
→ Get new token from https://cspr.cloud/
```

### "Insufficient balance"
```
→ Request testnet CSPR from faucet
→ Wait for confirmation
```

### Tests not running
```
→ Check browser console for errors
→ Verify wallet is connected
→ Verify contract hash is configured
```

## 📚 Documentation

- **Test Page Guide**: `frontend/TEST_PAGE_README.md`
- **Integration Summary**: `frontend/INTEGRATION_SUMMARY.md`
- **Contract Code**: `contract/src/lib.rs`
- **Deployment Guide**: `contract/DEPLOYMENT_READY.md`

## 🔄 Development Workflow

1. **Deploy Contract**
   ```bash
   cd contract
   ./deploy.sh  # or use web UI
   ```

2. **Get Contract Hash**
   - From deployment output
   - From block explorer

3. **Update Config**
   ```bash
   # Edit frontend/src/config/contractConfig.ts
   contractHash: 'hash-YOUR_HASH_HERE'
   ```

4. **Start Frontend**
   ```bash
   cd frontend
   npm start
   ```

5. **Test Contract**
   - Navigate to `/test`
   - Run test functions
   - View results

## 🚀 Production Build

```bash
cd frontend
npm run build
```

Output: `frontend/build/`

## 📦 Dependencies

Key packages:
- `react` - UI framework
- `styled-components` - Styling
- `casper-js-sdk` - Casper blockchain
- `@make-software/csprclick-react` - Wallet integration

## 🔗 Integration Points

### App.tsx
- Test page routing
- Navigation buttons
- Theme management

### useCep18Permit.ts
- Contract queries
- Deploy creation
- Error handling

### Cep18PermitTest.tsx
- UI components
- Test execution
- Result display

### contractConfig.ts
- Configuration values
- Dummy test data
- Error messages

## ✅ Checklist

- [ ] Install dependencies: `npm install`
- [ ] Get contract hash from deployment
- [ ] Update `contractConfig.ts` with hash
- [ ] Start dev server: `npm start`
- [ ] Connect wallet
- [ ] Navigate to `/test`
- [ ] Run read-only tests
- [ ] Run write tests
- [ ] View results and logs

## 💡 Tips

- **Dummy Values**: All write tests use safe dummy values
- **No Real Transfers**: Tests don't actually transfer tokens
- **Testnet Only**: Designed for testnet testing
- **Clear Logs**: Use "Clear All" button to reset
- **Persistent Config**: Settings persist during session

## 🆘 Need Help?

1. Check `TEST_PAGE_README.md` for detailed function docs
2. Review contract code in `contract/src/lib.rs`
3. Check browser console for errors
4. Verify wallet connection
5. Verify network selection (Testnet)

## 📞 Support Resources

- [Casper Docs](https://docs.cspr.cloud/)
- [CEP-18 Standard](https://github.com/casper-ecosystem/cep-18)
- [CSPRClick Wallet](https://www.csprclick.com/)
- [Odra Framework](https://docs.odra.dev/)

---

**Ready to test?** 🚀

1. Configure your contract hash
2. Start the dev server
3. Navigate to `/test`
4. Connect your wallet
5. Run the tests!
