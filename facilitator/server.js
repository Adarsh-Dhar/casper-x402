/**
 * Transaction Relay Server
 * Express.js server for relaying payment settlements to Casper blockchain
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { processPaymentAuthorization, monitorDeploy } = require('./index');
const { validateSettlementRequest, sanitizeInput } = require('./middleware/validation');
const { verifySignature, preventReplayAttacks, enhancedSanitization, createRateLimiter } = require('./middleware/security');
const { globalErrorHandler, asyncErrorHandler, notFoundHandler } = require('./middleware/error-handler');
const { validateConversionInputs } = require('./utils/clvalue-converter');
const { processSettlement, extractSettlementParams } = require('./utils/facilitator-adapter');
const { getConfig, printConfigSummary } = require('./config');

// Load and validate configuration
const CONFIG = getConfig();

// Create Express application
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: CONFIG.allowedOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request parsing middleware
app.use(express.json({ limit: CONFIG.requestSizeLimit }));
app.use(express.urlencoded({ extended: true, limit: CONFIG.requestSizeLimit }));

// Logging middleware
if (CONFIG.nodeEnv !== 'test' && CONFIG.enableAccessLogs) {
    app.use(morgan('combined'));
}

// Rate limiting (disabled in test environment)
if (CONFIG.nodeEnv !== 'test') {
    const rateLimiter = createRateLimiter(CONFIG.rateLimitMax, CONFIG.rateLimitWindowMs);
    app.use('/settle', rateLimiter);
}

// Health check endpoint
app.get(CONFIG.healthCheckPath, (req, res) => {
    res.json({
        status: 'ok',
        service: 'transaction-relay-server',
        version: require('./package.json').version || '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: CONFIG.nodeEnv,
        config: {
            casperNode: CONFIG.nodeAddress,
            chainName: CONFIG.chainName,
            rateLimitMax: CONFIG.rateLimitMax
        }
    });
});

// Transaction status monitoring endpoint
app.get('/status/:deployHash', asyncErrorHandler(async (req, res) => {
    const { deployHash } = req.params;
    const startTime = Date.now();
    
    try {
        // Validate deploy hash format
        if (!deployHash || typeof deployHash !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Invalid deploy hash format'
            });
        }
        
        // Basic hex string validation
        if (!/^[a-fA-F0-9-]+$/.test(deployHash)) {
            return res.status(400).json({
                success: false,
                error: 'Deploy hash must be a valid hex string'
            });
        }
        
        console.log(`Monitoring deploy status: ${deployHash}`);
        
        // Monitor deploy using existing facilitator function
        const result = await monitorDeploy(deployHash);
        
        const monitoringTime = Date.now() - startTime;
        console.log(`Deploy monitoring completed in ${monitoringTime}ms:`, {
            success: result.success,
            deployHash: deployHash
        });
        
        res.status(200).json({
            success: true,
            deployHash: deployHash,
            status: result.success ? 'completed' : 'failed',
            cost: result.cost,
            error: result.error,
            result: result.result,
            monitoringTimeMs: monitoringTime
        });
        
    } catch (error) {
        const monitoringTime = Date.now() - startTime;
        console.error('Deploy monitoring error:', error);
        
        // Handle timeout or monitoring errors
        if (error.message.includes('timeout')) {
            res.status(202).json({
                success: false,
                deployHash: deployHash,
                status: 'pending',
                error: 'Deploy monitoring timeout - transaction may still be processing',
                monitoringTimeMs: monitoringTime
            });
        } else {
            // Let global error handler deal with this
            throw error;
        }
    }
}));

// Settlement endpoint
app.post('/settle', 
    sanitizeInput, 
    enhancedSanitization,
    validateSettlementRequest, 
    verifySignature,
    preventReplayAttacks,
    asyncErrorHandler(async (req, res) => {
    const startTime = Date.now();
    
    try {
        console.log('Processing settlement request:', extractSettlementParams(req.body));
        
        // Validate CLValue conversion inputs
        const conversionValidation = validateConversionInputs(req.body);
        if (!conversionValidation.success) {
            return res.status(422).json({
                success: false,
                error: 'Parameter conversion failed',
                details: conversionValidation.errors
            });
        }
        
        // Process settlement through facilitator service
        const result = await processSettlement(req.body);
        
        const processingTime = Date.now() - startTime;
        console.log(`Settlement processing completed in ${processingTime}ms:`, {
            success: result.success,
            deployHash: result.deployHash,
            error: result.error
        });
        
        // Return appropriate response
        if (result.success) {
            res.status(200).json({
                success: true,
                deployHash: result.deployHash,
                cost: result.cost,
                processingTimeMs: processingTime,
                message: 'Settlement processed successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error,
                processingTimeMs: processingTime
            });
        }
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error('Settlement processing error:', error);
        
        // Let global error handler deal with this
        throw error;
    }
}));

// 404 handler
app.use('*', notFoundHandler);

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

// Server startup function
function startServer() {
    // Check configuration before starting (skip in test environment)
    if (!CONFIG.validation.valid && CONFIG.nodeEnv !== 'test') {
        console.error('❌ Configuration validation failed:');
        CONFIG.validation.errors.forEach(error => {
            console.error(`   - ${error}`);
        });
        process.exit(1);
    }
    
    // Print configuration summary
    printConfigSummary(CONFIG);
    
    const server = app.listen(CONFIG.port, CONFIG.host, () => {
        console.log(`🚀 Transaction Relay Server started successfully`);
        console.log(`📍 Server: http://${CONFIG.host}:${CONFIG.port}`);
        console.log(`📊 Health: http://${CONFIG.host}:${CONFIG.port}${CONFIG.healthCheckPath}`);
        console.log(`💰 Settlement: POST http://${CONFIG.host}:${CONFIG.port}/settle`);
        console.log(`📈 Monitoring: GET http://${CONFIG.host}:${CONFIG.port}/status/:deployHash`);
    });

    // Graceful shutdown handling
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

    return server;
}

// Start server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = { app, startServer, CONFIG };