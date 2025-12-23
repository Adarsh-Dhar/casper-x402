import pkg from 'casper-js-sdk';
const { 
  CasperClient, 
  DeployUtil, 
  CLValueBuilder, 
  CLPublicKey,
  RuntimeArgs,
  decodeBase16
} = pkg;

// Type definitions for the imported classes
type CasperClientType = InstanceType<typeof CasperClient>;
type DeployType = ReturnType<typeof DeployUtil.makeDeploy>;

export interface TransactionRequest {
  fromPublicKey: string;
  toPublicKey: string;
  amount: string; // in motes
  signature: string;
  deployHash?: string;
}

export interface TransactionResult {
  success: boolean;
  deployHash?: string;
  error?: string;
  explorerUrl?: string;
}

export class CasperTransactionService {
  private nodeUrl: string;
  private networkName: string;
  private casperClient: CasperClientType;

  constructor(nodeUrl: string, networkName: string) {
    this.nodeUrl = nodeUrl;
    this.networkName = networkName;
    this.casperClient = new CasperClient(nodeUrl);
    console.log('🔧 CasperTransactionService initialized with REAL Casper SDK');
    console.log('   Node URL:', nodeUrl);
    console.log('   Network:', networkName);
  }

  /**
   * Create a real Casper transfer deploy using the Casper JS SDK
   */
  async createTransferDeploy(
    fromPublicKey: string,
    toPublicKey: string,
    amount: string
  ): Promise<{ deploy: DeployType; deployHash: string }> {
    try {
      console.log('🚀 Creating REAL Casper transfer deploy with SDK');
      console.log('   From:', fromPublicKey);
      console.log('   To:', toPublicKey);
      console.log('   Amount:', amount, 'motes');

      // Create CLPublicKey objects
      const fromCLPublicKey = CLPublicKey.fromHex(fromPublicKey);
      const toCLPublicKey = CLPublicKey.fromHex(toPublicKey);

      // Convert amount to number for proper handling
      const transferAmount = parseInt(amount);
      const gasPayment = 10000000000; // 10 CSPR for gas

      // Create the deploy using the correct SDK method with proper timestamps
      const currentTime = Date.now();
      const deployTimestamp = currentTime - 300000; // 5 minutes in the past
      const transferId = Math.floor(currentTime / 1000); // Use seconds since epoch for transfer ID
      
      console.log('🕐 Deploy timestamp:', new Date(deployTimestamp).toISOString());
      console.log('🕐 Current time:', new Date(currentTime).toISOString());
      console.log('🆔 Transfer ID:', transferId);
      
      const deploy = DeployUtil.makeDeploy(
        new DeployUtil.DeployParams(
          fromCLPublicKey,
          this.networkName,
          1, // gas price
          1800000, // ttl in milliseconds (30 minutes)
          [], // dependencies
          deployTimestamp // timestamp (5 minutes in the past)
        ),
        DeployUtil.ExecutableDeployItem.newTransfer(
          transferAmount,
          toCLPublicKey,
          null, // sourcePurse (use main purse)
          transferId // transfer id (seconds since epoch)
        ),
        DeployUtil.standardPayment(gasPayment)
      );

      const deployHash = Buffer.from(deploy.hash).toString('hex');
      
      console.log('✅ REAL Casper deploy created successfully');
      console.log('   Deploy hash:', deployHash);
      console.log('   Network:', this.networkName);
      console.log('   Gas payment: 10 CSPR');

      return { deploy, deployHash };

    } catch (error) {
      console.error('❌ Error creating real Casper deploy:', error);
      throw new Error(`Failed to create deploy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit a signed deploy to the real Casper network
   */
  async submitSignedDeploy(
    deploy: DeployType,
    signature: string,
    publicKey: string
  ): Promise<TransactionResult> {
    try {
      console.log('📤 Submitting REAL signed deploy to Casper network');
      console.log('   Signer:', publicKey);
      console.log('   Signature length:', signature.length);
      console.log('   Network:', this.networkName);

      // Create CLPublicKey and signature
      const signerPublicKey = CLPublicKey.fromHex(publicKey);
      const signatureBytes = decodeBase16(signature);

      // Add the signature to the deploy
      const signedDeploy = DeployUtil.setSignature(
        deploy,
        signatureBytes,
        signerPublicKey
      );

      console.log('🌐 Submitting to Casper testnet via RPC...');
      
      // Submit to the real Casper network
      const deployHash = await this.casperClient.putDeploy(signedDeploy);

      console.log('🎉 REAL TRANSACTION SUBMITTED TO CASPER NETWORK!');
      console.log('   Deploy hash:', deployHash);
      console.log('   Network:', this.networkName);
      console.log('   RPC URL:', this.nodeUrl);

      const explorerUrl = `https://testnet.cspr.live/deploy/${deployHash}`;
      console.log('   Explorer URL:', explorerUrl);

      return {
        success: true,
        deployHash,
        explorerUrl
      };

    } catch (error) {
      console.error('❌ Error submitting REAL deploy to Casper network:', error);
      
      // Log detailed error information
      if (error instanceof Error) {
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error submitting to Casper network'
      };
    }
  }

  /**
   * Get account balance via real Casper RPC
   */
  async getAccountBalance(publicKey: string): Promise<string> {
    try {
      console.log('💰 Fetching REAL account balance for:', publicKey);

      // Get the latest state root hash
      const stateRootHash = await this.casperClient.nodeClient.getStateRootHash();
      console.log('📊 Got state root hash:', stateRootHash.substring(0, 16) + '...');

      // Get account info using the correct method
      const accountHash = CLPublicKey.fromHex(publicKey).toAccountHashStr();
      const accountInfo = await this.casperClient.nodeClient.getBlockState(
        stateRootHash,
        accountHash,
        []
      );

      if (!accountInfo || !accountInfo.Account) {
        console.log('⚠️  Account not found on network');
        return '0';
      }

      const mainPurse = accountInfo.Account.mainPurse;
      console.log('👛 Found main purse:', mainPurse.substring(0, 16) + '...');

      // Get balance from main purse using the correct method
      const balance = await this.casperClient.nodeClient.getAccountBalance(
        stateRootHash,
        mainPurse
      );

      console.log('✅ REAL account balance:', balance.toString(), 'motes');
      console.log('💰 Balance in CSPR:', (parseInt(balance.toString()) / 1000000000).toFixed(9));
      
      return balance.toString();

    } catch (error) {
      console.error('❌ Error fetching REAL balance:', error);
      
      // Fallback to RPC method if SDK method fails
      try {
        console.log('🔄 Trying fallback RPC method...');
        return await this.getAccountBalanceRPC(publicKey);
      } catch (fallbackError) {
        console.error('❌ Fallback RPC method also failed:', fallbackError);
        return '0';
      }
    }
  }

  /**
   * Fallback method to get balance via direct RPC
   */
  private async getAccountBalanceRPC(publicKey: string): Promise<string> {
    // Get state root hash
    const stateResponse = await fetch(this.nodeUrl, {
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

    const stateData = await stateResponse.json();
    const stateRootHash = stateData.result?.state_root_hash;

    if (!stateRootHash) {
      throw new Error('Could not get state root hash');
    }

    // Get account info
    const accountResponse = await fetch(this.nodeUrl, {
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

    const accountData = await accountResponse.json();
    
    if (accountData.error) {
      console.log('⚠️  Account not found via RPC, balance is 0');
      return '0';
    }

    const mainPurse = accountData.result?.account?.main_purse;
    if (!mainPurse) {
      return '0';
    }

    // Get balance
    const balanceResponse = await fetch(this.nodeUrl, {
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

    const balanceData = await balanceResponse.json();
    const balance = balanceData.result?.balance_value || '0';
    
    console.log('✅ RPC fallback balance:', balance, 'motes');
    return balance;
  }

  /**
   * Validate transaction parameters
   */
  validateTransaction(request: TransactionRequest): { valid: boolean; error?: string } {
    try {
      // Validate public key format (should be hex, 66 chars for compressed keys)
      if (!request.fromPublicKey || request.fromPublicKey.length < 64) {
        return { valid: false, error: 'Invalid from public key format' };
      }

      if (!request.toPublicKey || request.toPublicKey.length < 64) {
        return { valid: false, error: 'Invalid to public key format' };
      }

      // Validate amount
      const amount = BigInt(request.amount);
      if (amount <= 0) {
        return { valid: false, error: 'Amount must be greater than 0' };
      }

      // Validate signature (only if provided and not empty)
      if (request.signature && request.signature.length > 0 && request.signature.length !== 128) {
        return { valid: false, error: 'Invalid signature format' };
      }

      return { valid: true };

    } catch (error) {
      return { 
        valid: false, 
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}