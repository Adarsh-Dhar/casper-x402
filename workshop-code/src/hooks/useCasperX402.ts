import { useState, useCallback, useEffect } from 'react';
import { CasperPaymentClient, PaymentInfo, PaymentData, KeyPairInfo } from '@/services/casperClient';
import { ActiveAccountType } from '@/types';
import useCsprClick from './useCsprClick';

interface UseCasperX402Return {
  loading: boolean;
  error: string | null;
  paymentData: PaymentData | null;
  balance: string;
  activeAccount: ActiveAccountType | null;
  fetchWithPayment: (url: string, options?: RequestInit) => Promise<Response>;
  fetchWithWalletPayment: (url: string, options?: RequestInit) => Promise<Response>;
  generateKeyPair: () => KeyPairInfo;
  loadKeyPair: (privateKeyHex: string) => KeyPairInfo;
  getBalance: (publicKey: string) => Promise<void>;
  clearError: () => void;
}

export function useCasperX402(): UseCasperX402Return {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [balance, setBalance] = useState<string>('0');

  const { activeAccount, signMessage } = useCsprClick();
  const casperClient = new CasperPaymentClient(
    process.env.NEXT_PUBLIC_CASPER_NODE_URL || process.env.CASPER_NODE_URL || 'http://localhost:11101/rpc',
    process.env.NEXT_PUBLIC_CASPER_NETWORK_NAME || process.env.CASPER_NETWORK_NAME || 'casper-test'
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Listen for balance updates after transactions
  useEffect(() => {
    const handleBalanceUpdate = (event: CustomEvent) => {
      const { balance, publicKey } = event.detail;
      if (activeAccount && publicKey === activeAccount.public_key) {
        console.log('🔄 Balance updated from transaction confirmation:', balance);
        setBalance(balance);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
      return () => {
        window.removeEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
      };
    }
  }, [activeAccount]);

  const generateKeyPair = useCallback(() => {
    return casperClient.generateKeyPair();
  }, [casperClient]);

  const loadKeyPair = useCallback((privateKeyHex: string) => {
    try {
      return casperClient.loadKeyPairFromHex(privateKeyHex);
    } catch (err) {
      setError('Invalid private key format');
      throw err;
    }
  }, [casperClient]);

  const getBalance = useCallback(async (publicKey: string) => {
    try {
      const accountBalance = await casperClient.getAccountBalance(publicKey);
      setBalance(accountBalance);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError('Failed to fetch account balance');
    }
  }, [casperClient]);

  const fetchWithWalletPayment = useCallback(async (url: string, options?: RequestInit): Promise<Response> => {
    if (!activeAccount) {
      throw new Error('No wallet connected');
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Starting wallet payment flow for:', url);
      console.log('🔑 Using wallet account:', activeAccount.public_key);
      
      // First request - should return 402 if payment required
      const initialResponse = await fetch(url, options);
      console.log('📡 Initial response status:', initialResponse.status);

      if (initialResponse.status !== 402) {
        console.log('✅ No payment required, returning response');
        return initialResponse;
      }

      // Get payment requirements from the 402 response
      const paymentRequiredHeader = initialResponse.headers.get('X-Payment-Required');
      console.log('💰 Payment required header:', paymentRequiredHeader);
      
      if (!paymentRequiredHeader) {
        throw new Error('Payment required but no payment info provided');
      }

      const paymentInfo: PaymentInfo = JSON.parse(paymentRequiredHeader);
      console.log('💳 Payment info:', paymentInfo);
      
      // Create payment data using connected wallet
      console.log('🔐 Creating payment data with wallet...');
      const signedPaymentData = await casperClient.createPaymentDataWithWallet(
        activeAccount, 
        paymentInfo, 
        signMessage
      );
      
      console.log('✍️ Signed payment data:', signedPaymentData);
      setPaymentData(signedPaymentData);

      // Retry the request with payment header
      console.log('🔄 Retrying request with payment...');
      const paymentResponse = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          'X-Payment': JSON.stringify(signedPaymentData),
        },
      });

      console.log('📡 Payment response status:', paymentResponse.status);
      
      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text();
        console.error('❌ Payment response error:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || errorData.message || `Payment failed: ${paymentResponse.status}`);
        } catch (parseError) {
          throw new Error(`Payment failed: ${paymentResponse.status} - ${errorText}`);
        }
      }

      return paymentResponse;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Wallet payment error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [activeAccount, signMessage, casperClient]);

  const fetchWithPayment = useCallback(async (url: string, options?: RequestInit): Promise<Response> => {
    setLoading(true);
    setError(null);

    try {
      // First request - should return 402 if payment required
      const initialResponse = await fetch(url, options);

      if (initialResponse.status !== 402) {
        return initialResponse;
      }

      // Get payment requirements from the 402 response
      const paymentRequiredHeader = initialResponse.headers.get('X-Payment-Required');
      if (!paymentRequiredHeader) {
        throw new Error('Payment required but no payment info provided');
      }

      const paymentInfo: PaymentInfo = JSON.parse(paymentRequiredHeader);

      // For demo purposes, we'll create a mock key pair
      // In a real app, this would come from a wallet connection
      const keyPair = casperClient.generateKeyPair();
      
      // Create payment data
      const signedPaymentData = await casperClient.createPaymentData(keyPair, paymentInfo);
      
      setPaymentData(signedPaymentData);

      // Retry the request with payment header
      const paymentResponse = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          'X-Payment': JSON.stringify(signedPaymentData),
        },
      });

      return paymentResponse;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [casperClient]);

  return {
    loading,
    error,
    paymentData,
    balance,
    activeAccount,
    fetchWithPayment,
    fetchWithWalletPayment,
    generateKeyPair,
    loadKeyPair,
    getBalance,
    clearError,
  };
}