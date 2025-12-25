/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
  HttpHandler, 
  RpcClient, 
  NativeTransferBuilder, 
  PrivateKey, 
  KeyAlgorithm, 
  PublicKey
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
   * @returns Signed transaction
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

      // Parse the recipient's public key
      const toPublicKey = PublicKey.fromHex(toAddress);

      // Create the native transfer using builder pattern
      // Standard fee for native transfer is 100,000,000 motes (0.1 CSPR)
      const STANDARD_PAYMENT_AMOUNT = 100_000_000;

      const transaction = new NativeTransferBuilder()
        .from(fromPublicKey)
        .target(toPublicKey)
        .amount(amountInMotes)
        .payment(STANDARD_PAYMENT_AMOUNT) // Required: Transaction fee
        .id(Date.now()) // Required: Transfer ID (memo)
        .chainName(CASPER_NETWORK_NAME)
        .build();

      // Sign the transaction with the user's private key
      transaction.sign(privateKey);

      return transaction;
    } catch (error) {
      console.error('Error creating payment transaction:', error);
      throw new Error(`Failed to create payment transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send transaction to the network
   * @param transaction - Signed transaction
   * @returns Transaction hash
   */
  async sendTransaction(transaction: any): Promise<string> {
    try {
      // Use the SDK's deploy method which handles serialization correctly
      // This calls account_put_deploy internally and returns the hash
      const deployResult = await this.rpcClient.waitForDeploy(transaction);
      
      // Check for deploy_hash in the result
      if (deployResult && deployResult.deploy.hash) {
        return deployResult.deploy.hash.toString();
      }
      
      throw new Error("No deploy hash returned from deploy operation");
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw new Error(`Failed to send transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transaction status
   * @param transactionHash - Transaction hash to check
   * @returns Transaction info
   */
  async getTransactionStatus(transactionHash: string): Promise<any> {
    try {
      const deployResult = await this.rpcClient.getDeploy(transactionHash);
      return deployResult;
    } catch (error) {
      console.error('Error getting transaction status:', error);
      throw new Error(`Failed to get transaction status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Wait for transaction to be executed
   * @param transactionHash - Transaction hash to wait for
   * @param timeout - Timeout in milliseconds (default: 5 minutes)
   * @returns Transaction execution result
   */
  async waitForTransaction(transactionHash: string, timeout: number = 300000): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds

    while (Date.now() - startTime < timeout) {
      try {
        const result = await this.rpcClient.getDeploy(transactionHash);
        
        if (result) {
          const executionResult = result.executionResultsV1
          
          if (executionResult) {
            return { success: true, result: true };
          } else if (executionResult) {
            return { success: false, error: "error" };
          }
        }
      } catch (error) {
        // Transaction might not be available yet, continue polling
        console.log('Waiting for transaction execution...');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Transaction execution timeout');
  }

  /**
   * Create payment from user's private key and send it
   * @param privateKeyHex - User's private key (hex string)
   * @param toAddress - Recipient address (public key hex)
   * @param amountInMotes - Amount in motes
   * @param keyAlgorithm - Key algorithm (ED25519 or SECP256K1)
   * @returns Transaction hash and signed transaction
   */
  async createAndSendPayment(
    privateKeyHex: string,
    toAddress: string,
    amountInMotes: string,
    keyAlgorithm: KeyAlgorithm = KeyAlgorithm.ED25519
  ): Promise<{ transactionHash: string; transaction: any }> {
    // Create the payment transaction using user's private key
    const transaction = await this.createPaymentTransaction(
      privateKeyHex, 
      toAddress, 
      amountInMotes,
      keyAlgorithm
    );
    
    // Send the transaction to the network
    const transactionHash = await this.sendTransaction(transaction);

    return { transactionHash, transaction };
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

export const checkPaymentStatus = async (transactionHash: string) => {
  return casperService.getTransactionStatus(transactionHash);
};

export const waitForPaymentConfirmation = async (transactionHash: string) => {
  return casperService.waitForTransaction(transactionHash);
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