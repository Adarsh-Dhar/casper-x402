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

  const nodeUrl = '/api/casper-rpc';
  const networkName = process.env.NEXT_PUBLIC_CASPER_NETWORK_NAME || 'casper-custom';

  const payWithPemSigner = async (payTo: string, payAmount: string) => {
    const response = await fetch('/api/submit-real-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'x402-pay', payTo, payAmount }),
    });

    const body = (await response.json()) as any;
    if (!response.ok || !body?.success) {
      const message = typeof body?.message === 'string' ? body.message : 'Failed to submit payment deploy';
      throw new Error(message);
    }

    if (body?.senderPublicKey) console.log('Sender Public Key:', body.senderPublicKey);
    if (body?.senderBalanceMotes) console.log('Sender Balance (motes):', body.senderBalanceMotes);
    if (body?.senderBalanceMotes) console.log('Sender Balance (CSPR):', motesToCspr(body.senderBalanceMotes));
    if (body?.requiredTotalMotes) console.log('Tx Required Total (motes):', body.requiredTotalMotes);
    if (body?.requiredTotalMotes) console.log('Tx Required Total (CSPR):', motesToCspr(body.requiredTotalMotes));
    if (body?.payAmount) console.log('Tx Transfer Amount (motes):', body.payAmount);
    if (body?.paymentAmount) console.log('Tx Payment Amount (motes):', body.paymentAmount);

    return body as {
      deployHash: string;
      senderPublicKey: string;
    };
  };

  function csprToMotes(cspr: number): string {
    return (cspr * 1_000_000_000).toString();
  }

  function motesToCspr(motes: string | number): number {
    return Number(motes) / 1_000_000_000;
  }

  const toMotes = (value: string): bigint => {
    try {
      return BigInt(value);
    } catch {
      return BigInt(0);
    }
  };

  const getAccountHash = (publicKey: PublicKey): string => {
    const anyKey = publicKey as any;
    if (typeof anyKey.accountHash === 'function') {
      return anyKey.accountHash().toString();
    }
    if (anyKey.accountHash) {
      return anyKey.accountHash.toString();
    }
    return '';
  };

  const rpc = async (method: string, params: unknown, id = 1): Promise<any> => {
    const response = await fetch(nodeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        jsonrpc: '2.0',
        method,
        params,
      }),
    });

    const body = (await response.json()) as any;
    if (body?.error) {
      const message = typeof body.error?.message === 'string' ? body.error.message : 'RPC error';
      throw new Error(message);
    }
    return body?.result;
  };

  const getAccountBalanceMotes = async (publicKeyHex: string): Promise<string> => {
    const stateRoot = await rpc('chain_get_state_root_hash', {}, 1);
    const stateRootHash = stateRoot?.state_root_hash;
    if (!stateRootHash) return '0';

    const accountInfo = await rpc('state_get_account_info', { public_key: publicKeyHex }, 2);
    const mainPurse = accountInfo?.account?.main_purse;
    if (!mainPurse) return '0';

    const balanceResult = await rpc(
      'state_get_balance',
      { state_root_hash: stateRootHash, purse_uref: mainPurse },
      3
    );

    return balanceResult?.balance_value ?? '0';
  };

  const ensureAccountExists = async (publicKeyHex: string): Promise<void> => {
    const response = await fetch(nodeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'state_get_account_info',
        params: { public_key: publicKeyHex },
      }),
    });

    const body = (await response.json()) as any;
    if (body?.error) {
      const message = typeof body.error?.message === 'string' ? body.error.message : 'Account lookup failed';
      if (message.toLowerCase().includes('no such account')) {
        console.log('Sender Public Key:', publicKeyHex);
        console.log('Sender Balance (motes): 0');
        console.log('Sender Balance (CSPR): 0');
        throw new Error(
          `Sender account not found on ${networkName}. Fund this public key on testnet, then retry.`
        );
      }
      throw new Error(message);
    }

    const balanceMotes = await getAccountBalanceMotes(publicKeyHex);
    console.log('Sender Public Key:', publicKeyHex);
    console.log('Sender Balance (motes):', balanceMotes);
    console.log('Sender Balance (CSPR):', motesToCspr(balanceMotes));
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
      const accountHash = getAccountHash(publicKey);

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

      const paymentAmount = '100000000';
      const requiredMotes = toMotes(amount) + toMotes(paymentAmount);
      console.log('Tx Payment Amount (motes):', paymentAmount);
      console.log('Tx Required Total (motes):', requiredMotes.toString());
      console.log('Tx Required Total (CSPR):', motesToCspr(requiredMotes.toString()));

      await ensureAccountExists(keyPair.publicKey);

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
        paymentAmount,
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
    url: string
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

      const { deployHash, senderPublicKey } = await payWithPemSigner(payTo, payAmount);

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
        sender: senderPublicKey,
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
