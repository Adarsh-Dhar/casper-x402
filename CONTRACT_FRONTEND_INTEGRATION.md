# 🔗 Cep18Permit Contract & Frontend Integration

Complete integration of the Cep18Permit smart contract with the React frontend, including a comprehensive test page.

## 📦 What's Included

### Smart Contract (Rust/Odra)
- **Location**: `contract/src/lib.rs`
- **Status**: ✅ Built and ready to deploy
- **WASM**: `contract/wasm/Cep18Permit.wasm` (331 KB)
- **Features**:
  - CEP-18 token standard
  - Signature-based payments
  - Nonce-based replay protection
  - Event emissions

### Frontend Integration
- **Test Page**: `/test` route
- **Components**: Cep18PermitTest.tsx
- **Hooks**: useCep18Permit.ts
- **Config**: contractConfig.ts
- **Documentation**: Multiple guides

## 🚀 Quick Start

### 1. Deploy Contract

```bash
cd contract
./deploy.sh  # or use web UI at https://cspr.cloud/
```

Get the contract hash from deployment output.

### 2. Configure Frontend

Edit `frontend/src/config/contractConfig.ts`:

```typescript
contractHash: 'hash-YOUR_DEPLOYED_HASH'
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm start
```

### 4. Access Test Page

- Click "🧪 Go to Contract Test Page" button
- Or visit: `http://localhost:3000/test`

## 📋 Test Page Functions

### Read-Only (No Gas)
| Function | Purpose | Returns |
|----------|---------|---------|
| `name()` | Get token name | String |
| `symbol()` | Get token symbol | String |
| `decimals()` | Get decimal places | u8 |
| `totalSupply()` | Get total supply | U256 |
| `balanceOf()` | Get wallet balance | U256 |
| `nonceOf()` | Get signature nonce | u64 |

### Write Operations (With Dummy Values)
| Function | Purpose | Parameters |
|----------|---------|------------|
| `transfer()` | Transfer tokens | recipient, amount |
| `approve()` | Approve spender | spender, amount |
| `allowance()` | Check allowance | owner, spender |
| `transferFrom()` | Transfer from approved | owner, recipient, amount |
| `claimPayment()` | Signature-based payment | pubkey, recipient, amount, nonce, deadline, signature |

## 📁 File Structure

```
project/
├── contract/
│   ├── src/lib.rs                    # Smart contract code
│   ├── wasm/Cep18Permit.wasm        # Compiled WASM
│   ├── keys/                         # Generated keypair
│   ├── deploy.sh                     # Deployment script
│   ├── DEPLOYMENT_READY.md           # Deployment guide
│   └── DEPLOYMENT_GUIDE.md           # Detailed guide
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Cep18PermitTest.tsx  # Test page component
│   │   │   └── X402Demo.tsx         # Existing demo
│   │   ├── hooks/
│   │   │   ├── useCep18Permit.ts    # Contract hook
│   │   │   └── useX402.ts           # Existing hook
│   │   ├── config/
│   │   │   └── contractConfig.ts    # Configuration
│   │   └── App.tsx                  # Updated with routing
│   ├── TEST_PAGE_README.md          # Test page guide
│   ├── INTEGRATION_SUMMARY.md       # Integration details
│   └── package.json
│
├── FRONTEND_SETUP.md                # Frontend setup guide
└── CONTRACT_FRONTEND_INTEGRATION.md # This file
```

## 🔧 Configuration

### Contract Hash

Required for all tests. Get from:
1. Deployment output
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

## 🧪 Test Page Features

### Configuration Panel
- Node address input
- Contract hash input
- Chain name input
- Real-time validation

### Test Cards
- One card per function
- Function name and description
- Test button
- Result display

### Execution Logs
- Timestamped entries
- Real-time updates
- Clear button
- Scrollable container

### Results Grid
- Success/error/info indicators
- Color-coded results
- Detailed messages

## 🔐 Security

### Dummy Values
- All write tests use safe dummy values
- No real tokens transferred
- Dummy signatures won't validate on-chain
- Testnet only

### Wallet Security
- Private keys never exposed
- Signatures handled by wallet
- No sensitive data in logs
- Secure message signing

## 📊 Test Results Display

Each test shows:
```
Function Name: transfer()
Result: Deploy: deploy_hash_placeholder
Type: Info (blue)
```

Results are:
- Color-coded by type
- Timestamped in logs
- Displayed in grid
- Scrollable in logs

## 🐛 Troubleshooting

### Common Issues

**"Wallet not connected"**
- Solution: Click wallet icon and connect CSPRClick

**"Contract hash not found"**
- Solution: Verify contract hash is correct and deployed

**"HTTP 401 Unauthorized"**
- Solution: Update auth token in configuration

**"Insufficient balance"**
- Solution: Request testnet CSPR from faucet

**Tests not running**
- Solution: Check browser console, verify wallet connection

## 📚 Documentation

### Setup & Configuration
- `FRONTEND_SETUP.md` - Frontend setup guide
- `frontend/INTEGRATION_SUMMARY.md` - Integration details
- `contract/DEPLOYMENT_READY.md` - Deployment guide

### Usage Guides
- `frontend/TEST_PAGE_README.md` - Test page user guide
- `contract/DEPLOYMENT_GUIDE.md` - Detailed deployment

### Code Documentation
- `contract/src/lib.rs` - Contract code with comments
- `frontend/src/hooks/useCep18Permit.ts` - Hook documentation
- `frontend/src/config/contractConfig.ts` - Configuration

## 🔄 Integration Points

### App.tsx
```typescript
// Added test page routing
const [currentPage, setCurrentPage] = useState<'home' | 'test'>('home');

// Added navigation button
<button onClick={() => setCurrentPage('test')}>
  🧪 Go to Contract Test Page
</button>
```

### useCep18Permit.ts
```typescript
// Contract interaction methods
const contract = useCep18Permit({
  nodeAddress,
  contractHash,
  chainName
});

// Call contract functions
const balance = await contract.balanceOf(account);
```

### Cep18PermitTest.tsx
```typescript
// Test execution
const testName = async () => {
  const result = await contract.name();
  addResult('name()', result, 'success');
};
```

## 🚀 Deployment Workflow

1. **Build Contract**
   ```bash
   cd contract
   cargo odra build
   ```

2. **Deploy Contract**
   ```bash
   ./deploy.sh  # or use web UI
   ```

3. **Get Contract Hash**
   - From deployment output
   - From block explorer

4. **Update Frontend Config**
   ```typescript
   contractHash: 'hash-YOUR_HASH'
   ```

5. **Start Frontend**
   ```bash
   cd frontend
   npm start
   ```

6. **Test Contract**
   - Navigate to `/test`
   - Run tests
   - View results

## ✅ Checklist

### Contract
- [x] Contract code written
- [x] Contract compiled to WASM
- [x] Keys generated
- [x] Deployment scripts created
- [ ] Contract deployed (manual step)

### Frontend
- [x] Test page component created
- [x] Contract hook created
- [x] Configuration file created
- [x] App.tsx updated with routing
- [x] Navigation buttons added
- [x] Documentation created
- [ ] Contract hash configured (manual step)
- [ ] Frontend started (manual step)
- [ ] Tests executed (manual step)

## 📞 Support

### Resources
- [Casper Documentation](https://docs.cspr.cloud/)
- [CEP-18 Standard](https://github.com/casper-ecosystem/cep-18)
- [Odra Framework](https://docs.odra.dev/)
- [CSPRClick Wallet](https://www.csprclick.com/)

### Troubleshooting
1. Check relevant documentation
2. Review browser console
3. Verify wallet connection
4. Verify network selection
5. Check contract deployment

## 🎯 Next Steps

1. **Deploy Contract**
   - Use deployment script or web UI
   - Get contract hash

2. **Configure Frontend**
   - Add contract hash to config
   - Verify node address

3. **Start Testing**
   - Start frontend dev server
   - Navigate to test page
   - Connect wallet
   - Run tests

4. **Integrate with App**
   - Use contract hook in other components
   - Implement payment flow
   - Add contract interactions

## 💡 Tips

- **Dummy Values**: Safe for testing without real transfers
- **Read-Only First**: Test read functions before write
- **Check Logs**: Execution logs show detailed information
- **Clear Results**: Use "Clear All" to reset between tests
- **Persistent Config**: Settings persist during session

## 📝 Notes

- Test page uses dummy values for safety
- All read-only functions work immediately
- Write functions require wallet connection
- Results displayed in real-time
- Logs can be cleared with button
- Configuration persists during session

---

**Ready to integrate?** 🚀

1. Deploy your contract
2. Get the contract hash
3. Update the frontend config
4. Start the dev server
5. Navigate to `/test`
6. Connect your wallet
7. Run the tests!

For detailed instructions, see:
- `FRONTEND_SETUP.md` - Frontend setup
- `contract/DEPLOYMENT_READY.md` - Contract deployment
- `frontend/TEST_PAGE_README.md` - Test page usage
