/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import {
  PrivateKey,
  PublicKey,
  KeyAlgorithm,
  makeCsprTransferDeploy,
  HttpHandler,
  RpcClient,
} from 'casper-js-sdk';

export interface KeyPairInfo {
  publicKey: string;
  privateKey: string;
  accountHash: string;
}

export interface PaymentData {
  deploy_hash: string;
  amount: string;
  recipient: string;
  timestamp: number;
}

export function useCasperX402() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);

  const nodeUrl = process.env.NEXT_PUBLIC_CASPER_NODE_URL || 'http://localhost:11101/rpc';
  const networkName = process.env.NEXT_PUBLIC_CASPER_NETWORK_NAME || 'casper-test';

  // Utility functions
  const csprToMotes = (cspr: number): string => {
    return (cspr * 1_000_000_000).toString();
  };

  const motesToCspr = (motes: string | number): number => {
    return Number(motes) / 1_000_000_000;
  };

  const clearError = () => {
    setError(null);
  };

  // Load key pair from private key
  const loadKeyPair = async (privateKeyHex: string): Promise<KeyPairInfo> => {
    try {
      setLoading(true);
      setError(null);

      // Remove any whitespace or 0x prefix
      const cleanHex = privateKeyHex.trim().replace(/^0x/, '');

      // Validate hex format
      if (!/^[0-9a-fA-F]{64}$/.test(cleanHex)) {
        throw new Error('Invalid private key format. Expected 64 hex characters.');
      }

      // Try ED25519 first (most common)
      let privateKey: PrivateKey;
      let publicKey: PublicKey;

      try {
        privateKey = await PrivateKey.fromHex(cleanHex, KeyAlgorithm.ED25519);
        publicKey = privateKey.publicKey;
      } catch (ed25519Error) {
        // If ED25519 fails, try SECP256K1
        try {
          privateKey = await PrivateKey.fromHex(cleanHex, KeyAlgorithm.SECP256K1);
          publicKey = privateKey.publicKey;
        } catch (secp256k1Error) {
          throw new Error('Failed to parse private key. Tried both ED25519 and SECP256K1.');
        }
      }

      const publicKeyHex = publicKey.toHex();
      const accountHash = publicKey.accountHash.toString();

      const keyPairInfo: KeyPairInfo = {
        publicKey: publicKeyHex,
        privateKey: cleanHex,
        accountHash,
      };

      console.log('✅ Key pair loaded successfully');
      console.log('Public Key:', publicKeyHex);
      console.log('Account Hash:', accountHash);

      return keyPairInfo;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load key pair';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create and sign a Casper transfer
  const createSignedTransfer = async (
    keyPair: KeyPairInfo,
    recipientPublicKeyHex: string,
    amount: string
  ): Promise<string> => {
    try {
      console.log('Creating transfer...');
      console.log('Sender:', keyPair.publicKey);
      console.log('Recipient:', recipientPublicKeyHex);
      console.log('Amount:', amount, 'motes');

      // Load private key
      let privateKey: PrivateKey;
      try {
        privateKey = await PrivateKey.fromHex(keyPair.privateKey, KeyAlgorithm.ED25519);
      } catch {
        privateKey = await PrivateKey.fromHex(keyPair.privateKey, KeyAlgorithm.SECP256K1);
      }

      // Create deploy using v5 utility function
      const deploy = makeCsprTransferDeploy({
        senderPublicKeyHex: keyPair.publicKey,
        recipientPublicKeyHex: recipientPublicKeyHex,
        transferAmount: amount,
        chainName: networkName,
        paymentAmount: '100000000', // 0.1 CSPR for native transfer
      });

      // Sign the deploy
      deploy.sign(privateKey);

      console.log('✅ Deploy created and signed');
      console.log('Deploy hash:', deploy.hash.toHex());

      // Send to network
      const rpcHandler = new HttpHandler(nodeUrl);
      const rpcClient = new RpcClient(rpcHandler);

      console.log('📤 Submitting to network...');
      const result = await rpcClient.putDeploy(deploy);

      console.log('✅ Transaction sent successfully!');
      console.log('Deploy hash:', result.deployHash);

      return result.deployHash.toString();
    } catch (err) {
      console.error('❌ Error creating/sending transfer:', err);
      throw err;
    }
  };

  // Fetch with x402 payment
  const fetchWithPayment = async (
    url: string,
    keyPair: KeyPairInfo
  ): Promise<Response> => {
    setLoading(true);
    setError(null);
    setPaymentData(null);

    try {
      console.log('🔄 Making initial request:', url);

      // First request - should return 402
      const initialResponse = await fetch(url);

      if (initialResponse.status === 200) {
        console.log('✅ No payment required');
        setLoading(false);
        return initialResponse;
      }

      if (initialResponse.status !== 402) {
        throw new Error(`Unexpected status: ${initialResponse.status}`);
      }

      console.log('💳 Payment required (402)');

      // Get payment requirements from headers
      const payTo = initialResponse.headers.get('X-Pay-To');
      const payAmount = initialResponse.headers.get('X-Pay-Amount');

      if (!payTo || !payAmount) {
        throw new Error('Missing payment headers');
      }

      console.log('Payment requirements:');
      console.log('- Recipient:', payTo);
      console.log('- Amount:', payAmount, 'motes');

      // Create and send the transfer
      const deployHash = await createSignedTransfer(keyPair, payTo, payAmount);

      // Store payment data
      const payment: PaymentData = {
        deploy_hash: deployHash,
        amount: payAmount,
        recipient: payTo,
        timestamp: Math.floor(Date.now() / 1000),
      };
      setPaymentData(payment);

      // Create payment proof
      const paymentProof = JSON.stringify({
        deploy_hash: deployHash,
        sender: keyPair.publicKey,
        network: networkName,
      });

      console.log('🔄 Retrying request with payment proof...');

      // Retry request with payment proof
      const retryResponse = await fetch(url, {
        headers: {
          'X-Payment': paymentProof,
        },
      });

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        throw new Error(`Payment verification failed: ${errorText}`);
      }

      console.log('✅ Payment verified! Content unlocked.');

      return retryResponse;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMsg);
      console.error('❌ Error in fetchWithPayment:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    paymentData,
    loadKeyPair,
    fetchWithPayment,
    clearError,
    csprToMotes,
    motesToCspr,
  };
}