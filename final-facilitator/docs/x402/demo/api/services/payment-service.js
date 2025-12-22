/**
 * Payment Service for Protected API
 * 
 * Handles payment verification and tracking for the protected API
 */

class PaymentService {
    constructor() {
        this.processedPayments = new Map(); // In production, use Redis or database
        this.facilitatorUrl = process.env.FACILITATOR_URL;
    }

    /**
     * Verify a payment has been processed
     */
    async verifyPayment(paymentData) {
        const { userPublicKey, amount, signature, nonce, deadline } = paymentData;
        
        try {
            // Check if payment has already been processed
            const paymentKey = this.generatePaymentKey(paymentData);
            if (this.processedPayments.has(paymentKey)) {
                const existingPayment = this.processedPayments.get(paymentKey);
                return {
                    success: true,
                    payment: existingPayment,
                    cached: true
                };
            }

            // Verify payment with facilitator (this would be a real API call)
            const verificationResult = await this.verifyWithFacilitator(paymentData);
            
            if (verificationResult.success) {
                // Store successful payment
                const paymentRecord = {
                    userPublicKey,
                    amount,
                    signature,
                    nonce,
                    deadline,
                    deployHash: verificationResult.deployHash,
                    timestamp: new Date().toISOString(),
                    verified: true
                };
                
                this.processedPayments.set(paymentKey, paymentRecord);
                
                return {
                    success: true,
                    payment: paymentRecord,
                    cached: false
                };
            } else {
                return {
                    success: false,
                    error: verificationResult.error
                };
            }
        } catch (error) {
            console.error('Payment verification error:', error);
            return {
                success: false,
                error: 'Payment verification failed'
            };
        }
    }

    /**
     * Generate a unique key for payment tracking
     */
    generatePaymentKey(paymentData) {
        const { userPublicKey, amount, nonce } = paymentData;
        return `${userPublicKey}:${amount}:${nonce}`;
    }

    /**
     * Verify payment with facilitator service
     */
    async verifyWithFacilitator(paymentData) {
        // In a real implementation, this would make an HTTP request to the facilitator
        // For demo purposes, we'll simulate the verification
        
        const { userPublicKey, amount, signature, nonce, deadline } = paymentData;
        
        // Basic validation
        if (!userPublicKey || !amount || !signature || !nonce || !deadline) {
            return {
                success: false,
                error: 'Missing required payment fields'
            };
        }
        
        // Check deadline
        const currentTime = Math.floor(Date.now() / 1000);
        if (deadline <= currentTime) {
            return {
                success: false,
                error: 'Payment deadline has passed'
            };
        }
        
        // Simulate successful verification
        return {
            success: true,
            deployHash: this.generateMockDeployHash(),
            cost: '2500000000', // Mock gas cost
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Generate a mock deploy hash for demo purposes
     */
    generateMockDeployHash() {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Get payment statistics
     */
    getPaymentStats() {
        const payments = Array.from(this.processedPayments.values());
        
        return {
            totalPayments: payments.length,
            totalAmount: payments.reduce((sum, p) => sum + parseInt(p.amount), 0),
            uniqueUsers: new Set(payments.map(p => p.userPublicKey)).size,
            averageAmount: payments.length > 0 ? 
                payments.reduce((sum, p) => sum + parseInt(p.amount), 0) / payments.length : 0,
            lastPayment: payments.length > 0 ? 
                payments[payments.length - 1].timestamp : null
        };
    }

    /**
     * Clean up expired payments
     */
    cleanupExpiredPayments() {
        const currentTime = Date.now();
        const expirationTime = 24 * 60 * 60 * 1000; // 24 hours
        
        for (const [key, payment] of this.processedPayments.entries()) {
            const paymentTime = new Date(payment.timestamp).getTime();
            if (currentTime - paymentTime > expirationTime) {
                this.processedPayments.delete(key);
            }
        }
    }

    /**
     * Get payment history for a user
     */
    getUserPaymentHistory(userPublicKey) {
        const userPayments = Array.from(this.processedPayments.values())
            .filter(payment => payment.userPublicKey === userPublicKey)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return {
            userPublicKey,
            paymentCount: userPayments.length,
            totalAmount: userPayments.reduce((sum, p) => sum + parseInt(p.amount), 0),
            payments: userPayments
        };
    }
}

module.exports = PaymentService;