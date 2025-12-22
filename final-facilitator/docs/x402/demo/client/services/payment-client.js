/**
 * Payment Client Service
 * 
 * Handles x402 payment creation and submission to the facilitator
 */

const axios = require('axios');

class PaymentClient {
    constructor(casperClient, facilitatorUrl) {
        this.casperClient = casperClient;
        this.facilitatorUrl = facilitatorUrl;
    }

    /**
     * Create a payment for x402 protocol
     */
    async createPayment(params) {
        const { amount, tokenSymbol, endpoint, description } = params;
        
        try {
            // Get payer info
            const payerInfo = this.casperClient.getPayerInfo();
            
            // Generate nonce and deadline
            const nonce = this.casperClient.generateNonce();
            const deadline = this.casperClient.generateDeadline();
            
            // Create payment signature
            const signatureData = this.casperClient.createPaymentSignature({
                amount,
                tokenSymbol,
                nonce,
                deadline,
                endpoint
            });
            
            // Submit payment to facilitator
            const facilitatorResponse = await this.submitToFacilitator({
                userPublicKey: payerInfo.publicKey,
                amount,
                tokenSymbol,
                nonce,
                deadline,
                userSignature: signatureData.signature,
                metadata: {
                    endpoint,
                    description,
                    message: signatureData.message,
                    messageHash: signatureData.messageHash
                }
            });
            
            return {
                userPublicKey: payerInfo.publicKey,
                amount,
                tokenSymbol,
                nonce,
                deadline,
                signature: signatureData.signature,
                deployHash: facilitatorResponse.deployHash,
                transactionHash: facilitatorResponse.transactionHash,
                status: facilitatorResponse.status,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            throw new Error(`Payment creation failed: ${error.message}`);
        }
    }

    /**
     * Submit payment to facilitator
     */
    async submitToFacilitator(paymentData) {
        try {
            const response = await axios.post(`${this.facilitatorUrl}/process-payment`, paymentData, {
                timeout: 30000 // 30 second timeout
            });
            
            if (response.data.success) {
                return {
                    deployHash: response.data.data.deployHash,
                    transactionHash: response.data.data.transactionHash,
                    status: response.data.data.status,
                    cost: response.data.data.cost,
                    feesPaid: response.data.data.feesPaid
                };
            } else {
                throw new Error(response.data.error || 'Payment submission failed');
            }
            
        } catch (error) {
            if (error.response) {
                throw new Error(error.response.data?.error || 'Facilitator request failed');
            }
            throw new Error(`Failed to submit payment: ${error.message}`);
        }
    }

    /**
     * Estimate payment fees
     */
    async estimateFees(params) {
        const { transactionSize = 1024, instructionCount = 2, tokenSymbol = 'CSPR' } = params;
        
        try {
            const response = await axios.post(`${this.facilitatorUrl}/estimate-fees`, {
                transactionSize,
                instructionCount,
                tokenSymbol
            });
            
            if (response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.error || 'Fee estimation failed');
            }
            
        } catch (error) {
            if (error.response) {
                throw new Error(error.response.data?.error || 'Fee estimation request failed');
            }
            throw new Error(`Failed to estimate fees: ${error.message}`);
        }
    }

    /**
     * Get payment status from facilitator
     */
    async getPaymentStatus(deployHash) {
        try {
            const response = await axios.get(`${this.facilitatorUrl}/status/${deployHash}`);
            
            if (response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.error || 'Status check failed');
            }
            
        } catch (error) {
            if (error.response) {
                throw new Error(error.response.data?.error || 'Status request failed');
            }
            throw new Error(`Failed to get payment status: ${error.message}`);
        }
    }

    /**
     * Wait for payment confirmation
     */
    async waitForConfirmation(deployHash, timeoutMs = 300000) {
        const startTime = Date.now();
        const checkInterval = 5000; // 5 seconds
        
        while (Date.now() - startTime < timeoutMs) {
            try {
                const status = await this.getPaymentStatus(deployHash);
                
                if (status.status === 'completed') {
                    return {
                        confirmed: true,
                        status: status.status,
                        result: status.result,
                        cost: status.cost
                    };
                } else if (status.status === 'failed') {
                    return {
                        confirmed: false,
                        status: status.status,
                        error: status.errorMessage
                    };
                }
                
                // Wait before next check
                await new Promise(resolve => setTimeout(resolve, checkInterval));
                
            } catch (error) {
                // Continue waiting if status check fails
                await new Promise(resolve => setTimeout(resolve, checkInterval));
            }
        }
        
        throw new Error('Payment confirmation timeout');
    }

    /**
     * Get supported tokens from facilitator
     */
    async getSupportedTokens() {
        try {
            const response = await axios.get(`${this.facilitatorUrl}/supported-tokens`);
            
            if (response.data.success) {
                return response.data.data.tokens;
            } else {
                throw new Error(response.data.error || 'Failed to get supported tokens');
            }
            
        } catch (error) {
            if (error.response) {
                throw new Error(error.response.data?.error || 'Request failed');
            }
            throw new Error(`Failed to get supported tokens: ${error.message}`);
        }
    }

    /**
     * Get facilitator info
     */
    async getFacilitatorInfo() {
        try {
            const response = await axios.get(`${this.facilitatorUrl}/info`);
            
            if (response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.error || 'Failed to get facilitator info');
            }
            
        } catch (error) {
            if (error.response) {
                throw new Error(error.response.data?.error || 'Request failed');
            }
            throw new Error(`Failed to get facilitator info: ${error.message}`);
        }
    }

    /**
     * Create payment header for HTTP requests
     */
    createPaymentHeader(payment) {
        const paymentData = {
            userPublicKey: payment.userPublicKey,
            amount: payment.amount,
            tokenSymbol: payment.tokenSymbol,
            nonce: payment.nonce,
            deadline: payment.deadline,
            signature: payment.signature
        };

        const paymentJson = JSON.stringify(paymentData);
        const paymentBase64 = Buffer.from(paymentJson).toString('base64');
        return `casper ${paymentBase64}`;
    }

    /**
     * Validate payment response
     */
    validatePaymentResponse(response) {
        if (!response || !response.deployHash) {
            throw new Error('Invalid payment response: missing deploy hash');
        }
        
        if (!response.status) {
            throw new Error('Invalid payment response: missing status');
        }
        
        return true;
    }
}

module.exports = PaymentClient;