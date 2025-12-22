/**
 * Protected API Server
 * 
 * This server demonstrates how to protect API endpoints using the x402 payment protocol.
 * It requires payment before allowing access to protected resources.
 */

require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const X402Middleware = require('./middleware/x402-middleware');
const PaymentService = require('./services/payment-service');

const app = express();
const PORT = process.env.PROTECTED_API_PORT || 3002;
const HOST = process.env.API_HOST || 'localhost';

// Initialize services
const paymentService = new PaymentService();
const x402Middleware = new X402Middleware(paymentService);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Health check endpoint (unprotected)
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'casper-x402-protected-api',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        paymentRequired: true,
        facilitatorUrl: process.env.FACILITATOR_URL
    });
});

// API info endpoint (unprotected)
app.get('/info', (req, res) => {
    res.json({
        service: 'Casper x402 Protected API',
        description: 'API endpoints protected by x402 payment protocol',
        network: process.env.CASPER_CHAIN_NAME,
        facilitator: process.env.FACILITATOR_URL,
        endpoints: {
            '/protected': {
                method: 'GET',
                price: process.env.DEMO_PRICE_USD || '$0.0001',
                description: 'Protected endpoint requiring payment'
            },
            '/premium': {
                method: 'GET',
                price: '$0.001',
                description: 'Premium endpoint with higher price'
            },
            '/data': {
                method: 'POST',
                price: '$0.0005',
                description: 'Data processing endpoint'
            }
        },
        paymentInfo: {
            protocol: 'x402',
            network: process.env.NETWORK,
            tokenSymbol: process.env.DEMO_TOKEN_SYMBOL || 'CSPR'
        }
    });
});

// Protected endpoints with x402 payment middleware

// Basic protected endpoint
app.get('/protected', 
    x402Middleware.requirePayment({
        price: process.env.DEMO_PRICE_USD || '$0.0001',
        description: 'Access to protected resource'
    }),
    (req, res) => {
        res.json({
            success: true,
            message: 'Welcome to the protected resource!',
            data: {
                timestamp: new Date().toISOString(),
                userPublicKey: req.payment?.userPublicKey,
                paymentAmount: req.payment?.amount,
                accessGranted: true,
                content: {
                    secretData: 'This is protected content that requires payment to access',
                    value: 42,
                    items: ['item1', 'item2', 'item3']
                }
            }
        });
    }
);

// Premium endpoint with higher price
app.get('/premium',
    x402Middleware.requirePayment({
        price: '$0.001',
        description: 'Access to premium features'
    }),
    (req, res) => {
        res.json({
            success: true,
            message: 'Welcome to premium features!',
            data: {
                timestamp: new Date().toISOString(),
                userPublicKey: req.payment?.userPublicKey,
                paymentAmount: req.payment?.amount,
                premiumContent: {
                    advancedData: 'This is premium content with advanced features',
                    analytics: {
                        views: 1234,
                        users: 567,
                        revenue: '$89.12'
                    },
                    features: [
                        'Advanced analytics',
                        'Priority support',
                        'Custom integrations',
                        'Real-time data'
                    ]
                }
            }
        });
    }
);

// Data processing endpoint
app.post('/data',
    x402Middleware.requirePayment({
        price: '$0.0005',
        description: 'Data processing service'
    }),
    (req, res) => {
        const { data } = req.body;
        
        // Simulate data processing
        const processedData = {
            originalData: data,
            processed: true,
            timestamp: new Date().toISOString(),
            processingTime: Math.random() * 1000,
            results: {
                itemCount: Array.isArray(data) ? data.length : 1,
                dataType: typeof data,
                hash: require('crypto').createHash('sha256').update(JSON.stringify(data)).digest('hex').substring(0, 16)
            }
        };
        
        res.json({
            success: true,
            message: 'Data processed successfully',
            data: processedData,
            payment: {
                userPublicKey: req.payment?.userPublicKey,
                amount: req.payment?.amount,
                timestamp: req.payment?.timestamp
            }
        });
    }
);

// Batch endpoint for multiple operations
app.post('/batch',
    x402Middleware.requirePayment({
        price: '$0.002',
        description: 'Batch processing service'
    }),
    (req, res) => {
        const { operations } = req.body;
        
        if (!Array.isArray(operations)) {
            return res.status(400).json({
                success: false,
                error: 'Operations must be an array'
            });
        }
        
        // Process each operation
        const results = operations.map((op, index) => ({
            index,
            operation: op,
            result: `Processed operation ${index + 1}`,
            timestamp: new Date().toISOString()
        }));
        
        res.json({
            success: true,
            message: `Processed ${operations.length} operations`,
            data: {
                results,
                totalOperations: operations.length,
                processingTime: Math.random() * 2000
            },
            payment: {
                userPublicKey: req.payment?.userPublicKey,
                amount: req.payment?.amount
            }
        });
    }
);

// Streaming endpoint (simulated)
app.get('/stream',
    x402Middleware.requirePayment({
        price: '$0.0002',
        description: 'Real-time data stream'
    }),
    (req, res) => {
        res.writeHead(200, {
            'Content-Type': 'text/plain',
            'Transfer-Encoding': 'chunked'
        });
        
        let counter = 0;
        const interval = setInterval(() => {
            const data = {
                timestamp: new Date().toISOString(),
                counter: ++counter,
                randomValue: Math.random(),
                userPublicKey: req.payment?.userPublicKey
            };
            
            res.write(`data: ${JSON.stringify(data)}\n\n`);
            
            if (counter >= 10) {
                clearInterval(interval);
                res.end();
            }
        }, 1000);
        
        req.on('close', () => {
            clearInterval(interval);
        });
    }
);

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    
    // Don't expose internal errors in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Internal server error',
        ...(isDevelopment && { stack: error.stack })
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        availableEndpoints: [
            'GET /health',
            'GET /info',
            'GET /protected',
            'GET /premium',
            'POST /data',
            'POST /batch',
            'GET /stream'
        ]
    });
});

// Start server
const server = app.listen(PORT, HOST, () => {
    console.log('🔒 Casper x402 Protected API Started');
    console.log('====================================');
    console.log(`📍 Server: http://${HOST}:${PORT}`);
    console.log(`🌐 Network: ${process.env.CASPER_CHAIN_NAME}`);
    console.log(`💰 Facilitator: ${process.env.FACILITATOR_URL}`);
    console.log(`💵 Demo Price: ${process.env.DEMO_PRICE_USD || '$0.0001'}`);
    console.log('');
    console.log('🔓 Unprotected Endpoints:');
    console.log(`   GET  /health - Health check`);
    console.log(`   GET  /info - API information`);
    console.log('');
    console.log('🔒 Protected Endpoints (require payment):');
    console.log(`   GET  /protected - Basic protected resource (${process.env.DEMO_PRICE_USD || '$0.0001'})`);
    console.log(`   GET  /premium - Premium features ($0.001)`);
    console.log(`   POST /data - Data processing ($0.0005)`);
    console.log(`   POST /batch - Batch processing ($0.002)`);
    console.log(`   GET  /stream - Real-time stream ($0.0002)`);
    console.log('');
    console.log('✅ Ready to serve protected content!');
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