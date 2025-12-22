/**
 * Payment Service
 * 
 * Handles x402 payment protocol logic including:
 * - Payment validation
 * - Transaction signing
 * - Payment processing
 * - Fee calculation
 */

const { v4: uuidv4 } = require('uuid');

class PaymentService {
    constructor(casperService) {
        this.casperService = casperService;
        this.pendingPayments = new Map(); // In production, use Redis or database
    }

    /**
     * Estimate fees for a transaction
     */
    async estimateFees(params) {
        try {
            const feeEstimate = await this.casperService.estimateFees(params);
            
            return {
                ...feeEstimate,
                estimatedAt: new Date().toISOString(),
                validUntil: new Date(Date.now() + 300000).toISOString() // 5 minutes
            };
        } catch (error) {
            throw new Error(`Fee estimation failed: ${error.message}`);
        }
    }

    /**
     * Sign a transaction (x402 step 1)
     */
    async signTransaction(params) {
        const { transaction, userPublicKey, amount, nonce, deadline, requestId } = params;
        
        try {
            // Validate parameters
            this.validateSignParameters(params);
            
            // Check deadline
            const currentTime = Math.floor(Date.now() / 1000);
            if (deadline <= currentTime) {
                throw new Error('Transaction deadline has passed');
            }
            
            // Create transaction message
            const message = this.createTransactionMessage({
                userPublicKey,
                amount,
                nonce,
                deadline,
                transaction
            });
            
            // Sign the transaction
            const facilitatorSignature = this.casperService.signMessage(message);
            
            // Store pending payment
            const paymentData = {
                requestId,
                userPublicKey,
                amount,
                nonce,
                deadline,
                message,
                facilitatorSignature,
                status: 'signed',
                createdAt: new Date().toISOString()
            };
            
            this.pendingPayments.set(requestId, paymentData);
            
            // Estimate fees
            const feeEstimate = await this.estimateFees({
                transactionSize: transaction ? transaction.length : 1024,
                instructionCount: 2
            });
            
            return {
                signedTransaction: message,
                signature: facilitatorSignature,
                transactionHash: this.generateTransactionHash(message),
                estimatedFee: feeEstimate.totalFee,
                requestId,
                validUntil: new Date(deadline * 1000).toISOString()
            };
        } catch (error) {
            throw new Error(`Transaction signing failed: ${error.message}`);
        }
    }

    /**
     * Send a signed transaction (x402 step 2)
     */
    async sendTransaction(params) {
        const { signedTransaction, userSignature, paymentProof, requestId } = params;
        
        try {
            // Validate parameters
            this.validateSendParameters(params);
            
            // Get pending payment
            const pendingPayment = this.pendingPayments.get(requestId);
            if (!pendingPayment) {
                throw new Error('Payment request not found or expired');
            }
            
            // Verify user signature
            const isValidSignature = this.casperService.verifySignature(
                pendingPayment.message,
                userSignature,
                pendingPayment.userPublicKey
            );
            
            if (!isValidSignature) {
                throw new Error('Invalid user signature');
            }
            
            // Process the payment
            const result = await this.casperService.processPayment({
                userPublicKey: pendingPayment.userPublicKey,
                recipient: process.env.FACILITATOR_ACCOUNT_HASH,
                amount: pendingPayment.amount,
                nonce: pendingPayment.nonce,
                deadline: pendingPayment.deadline,
                userSignature
            });
            
            // Update payment status
            pendingPayment.status = 'sent';
            pendingPayment.deployHash = result.deployHash;
            pendingPayment.sentAt = new Date().toISOString();
            
            return {
                deployHash: result.deployHash,
                status: 'submitted',
                cost: null, // Will be available after execution
                requestId
            };
        } catch (error) {
            throw new Error(`Transaction sending failed: ${error.message}`);
        }
    }

    /**
     * Process a complete x402 payment (combined sign + send)
     */
    async processPayment(params) {
        const { 
            userPublicKey, 
            recipient, 
            amount, 
            tokenSymbol,
            nonce, 
            deadline, 
            userSignature,
            metadata,
            requestId 
        } = params;
        
        try {
            // Validate payment parameters
            this.validatePaymentParameters(params);
            
            // Check deadline
            const currentTime = Math.floor(Date.now() / 1000);
            if (deadline <= currentTime) {
                throw new Error('Payment deadline has passed');
            }
            
            // Create payment message
            const message = this.createPaymentMessage({
                userPublicKey,
                recipient,
                amount,
                tokenSymbol,
                nonce,
                deadline
            });
            
            // Verify user signature
            const isValidSignature = this.casperService.verifySignature(
                message,
                userSignature,
                userPublicKey
            );
            
            if (!isValidSignature) {
                throw new Error('Invalid user signature');
            }
            
            // Process the payment through Casper
            const result = await this.casperService.processPayment({
                userPublicKey,
                recipient: recipient || process.env.FACILITATOR_ACCOUNT_HASH,
                amount,
                nonce,
                deadline,
                userSignature
            });
            
            // Calculate fees
            const feeEstimate = await this.estimateFees({
                transactionSize: 1024,
                instructionCount: 2,
                tokenSymbol
            });
            
            // Store payment record
            const paymentRecord = {
                requestId,
                userPublicKey,
                recipient,
                amount,
                tokenSymbol,
                nonce,
                deadline,
                userSignature,
                deployHash: result.deployHash,
                status: 'submitted',
                feesPaid: feeEstimate.totalFee,
                metadata,
                createdAt: new Date().toISOString()
            };
            
            this.pendingPayments.set(requestId, paymentRecord);
            
            return {
                deployHash: result.deployHash,
                transactionHash: this.generateTransactionHash(message),
                status: 'submitted',
                cost: null, // Will be available after execution
                feesPaid: feeEstimate.totalFee,
                requestId
            };
        } catch (error) {
            throw new Error(`Payment processing failed: ${error.message}`);
        }
    }

    /**
     * Create transaction message for signing
     */
    createTransactionMessage(params) {
        const { userPublicKey, amount, nonce, deadline, transaction } = params;
        
        return JSON.stringify({
            userPublicKey,
            amount,
            nonce,
            deadline,
            transaction: transaction || '',
            chainName: process.env.CASPER_CHAIN_NAME,
            contractHash: process.env.FACILITATOR_CONTRACT_HASH,
            timestamp: Math.floor(Date.now() / 1000)
        });
    }

    /**
     * Create payment message for signing
     */
    createPaymentMessage(params) {
        const { userPublicKey, recipient, amount, tokenSymbol, nonce, deadline } = params;
        
        return JSON.stringify({
            userPublicKey,
            recipient,
            amount,
            tokenSymbol,
            nonce,
            deadline,
            chainName: process.env.CASPER_CHAIN_NAME,
            contractHash: process.env.FACILITATOR_CONTRACT_HASH,
            timestamp: Math.floor(Date.now() / 1000)
        });
    }

    /**
     * Generate a transaction hash
     */
    generateTransactionHash(message) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(message).digest('hex');
    }

    /**
     * Validate sign transaction parameters
     */
    validateSignParameters(params) {
        const { userPublicKey, amount, nonce, deadline } = params;
        
        if (!userPublicKey || !this.casperService.validatePublicKey(userPublicKey)) {
            throw new Error('Invalid user public key');
        }
        
        if (!amount || isNaN(amount) || parseInt(amount) <= 0) {
            throw new Error('Invalid amount');
        }
        
        if (nonce === undefined || nonce === null || !Number.isInteger(nonce) || nonce < 0) {
            throw new Error('Invalid nonce');
        }
        
        if (!deadline || !Number.isInteger(deadline) || deadline <= Math.floor(Date.now() / 1000)) {
            throw new Error('Invalid deadline');
        }
    }

    /**
     * Validate send transaction parameters
     */
    validateSendParameters(params) {
        const { signedTransaction, userSignature, requestId } = params;
        
        if (!signedTransaction || typeof signedTransaction !== 'string') {
            throw new Error('Invalid signed transaction');
        }
        
        if (!userSignature || typeof userSignature !== 'string') {
            throw new Error('Invalid user signature');
        }
        
        if (!requestId || typeof requestId !== 'string') {
            throw new Error('Invalid request ID');
        }
    }

    /**
     * Validate payment parameters
     */
    validatePaymentParameters(params) {
        const { userPublicKey, amount, nonce, deadline, userSignature } = params;
        
        if (!userPublicKey || !this.casperService.validatePublicKey(userPublicKey)) {
            throw new Error('Invalid user public key');
        }
        
        if (!amount || isNaN(amount) || parseInt(amount) <= 0) {
            throw new Error('Invalid amount');
        }
        
        if (nonce === undefined || nonce === null || !Number.isInteger(nonce) || nonce < 0) {
            throw new Error('Invalid nonce');
        }
        
        if (!deadline || !Number.isInteger(deadline)) {
            throw new Error('Invalid deadline');
        }
        
        if (!userSignature || typeof userSignature !== 'string') {
            throw new Error('Invalid user signature');
        }
    }

    /**
     * Get payment status
     */
    getPaymentStatus(requestId) {
        return this.pendingPayments.get(requestId) || null;
    }

    /**
     * Clean up expired payments
     */
    cleanupExpiredPayments() {
        const currentTime = Date.now();
        const expirationTime = 3600000; // 1 hour
        
        for (const [requestId, payment] of this.pendingPayments.entries()) {
            const paymentTime = new Date(payment.createdAt).getTime();
            if (currentTime - paymentTime > expirationTime) {
                this.pendingPayments.delete(requestId);
            }
        }
    }
}

module.exports = PaymentService;