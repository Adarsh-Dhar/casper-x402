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

  constructor(nodeUrl: string = 'http://localhost:11101/rpc', networkName: string = 'casper-test') {
    this.networkName = networkName;
  }

  /**
   * Generate a new key pair (simplified for demo)
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
   * Load key pair from private key hex (simplified)
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
   * Create payment data for x402 (simplified for demo)
   */
  async createPaymentData(
    keyPair: KeyPairInfo,
    paymentInfo: PaymentInfo
  ): Promise<PaymentData> {
    // Create a mock deploy hash
    const deployHash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Create a mock signature
    const message = `${keyPair.publicKey}${paymentInfo.pay_to}${paymentInfo.amount}${Date.now()}`;
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

  /**
   * Get account balance (mock for demo)
   */
  async getAccountBalance(publicKey: string): Promise<string> {
    // Return a mock balance for demo purposes
    return '5000000000'; // 5 CSPR in motes
  }
}