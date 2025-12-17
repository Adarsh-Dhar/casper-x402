# 🧪 Cep18Permit Contract Test Page

A comprehensive testing interface for the Cep18Permit smart contract deployed on Casper Testnet.

## 🚀 Quick Start

### Access the Test Page

1. Start the frontend development server:
   ```bash
   cd frontend
   npm start
   ```

2. Navigate to the test page:
   - Click the "🧪 Go to Contract Test Page" button on the home page
   - Or directly visit: `http://localhost:3000/test`

### Configure the Contract

Before testing, you need to configure:

1. **Node Address**: The Casper RPC endpoint
   - Default: `https://node.testnet.cspr.cloud`
   - Requires valid auth token in headers

2. **Contract Hash**: The deployed contract hash
   - Format: `hash-abc123...` or just the hex value
   - Get this from your deployment

3. **Chain Name**: The Casper network
   - Testnet: `casper-test`
   - Mainnet: `casper`

## 📖 Read-Only Functions

These functions query contract state without requiring transactions:

### name()
- **Returns**: Token name (string)
- **Example**: "MyToken"
- **Gas**: None (read-only)

### symbol()
- **Returns**: Token symbol (string)
- **Example**: "MTK"
- **Gas**: None (read-only)

### decimals()
- **Returns**: Number of decimal places (u8)
- **Example**: 18
- **Gas**: None (read-only)

### totalSupply()
- **Returns**: Total token supply (U256)
- **Example**: "1000000000000000000000000"
- **Gas**: None (read-only)

### balanceOf()
- **Returns**: Token balance of connected wallet (U256)
- **Requires**: Wallet connection
- **Gas**: None (read-only)

### nonceOf()
- **Returns**: Current nonce for signature-based payments (u64)
- **Requires**: Wallet connection
- **Gas**: None (read-only)

## ✍️ Write Functions

These functions modify contract state and require transactions:

### transfer(recipient, amount)
- **Parameters**:
  - `recipient`: Destination address
  - `amount`: Amount to transfer (in smallest units)
- **Example**: Transfer 1 token (with 18 decimals) = "1000000000000000000"
- **Gas**: Required
- **Test Values**: Uses dummy recipient address

### approve(spender, amount)
- **Parameters**:
  - `spender`: Address allowed to spend tokens
  - `amount`: Maximum amount spender can transfer
- **Example**: Approve 5 tokens = "5000000000000000000"
- **Gas**: Required
- **Test Values**: Uses dummy spender address

### allowance(owner, spender)
- **Returns**: Amount spender is allowed to transfer from owner
- **Parameters**:
  - `owner`: Token owner address
  - `spender`: Spender address
- **Gas**: None (read-only)

### transferFrom(owner, recipient, amount)
- **Parameters**:
  - `owner`: Token owner
  - `recipient`: Destination address
  - `amount`: Amount to transfer
- **Requires**: Sufficient allowance from owner
- **Gas**: Required
- **Test Values**: Uses dummy addresses

### claimPayment(userPubkey, recipient, amount, nonce, deadline, signature)
- **Parameters**:
  - `userPubkey`: User's public key
  - `recipient`: Payment recipient
  - `amount`: Payment amount
  - `nonce`: Anti-replay nonce
  - `deadline`: Signature expiration timestamp
  - `signature`: Signed message
- **Purpose**: Signature-based gasless payment
- **Gas**: Required
- **Test Values**: Uses dummy values with 1-hour deadline

## 🔧 Configuration Details

### Node Address
- **Testnet**: `https://node.testnet.cspr.cloud`
- **Mainnet**: `https://node.cspr.cloud`
- **Local**: `http://localhost:7777`

### Contract Hash Format
- Full format: `hash-abc123def456...`
- Short format: `abc123def456...`
- Get from deployment output or block explorer

### Chain Name
- **Testnet**: `casper-test`
- **Mainnet**: `casper`

## 📊 Test Results

Each test displays:
- **Function Name**: The contract function tested
- **Result**: Return value or error message
- **Type**: Success (green), Error (red), or Info (blue)

Results are also logged in the execution logs section.

## 📝 Execution Logs

Real-time logs show:
- Timestamp of each operation
- Function calls and parameters
- Results and errors
- Wallet connection status

Use the "Clear All" button to reset logs and results.

## 🔐 Wallet Connection

### Requirements
- CSPRClick wallet extension installed
- Connected to Casper Testnet
- Account with sufficient CSPR for gas fees

### Connection Status
- Green indicator: Wallet connected
- Red indicator: Wallet disconnected
- Click wallet icon to connect/disconnect

## 💡 Testing Tips

### For Read-Only Functions
1. Configure contract hash
2. Click test button
3. View result immediately

### For Write Functions
1. Connect wallet
2. Configure contract hash
3. Click test button
4. Approve transaction in wallet
5. Wait for confirmation
6. View result in logs

### Dummy Values
- **Recipient Address**: `0189099e95b8682bc6c3644f542f19344c3e3ece4dc7c655ca3523eb091b080de3`
- **Amount**: Varies by function (1-5 tokens)
- **Nonce**: 0 (first payment)
- **Deadline**: Current time + 1 hour

## ⚠️ Important Notes

- **Test Values**: All write operations use dummy values for safety
- **No Real Transfers**: Tests don't actually transfer tokens
- **Gas Fees**: Write operations require CSPR for gas
- **Testnet Only**: Designed for testnet testing
- **Signature Verification**: Dummy signatures won't validate on-chain

## 🆘 Troubleshooting

### "Wallet not connected"
- Install CSPRClick extension
- Click wallet icon to connect
- Ensure you're on Casper Testnet

### "Contract hash not found"
- Verify contract hash is correct
- Check contract is deployed on the network
- Ensure node address is correct

### "HTTP 401 Unauthorized"
- Auth token is invalid or expired
- Get new token from https://cspr.cloud/
- Update node address configuration

### "Insufficient balance"
- Request testnet CSPR from faucet
- Wait for transaction confirmation
- Check balance with balanceOf()

## 📚 Resources

- [Casper Documentation](https://docs.cspr.cloud/)
- [CEP-18 Standard](https://github.com/casper-ecosystem/cep-18)
- [Odra Framework](https://docs.odra.dev/)
- [CSPRClick Wallet](https://www.csprclick.com/)

## 🔗 Related Files

- **Hook**: `frontend/src/hooks/useCep18Permit.ts`
- **Component**: `frontend/src/components/Cep18PermitTest.tsx`
- **Contract**: `contract/src/lib.rs`
- **Deployment**: `contract/DEPLOYMENT_READY.md`
