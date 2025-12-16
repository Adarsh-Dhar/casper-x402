import { renderHook } from '@testing-library/react';
import { useX402 } from '../useX402';

// Setup jest-dom matchers
import '@testing-library/jest-dom';

// Mock csprclick-ui
jest.mock('@make-software/csprclick-ui', () => ({
  useClickRef: jest.fn()
}));

describe('useX402 Hook', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock fetch globally
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Hook Interface', () => {
    test('should return fetchWithPayment function', () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'test-key' },
        signMessage: jest.fn()
      });

      const { result } = renderHook(() => useX402());
      
      expect(result.current).toHaveProperty('fetchWithPayment');
      expect(typeof result.current.fetchWithPayment).toBe('function');
    });
  });

  describe('HTTP Request Handling', () => {
    /**
     * **Feature: x402-payment-adapter, Property 1: HTTP request handling**
     * For any valid URL and request options, fetchWithPayment should make HTTP requests 
     * and return non-402 responses without additional processing
     */
    test('should handle non-402 responses without modification', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'test-key' },
        signMessage: jest.fn()
      });

      const mockResponse = {
        status: 200,
        json: jest.fn(),
        text: jest.fn(),
        ok: true
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useX402());
      const response = await result.current.fetchWithPayment('https://example.com', { method: 'GET' });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith('https://example.com', { method: 'GET' });
      expect(response).toBe(mockResponse);
    });

    test('should handle different HTTP methods', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'test-key' },
        signMessage: jest.fn()
      });

      const methods = ['GET', 'POST', 'PUT', 'DELETE'];
      
      for (const method of methods) {
        const mockResponse = {
          status: 200,
          json: jest.fn(),
          text: jest.fn(),
          ok: true
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        const { result } = renderHook(() => useX402());
        const response = await result.current.fetchWithPayment('https://example.com', { method });

        expect(global.fetch).toHaveBeenCalledWith('https://example.com', { method });
        expect(response).toBe(mockResponse);
        
        jest.clearAllMocks();
      }
    });

    test('should handle network errors properly', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'test-key' },
        signMessage: jest.fn()
      });

      const networkError = new Error('Network connection failed');
      (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useX402());
      
      await expect(result.current.fetchWithPayment('https://example.com'))
        .rejects.toThrow('Network request failed: Network connection failed');
    });
  });

  describe('402 Response Handling', () => {
    /**
     * **Feature: x402-payment-adapter, Property 2: 402 response parsing**
     * For any 402 response with valid JSON, the adapter should extract all required payment fields
     */
    test('should parse valid 402 response with payment requirements', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      const mockSignMessage = jest.fn().mockResolvedValue({
        cancelled: false,
        signatureHex: 'mock-signature-hex'
      });
      
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'test-public-key' },
        signMessage: mockSignMessage
      });

      const mock402Response = {
        status: 402,
        json: jest.fn().mockResolvedValue({
          payment_requirements: {
            amount: '1000000000',
            nonce: 12345,
            token_contract_hash: 'hash-abc123',
            chain_name: 'casper-test'
          }
        })
      };

      const mockSuccessResponse = {
        status: 200,
        json: jest.fn().mockResolvedValue({ content: 'premium content' })
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mock402Response)
        .mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useX402());
      const response = await result.current.fetchWithPayment('https://example.com/premium');

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(mockSignMessage).toHaveBeenCalledWith(
        'x402-casper:casper-test:hash-abc123:1000000000:12345',
        'test-public-key'
      );
      expect(response).toBe(mockSuccessResponse);
    });

    test('should throw error for 402 response with invalid JSON', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'test-key' },
        signMessage: jest.fn()
      });

      const mock402Response = {
        status: 402,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mock402Response);

      const { result } = renderHook(() => useX402());
      
      await expect(result.current.fetchWithPayment('https://example.com'))
        .rejects.toThrow('Failed to parse 402 response: Invalid JSON format');
    });

    test('should throw error for 402 response missing payment_requirements', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'test-key' },
        signMessage: jest.fn()
      });

      const mock402Response = {
        status: 402,
        json: jest.fn().mockResolvedValue({ error: 'Payment required' })
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mock402Response);

      const { result } = renderHook(() => useX402());
      
      await expect(result.current.fetchWithPayment('https://example.com'))
        .rejects.toThrow('402 response missing payment_requirements field');
    });

    test('should throw error for missing required payment fields', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'test-key' },
        signMessage: jest.fn()
      });

      const mock402Response = {
        status: 402,
        json: jest.fn().mockResolvedValue({
          payment_requirements: {
            amount: '1000000000',
            // missing nonce, token_contract_hash, chain_name
          }
        })
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mock402Response);

      const { result } = renderHook(() => useX402());
      
      await expect(result.current.fetchWithPayment('https://example.com'))
        .rejects.toThrow('Payment requirements missing required fields: nonce, token_contract_hash, chain_name');
    });
  });

  describe('Payment Intent Construction', () => {
    /**
     * **Feature: x402-payment-adapter, Property 5: Payment payload formatting**
     * For any valid payment requirements, the constructed payload should follow the exact format
     */
    test('should construct payment payload with exact format', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      const mockSignMessage = jest.fn().mockResolvedValue({
        cancelled: false,
        signatureHex: 'test-signature'
      });
      
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'test-public-key' },
        signMessage: mockSignMessage
      });

      const testCases = [
        {
          requirements: {
            chain_name: 'casper-test',
            token_contract_hash: 'hash-123',
            amount: '1000000000',
            nonce: 42
          },
          expectedPayload: 'x402-casper:casper-test:hash-123:1000000000:42'
        },
        {
          requirements: {
            chain_name: 'casper',
            token_contract_hash: 'contract-abc',
            amount: '500000000',
            nonce: 999
          },
          expectedPayload: 'x402-casper:casper:contract-abc:500000000:999'
        }
      ];

      for (const testCase of testCases) {
        const mock402Response = {
          status: 402,
          json: jest.fn().mockResolvedValue({
            payment_requirements: testCase.requirements
          })
        };

        const mockSuccessResponse = {
          status: 200,
          json: jest.fn().mockResolvedValue({ content: 'success' })
        };

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce(mock402Response)
          .mockResolvedValueOnce(mockSuccessResponse);

        const { result } = renderHook(() => useX402());
        await result.current.fetchWithPayment('https://example.com');

        expect(mockSignMessage).toHaveBeenCalledWith(
          testCase.expectedPayload,
          'test-public-key'
        );

        jest.clearAllMocks();
      }
    });

    /**
     * **Feature: x402-payment-adapter, Property 6: Value preservation in payload**
     * For any payment requirements from a 402 response, the constructed payload should use exact values
     */
    test('should preserve exact values from 402 response without modification', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      const mockSignMessage = jest.fn().mockResolvedValue({
        cancelled: false,
        signatureHex: 'test-signature'
      });
      
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'test-public-key' },
        signMessage: mockSignMessage
      });

      // Test with special characters and edge cases
      const requirements = {
        chain_name: 'casper-test-network',
        token_contract_hash: 'hash-with-special-chars_123',
        amount: '999999999999999999',
        nonce: 0
      };

      const mock402Response = {
        status: 402,
        json: jest.fn().mockResolvedValue({
          payment_requirements: requirements
        })
      };

      const mockSuccessResponse = {
        status: 200,
        json: jest.fn().mockResolvedValue({ content: 'success' })
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mock402Response)
        .mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useX402());
      await result.current.fetchWithPayment('https://example.com');

      const expectedPayload = `x402-casper:${requirements.chain_name}:${requirements.token_contract_hash}:${requirements.amount}:${requirements.nonce}`;
      expect(mockSignMessage).toHaveBeenCalledWith(expectedPayload, 'test-public-key');
    });
  });

  describe('Wallet Integration', () => {
    /**
     * **Feature: x402-payment-adapter, Property 7: Wallet connection validation**
     * For any payment signature request, the adapter should verify wallet connection
     */
    test('should throw error when wallet is not connected', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      useClickRef.mockReturnValue({
        activeAccount: null, // No active account
        signMessage: jest.fn()
      });

      const mock402Response = {
        status: 402,
        json: jest.fn().mockResolvedValue({
          payment_requirements: {
            amount: '1000000000',
            nonce: 12345,
            token_contract_hash: 'hash-abc123',
            chain_name: 'casper-test'
          }
        })
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mock402Response);

      const { result } = renderHook(() => useX402());
      
      await expect(result.current.fetchWithPayment('https://example.com'))
        .rejects.toThrow('Wallet not connected');
    });

    test('should throw error when wallet has no public key', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      useClickRef.mockReturnValue({
        activeAccount: { public_key: null }, // No public key
        signMessage: jest.fn()
      });

      const mock402Response = {
        status: 402,
        json: jest.fn().mockResolvedValue({
          payment_requirements: {
            amount: '1000000000',
            nonce: 12345,
            token_contract_hash: 'hash-abc123',
            chain_name: 'casper-test'
          }
        })
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mock402Response);

      const { result } = renderHook(() => useX402());
      
      await expect(result.current.fetchWithPayment('https://example.com'))
        .rejects.toThrow('Wallet not connected');
    });

    /**
     * **Feature: x402-payment-adapter, Property 8: Wallet signature integration**
     * For any payment payload and connected wallet, the adapter should call clickRef.signMessage
     */
    test('should call wallet signMessage with correct parameters', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      const mockSignMessage = jest.fn().mockResolvedValue({
        cancelled: false,
        signatureHex: 'test-signature-hex'
      });
      
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'test-public-key-123' },
        signMessage: mockSignMessage
      });

      const mock402Response = {
        status: 402,
        json: jest.fn().mockResolvedValue({
          payment_requirements: {
            amount: '2000000000',
            nonce: 54321,
            token_contract_hash: 'contract-xyz789',
            chain_name: 'casper-mainnet'
          }
        })
      };

      const mockSuccessResponse = {
        status: 200,
        json: jest.fn().mockResolvedValue({ content: 'success' })
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mock402Response)
        .mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useX402());
      await result.current.fetchWithPayment('https://example.com');

      expect(mockSignMessage).toHaveBeenCalledWith(
        'x402-casper:casper-mainnet:contract-xyz789:2000000000:54321',
        'test-public-key-123'
      );
    });

    /**
     * **Feature: x402-payment-adapter, Property 9: Signature result handling**
     * For any wallet signature operation, the adapter should handle both success and cancellation
     */
    test('should throw error when user cancels signature', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      const mockSignMessage = jest.fn().mockResolvedValue({
        cancelled: true // User cancelled
      });
      
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'test-public-key' },
        signMessage: mockSignMessage
      });

      const mock402Response = {
        status: 402,
        json: jest.fn().mockResolvedValue({
          payment_requirements: {
            amount: '1000000000',
            nonce: 12345,
            token_contract_hash: 'hash-abc123',
            chain_name: 'casper-test'
          }
        })
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mock402Response);

      const { result } = renderHook(() => useX402());
      
      await expect(result.current.fetchWithPayment('https://example.com'))
        .rejects.toThrow('User cancelled signature');
    });

    test('should handle successful signature and return hex format', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      const mockSignMessage = jest.fn().mockResolvedValue({
        cancelled: false,
        signatureHex: 'abcdef123456789' // Successful signature
      });
      
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'test-public-key' },
        signMessage: mockSignMessage
      });

      const mock402Response = {
        status: 402,
        json: jest.fn().mockResolvedValue({
          payment_requirements: {
            amount: '1000000000',
            nonce: 12345,
            token_contract_hash: 'hash-abc123',
            chain_name: 'casper-test'
          }
        })
      };

      const mockSuccessResponse = {
        status: 200,
        json: jest.fn().mockResolvedValue({ content: 'premium content' })
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mock402Response)
        .mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useX402());
      const response = await result.current.fetchWithPayment('https://example.com');

      expect(response).toBe(mockSuccessResponse);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      
      // Verify the X-PAYMENT header was constructed with the signature
      const secondCall = (global.fetch as jest.Mock).mock.calls[1];
      const headers = secondCall[1].headers;
      const xPaymentHeader = headers.get('X-PAYMENT');
      const paymentData = JSON.parse(xPaymentHeader);
      
      expect(paymentData.signature).toBe('abcdef123456789');
      expect(paymentData.public_key).toBe('test-public-key');
    });
  });

  describe('Payment Header Construction and Retry Logic', () => {
    /**
     * **Feature: x402-payment-adapter, Property 10: Payment header construction**
     * For any successful signature, the adapter should construct a JSON X-PAYMENT header with all required fields
     */
    test('should construct X-PAYMENT header with all required fields', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      const mockSignMessage = jest.fn().mockResolvedValue({
        cancelled: false,
        signatureHex: 'signature-hex-123'
      });
      
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'user-public-key-456' },
        signMessage: mockSignMessage
      });

      const paymentRequirements = {
        amount: '3000000000',
        nonce: 98765,
        token_contract_hash: 'contract-hash-xyz',
        chain_name: 'casper-testnet'
      };

      const mock402Response = {
        status: 402,
        json: jest.fn().mockResolvedValue({
          payment_requirements: paymentRequirements
        })
      };

      const mockSuccessResponse = {
        status: 200,
        json: jest.fn().mockResolvedValue({ content: 'success' })
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mock402Response)
        .mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useX402());
      await result.current.fetchWithPayment('https://example.com');

      // Verify the X-PAYMENT header structure
      const secondCall = (global.fetch as jest.Mock).mock.calls[1];
      const headers = secondCall[1].headers;
      const xPaymentHeader = headers.get('X-PAYMENT');
      const paymentData = JSON.parse(xPaymentHeader);
      
      expect(paymentData).toHaveProperty('signature', 'signature-hex-123');
      expect(paymentData).toHaveProperty('public_key', 'user-public-key-456');
      expect(paymentData).toHaveProperty('amount', '3000000000');
      expect(paymentData).toHaveProperty('nonce', 98765);
      expect(paymentData).toHaveProperty('payload_str', 'x402-casper:casper-testnet:contract-hash-xyz:3000000000:98765');
    });

    /**
     * **Feature: x402-payment-adapter, Property 11: Request retry with payment**
     * For any original request and payment header, the retry should preserve original URL and options while adding X-PAYMENT header
     */
    test('should preserve original request parameters in retry', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      const mockSignMessage = jest.fn().mockResolvedValue({
        cancelled: false,
        signatureHex: 'test-signature'
      });
      
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'test-public-key' },
        signMessage: mockSignMessage
      });

      const originalOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123'
        },
        body: JSON.stringify({ data: 'test' })
      };

      const mock402Response = {
        status: 402,
        json: jest.fn().mockResolvedValue({
          payment_requirements: {
            amount: '1000000000',
            nonce: 12345,
            token_contract_hash: 'hash-abc123',
            chain_name: 'casper-test'
          }
        })
      };

      const mockSuccessResponse = {
        status: 200,
        json: jest.fn().mockResolvedValue({ content: 'success' })
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mock402Response)
        .mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useX402());
      await result.current.fetchWithPayment('https://api.example.com/premium', originalOptions);

      // Verify first call (original request)
      const firstCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(firstCall[0]).toBe('https://api.example.com/premium');
      expect(firstCall[1]).toEqual(originalOptions);

      // Verify second call (retry with payment)
      const secondCall = (global.fetch as jest.Mock).mock.calls[1];
      expect(secondCall[0]).toBe('https://api.example.com/premium'); // Same URL
      expect(secondCall[1].method).toBe('POST'); // Same method
      expect(secondCall[1].body).toBe(JSON.stringify({ data: 'test' })); // Same body
      
      // Verify original headers are preserved
      const retryHeaders = secondCall[1].headers;
      expect(retryHeaders.get('Content-Type')).toBe('application/json');
      expect(retryHeaders.get('Authorization')).toBe('Bearer token123');
      
      // Verify X-PAYMENT header is added
      expect(retryHeaders.has('X-PAYMENT')).toBe(true);
      const paymentData = JSON.parse(retryHeaders.get('X-PAYMENT'));
      expect(paymentData.signature).toBe('test-signature');
    });

    test('should handle requests with no original headers', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      const mockSignMessage = jest.fn().mockResolvedValue({
        cancelled: false,
        signatureHex: 'test-signature'
      });
      
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'test-public-key' },
        signMessage: mockSignMessage
      });

      const mock402Response = {
        status: 402,
        json: jest.fn().mockResolvedValue({
          payment_requirements: {
            amount: '1000000000',
            nonce: 12345,
            token_contract_hash: 'hash-abc123',
            chain_name: 'casper-test'
          }
        })
      };

      const mockSuccessResponse = {
        status: 200,
        json: jest.fn().mockResolvedValue({ content: 'success' })
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mock402Response)
        .mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useX402());
      await result.current.fetchWithPayment('https://example.com'); // No options

      // Verify retry call has X-PAYMENT header
      const secondCall = (global.fetch as jest.Mock).mock.calls[1];
      const retryHeaders = secondCall[1].headers;
      expect(retryHeaders.has('X-PAYMENT')).toBe(true);
    });
  });

  describe('Comprehensive Error Handling', () => {
    /**
     * **Feature: x402-payment-adapter, Property 13: Comprehensive error handling**
     * For any failure in the payment flow, the adapter should throw descriptive errors
     */
    test('should handle wallet signing errors', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      const mockSignMessage = jest.fn().mockRejectedValue(new Error('Wallet signing failed'));
      
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'test-public-key' },
        signMessage: mockSignMessage
      });

      const mock402Response = {
        status: 402,
        json: jest.fn().mockResolvedValue({
          payment_requirements: {
            amount: '1000000000',
            nonce: 12345,
            token_contract_hash: 'hash-abc123',
            chain_name: 'casper-test'
          }
        })
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mock402Response);

      const { result } = renderHook(() => useX402());
      
      await expect(result.current.fetchWithPayment('https://example.com'))
        .rejects.toThrow('Network request failed: Wallet signing failed');
    });

    test('should handle retry request failures', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      const mockSignMessage = jest.fn().mockResolvedValue({
        cancelled: false,
        signatureHex: 'test-signature'
      });
      
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'test-public-key' },
        signMessage: mockSignMessage
      });

      const mock402Response = {
        status: 402,
        json: jest.fn().mockResolvedValue({
          payment_requirements: {
            amount: '1000000000',
            nonce: 12345,
            token_contract_hash: 'hash-abc123',
            chain_name: 'casper-test'
          }
        })
      };

      const retryError = new Error('Retry request failed');

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mock402Response)
        .mockRejectedValueOnce(retryError);

      const { result } = renderHook(() => useX402());
      
      await expect(result.current.fetchWithPayment('https://example.com'))
        .rejects.toThrow('Network request failed: Retry request failed');
    });

    test('should distinguish between different error types', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      
      // Test cases for different error scenarios
      const errorScenarios = [
        {
          name: 'Network error on initial request',
          setup: () => {
            useClickRef.mockReturnValue({
              activeAccount: { public_key: 'test-key' },
              signMessage: jest.fn()
            });
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));
          },
          expectedError: 'Network request failed: Network timeout'
        },
        {
          name: 'JSON parsing error',
          setup: () => {
            useClickRef.mockReturnValue({
              activeAccount: { public_key: 'test-key' },
              signMessage: jest.fn()
            });
            const mock402Response = {
              status: 402,
              json: jest.fn().mockRejectedValue(new Error('Unexpected token'))
            };
            (global.fetch as jest.Mock).mockResolvedValueOnce(mock402Response);
          },
          expectedError: 'Failed to parse 402 response: Invalid JSON format'
        },
        {
          name: 'Missing payment requirements',
          setup: () => {
            useClickRef.mockReturnValue({
              activeAccount: { public_key: 'test-key' },
              signMessage: jest.fn()
            });
            const mock402Response = {
              status: 402,
              json: jest.fn().mockResolvedValue({ error: 'Payment required' })
            };
            (global.fetch as jest.Mock).mockResolvedValueOnce(mock402Response);
          },
          expectedError: '402 response missing payment_requirements field'
        }
      ];

      for (const scenario of errorScenarios) {
        scenario.setup();
        
        const { result } = renderHook(() => useX402());
        
        await expect(result.current.fetchWithPayment('https://example.com'))
          .rejects.toThrow(scenario.expectedError);
        
        jest.clearAllMocks();
      }
    });

    test('should preserve original error information', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'test-key' },
        signMessage: jest.fn()
      });

      const originalError = new Error('Original network error');
      originalError.stack = 'Original stack trace';
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(originalError);

      const { result } = renderHook(() => useX402());
      
      try {
        await result.current.fetchWithPayment('https://example.com');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toBe('Network request failed: Original network error');
        // The original error information is preserved in the message
      }
    });

    test('should handle non-Error objects thrown', async () => {
      const { useClickRef } = require('@make-software/csprclick-ui');
      useClickRef.mockReturnValue({
        activeAccount: { public_key: 'test-key' },
        signMessage: jest.fn()
      });

      const nonErrorObject = { code: 'NETWORK_ERROR', message: 'Connection failed' };
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(nonErrorObject);

      const { result } = renderHook(() => useX402());
      
      try {
        await result.current.fetchWithPayment('https://example.com');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBe(nonErrorObject); // Non-Error objects are re-thrown as-is
      }
    });
  });
});