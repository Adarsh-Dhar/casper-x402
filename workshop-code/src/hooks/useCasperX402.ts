import { useState, useCallback } from 'react';
import { CasperPaymentClient, PaymentInfo, PaymentData, KeyPairInfo } from '@/services/casperClient';

interface UseCasperX402Return {
  loading: boolean;
  error: string | null;
  paymentData: PaymentData | null;
  balance: string;
  fetchWithPayment: (url: string, options?: RequestInit) => Promise<Response>;
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

  const casperClient = new CasperPaymentClient();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

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
    fetchWithPayment,
    generateKeyPair,
    loadKeyPair,
    getBalance,
    clearError,
  };
}