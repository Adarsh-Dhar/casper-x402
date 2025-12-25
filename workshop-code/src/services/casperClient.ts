/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  HttpHandler,
  RpcClient,
  KeyAlgorithm,
  PrivateKey,
  PublicKey,
  makeCsprTransferDeploy,
  Deploy,
} from 'casper-js-sdk';

export interface CasperConfig {
  nodeUrl: string;
  networkName: string;
}

export class CasperService {
  private rpcClient: RpcClient;
  private networkName: string;

  constructor(config: CasperConfig) {
    const rpcHandler = new HttpHandler(config.nodeUrl);
    this.rpcClient = new RpcClient(rpcHandler);
    this.networkName = config.networkName;
  }

  /**
   * Create and sign a native transfer using v5 API
   */
  async createTransfer(
    fromPublicKeyHex: string,
    fromPrivateKeyHex: string,
    toPublicKeyHex: string,
    amount: string
  ): Promise<Deploy> {
    try {
      console.log('Creating transfer deploy...');
      console.log('Sender:', fromPublicKeyHex);
      console.log('Recipient:', toPublicKeyHex);
      console.log('Amount:', amount);

      // Parse private key using v5 API
      const privateKey = await PrivateKey.fromHex(
        fromPrivateKeyHex,
        KeyAlgorithm.ED25519 // or KeyAlgorithm.SECP256K1 depending on your key type
      );

      // Create deploy using v5 utility function
      const deploy = makeCsprTransferDeploy({
        senderPublicKeyHex: fromPublicKeyHex,
        recipientPublicKeyHex: toPublicKeyHex,
        transferAmount: amount, // Amount in motes
        chainName: this.networkName,
        paymentAmount: '100000000', // 0.1 CSPR payment for native transfer
      });

      // Sign the deploy
      deploy.sign(privateKey);

      console.log('Deploy created and signed successfully');
      console.log('Deploy hash:', deploy.hash.toHex());

      return deploy;
    } catch (error) {
      console.error('Error creating transfer:', error);
      throw error;
    }
  }

  /**
   * Send a signed deploy to the network
   */
  async sendTransaction(deploy: Deploy): Promise<string> {
    try {
      console.log('Submitting deploy to network...');

      // Send the deploy using v5 RpcClient
      const result = await this.rpcClient.putDeploy(deploy);
      
      console.log('Deploy submitted successfully');
      console.log('Deploy hash:', result.deployHash);
      
      return result.deployHash.toHex();
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw new Error(`Failed to send transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get deploy status
   */
  async getDeployStatus(deployHash: string): Promise<any> {
    try {
      const deployResult = await this.rpcClient.getDeploy(deployHash);
      return deployResult;
    } catch (error) {
      console.error('Error getting deploy status:', error);
      throw error;
    }
  }

  /**
   * Wait for deploy to be processed
   */
  async waitForDeploy(deployHash: string, timeout = 300000): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await this.rpcClient.getDeploy(deployHash);
        
        if (result.executionInfo) {
          const execution = result.executionResultsV1;
          
          return { execution, success: true };
        }
        
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        // Deploy might not be available yet
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    throw new Error('Timeout waiting for deploy to be processed');
  }

  /**
   * Get account balance
   */
  async getAccountBalance(publicKeyHex: string): Promise<string> {
    try {
      // const publicKey = PublicKey.fromHex(publicKeyHex);
      
      // // Get latest state root hash
      // const stateRootHash = await this.rpcClient.getStateRootHashLatest();
      
      // Query balance
      const balance = await this.rpcClient.queryBalanceDetailsByStateRootHash;
      
      return balance.toString();
    } catch (error) {
      console.error('Error getting account balance:', error);
      throw error;
    }
  }

  /**
   * Generate new key pair
   */
  async generateKeys(algorithm: KeyAlgorithm = KeyAlgorithm.ED25519): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    const privateKey = await PrivateKey.generate(algorithm);
    const publicKey = privateKey.publicKey;
    
    return {
      publicKey: publicKey.toHex(),
      privateKey: privateKey.toBytes().toString(),
    };
  }
}

/**
 * Export helper to create payment header
 */
export function createPaymentHeader(
  deployHash: string,
  senderPublicKey: string
): string {
  return JSON.stringify({
    deploy_hash: deployHash,
    sender: senderPublicKey,
    network: 'casper-test',
  });
}

/**
 * Convert public key to account hash
 */
export function getAccountHashFromPublicKey(publicKeyHex: string): string {
  const publicKey = PublicKey.fromHex(publicKeyHex);
  return publicKey.accountHash.toString();
}