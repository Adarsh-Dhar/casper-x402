/**
 * Cep18Permit Contract Configuration
 * Update these values with your deployed contract details
 */

export const CONTRACT_CONFIG = {
  // Testnet Configuration
  testnet: {
    nodeAddress: 'https://node.testnet.cspr.cloud',
    contractHash: '', // TODO: Add your deployed contract hash here
    chainName: 'casper-test',
    description: 'Casper Testnet'
  },

  // Mainnet Configuration
  mainnet: {
    nodeAddress: 'https://node.cspr.cloud',
    contractHash: '', // TODO: Add your mainnet contract hash here
    chainName: 'casper',
    description: 'Casper Mainnet'
  },

  // Local Development Configuration
  local: {
    nodeAddress: 'http://localhost:7777',
    contractHash: '', // TODO: Add your local contract hash here
    chainName: 'casper-test',
    description: 'Local Development'
  }
};

// Default configuration
export const DEFAULT_CONFIG = CONTRACT_CONFIG.testnet;

// Token metadata (for display purposes)
export const TOKEN_METADATA = {
  name: 'Cep18Permit Token',
  symbol: 'CEP18',
  decimals: 18,
  description: 'CEP-18 Token with Permit Functionality'
};

// Dummy test values
export const DUMMY_VALUES = {
  // Test recipient address (public key)
  recipientAddress: '0189099e95b8682bc6c3644f542f19344c3e3ece4dc7c655ca3523eb091b080de3',

  // Test amounts (in smallest units, assuming 18 decimals)
  amounts: {
    small: '1000000000000000000',      // 1 token
    medium: '5000000000000000000',     // 5 tokens
    large: '100000000000000000000'     // 100 tokens
  },

  // Test nonce
  nonce: 0,

  // Test deadline (1 hour from now)
  getDeadline: () => Math.floor(Date.now() / 1000) + 3600,

  // Dummy signature (128 hex characters)
  dummySignature: '0x' + '0'.repeat(128)
};

// RPC Methods
export const RPC_METHODS = {
  // Query contract state
  queryContract: 'query_contract',
  
  // Get state root hash
  getStateRootHash: 'chain_get_state_root_hash',
  
  // Get block
  getBlock: 'chain_get_block',
  
  // Put deploy
  putDeploy: 'account_put_deploy',
  
  // Get deploy
  getDeploy: 'info_get_deploy'
};

// Contract entry points
export const CONTRACT_ENTRY_POINTS = {
  // Read-only
  name: 'name',
  symbol: 'symbol',
  decimals: 'decimals',
  totalSupply: 'total_supply',
  balanceOf: 'balance_of',
  allowance: 'allowance',
  nonceOf: 'nonce_of',

  // Write operations
  init: 'init',
  transfer: 'transfer',
  approve: 'approve',
  transferFrom: 'transfer_from',
  claimPayment: 'claim_payment'
};

// Error messages
export const ERROR_MESSAGES = {
  walletNotConnected: 'Wallet not connected. Please connect your CSPRClick wallet.',
  contractHashMissing: 'Contract hash is required. Please configure it in the settings.',
  nodeAddressMissing: 'Node address is required. Please configure it in the settings.',
  invalidContractHash: 'Invalid contract hash format.',
  deploymentFailed: 'Deployment failed. Check the logs for details.',
  queryFailed: 'Query failed. The contract may not be deployed at this address.',
  insufficientBalance: 'Insufficient balance for this operation.',
  invalidSignature: 'Invalid signature. Please try again.',
  transactionExpired: 'Transaction expired. Please try again.'
};

// Success messages
export const SUCCESS_MESSAGES = {
  deploymentSubmitted: 'Deployment submitted successfully!',
  querySuccessful: 'Query completed successfully!',
  transactionConfirmed: 'Transaction confirmed!',
  walletConnected: 'Wallet connected successfully!'
};
