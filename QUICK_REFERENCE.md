# 🚀 Quick Reference Guide

## 5-Minute Setup

### Step 1: Deploy Contract
```bash
cd contract
./deploy.sh
# Get: Deploy Hash: hash-abc123...
```

### Step 2: Update Config
```bash
# Edit: frontend/src/config/contractConfig.ts
contractHash: 'hash-abc123...'  # ← Paste your hash
```

### Step 3: Start Frontend
```bash
cd frontend
npm install
npm start
```

### Step 4: Test
- Click "🧪 Go to Contract Test Page"
- Connect wallet
- Run tests

## 📍 Key Files

| File | Purpose |
|------|---------|
| `contract/src/lib.rs` | Smart contract code |
| `contract/wasm/Cep18Permit.wasm` | Compiled contract |
| `contract/deploy.sh` | Deployment script |
| `frontend/src/components/Cep18PermitTest.tsx` | Test page |
| `frontend/src/hooks/useCep18Permit.ts` | Contract hook |
| `frontend/src/config/contractConfig.ts` | Configuration |
| `frontend/src/App.tsx` | Main app (updated) |

## 🧪 Test Functions

### Read-Only (Click & View)
```
✓ name()           → Token name
✓ symbol()         → Token symbol
✓ decimals()       → Decimal places
✓ totalSupply()    → Total supply
✓ balanceOf()      → Your balance
✓ nonceOf()        → Your nonce
```

### Write (Dummy Values)
```
✓ transfer()       → Transfer tokens
✓ approve()        → Approve spender
✓ allowance()      → Check allowance
✓ transferFrom()   → Transfer from approved
✓ claimPayment()   → Signature payment
```

## 🔧 Configuration

### Contract Hash
```typescript
// frontend/src/config/contractConfig.ts
contractHash: 'hash-YOUR_HASH_HERE'
```

### Node Address
```
Testnet: https://node.testnet.cspr.cloud
Mainnet: https://node.cspr.cloud
Local:   http://localhost:7777
```

### Chain Name
```
Testnet: casper-test
Mainnet: casper
```

## 🎯 Test Page URL

```
Home:  http://localhost:3000/
Test:  http://localhost:3000/test
```

## 📊 Test Results

| Type | Color | Meaning |
|------|-------|---------|
| Success | Green | Function executed successfully |
| Error | Red | Function failed |
| Info | Blue | Function executed (write operation) |

## 🔐 Wallet Setup

1. Install CSPRClick extension
2. Create/import account
3. Switch to Casper Testnet
4. Request testnet CSPR
5. Click wallet icon in app
6. Connect

## 🐛 Quick Fixes

| Problem | Solution |
|---------|----------|
| Wallet not connected | Click wallet icon → Connect |
| Contract not found | Verify contract hash is correct |
| 401 Unauthorized | Update auth token in config |
| Insufficient balance | Request testnet CSPR from faucet |
| Tests not running | Check browser console for errors |

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `FRONTEND_SETUP.md` | Frontend setup guide |
| `CONTRACT_FRONTEND_INTEGRATION.md` | Full integration guide |
| `frontend/TEST_PAGE_README.md` | Test page detailed guide |
| `frontend/INTEGRATION_SUMMARY.md` | Integration details |
| `contract/DEPLOYMENT_READY.md` | Deployment guide |

## 💻 Commands

```bash
# Deploy contract
cd contract && ./deploy.sh

# Start frontend
cd frontend && npm start

# Build frontend
cd frontend && npm run build

# Run tests
cd frontend && npm test

# Format code
cd frontend && npm run format

# Lint code
cd frontend && npm run lint
```

## 🔗 Links

- **Testnet Explorer**: https://testnet.cspr.cloud/
- **Mainnet Explorer**: https://cspr.cloud/
- **Casper Docs**: https://docs.cspr.cloud/
- **CSPRClick Wallet**: https://www.csprclick.com/
- **Odra Framework**: https://docs.odra.dev/

## 📋 Dummy Test Values

```typescript
// Recipient address
0189099e95b8682bc6c3644f542f19344c3e3ece4dc7c655ca3523eb091b080de3

// Amounts (18 decimals)
1 token:   1000000000000000000
5 tokens:  5000000000000000000
100 tokens: 100000000000000000000

// Nonce: 0
// Deadline: Current time + 1 hour
// Signature: Dummy hex (won't validate)
```

## ✅ Checklist

- [ ] Deploy contract
- [ ] Get contract hash
- [ ] Update config
- [ ] Install dependencies
- [ ] Start frontend
- [ ] Connect wallet
- [ ] Navigate to /test
- [ ] Run read-only tests
- [ ] Run write tests
- [ ] View results

## 🚀 Next Steps

1. Deploy contract → Get hash
2. Update config → Add hash
3. Start frontend → npm start
4. Navigate to /test
5. Connect wallet
6. Run tests
7. View results

## 💡 Pro Tips

- **Dummy Values**: Safe for testing
- **No Real Transfers**: Tests don't transfer tokens
- **Testnet Only**: For testing only
- **Clear Logs**: Use "Clear All" button
- **Persistent Config**: Settings stay during session

## 🆘 Need Help?

1. Check `FRONTEND_SETUP.md`
2. Check `frontend/TEST_PAGE_README.md`
3. Check browser console
4. Verify wallet connection
5. Verify network selection

---

**Ready?** Deploy → Configure → Test! 🎉
