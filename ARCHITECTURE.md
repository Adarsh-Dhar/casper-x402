# 🏗️ Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              App.tsx (Main Component)                │  │
│  │  ├─ Home Page (/)                                   │  │
│  │  │  ├─ Welcome Section                              │  │
│  │  │  ├─ Getting Started                              │  │
│  │  │  ├─ X402 Demo                                    │  │
│  │  │  └─ [🧪 Go to Test Page] Button                 │  │
│  │  │                                                   │  │
│  │  └─ Test Page (/test)                              │  │
│  │     └─ Cep18PermitTest Component                   │  │
│  │        ├─ Configuration Panel                       │  │
│  │        ├─ Read-Only Tests (6)                       │  │
│  │        ├─ Write Tests (5)                           │  │
│  │        ├─ Results Grid                              │  │
│  │        └─ Execution Logs                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Hooks & Services                        │  │
│  │  ├─ useCep18Permit.ts                              │  │
│  │  │  ├─ balanceOf()                                  │  │
│  │  │  ├─ transfer()                                   │  │
│  │  │  ├─ approve()                                    │  │
│  │  │  ├─ allowance()                                  │  │
│  │  │  ├─ transferFrom()                               │  │
│  │  │  ├─ name()                                       │  │
│  │  │  ├─ symbol()                                     │  │
│  │  │  ├─ decimals()                                   │  │
│  │  │  ├─ totalSupply()                                │  │
│  │  │  ├─ nonceOf()                                    │  │
│  │  │  └─ claimPayment()                               │  │
│  │  │                                                   │  │
│  │  ├─ useX402.ts (Existing)                          │  │
│  │  │  └─ fetchWithPayment()                           │  │
│  │  │                                                   │  │
│  │  └─ useClickRef.ts (Wallet)                        │  │
│  │     ├─ activeAccount                                │  │
│  │     ├─ signMessage()                                │  │
│  │     └─ on() events                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Configuration & Constants                  │  │
│  │  ├─ contractConfig.ts                              │  │
│  │  │  ├─ CONTRACT_CONFIG (testnet/mainnet/local)     │  │
│  │  │  ├─ DUMMY_VALUES                                │  │
│  │  │  ├─ RPC_METHODS                                 │  │
│  │  │  ├─ CONTRACT_ENTRY_POINTS                       │  │
│  │  │  └─ ERROR_MESSAGES                              │  │
│  │  │                                                   │  │
│  │  └─ theme.tsx (Styling)                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    HTTP/RPC Requests
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Casper Blockchain Network                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Casper Node (RPC Endpoint)                  │  │
│  │  ├─ Testnet: node.testnet.cspr.cloud              │  │
│  │  ├─ Mainnet: node.cspr.cloud                      │  │
│  │  └─ Local: localhost:7777                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↓                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      Cep18Permit Smart Contract                     │  │
│  │  ├─ Contract Hash: hash-abc123...                  │  │
│  │  ├─ Chain: casper-test (testnet)                   │  │
│  │  │                                                   │  │
│  │  ├─ State Variables                                │  │
│  │  │  ├─ name: Var<String>                           │  │
│  │  │  ├─ symbol: Var<String>                         │  │
│  │  │  ├─ decimals: Var<u8>                           │  │
│  │  │  ├─ total_supply: Var<U256>                     │  │
│  │  │  ├─ balances: Mapping<Address, U256>            │  │
│  │  │  ├─ allowances: Mapping<(Address, Address), U256>│ │
│  │  │  └─ nonces: Mapping<Address, u64>               │  │
│  │  │                                                   │  │
│  │  ├─ Read-Only Functions                            │  │
│  │  │  ├─ name()                                       │  │
│  │  │  ├─ symbol()                                     │  │
│  │  │  ├─ decimals()                                   │  │
│  │  │  ├─ total_supply()                               │  │
│  │  │  ├─ balance_of()                                 │  │
│  │  │  ├─ allowance()                                  │  │
│  │  │  └─ nonce_of()                                   │  │
│  │  │                                                   │  │
│  │  ├─ Write Functions                                │  │
│  │  │  ├─ init()                                       │  │
│  │  │  ├─ transfer()                                   │  │
│  │  │  ├─ approve()                                    │  │
│  │  │  ├─ transfer_from()                              │  │
│  │  │  └─ claim_payment()                              │  │
│  │  │                                                   │  │
│  │  └─ Events                                         │  │
│  │     ├─ Transfer                                     │  │
│  │     ├─ Approval                                     │  │
│  │     └─ PaymentClaimed                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              CSPRClick Wallet Extension                     │
│  ├─ Account Management                                     │
│  ├─ Message Signing                                        │
│  ├─ Transaction Approval                                   │
│  └─ Network Selection                                      │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Read-Only Function Call
```
User clicks "Get Balance"
        ↓
Cep18PermitTest.tsx
        ↓
useCep18Permit.balanceOf()
        ↓
CasperClient.queryContract()
        ↓
RPC: query_contract
        ↓
Casper Node
        ↓
Smart Contract (balance_of)
        ↓
Returns: U256 balance
        ↓
Display in Result Box
```

### Write Function Call (Dummy)
```
User clicks "Test Transfer"
        ↓
Cep18PermitTest.tsx
        ↓
useCep18Permit.transfer()
        ↓
Log: "Transfer 1 token to 0x..."
        ↓
Return: "deploy_hash_placeholder"
        ↓
Display in Result Box
        ↓
Add to Execution Logs
```

### Wallet Connection Flow
```
User clicks Wallet Icon
        ↓
ClickUI Component
        ↓
CSPRClick Extension
        ↓
User Approves Connection
        ↓
useClickRef.activeAccount updated
        ↓
App.tsx updates state
        ↓
Wallet Icon shows connected
```

## Component Hierarchy

```
App.tsx
├─ ClickTopBar
│  └─ Wallet Connection UI
├─ Container
│  ├─ Home Page (/)
│  │  ├─ Welcome
│  │  ├─ GettingStartedContainer
│  │  │  ├─ LandingBrief (not connected)
│  │  │  └─ SignedInBrief (connected)
│  │  ├─ DemoSection
│  │  │  └─ X402Demo
│  │  └─ Navigation Button
│  │
│  └─ Test Page (/test)
│     ├─ Back Button
│     └─ Cep18PermitTest
│        ├─ ClickUI (Wallet)
│        ├─ ConfigSection
│        │  ├─ ConfigInput (Node Address)
│        │  ├─ ConfigInput (Contract Hash)
│        │  └─ ConfigInput (Chain Name)
│        ├─ TestGrid (Read-Only)
│        │  ├─ TestCard (name)
│        │  ├─ TestCard (symbol)
│        │  ├─ TestCard (decimals)
│        │  ├─ TestCard (totalSupply)
│        │  ├─ TestCard (balanceOf)
│        │  └─ TestCard (nonceOf)
│        ├─ TestGrid (Write)
│        │  ├─ TestCard (transfer)
│        │  ├─ TestCard (approve)
│        │  ├─ TestCard (allowance)
│        │  ├─ TestCard (transferFrom)
│        │  └─ TestCard (claimPayment)
│        ├─ Results Grid
│        │  └─ TestCard (per result)
│        └─ LogsSection
│           └─ LogsContainer
```

## State Management

### App.tsx State
```typescript
const [themeMode, setThemeMode] = useState<ThemeModeType>()
const [activeAccount, setActiveAccount] = useState<any>()
const [currentPage, setCurrentPage] = useState<'home' | 'test'>()
```

### Cep18PermitTest.tsx State
```typescript
const [contractHash, setContractHash] = useState<string>()
const [nodeAddress, setNodeAddress] = useState<string>()
const [chainName, setChainName] = useState<string>()
const [logs, setLogs] = useState<string>()
const [results, setResults] = useState<TestResult[]>()
const [isLoading, setIsLoading] = useState<boolean>()
```

## Configuration Flow

```
contractConfig.ts
├─ CONTRACT_CONFIG
│  ├─ testnet
│  │  ├─ nodeAddress
│  │  ├─ contractHash
│  │  └─ chainName
│  ├─ mainnet
│  │  ├─ nodeAddress
│  │  ├─ contractHash
│  │  └─ chainName
│  └─ local
│     ├─ nodeAddress
│     ├─ contractHash
│     └─ chainName
├─ DUMMY_VALUES
│  ├─ recipientAddress
│  ├─ amounts
│  ├─ nonce
│  ├─ getDeadline()
│  └─ dummySignature
├─ RPC_METHODS
├─ CONTRACT_ENTRY_POINTS
├─ ERROR_MESSAGES
└─ SUCCESS_MESSAGES
```

## File Dependencies

```
App.tsx
├─ Cep18PermitTest.tsx
│  ├─ useCep18Permit.ts
│  │  ├─ useClickRef (from @make-software/csprclick-ui)
│  │  ├─ CasperClient (from casper-js-sdk)
│  │  └─ contractConfig.ts
│  ├─ styled-components
│  └─ ClickUI (from @make-software/csprclick-ui)
├─ X402Demo.tsx
│  ├─ useX402.ts
│  ├─ useClickRef (from @make-software/csprclick-ui)
│  └─ styled-components
├─ ClickTopBar.tsx
├─ Container.tsx
├─ GettingStarted.tsx
└─ theme.tsx
```

## Deployment Architecture

```
Development
├─ Frontend Dev Server (localhost:3000)
├─ Contract (local build)
└─ Local Node (optional)

Testnet
├─ Frontend (deployed)
├─ Contract (deployed to testnet)
└─ Casper Testnet Node (node.testnet.cspr.cloud)

Mainnet
├─ Frontend (deployed)
├─ Contract (deployed to mainnet)
└─ Casper Mainnet Node (node.cspr.cloud)
```

## Security Architecture

```
User Input
├─ Validation (contractConfig.ts)
├─ Sanitization
└─ Safe Defaults

Wallet Integration
├─ Private Keys (in wallet only)
├─ Message Signing (in wallet)
└─ No Key Exposure

Contract Interaction
├─ Read-Only (no gas)
├─ Write (dummy values)
└─ Signature Verification (on-chain)

Data Flow
├─ HTTPS only
├─ No sensitive data in logs
└─ Dummy values for testing
```

## Error Handling Flow

```
User Action
        ↓
Try Block
├─ Success → Display Result
└─ Error → Catch Block
           ├─ Log Error
           ├─ Display Error Message
           └─ Add to Results
```

## Testing Flow

```
Test Page Load
        ↓
Configuration Panel
├─ User enters contract hash
├─ User enters node address
└─ User enters chain name
        ↓
Test Execution
├─ User clicks test button
├─ Function called
├─ Result captured
├─ Log entry added
└─ Result displayed
        ↓
Result Display
├─ Color-coded status
├─ Detailed message
└─ Timestamp
```

---

This architecture provides:
- **Modular design** - Easy to extend
- **Clear separation** - UI, logic, config
- **Secure interactions** - Wallet integration
- **Real-time feedback** - Logs and results
- **Flexible configuration** - Multiple networks
