import { 
  PrivateKey, 
  KeyAlgorithm,
} from 'casper-js-sdk';
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
  keyInstance?: PrivateKey;
}

export class CasperPaymentClient {
  private networkName: string;
  private nodeUrl: string;

  constructor(nodeUrl: string = 'https://node.testnet.casper.network/rpc', networkName: string = 'casper-test') {
    this.networkName = networkName;
    this.nodeUrl = nodeUrl;
  }

  /**
   * 1. Create Payment with Wallet (Was missing)
   */
  async createPaymentDataWithWallet(
    activeAccount: ActiveAccountType,
    paymentInfo: PaymentInfo,
    signMessage: (message: string, publicKey: string) => Promise<{ signature: string; cancelled: boolean }>
  ): Promise<PaymentData> {
    try {
      const timestamp = Date.now();
      const enableRealTx = process.env.NEXT_PUBLIC_ENABLE_REAL_TRANSACTIONS === 'true';
      
      if (!enableRealTx) throw new Error('Real transactions are disabled.');
      
      // Step 1: Create deploy
      const createResponse = await fetch('/api/submit-real-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'create-deploy', activeAccount, paymentInfo })
      });
      console.log("create response", createResponse)
      
      if (!createResponse.ok) throw new Error('Deploy creation failed');
      const createResult = await createResponse.json();
      
      // Step 2: Sign
      let signResult = await signMessage(createResult.deployHash, activeAccount.public_key);
      console.log("sign result", signResult)
      if (signResult.cancelled || !signResult.signature) throw new Error('Signing failed');

      // Step 3: Submit
      const submitResponse = await fetch('/api/submit-real-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'submit-transaction',
          activeAccount,
          paymentInfo,
          signature: signResult.signature,
          deployHash: createResult.deployHash
        })
      });
      console.log("submit response", submitResponse)
      
      if (!submitResponse.ok) throw new Error('Submission failed');
      const result = await submitResponse.json();
      
      // Schedule balance refresh
      setTimeout(async () => {
        try {
          const newBalance = await this.getAccountBalance(activeAccount.public_key);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('balanceUpdated', { 
              detail: { balance: newBalance, publicKey: activeAccount.public_key } 
            }));
          }
        } catch (e) { console.error(e); }
      }, 45000);
      
      return {
        deploy_hash: result.deployHash,
        public_key: activeAccount.public_key,
        signature: signResult.signature,
        amount: paymentInfo.amount,
        recipient: paymentInfo.pay_to,
        timestamp: Math.floor(timestamp / 1000)
      };
      
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  /**
   * 2. Get Balance (Was missing)
   */
  async getAccountBalance(publicKey: string): Promise<string> {
    try {
      // Get State Root Hash
      const stateResponse = await fetch('/api/casper-rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'chain_get_state_root_hash', params: {} })
      });
      const stateData = await stateResponse.json();
      const stateRootHash = stateData.result?.state_root_hash;
      if (!stateRootHash) return '0';
      
      // Get Account Info
      const accountResponse = await fetch('/api/casper-rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 2, jsonrpc: '2.0', method: 'state_get_account_info', params: { public_key: publicKey } })
      });
      const accountData = await accountResponse.json();
      const mainPurse = accountData.result?.account?.main_purse;
      if (!mainPurse) return '0';
      
      // Get Balance
      const balanceResponse = await fetch('/api/casper-rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: 3, 
          jsonrpc: '2.0', 
          method: 'state_get_balance', 
          params: { state_root_hash: stateRootHash, purse_uref: mainPurse } 
        })
      });
      const balanceData = await balanceResponse.json();
      return balanceData.result?.balance_value || '0';
    } catch (error) {
      return '0';
    }
  }

  /**
   * 3. Generate Keys (Async for v5)
   */
  async generateKeyPair(): Promise<KeyPairInfo> {
    const privateKey = await PrivateKey.generate(KeyAlgorithm.ED25519);
    return {
      publicKey: privateKey.publicKey.toHex(),
      privateKey: "HIDDEN_IN_V5", 
      accountHash: privateKey.publicKey.accountHash().toPrefixedString(),
      keyInstance: privateKey
    };
  }

  /**
   * 4. Load Keys (Async for v5)
   */
  async loadKeyPairFromHex(privateKeyHex: string): Promise<KeyPairInfo> {
    let cleanHex = privateKeyHex.trim();
    if (cleanHex.startsWith('0x')) cleanHex = cleanHex.slice(2);
    cleanHex = cleanHex.replace(/[^0-9a-fA-F]/g, '');

    let privateKey: PrivateKey;

    try {
      // Try Secp256k1
      privateKey = await PrivateKey.fromHex(cleanHex, KeyAlgorithm.SECP256K1);
    } catch (e) {
      try {
        // Try Ed25519
        privateKey = await PrivateKey.fromHex(cleanHex, KeyAlgorithm.ED25519);
      } catch (e2) {
        throw new Error('Invalid private key format');
      }
    }

    return {
      publicKey: privateKey.publicKey.toHex(),
      privateKey: cleanHex,
      accountHash: privateKey.publicKey.accountHash().toPrefixedString(),
      keyInstance: privateKey
    };
  }

  /**
   * 5. Manual Payment Data (Was missing)
   */
  async createPaymentData(
    keyPairInfo: KeyPairInfo,
    paymentInfo: PaymentInfo
  ): Promise<PaymentData> {
    // Mock data for demo
    const deployHash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const signature = Array.from(crypto.getRandomValues(new Uint8Array(64)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    return {
      deploy_hash: deployHash,
      public_key: keyPairInfo.publicKey,
      signature: signature,
      amount: paymentInfo.amount,
      recipient: paymentInfo.pay_to,
      timestamp: Date.now()
    };
  }
}