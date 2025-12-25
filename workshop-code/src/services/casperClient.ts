/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
  HttpHandler, 
  RpcClient, 
  PrivateKey, 
  KeyAlgorithm, 
  PublicKey,
  makeCsprTransferDeploy,
  Deploy
} from 'casper-js-sdk';

// Casper client configuration
// Use the local API proxy when running in the browser to avoid CORS errors
const CASPER_NODE_URL = typeof window !== 'undefined' 
  ? '/api/casper-rpc' 
  : (process.env.NEXT_PUBLIC_CASPER_NODE_URL || 'https://node.testnet.casper.network/rpc');

const CASPER_NETWORK_NAME = process.env.NEXT_PUBLIC_CASPER_NETWORK_NAME || 'casper-test';

export class CasperService {
  private rpcClient: RpcClient;
  private rpcHandler: HttpHandler;

  constructor() {
    this.rpcHandler = new HttpHandler(CASPER_NODE_URL);
    this.rpcClient = new RpcClient(this.rpcHandler);
  }

  /**
   * Create a payment transaction using the user's private key from the frontend
   * @param privateKeyHex - Private key provided by the user (as hex string)
   * @param toAddress - Recipient address (public key hex)
   * @param amountInMotes - Amount to transfer (in motes)
   * @param keyAlgorithm - Key algorithm (default: ED25519)
   * @returns Signed deploy
   */
  async createPaymentTransaction(
    privateKeyHex: string,
    toAddress: string,
    amountInMotes: string,
    keyAlgorithm: KeyAlgorithm = KeyAlgorithm.ED25519
  ) {
    try {
      // Parse the private key from the user input
      // Remove any '0x' prefix if present
      const cleanPrivateKey = privateKeyHex.startsWith('0x') 
        ? privateKeyHex.slice(2) 
        : privateKeyHex;

      // Create PrivateKey from the provided hex string and algorithm
      const privateKey = await PrivateKey.fromHex(cleanPrivateKey, keyAlgorithm);
      
      // Get the public key from the private key
      const fromPublicKey = privateKey.publicKey;
      const senderPublicKeyHex = fromPublicKey.toHex();

      // Parse the recipient's public key
      const toPublicKey = PublicKey.fromHex(toAddress);
      const recipientPublicKeyHex = toPublicKey.toHex();

      console.log('Creating transfer deploy...');
      console.log('Sender:', senderPublicKeyHex);
      console.log('Recipient:', recipientPublicKeyHex);
      console.log('Amount:', amountInMotes);

      // Create the deploy using makeCsprTransferDeploy
      const deploy = makeCsprTransferDeploy({
        chainName: CASPER_NETWORK_NAME,
        recipientPublicKeyHex: recipientPublicKeyHex,
        senderPublicKeyHex: senderPublicKeyHex,
        transferAmount: amountInMotes,
        memo: Date.now().toString(), // Use timestamp as memo/ID
      });

      console.log('Deploy created:', deploy);
      console.log('Deploy hash:', deploy.hash);

      // Sign the deploy with the user's private key
      deploy.sign(privateKey);

      console.log('Deploy signed successfully');

      return deploy;
    } catch (error) {
      console.error('Error creating payment transaction:', error);
      throw new Error(`Failed to create payment transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send transaction to the network
   * @param deploy - Signed deploy
   * @returns Deploy hash
   */
  async sendTransaction(deploy: any): Promise<string> {
    try {
      console.log('Submitting deploy to network...');
      console.log('Deploy hash:', deploy.hash);
      
      // Submit the deploy to the network
      const result = await this.rpcClient.putDeploy(deploy);
      
      console.log('Deploy submitted successfully:', result);
      
      // The result should contain the deploy hash
      const deployHash = result || deploy.hash;
      
      return deployHash.toString();
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw new Error(`Failed to send transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transaction status
   * @param deployHash - Deploy hash to check
   * @returns Deploy info
   */
  async getTransactionStatus(deployHash: string): Promise<any> {
    try {
      const deployResult = await this.rpcClient.getDeploy(deployHash);
      return deployResult;
    } catch (error) {
      console.error('Error getting transaction status:', error);
      throw new Error(`Failed to get transaction status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Wait for transaction to be executed
   * @param deployHash - Deploy hash to wait for
   * @param timeout - Timeout in milliseconds (default: 5 minutes)
   * @returns Transaction execution result
   */
  async waitForTransaction(deploy: Deploy, timeout: number = 300000): Promise<any> {
    try {
      console.log('Waiting for deploy execution:', deploy);

      
      // Use the SDK's built-in waitForDeploy method
      const result = await this.rpcClient.waitForDeploy(deploy, timeout);
      
      console.log('Deploy execution result:', result);
      const executionResult = result.executionResultsV1;
         
      return { success: true, executionResult };
    } catch (error) {
      console.error('Error waiting for transaction:', error);
      
      // If timeout or error, still return what we know
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Transaction confirmation timeout. The transaction may still be processing.');
      }
      
      throw new Error(`Failed to confirm transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create payment from user's private key and send it
   * @param privateKeyHex - User's private key (hex string)
   * @param toAddress - Recipient address (public key hex)
   * @param amountInMotes - Amount in motes
   * @param keyAlgorithm - Key algorithm (ED25519 or SECP256K1)
   * @returns Deploy hash and signed deploy
   */
  async createAndSendPayment(
    privateKeyHex: string,
    toAddress: string,
    amountInMotes: string,
    keyAlgorithm: KeyAlgorithm = KeyAlgorithm.ED25519
  ): Promise<{ deployHash: string; deploy: any }> {
    // Create the payment deploy using user's private key
    const deploy = await this.createPaymentTransaction(
      privateKeyHex, 
      toAddress, 
      amountInMotes,
      keyAlgorithm
    );
    
    // Send the deploy to the network
    const deployHash = await this.sendTransaction(deploy);

    return { deployHash, deploy };
  }

  /**
   * Detect key algorithm from public key prefix
   * @param publicKeyHex - Public key hex string
   * @returns KeyAlgorithm
   */
  detectKeyAlgorithm(publicKeyHex: string): KeyAlgorithm {
    const cleanKey = publicKeyHex.startsWith('0x') ? publicKeyHex.slice(2) : publicKeyHex;
    
    // Casper public keys have a prefix byte:
    // 01 = Ed25519
    // 02 = Secp256K1
    const prefix = cleanKey.substring(0, 2);
    
    if (prefix === '01') {
      return KeyAlgorithm.ED25519;
    } else if (prefix === '02') {
      return KeyAlgorithm.SECP256K1;
    }
    
    // Default to Ed25519 if unable to detect
    return KeyAlgorithm.ED25519;
  }

  /**
   * Get public key from private key
   * @param privateKeyHex - Private key hex string
   * @param keyAlgorithm - Key algorithm
   * @returns Public key hex string
   */
  async getPublicKeyFromPrivate(
    privateKeyHex: string,
    keyAlgorithm: KeyAlgorithm = KeyAlgorithm.ED25519
  ): Promise<string> {
    try {
      const cleanPrivateKey = privateKeyHex.startsWith('0x') 
        ? privateKeyHex.slice(2) 
        : privateKeyHex;

      const privateKey = await PrivateKey.fromHex(cleanPrivateKey, keyAlgorithm);
      const publicKey = privateKey.publicKey;
      
      return publicKey.toHex();
    } catch (error) {
      console.error('Error getting public key:', error);
      throw new Error(`Failed to get public key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate private key format
   * @param privateKeyHex - Private key to validate
   * @param keyAlgorithm - Expected key algorithm
   * @returns true if valid, throws error if invalid
   */
  async validatePrivateKey(
    privateKeyHex: string,
    keyAlgorithm: KeyAlgorithm = KeyAlgorithm.ED25519
  ): Promise<boolean> {
    try {
      const cleanPrivateKey = privateKeyHex.startsWith('0x') 
        ? privateKeyHex.slice(2) 
        : privateKeyHex;

      // Try to create a PrivateKey object - will throw if invalid
      await PrivateKey.fromHex(cleanPrivateKey, keyAlgorithm);
      
      return true;
    } catch (error) {
      throw new Error(`Invalid private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert CSPR to motes
   * @param cspr - Amount in CSPR
   * @returns Amount in motes (string)
   */
  csprToMotes(cspr: number | string): string {
    const csprValue = typeof cspr === 'string' ? parseFloat(cspr) : cspr;
    const motes = csprValue * 1_000_000_000;
    return Math.floor(motes).toString();
  }

  /**
   * Convert motes to CSPR
   * @param motes - Amount in motes
   * @returns Amount in CSPR (number)
   */
  motesToCspr(motes: string | number): number {
    const motesValue = typeof motes === 'string' ? parseFloat(motes) : motes;
    return motesValue / 1_000_000_000;
  }
}

// Export a singleton instance
export const casperService = new CasperService();

// Export helper functions for use in components
export const createPayment = async (
  privateKeyHex: string,
  toAddress: string,
  amountInMotes: string,
  keyAlgorithm: KeyAlgorithm = KeyAlgorithm.ED25519
) => {
  return casperService.createAndSendPayment(privateKeyHex, toAddress, amountInMotes, keyAlgorithm);
};

export const checkPaymentStatus = async (deployHash: string) => {
  return casperService.getTransactionStatus(deployHash);
};

export const waitForPaymentConfirmation = async (deploy: Deploy) => {
  return casperService.waitForTransaction(deploy);
};

export const getPublicKey = async (
  privateKeyHex: string,
  keyAlgorithm: KeyAlgorithm = KeyAlgorithm.ED25519
) => {
  return casperService.getPublicKeyFromPrivate(privateKeyHex, keyAlgorithm);
};

export const validatePrivateKey = async (
  privateKeyHex: string,
  keyAlgorithm: KeyAlgorithm = KeyAlgorithm.ED25519
) => {
  return casperService.validatePrivateKey(privateKeyHex, keyAlgorithm);
};

// Export KeyAlgorithm for use in components
export { KeyAlgorithm };