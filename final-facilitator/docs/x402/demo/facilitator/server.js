/**
 * Casper x402 Facilitator Service
 * 
 * This service acts as a facilitator for x402 payment protocol on Casper network.
 * It handles payment verification, transaction signing, and settlement.
 */

require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const CasperService = require('./services/casper-service');
const PaymentService = require('./services/payment-service');
const ValidationService = require('./services/validation-service');

const app = express();
const PORT = process.env.API_PORT || 3001;
const HOST = process.env.API_HOST || 'localhost';

// Initialize services
const casperService = new CasperService();
const paymentService = new PaymentService(casperService);
const validationService = new ValidationService();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'casper-x402-facilitator',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        network: process.env.CASPER_CHAIN_NAME,
        node: process.env.CASPER_NODE_ADDRESS
    });
});

// Get facilitator info
app.get('/info', async (req, res) => {
    try {
        const info = await casperService.getFacilitatorInfo();
        res.json({
            success: true,
            data: {
                facilitatorAddress: info.accountHash,
                publicKey: info.publicKey,
                contractHash: process.env.FACILITATOR_CONTRACT_HASH,
                network: process.env.CASPER_CHAIN_NAME,
                supportedTokens: info.supportedTokens || ['CSPR'],
                feeRates: {
                    baseFee: process.env.BASE_FEE_RATE,
                    gasPayment: process.env.GAS_PAYMENT
                }
            }
        });
    } catch (error) {
        console.error('Error getting facilitator info:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get facilitator info',
            message: error.message
        });
    }
});

// Estimate transaction fees
app.post('/estimate-fees', async (req, res) => {
    try {
        const { transactionSize, instructionCount, tokenSymbol } = req.body;
        
        // Validate request
        const validation = validationService.validateFeeEstimateRequest(req.body);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                details: validation.errors
            });
        }

        const feeEstimate = await paymentService.estimateFees({
            transactionSize: transactionSize || 1024,
            instructionCount: instructionCount || 2,
            tokenSymbol: tokenSymbol || 'CSPR'
        });

        res.json({
            success: true,
            data: feeEstimate
        });
    } catch (error) {
        console.error('Error estimating fees:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to estimate fees',
            message: error.message
        });
    }
});

// Sign transaction (x402 step 1)
app.post('/sign-transaction', async (req, res) => {
    try {
        const { transaction, userPublicKey, amount, nonce, deadline } = req.body;
        
        // Validate request
        const validation = validationService.validateSignRequest(req.body);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid sign request',
                details: validation.errors
            });
        }

        const signResult = await paymentService.signTransaction({
            transaction,
            userPublicKey,
            amount,
            nonce,
            deadline,
            requestId: uuidv4()
        });

        res.json({
            success: true,
            data: {
                signedTransaction: signResult.signedTransaction,
                facilitatorSignature: signResult.signature,
                transactionHash: signResult.transactionHash,
                estimatedFee: signResult.estimatedFee
            }
        });
    } catch (error) {
        console.error('Error signing transaction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sign transaction',
            message: error.message
        });
    }
});

// Send transaction (x402 step 2)
app.post('/send-transaction', async (req, res) => {
    try {
        const { signedTransaction, userSignature, paymentProof } = req.body;
        
        // Validate request
        const validation = validationService.validateSendRequest(req.body);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid send request',
                details: validation.errors
            });
        }

        const sendResult = await paymentService.sendTransaction({
            signedTransaction,
            userSignature,
            paymentProof,
            requestId: uuidv4()
        });

        res.json({
            success: true,
            data: {
                deployHash: sendResult.deployHash,
                status: sendResult.status,
                cost: sendResult.cost,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error sending transaction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send transaction',
            message: error.message
        });
    }
});

// Process x402 payment (combined sign + send)
app.post('/process-payment', async (req, res) => {
    try {
        const { 
            userPublicKey, 
            recipient, 
            amount, 
            tokenSymbol,
            nonce, 
            deadline, 
            userSignature,
            metadata 
        } = req.body;
        
        // Validate request
        const validation = validationService.validatePaymentRequest(req.body);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid payment request',
                details: validation.errors
            });
        }

        const paymentResult = await paymentService.processPayment({
            userPublicKey,
            recipient: recipient || process.env.FACILITATOR_ACCOUNT_HASH,
            amount,
            tokenSymbol: tokenSymbol || 'CSPR',
            nonce,
            deadline,
            userSignature,
            metadata,
            requestId: uuidv4()
        });

        res.json({
            success: true,
            data: {
                deployHash: paymentResult.deployHash,
                transactionHash: paymentResult.transactionHash,
                status: paymentResult.status,
                cost: paymentResult.cost,
                feesPaid: paymentResult.feesPaid,
                timestamp: new Date().toISOString(),
                requestId: paymentResult.requestId
            }
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process payment',
            message: error.message
        });
    }
});

// Get transaction status
app.get('/status/:deployHash', async (req, res) => {
    try {
        const { deployHash } = req.params;
        
        if (!deployHash || typeof deployHash !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Invalid deploy hash'
            });
        }

        const status = await casperService.getDeployStatus(deployHash);
        
        res.json({
            success: true,
            data: {
                deployHash,
                status: status.status,
                result: status.result,
                cost: status.cost,
                errorMessage: status.errorMessage,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error getting transaction status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get transaction status',
            message: error.message
        });
    }
});

// Get supported tokens
app.get('/supported-tokens', async (req, res) => {
    try {
        const tokens = await casperService.getSupportedTokens();
        
        res.json({
            success: true,
            data: {
                tokens,
                count: tokens.length,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error getting supported tokens:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get supported tokens',
            message: error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Start server
const server = app.listen(PORT, HOST, () => {
    console.log('🚀 Casper x402 Facilitator Service Started');
    console.log('==========================================');
    console.log(`📍 Server: http://${HOST}:${PORT}`);
    console.log(`🌐 Network: ${process.env.CASPER_CHAIN_NAME}`);
    console.log(`🔗 Node: ${process.env.CASPER_NODE_ADDRESS}`);
    console.log(`📋 Contract: ${process.env.FACILITATOR_CONTRACT_HASH}`);
    console.log('');
    console.log('📡 Available Endpoints:');
    console.log(`   GET  /health - Health check`);
    console.log(`   GET  /info - Facilitator information`);
    console.log(`   POST /estimate-fees - Estimate transaction fees`);
    console.log(`   POST /sign-transaction - Sign transaction`);
    console.log(`   POST /send-transaction - Send signed transaction`);
    console.log(`   POST /process-payment - Process x402 payment`);
    console.log(`   GET  /status/:deployHash - Get transaction status`);
    console.log(`   GET  /supported-tokens - Get supported tokens`);
    console.log('');
    console.log('✅ Ready to process x402 payments!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = app;