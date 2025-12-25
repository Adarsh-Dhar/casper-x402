import { 
  PrivateKey, 
  KeyAlgorithm,
  PublicKey
} from 'casper-js-sdk';
import { useState, useCallback } from 'react';
import { casperService } from '@/services/casperClient';

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

  constructor(nodeUrl: string = 'https://node.casper-test.casper.network/rpc', networkName: string = 'casper-test') {
    this.networkName = networkName;
    this.nodeUrl = nodeUrl;
  }

  /**
   * Load Key Pair from Hex (Async for SDK v5)
   */
  async loadKeyPairFromHex(privateKeyHex: string): Promise<KeyPairInfo> {
    try {
      // Clean the hex string
      let cleanHex = privateKeyHex.trim();
      if (cleanHex.startsWith('0x')) {
        cleanHex = cleanHex.slice(2);
      }
      cleanHex = cleanHex.replace(/[^0-9a-fA-F]/g, '');

      if (!cleanHex || cleanHex.length === 0) {
        throw new Error('Invalid private key: empty after cleaning');
      }

      let privateKey: PrivateKey;

      // Try Secp256k1 first (common for wallet keys)
      try {
        privateKey = await PrivateKey.fromHex(cleanHex, KeyAlgorithm.SECP256K1);
      } catch (secp256k1Error) {
        // Fallback to Ed25519
        try {
          privateKey = await PrivateKey.fromHex(cleanHex, KeyAlgorithm.ED25519);
        } catch (ed25519Error) {
          throw new Error('Invalid private key format for both SECP256K1 and ED25519');
        }
      }

      const publicKey = privateKey.publicKey;

      return {
        publicKey: publicKey.toHex(),
        privateKey: cleanHex,
        accountHash: publicKey.accountHash().toPrefixedString(),
        keyInstance: privateKey
      };
    } catch (error) {
      console.error('Error loading key pair:', error);
      throw error instanceof Error ? error : new Error('Failed to load key pair from hex');
    }
  }

  /**
   * Convert CSPR to Motes
   */
  csprToMotes(cspr: number | string): string {
    const csprValue = typeof cspr === 'string' ? parseFloat(cspr) : cspr;
    if (isNaN(csprValue)) {
      throw new Error('Invalid CSPR amount');
    }
    const motes = csprValue * 1_000_000_000;
    return Math.floor(motes).toString();
  }

  /**
   * Convert Motes to CSPR
   */
  motesToCspr(motes: string | number): number {
    const motesValue = typeof motes === 'string' ? parseFloat(motes) : motes;
    if (isNaN(motesValue)) {
      throw new Error('Invalid motes amount');
    }
    return motesValue / 1_000_000_000;
  }
}

// Hook implementation
export const useCasperX402 = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  
  const client = new CasperPaymentClient();

  const clearError = useCallback(() => setError(null), []);

  const loadKeyPair = async (hex: string) => {
    setLoading(true);
    try {
      return await client.loadKeyPairFromHex(hex);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load key');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchWithPayment = async (url: string, keyPair: KeyPairInfo) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Initial request to check for 402 Payment Required
      const res = await fetch(url);
      
      if (res.status === 402) {
        if (!keyPair) throw new Error("No keys loaded");

        const data = await res.json().catch(() => ({}));
        
        const DEFAULT_PAY_TO = '0202c9bda7c0da47cf0bbcd9972f8f40be72a81fa146df672c60595ca1807627403e';

        const paymentInfo: PaymentInfo = {
            network: 'casper-test',
            contract_hash: '', 
            pay_to: data.payTo || DEFAULT_PAY_TO, // Use valid key
            amount: '1000000000', // 1 CSPR
            description: 'Premium Content',
            facilitator_url: ''
        };

        // 2. Create and Sign the Real Transaction using the Private Key
        // Detect algorithm from public key prefix (01 = Ed25519, 02 = Secp256k1)
        const algo = keyPair.publicKey.startsWith('02') ? KeyAlgorithm.SECP256K1 : KeyAlgorithm.ED25519;

        const signedDeploy = await casperService.createPaymentTransaction(
          keyPair.privateKey,
          paymentInfo.pay_to,
          paymentInfo.amount,
          algo
        );

        // 3. Send the deploy to the network
        const deployHash = await casperService.sendTransaction(signedDeploy);

        // 4. Construct the X-Payment data header
        // We need the signature in hex format
        const signature = signedDeploy.approvals[0].signature;
        
        const pData: PaymentData = {
          deploy_hash: deployHash,
          public_key: keyPair.publicKey,
          signature: signature.toHex(),
          amount: paymentInfo.amount,
          recipient: paymentInfo.pay_to,
          timestamp: Math.floor(Date.now() / 1000)
        };

        setPaymentData(pData);
        
        // 5. Retry the request with the payment data
        const res2 = await fetch(url, {
          headers: {
             'x-payment': JSON.stringify(pData)
          }
        });
        return res2;
      }
      return res;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    error,
    paymentData,
    fetchWithPayment,
    loadKeyPair,
    clearError,
    csprToMotes: client.csprToMotes,
    motesToCspr: client.motesToCspr
  };
};

export default useCasperX402;