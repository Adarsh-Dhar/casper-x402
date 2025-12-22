/**
 * Casper Client Service
 * 
 * Handles Casper blockchain interactions for the x402 client
 */

const { Keys } = require('casper-js-sdk');
const fs = require('fs');
const path = require('path');

class CasperClient {
    constructor() {
        this.network = process.env.NETWORK || 'casper-test';
        this.nodeAddress = process.env.CASPER_NODE_ADDRESS;
        this.payerKeyPair = null;
    }

    /**
     * Load payer key pair from file
     */
    async loadPayerKeys() {
        try {
            const keyPath = path.resolve(process.env.PAYER_PRIVATE_KEY_PATH);
            
            if (!fs.existsSync(keyPath)) {
                // Generate new keys if they don't exist
                console.log('⚠️ Payer keys not found, generating new ones...');
                await this.generatePayerKeys();
                return;
            }

            this.payerKeyPair = Keys.Ed25519.loadKeyPairFromPrivateFile(keyPath);
            console.log('✅ Payer keys loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading payer keys:', error.message);
            throw new Error('Failed to load payer keys');
        }
    }

    /**
     * Generate new payer keys
     */
    async generatePayerKeys() {
        try {
            // Generate new key pair
            this.payerKeyPair = Keys.Ed25519.new();
            
            // Save keys to files
            const keyDir = path.dirname(process.env.PAYER_PRIVATE_KEY_PATH);
            if (!fs.existsSync(keyDir)) {
                fs.mkdirSync(keyDir, { recursive: true });
            }

            const privateKeyPem = this.payerKeyPair.exportPrivateKeyInPem();
            const publicKeyPem = this.payerKeyPair.exportPublicKeyInPem();

            fs.writeFileSync(process.env.PAYER_PRIVATE_KEY_PATH, privateKeyPem);
            fs.writeFileSync(process.env.PAYER_PRIVATE_KEY_PATH.replace('-secret.pem', '-public.pem'), publicKeyPem);

            console.log('✅ New payer keys generated and saved');
            console.log(`   Private key: ${process.env.PAYER_PRIVATE_KEY_PATH}`);
            console.log(`   Public key: ${process.env.PAYER_PRIVATE_KEY_PATH.replace('-secret.pem', '-public.pem')}`);
            console.log(`   Account hash: ${this.payerKeyPair.publicKey.toAccountHashStr()}`);
            console.log('');
            console.log('⚠️ IMPORTANT: Fund this account with testnet CSPR tokens!');
            console.log('   Faucet: https://testnet.cspr.live/tools/faucet');
            console.log('');

        } catch (error) {
            console.error('❌ Error generating payer keys:', error.message);
            throw new Error('Failed to generate payer keys');
        }
    }

    /**
     * Get payer information
     */
    getPayerInfo() {
        if (!this.payerKeyPair) {
            throw new Error('Payer keys not loaded');
        }

        return {
            publicKey: this.payerKeyPair.publicKey.toHex(),
            accountHash: this.payerKeyPair.publicKey.toAccountHashStr(),
            network: this.network
        };
    }

    /**
     * Sign a message with payer's private key
     */
    signMessage(message) {
        if (!this.payerKeyPair) {
            throw new Error('Payer keys not loaded');
        }

        try {
            const messageBytes = Buffer.from(message, 'utf8');
            const signature = this.payerKeyPair.sign(messageBytes);
            return signature.toString('hex');
        } catch (error) {
            throw new Error(`Failed to sign message: ${error.message}`);
        }
    }

    /**
     * Create a payment signature for x402
     */
    createPaymentSignature(paymentData) {
        const { amount, tokenSymbol, nonce, deadline, endpoint } = paymentData;
        
        // Create standardized message for signing
        const message = JSON.stringify({
            amount,
            tokenSymbol,
            nonce,
            deadline,
            endpoint,
            network: this.network,
            timestamp: Math.floor(Date.now() / 1000)
        });

        const signature = this.signMessage(message);
        
        return {
            message,
            signature,
            messageHash: require('crypto').createHash('sha256').update(message).digest('hex')
        };
    }

    /**
     * Validate payment parameters
     */
    validatePaymentParams(params) {
        const { amount, tokenSymbol, nonce, deadline } = params;
        
        if (!amount || isNaN(amount) || parseInt(amount) <= 0) {
            throw new Error('Invalid amount');
        }
        
        if (!tokenSymbol || typeof tokenSymbol !== 'string') {
            throw new Error('Invalid token symbol');
        }
        
        if (nonce === undefined || nonce === null || !Number.isInteger(nonce) || nonce < 0) {
            throw new Error('Invalid nonce');
        }
        
        if (!deadline || !Number.isInteger(deadline) || deadline <= Math.floor(Date.now() / 1000)) {
            throw new Error('Invalid deadline');
        }
        
        return true;
    }

    /**
     * Generate a unique nonce
     */
    generateNonce() {
        return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
    }

    /**
     * Generate a deadline (1 hour from now)
     */
    generateDeadline() {
        return Math.floor(Date.now() / 1000) + 3600; // 1 hour
    }

    /**
     * Format token amount for display
     */
    formatTokenAmount(amount, tokenSymbol, decimals = null) {
        if (!decimals) {
            const tokenDecimals = {
                'CSPR': 9,
                'USDC': 6,
                'WETH': 18
            };
            decimals = tokenDecimals[tokenSymbol] || 18;
        }

        const divisor = Math.pow(10, decimals);
        const formattedAmount = (parseInt(amount) / divisor).toFixed(decimals);
        
        // Remove trailing zeros
        return parseFloat(formattedAmount).toString();
    }

    /**
     * Get account balance (mock implementation for demo)
     */
    async getAccountBalance(tokenSymbol = 'CSPR') {
        // In a real implementation, this would query the blockchain
        // For demo purposes, return a mock balance
        const mockBalances = {
            'CSPR': '10000000000000000000', // 10 CSPR
            'USDC': '1000000000', // 1000 USDC
            'WETH': '1000000000000000000' // 1 WETH
        };

        return {
            balance: mockBalances[tokenSymbol] || '0',
            tokenSymbol,
            accountHash: this.getPayerInfo().accountHash,
            formatted: this.formatTokenAmount(mockBalances[tokenSymbol] || '0', tokenSymbol)
        };
    }

    /**
     * Check if account has sufficient balance
     */
    async checkSufficientBalance(amount, tokenSymbol) {
        const balance = await this.getAccountBalance(tokenSymbol);
        const balanceAmount = parseInt(balance.balance);
        const requiredAmount = parseInt(amount);
        
        return {
            sufficient: balanceAmount >= requiredAmount,
            balance: balance.balance,
            required: amount,
            difference: balanceAmount - requiredAmount
        };
    }
}

module.exports = CasperClient;