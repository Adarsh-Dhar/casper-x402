# Frontend-Facilitator Integration Guide

## Overview

The facilitator service is now running and ready to process x402 transactions. Here's how to integrate it with your frontend.

## Current Status

✅ **Facilitator Service**: Running on `http://localhost:3001`
✅ **CEP18 Contract**: Deployed at `hash-937627b2d99b08199fad92f566495f4979e4fa5b8f4ecefba632be9b310c6cbb`
✅ **Network**: Connected to Casper testnet
✅ **Security**: Full validation and replay protection enabled

## Integration Steps

### 1. Frontend Configuration

Add these constants to your frontend:

```javascript
// Frontend configuration
const FACILITATOR_URL = 'http://localhost:3001';
const CONTRACT_HASH = 'hash-937627b2d99b08199fad92f566495f4979e4fa5b8f4ecefba632be9b310c6cbb';
const CHAIN_NAME = 'casper-test';
```

### 2. x402 Transaction Flow

```javascript
async function submitX402Transaction(userWallet, recipientAddress, amount) {
    try {
        // 1. Prepare transaction data
        const nonce = Math.floor(Date.now() / 1000);
        const deadline = nonce + 3600; // 1 hour expiry
        
        // 2. Create message to sign
        const message = `${userWallet.publicKey}:${recipientAddress}:${amount}:${nonce}:${deadline}`;
        
        // 3. Sign the message with user's private key
        const signature = await userWallet.sign(message);
        
        // 4. Submit to facilitator
        const response = await fetch(`${FACILITATOR_URL}/settle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                owner_public_key: userWallet.publicKey,
                recipient: recipientAddress,
                amount: amount.toString(),
                nonce: nonce,
                deadline: deadline,
                signature: signature,
                chainName: CHAIN_NAME,
                contractHash: CONTRACT_HASH
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Transaction submitted:', result.deployHash);
            
            // 5. Monitor transaction status
            return await monitorTransaction(result.deployHash);
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('❌ Transaction failed:', error);
        throw error;
    }
}
```

### 3. Transaction Monitoring

```javascript
async function monitorTransaction(deployHash) {
    const maxAttempts = 60; // 5 minutes
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        try {
            const response = await fetch(`${FACILITATOR_URL}/status/${deployHash}`);
            const status = await response.json();
            
            if (status.status === 'completed') {
                console.log('✅ Transaction completed:', status);
                return status;
            } else if (status.status === 'failed') {
                throw new Error(status.error);
            }
            
            // Wait 5 seconds before next check
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;
            
        } catch (error) {
            console.log('⏳ Transaction still processing...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;
        }
    }
    
    throw new Error('Transaction monitoring timeout');
}
```

### 4. Error Handling

```javascript
function handleTransactionError(error) {
    if (error.message.includes('nonce')) {
        return 'Transaction expired or already processed';
    } else if (error.message.includes('signature')) {
        return 'Invalid signature - please try again';
    } else if (error.message.includes('balance')) {
        return 'Insufficient balance';
    } else if (error.message.includes('rate limit')) {
        return 'Too many requests - please wait';
    } else {
        return `Transaction failed: ${error.message}`;
    }
}
```

### 5. Complete Example

```javascript
// Complete x402 transaction example
async function processPayment(userWallet, recipientAddress, tokenAmount) {
    try {
        // Show loading state
        setLoading(true);
        setStatus('Preparing transaction...');
        
        // Convert amount to smallest unit (18 decimals for this token)
        const amountInSmallestUnit = (tokenAmount * Math.pow(10, 18)).toString();
        
        // Submit transaction
        setStatus('Submitting transaction...');
        const result = await submitX402Transaction(
            userWallet, 
            recipientAddress, 
            amountInSmallestUnit
        );
        
        // Show success
        setStatus('Transaction completed successfully!');
        setTransactionHash(result.deployHash);
        
        return result;
        
    } catch (error) {
        const errorMessage = handleTransactionError(error);
        setStatus(`Error: ${errorMessage}`);
        throw error;
        
    } finally {
        setLoading(false);
    }
}
```

## Testing the Integration

### 1. Health Check

```javascript
async function testFacilitatorConnection() {
    try {
        const response = await fetch(`${FACILITATOR_URL}/health`);
        const health = await response.json();
        console.log('✅ Facilitator connected:', health);
        return true;
    } catch (error) {
        console.error('❌ Facilitator not accessible:', error);
        return false;
    }
}
```

### 2. Mock Transaction Test

```javascript
async function testMockTransaction() {
    const mockData = {
        owner_public_key: '01682FA591f79eC7dCcaAdBf3a4C11d37b913e224F901730f6AaA1Dd545AE553E7',
        recipient: 'account-hash-1111111111111111111111111111111111111111111111111111111111111111',
        amount: '1000000000000000000',
        nonce: Math.floor(Date.now() / 1000),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        signature: '1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        chainName: 'casper-test',
        contractHash: CONTRACT_HASH
    };
    
    try {
        const response = await fetch(`${FACILITATOR_URL}/settle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mockData)
        });
        
        const result = await response.json();
        console.log('Mock transaction result:', result);
        
    } catch (error) {
        console.error('Mock transaction failed:', error);
    }
}
```

## Required Frontend Dependencies

Make sure your frontend has these capabilities:

```javascript
// Required for x402 transactions
- Wallet connection (Casper Signer, Casper Wallet, etc.)
- Message signing capability
- HTTP client (fetch, axios, etc.)
- Error handling and user feedback
```

## Security Considerations

1. **Signature Validation**: Always verify signatures on the client side
2. **Nonce Management**: Use current timestamps to prevent replay attacks
3. **Amount Validation**: Validate amounts before submission
4. **Error Handling**: Provide clear feedback to users
5. **Rate Limiting**: Respect the facilitator's rate limits

## Troubleshooting

### Common Issues

1. **CORS Errors**: The facilitator allows all origins in development
2. **Signature Errors**: Ensure proper message formatting and signing
3. **Nonce Errors**: Use current timestamp, not random numbers
4. **Network Errors**: Check facilitator service is running

### Debug Commands

```bash
# Check facilitator status
cd facilitator && node status.js

# Test facilitator endpoints
curl http://localhost:3001/health

# Run facilitator tests
cd facilitator && node test-x402.js
```

## Next Steps

1. **Fund Facilitator**: Add testnet CSPR to the facilitator account
2. **Implement Frontend**: Add the integration code to your React app
3. **Test Transactions**: Start with small amounts
4. **Monitor Logs**: Watch facilitator logs for debugging
5. **Production Setup**: Configure for production deployment

## Support

- Facilitator logs: Check the terminal running the facilitator
- Test suite: `cd facilitator && node test-x402.js`
- Status check: `cd facilitator && node status.js`
- Documentation: See `FACILITATOR_SETUP.md`

The facilitator is ready to process x402 transactions! 🚀