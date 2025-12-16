import { useClickRef } from '@make-software/csprclick-ui';

// TypeScript interfaces for X402 payment flow
export interface PaymentRequirements {
  amount: string;              // Token amount in motes
  nonce: number;              // Anti-replay nonce from backend
  token_contract_hash: string; // CEP-18 contract hash
  chain_name: string;         // Casper network identifier
}

export interface PaymentIntent {
  payload: string;            // Formatted as "x402-casper:{chain}:{contract}:{amount}:{nonce}"
  signature: string;          // Hex-encoded wallet signature
  publicKey: string;          // User's public key
}

export interface XPaymentHeader {
  signature: string;          // Hex signature from wallet
  public_key: string;         // User's public key
  amount: string;            // Payment amount
  nonce: number;             // Nonce value
  payload_str: string;       // Original payload string (optional)
}

export interface UseX402Return {
  fetchWithPayment: (url: string, options?: RequestInit) => Promise<Response>;
}

export const useX402 = (): UseX402Return => {
  const clickRef = useClickRef();

  const fetchWithPayment = async (url: string, options: RequestInit = {}): Promise<Response> => {
    try {
      // 1. Initial Request
      let response = await fetch(url, options);

      // 2. For non-402 responses, return directly without additional processing
      if (response.status !== 402) {
        return response;
      }

      // 3. Handle 402 Payment Required
      if (response.status === 402) {
        let data;
        try {
          data = await response.json();
        } catch (error) {
          throw new Error('Failed to parse 402 response: Invalid JSON format');
        }

        if (!data.payment_requirements) {
          throw new Error('402 response missing payment_requirements field');
        }

        const { amount, nonce, token_contract_hash, chain_name } = data.payment_requirements;

        // Validate required fields (note: nonce can be 0, so check for undefined/null)
        if (!amount || nonce === undefined || nonce === null || !token_contract_hash || !chain_name) {
          const missing = [];
          if (!amount) missing.push('amount');
          if (nonce === undefined || nonce === null) missing.push('nonce');
          if (!token_contract_hash) missing.push('token_contract_hash');
          if (!chain_name) missing.push('chain_name');
          throw new Error(`Payment requirements missing required fields: ${missing.join(', ')}`);
        }

      if (!clickRef?.activeAccount?.public_key) {
        throw new Error("Wallet not connected");
      }

      // 3. Construct Payment Intent (CRITICAL: Must match Rust logic exactly)
      // Format: x402-casper:<chain_name>:<contract_hash>:<amount>:<nonce>
      const paymentPayload = `x402-casper:${chain_name}:${token_contract_hash}:${amount}:${nonce}`;
      console.log("Signing payload:", paymentPayload);

      // 4. Sign Message
      // The wallet handles the Blake2b hashing and prefixing internally
      const signResult = await clickRef.signMessage(
        paymentPayload,
        clickRef.activeAccount.public_key
      );

      if (signResult.cancelled) {
        throw new Error("User cancelled signature");
      }

      // 5. Retry with Header
      // Create the X-PAYMENT header
      const xPaymentHeader = JSON.stringify({
        signature: signResult.signatureHex, // The hex signature
        public_key: clickRef.activeAccount.public_key,
        amount: amount,
        nonce: nonce,
        payload_str: paymentPayload // Optional: helps backend verify formatting
      });

      const newHeaders = new Headers(options.headers);
      newHeaders.append('X-PAYMENT', xPaymentHeader);

      response = await fetch(url, {
        ...options,
        headers: newHeaders
      });
    }

    return response;
    } catch (error) {
      // Preserve and propagate network errors
      if (error instanceof Error) {
        throw new Error(`Network request failed: ${error.message}`);
      }
      throw error;
    }
  };

  return { fetchWithPayment };
};