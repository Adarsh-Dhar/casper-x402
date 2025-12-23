import { ActiveAccountType } from '../types';

export interface PaymentInfo {
  network: string;
  contract_hash: string;
  pay_to: string;
  amount: string;
  description: string;
  facilitator_url: string;
}

export interface PaymentData {
  deploy_hash: string;
  public_key: string;
  signature: string;
  amount: string;
  recipient: string;
  timestamp: number;
}

export interface KeyPairInfo {
  publicKey: string;
  privateKey: string;
  accountHash: string;
}

export class CasperPaymentClient {
  private networkName: string;
  private nodeUrl: string;

  constructor(nodeUrl: string = 'https://node.testnet.casper.network/rpc', networkName: string = 'casper-test') {
    this.networkName = networkName;
    this.nodeUrl = nodeUrl;
    
    console.log('🔧 CasperPaymentClient initialized for REAL transactions:');
    console.log('   - Node URL:', this.nodeUrl);
    console.log('   - Network:', this.networkName);
    console.log('   - Real transactions enabled:', process.env.NEXT_PUBLIC_ENABLE_REAL_TRANSACTIONS);
  }

  /**
   * Create payment data for x402 using real Casper testnet transactions
   */
  async createPaymentDataWithWallet(
    activeAccount: ActiveAccountType,
    paymentInfo: PaymentInfo,
    signMessage: (message: string, publicKey: string) => Promise<{ signature: string; cancelled: boolean }>
  ): Promise<PaymentData> {
    try {
      console.log('🚀 Creating REAL Casper payment transaction');
      console.log('👤 Active account:', activeAccount);
      console.log('💰 Payment info:', paymentInfo);
      
      const timestamp = Date.now();
      
      // Check if real transactions are enabled
      const enableRealTx = process.env.NEXT_PUBLIC_ENABLE_REAL_TRANSACTIONS === 'true';
      
      if (!enableRealTx) {
        throw new Error('Real transactions are disabled. Set NEXT_PUBLIC_ENABLE_REAL_TRANSACTIONS=true to enable.');
      }
      
      console.log('✅ REAL TRANSACTION MODE: Submitting to Casper testnet');
      console.log('   From:', activeAccount.public_key);
      console.log('   To:', paymentInfo.pay_to);
      console.log('   Amount:', paymentInfo.amount, 'motes');
      console.log('   Amount in CSPR:', parseInt(paymentInfo.amount) / 1000000000);
      
      // Step 1: Create deploy on server first
      console.log('📝 Creating deploy for signing...');
      const createResponse = await fetch('/api/submit-real-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step: 'create-deploy',
          activeAccount,
          paymentInfo
        })
      });
      
      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(`Deploy creation failed: ${errorData.message || createResponse.statusText}`);
      }
      
      const createResult = await createResponse.json();
      console.log('✅ Deploy created:', createResult.deployHash);
      
      // Step 2: Sign the deploy with wallet
      console.log('🔑 Requesting wallet signature for deploy...');
      let signResult;
      
      if (createResult.deployJson) {
        // Try to sign the full deploy object if available
        console.log('🎯 Signing full deploy object...');
        signResult = await signMessage(createResult.deployJson, activeAccount.public_key);
      } else {
        // Fallback to signing just the hash
        console.log('📝 Signing deploy hash...');
        signResult = await signMessage(createResult.deployHash, activeAccount.public_key);
      }
      
      if (signResult.cancelled) {
        throw new Error('User cancelled the transaction signing');
      }

      if (!signResult.signature || signResult.signature.length === 0) {
        throw new Error('Failed to generate signature - signature is empty');
      }

      console.log('✍️ Real signature received:', signResult.signature.substring(0, 16) + '...');
      
      // Step 3: Submit signed transaction
      console.log('📤 Submitting signed transaction to Casper testnet...');
      const submitResponse = await fetch('/api/submit-real-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step: 'submit-transaction',
          activeAccount,
          paymentInfo,
          signature: signResult.signature,
          deployHash: createResult.deployHash
        })
      });
      
      if (!submitResponse.ok) {
        const errorData = await submitResponse.json();
        throw new Error(`Transaction submission failed: ${errorData.message || submitResponse.statusText}`);
      }
      
      const result = await submitResponse.json();
      
      if (!result.success) {
        throw new Error(`Transaction failed: ${result.message}`);
      }
      
      console.log('🎉 REAL TRANSACTION SUBMITTED SUCCESSFULLY!');
      console.log('   Deploy hash:', result.deployHash);
      console.log('   Explorer URL:', result.explorerUrl);
      console.log('   Status:', result.details?.status);
      console.log('   ⏳ Note: Balance will update after blockchain confirmation (30-60 seconds)');
      
      // Create payment data with real deploy hash
      const paymentData = {
        deploy_hash: result.deployHash,
        public_key: activeAccount.public_key,
        signature: signResult.signature,
        amount: paymentInfo.amount,
        recipient: paymentInfo.pay_to,
        timestamp: Math.floor(timestamp / 1000)
      };
      
      console.log('💳 Payment data created with REAL transaction:', paymentData);
      
      // Schedule balance refresh after transaction confirmation delay
      console.log('🔄 Scheduling balance refresh in 45 seconds...');
      setTimeout(async () => {
        try {
          console.log('🔄 Refreshing balance after transaction confirmation...');
          const newBalance = await this.getAccountBalance(activeAccount.public_key);
          console.log('💰 Updated balance:', newBalance, 'motes');
          console.log('💰 Updated balance in CSPR:', (parseInt(newBalance) / 1000000000).toFixed(9));
          
          // Trigger a custom event to notify the frontend
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('balanceUpdated', { 
              detail: { balance: newBalance, publicKey: activeAccount.public_key } 
            }));
          }
        } catch (error) {
          console.error('❌ Error refreshing balance:', error);
        }
      }, 45000); // 45 seconds delay for blockchain confirmation
      
      return paymentData;
      
    } catch (error) {
      console.error('❌ Error creating real Casper payment:', error);
      throw error;
    }
  }

  /**
   * Get account balance using Casper testnet via proxy API
   */
  async getAccountBalance(publicKey: string): Promise<string> {
    try {
      console.log('💰 Fetching real balance for:', publicKey);
      console.log('🌐 Connecting to Casper testnet via proxy API');
      
      try {
        // Get the latest state root hash
        const stateResponse = await fetch('/api/casper-rpc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            method: 'chain_get_state_root_hash',
            params: {}
          })
        });
        
        if (!stateResponse.ok) {
          throw new Error(`HTTP error! status: ${stateResponse.status}`);
        }
        
        const stateData = await stateResponse.json();
        const stateRootHash = stateData.result?.state_root_hash;
        
        if (!stateRootHash) {
          throw new Error('Could not get state root hash');
        }
        
        console.log('📊 Got state root hash:', stateRootHash.substring(0, 16) + '...');
        
        // Get account info using the public key (use latest block)
        const accountResponse = await fetch('/api/casper-rpc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: 2,
            jsonrpc: '2.0',
            method: 'state_get_account_info',
            params: {
              public_key: publicKey
            }
          })
        });
        
        if (!accountResponse.ok) {
          throw new Error(`HTTP error! status: ${accountResponse.status}`);
        }
        
        const accountData = await accountResponse.json();
        
        if (accountData.error) {
          console.log('⚠️  Account not found on testnet:', accountData.error.message);
          console.log('💡 This account has no balance or does not exist on testnet');
          return '0';
        }
        
        const mainPurse = accountData.result?.account?.main_purse;
        
        if (!mainPurse) {
          console.log('⚠️  No main purse found');
          return '0';
        }
        
        console.log('👛 Found main purse:', mainPurse.substring(0, 16) + '...');
        
        // Get balance from the main purse
        const balanceResponse = await fetch('/api/casper-rpc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: 3,
            jsonrpc: '2.0',
            method: 'state_get_balance',
            params: {
              state_root_hash: stateRootHash,
              purse_uref: mainPurse
            }
          })
        });
        
        if (!balanceResponse.ok) {
          throw new Error(`HTTP error! status: ${balanceResponse.status}`);
        }
        
        const balanceData = await balanceResponse.json();
        
        if (balanceData.error) {
          console.log('⚠️  Could not get balance:', balanceData.error.message);
          return '0';
        }
        
        const balance = balanceData.result?.balance_value || '0';
        console.log('✅ Real testnet balance:', balance, 'motes');
        console.log('💰 Balance in CSPR:', (parseInt(balance) / 1000000000).toFixed(9));
        return balance;
        
      } catch (error) {
        console.error('❌ Error fetching real balance:', error);
        console.log('⚠️  Account may not exist on testnet or have zero balance');
        return '0';
      }
      
    } catch (error) {
      console.error('❌ Error in balance fetch:', error);
      return '0';
    }
  }

  /**
   * Generate a new key pair (for demo purposes only)
   */
  generateKeyPair(): KeyPairInfo {
    // Generate random bytes for demo purposes
    const privateKeyBytes = new Uint8Array(32);
    crypto.getRandomValues(privateKeyBytes);
    
    const privateKey = Array.from(privateKeyBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // For demo, create a mock public key and account hash
    const publicKey = '01' + privateKey.substring(0, 64);
    const accountHash = 'account-hash-' + privateKey.substring(0, 64);
    
    return {
      publicKey,
      privateKey,
      accountHash
    };
  }

  /**
   * Load key pair from private key hex (for demo purposes only)
   */
  loadKeyPairFromHex(privateKeyHex: string): KeyPairInfo {
    if (privateKeyHex.length !== 64) {
      throw new Error('Private key must be 64 hex characters');
    }
    
    const publicKey = '01' + privateKeyHex.substring(0, 64);
    const accountHash = 'account-hash-' + privateKeyHex.substring(0, 64);
    
    return {
      publicKey,
      privateKey: privateKeyHex,
      accountHash
    };
  }

  /**
   * Create payment data for x402 (demo/testing only)
   */
  async createPaymentData(
    keyPair: KeyPairInfo,
    paymentInfo: PaymentInfo
  ): Promise<PaymentData> {
    // Create a mock deploy hash for testing
    const deployHash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Create a mock signature for testing
    const signature = Array.from(crypto.getRandomValues(new Uint8Array(64)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return {
      deploy_hash: deployHash,
      public_key: keyPair.publicKey,
      signature: signature,
      amount: paymentInfo.amount,
      recipient: paymentInfo.pay_to,
      timestamp: Date.now()
    };
  }
}