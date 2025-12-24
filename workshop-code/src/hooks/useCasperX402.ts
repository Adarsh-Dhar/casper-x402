import { useState, useCallback, useEffect, useMemo } from 'react';
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
  generateKeyPair: () => Promise<KeyPairInfo>;
  loadKeyPair: (privateKeyHex: string) => Promise<KeyPairInfo>;
  getBalance: (publicKey: string) => Promise<void>;
  clearError: () => void;
}

// ✅ EXPORTED FUNCTION (This fixes your error)
export function useCasperX402(): UseCasperX402Return {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [balance, setBalance] = useState<string>('0');

  const { activeAccount, signMessage } = useCsprClick();
  
  // Initialize the client (Memorized to prevent recreation)
  const casperClient = useMemo(() => new CasperPaymentClient(
    process.env.NEXT_PUBLIC_CASPER_NODE_URL || process.env.CASPER_NODE_URL || 'http://localhost:11101/rpc',
    process.env.NEXT_PUBLIC_CASPER_NETWORK_NAME || process.env.CASPER_NETWORK_NAME || 'casper-test'
  ), []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Balance Listener
  useEffect(() => {
    const handleBalanceUpdate = (event: CustomEvent) => {
      const { balance: newBalance, publicKey } = event.detail;
      if (activeAccount && publicKey === activeAccount.public_key) {
        setBalance(newBalance);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
      return () => {
        window.removeEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
      };
    }
  }, [activeAccount]);

  // Async Key Generation
  const generateKeyPair = useCallback(async () => {
    return await casperClient.generateKeyPair();
  }, [casperClient]);

  // Async Key Loading
  const loadKeyPair = useCallback(async (privateKeyHex: string) => {
    try {
      return await casperClient.loadKeyPairFromHex(privateKeyHex);
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
    if (!activeAccount) throw new Error('No wallet connected');

    setLoading(true);
    setError(null);

    try {
      // 1. Initial Request
      const initialResponse = await fetch(url, options);
      if (initialResponse.status !== 402) return initialResponse;

      // 2. Parse Payment Info
      const paymentRequiredHeader = initialResponse.headers.get('X-Payment-Required');
      if (!paymentRequiredHeader) throw new Error('Payment required but no payment info provided');

      const paymentInfo: PaymentInfo = JSON.parse(paymentRequiredHeader);
      
      // 3. Create & Sign Payment
      const signedPaymentData = await casperClient.createPaymentDataWithWallet(
        activeAccount, 
        paymentInfo, 
        signMessage
      );
      
      setPaymentData(signedPaymentData);

      // 4. Retry Request
      const paymentResponse = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          'X-Payment': JSON.stringify(signedPaymentData),
        },
      });

      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || errorData.message || `Payment failed: ${paymentResponse.status}`);
        } catch (e) {
          throw new Error(`Payment failed: ${paymentResponse.status} - ${errorText}`);
        }
      }

      return paymentResponse;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
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
      const initialResponse = await fetch(url, options);
      if (initialResponse.status !== 402) return initialResponse;

      const paymentRequiredHeader = initialResponse.headers.get('X-Payment-Required');
      if (!paymentRequiredHeader) throw new Error('Payment required but no payment info provided');

      const paymentInfo: PaymentInfo = JSON.parse(paymentRequiredHeader);

      // Async Key Generation
      const keyPair = await casperClient.generateKeyPair();
      
      const signedPaymentData = await casperClient.createPaymentData(keyPair, paymentInfo);
      setPaymentData(signedPaymentData);

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