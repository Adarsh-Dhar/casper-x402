/**
 * x402 Payment Middleware
 * 
 * Implements the x402 payment protocol for protecting API endpoints.
 * Returns 402 Payment Required for unpaid requests and validates payments.
 */

const axios = require('axios');

class X402Middleware {
    constructor(paymentService) {
        this.paymentService = paymentService;
        this.facilitatorUrl = process.env.FACILITATOR_URL;
        this.network = process.env.NETWORK || 'casper-test';
        this.tokenSymbol = process.env.DEMO_TOKEN_SYMBOL || 'CSPR';
    }

    /**
     * Create middleware that requires payment for endpoint access
     */
    requirePayment(options = {}) {
        const {
            price = '$0.0001',
            description = 'API access',
            tokenSymbol = this.tokenSymbol
        } = options;

        return async (req, res, next) => {
            try {
                // Check if payment header is present
                const paymentHeader = req.headers['x-payment'] || req.headers['payment'];
                
                if (!paymentHeader) {
                    return this.sendPaymentRequired(res, {
                        price,
                        description,
                        tokenSymbol,
                        endpoint: req.originalUrl,
                        method: req.method
                    });
                }

                // Parse payment header
                const paymentData = this.parsePaymentHeader(paymentHeader);
                if (!paymentData) {
                    return this.sendPaymentRequired(res, {
                        price,
                        description,
                        tokenSymbol,
                        endpoint: req.originalUrl,
                        method: req.method,
                        error: 'Invalid payment header format'
                    });
                }

                // Verify payment with facilitator
                const paymentValid = await this.verifyPayment(paymentData, {
                    price,
                    description,
                    endpoint: req.originalUrl
                });

                if (!paymentValid.success) {
                    return this.sendPaymentRequired(res, {
                        price,
                        description,
                        tokenSymbol,
                        endpoint: req.originalUrl,
                        method: req.method,
                        error: paymentValid.error
                    });
                }

                // Payment is valid, attach payment info to request and continue
                req.payment = paymentValid.payment;
                next();

            } catch (error) {
                console.error('x402 middleware error:', error);
                return this.sendPaymentRequired(res, {
                    price,
                    description,
                    tokenSymbol,
                    endpoint: req.originalUrl,
                    method: req.method,
                    error: 'Payment verification failed'
                });
            }
        };
    }

    /**
     * Send 402 Payment Required response
     */
    sendPaymentRequired(res, options) {
        const {
            price,
            description,
            tokenSymbol,
            endpoint,
            method,
            error
        } = options;

        // Convert price to token amount
        const tokenAmount = this.convertPriceToTokenAmount(price, tokenSymbol);
        
        // Generate payment challenge
        const paymentChallenge = this.generatePaymentChallenge({
            price,
            tokenAmount,
            tokenSymbol,
            endpoint,
            method,
            description
        });

        res.status(402).json({
            error: 'Payment Required',
            message: error || `Payment of ${price} required to access ${endpoint}`,
            payment: {
                required: true,
                price,
                tokenAmount,
                tokenSymbol,
                network: this.network,
                facilitatorUrl: this.facilitatorUrl,
                challenge: paymentChallenge,
                instructions: {
                    step1: 'Sign the payment challenge with your private key',
                    step2: 'Submit payment to facilitator',
                    step3: 'Include payment proof in X-Payment header',
                    step4: 'Retry the request with payment header'
                }
            },
            headers: {
                'X-Payment-Required': price,
                'X-Payment-Token': tokenSymbol,
                'X-Payment-Network': this.network,
                'X-Payment-Facilitator': this.facilitatorUrl
            }
        });
    }

    /**
     * Parse payment header
     */
    parsePaymentHeader(paymentHeader) {
        try {
            // Payment header format: "casper <base64-encoded-payment-data>"
            const parts = paymentHeader.split(' ');
            if (parts.length !== 2 || parts[0].toLowerCase() !== 'casper') {
                return null;
            }

            const paymentData = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            
            // Validate required fields
            if (!paymentData.userPublicKey || 
                !paymentData.amount || 
                !paymentData.signature || 
                !paymentData.nonce || 
                !paymentData.deadline) {
                return null;
            }

            return paymentData;
        } catch (error) {
            console.error('Error parsing payment header:', error);
            return null;
        }
    }

    /**
     * Verify payment with facilitator
     */
    async verifyPayment(paymentData, requestInfo) {
        try {
            const response = await axios.post(`${this.facilitatorUrl}/process-payment`, {
                userPublicKey: paymentData.userPublicKey,
                amount: paymentData.amount,
                tokenSymbol: paymentData.tokenSymbol || this.tokenSymbol,
                nonce: paymentData.nonce,
                deadline: paymentData.deadline,
                userSignature: paymentData.signature,
                metadata: {
                    endpoint: requestInfo.endpoint,
                    price: requestInfo.price,
                    description: requestInfo.description,
                    timestamp: new Date().toISOString()
                }
            }, {
                timeout: 30000 // 30 second timeout
            });

            if (response.data.success) {
                return {
                    success: true,
                    payment: {
                        userPublicKey: paymentData.userPublicKey,
                        amount: paymentData.amount,
                        tokenSymbol: paymentData.tokenSymbol || this.tokenSymbol,
                        deployHash: response.data.data.deployHash,
                        timestamp: new Date().toISOString()
                    }
                };
            } else {
                return {
                    success: false,
                    error: response.data.error || 'Payment verification failed'
                };
            }
        } catch (error) {
            console.error('Payment verification error:', error);
            
            if (error.response) {
                return {
                    success: false,
                    error: error.response.data?.error || 'Payment verification failed'
                };
            }
            
            return {
                success: false,
                error: 'Unable to verify payment with facilitator'
            };
        }
    }

    /**
     * Convert USD price to token amount
     */
    convertPriceToTokenAmount(price, tokenSymbol) {
        // Remove $ and convert to number
        const usdAmount = parseFloat(price.replace('$', ''));
        
        // Mock exchange rates (in production, get from real API)
        const exchangeRates = {
            'CSPR': 0.05, // 1 CSPR = $0.05
            'USDC': 1.0,  // 1 USDC = $1.00
            'WETH': 2500.0 // 1 WETH = $2500.00
        };
        
        const rate = exchangeRates[tokenSymbol] || 1.0;
        const tokenAmount = usdAmount / rate;
        
        // Convert to smallest unit (assuming 18 decimals for most tokens)
        const decimals = this.getTokenDecimals(tokenSymbol);
        const amountInSmallestUnit = Math.floor(tokenAmount * Math.pow(10, decimals));
        
        return amountInSmallestUnit.toString();
    }

    /**
     * Get token decimals
     */
    getTokenDecimals(tokenSymbol) {
        const decimals = {
            'CSPR': 9,
            'USDC': 6,
            'WETH': 18
        };
        
        return decimals[tokenSymbol] || 18;
    }

    /**
     * Generate payment challenge
     */
    generatePaymentChallenge(options) {
        const {
            price,
            tokenAmount,
            tokenSymbol,
            endpoint,
            method,
            description
        } = options;

        const challenge = {
            endpoint,
            method,
            price,
            tokenAmount,
            tokenSymbol,
            description,
            network: this.network,
            facilitatorUrl: this.facilitatorUrl,
            timestamp: Math.floor(Date.now() / 1000),
            deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
            nonce: Math.floor(Math.random() * 1000000)
        };

        // Create message to sign
        const message = JSON.stringify({
            endpoint: challenge.endpoint,
            amount: challenge.tokenAmount,
            tokenSymbol: challenge.tokenSymbol,
            nonce: challenge.nonce,
            deadline: challenge.deadline,
            network: challenge.network
        });

        challenge.message = message;
        challenge.messageHash = require('crypto').createHash('sha256').update(message).digest('hex');

        return challenge;
    }

    /**
     * Create payment header for client
     */
    static createPaymentHeader(paymentData) {
        const paymentJson = JSON.stringify(paymentData);
        const paymentBase64 = Buffer.from(paymentJson).toString('base64');
        return `casper ${paymentBase64}`;
    }

    /**
     * Middleware for handling CORS preflight requests
     */
    static corsHandler() {
        return (req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Payment, Payment');
            res.header('Access-Control-Expose-Headers', 'X-Payment-Required, X-Payment-Token, X-Payment-Network, X-Payment-Facilitator');
            
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        };
    }
}

module.exports = X402Middleware;