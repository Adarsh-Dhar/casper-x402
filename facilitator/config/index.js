/**
 * Server configuration management
 */

const fs = require('fs');
const path = require('path');

/**
 * Load and validate environment configuration
 * @returns {Object} - Configuration object
 */
function loadConfig() {
    const config = {
        // Server configuration
        port: parseInt(process.env.PORT) || 3001,
        nodeEnv: process.env.NODE_ENV || 'development',
        host: process.env.HOST || '0.0.0.0',
        
        // Security configuration
        allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
        rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || (15 * 60 * 1000),
        
        // Casper network configuration
        nodeAddress: process.env.CASPER_NODE_ADDRESS || 'http://136.243.187.84:7777',
        chainName: process.env.CASPER_CHAIN_NAME || 'casper-test',
        contractHash: process.env.CONTRACT_HASH || 'hash-YOUR-CONTRACT-HASH',
        
        // Facilitator configuration
        facilitatorKeyPath: process.env.FACILITATOR_KEY_PATH || './keys/facilitator-secret.pem',
        gasPayment: process.env.GAS_PAYMENT || '2500000000',
        
        // Monitoring configuration
        deployTimeoutMs: parseInt(process.env.DEPLOY_TIMEOUT_MS) || (5 * 60 * 1000),
        deployCheckIntervalMs: parseInt(process.env.DEPLOY_CHECK_INTERVAL_MS) || 5000,
        
        // Logging configuration
        logLevel: process.env.LOG_LEVEL || 'info',
        enableAccessLogs: process.env.ENABLE_ACCESS_LOGS !== 'false',
        
        // Health check configuration
        healthCheckPath: process.env.HEALTH_CHECK_PATH || '/health',
        
        // Request configuration
        requestSizeLimit: process.env.REQUEST_SIZE_LIMIT || '10mb',
        requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS) || 30000
    };
    
    return config;
}

/**
 * Validate configuration
 * @param {Object} config - Configuration object
 * @returns {Object} - Validation result
 */
function validateConfig(config) {
    const errors = [];
    const warnings = [];
    
    // Validate required configuration
    if (!config.port || config.port < 1 || config.port > 65535) {
        errors.push('Invalid port number');
    }
    
    if (!config.nodeAddress || !config.nodeAddress.startsWith('http')) {
        errors.push('Invalid Casper node address');
    }
    
    if (!config.chainName) {
        errors.push('Casper chain name is required');
    }
    
    if (config.contractHash === 'hash-YOUR-CONTRACT-HASH') {
        warnings.push('Contract hash appears to be placeholder - update for production');
    }
    
    // Validate facilitator key file
    try {
        const keyPath = path.resolve(config.facilitatorKeyPath);
        if (!fs.existsSync(keyPath)) {
            errors.push(`Facilitator key file not found: ${keyPath}`);
        } else {
            const keyContent = fs.readFileSync(keyPath, 'utf8');
            if (!keyContent.includes('BEGIN PRIVATE KEY') && !keyContent.includes('BEGIN EC PRIVATE KEY')) {
                warnings.push('Facilitator key file format may be invalid');
            }
        }
    } catch (error) {
        errors.push(`Error reading facilitator key file: ${error.message}`);
    }
    
    // Validate numeric values
    if (config.gasPayment && isNaN(parseInt(config.gasPayment))) {
        errors.push('Gas payment must be a valid number');
    }
    
    if (config.rateLimitMax < 1) {
        warnings.push('Rate limit max is very low - may block legitimate requests');
    }
    
    // Environment-specific validations
    if (config.nodeEnv === 'production') {
        if (config.allowedOrigins === '*') {
            warnings.push('CORS allows all origins in production - consider restricting');
        }
        
        if (config.logLevel === 'debug') {
            warnings.push('Debug logging enabled in production');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Get configuration with validation
 * @returns {Object} - Configuration object with validation
 */
function getConfig() {
    const config = loadConfig();
    const validation = validateConfig(config);
    
    return {
        ...config,
        validation
    };
}

/**
 * Print configuration summary
 * @param {Object} config - Configuration object
 */
function printConfigSummary(config) {
    console.log('🔧 Server Configuration:');
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   Host: ${config.host}`);
    console.log(`   Casper Node: ${config.nodeAddress}`);
    console.log(`   Chain: ${config.chainName}`);
    console.log(`   Rate Limit: ${config.rateLimitMax} requests per ${config.rateLimitWindowMs / 1000}s`);
    
    if (config.validation.warnings.length > 0) {
        console.log('⚠️  Configuration Warnings:');
        config.validation.warnings.forEach(warning => {
            console.log(`   - ${warning}`);
        });
    }
    
    if (config.validation.errors.length > 0) {
        console.log('❌ Configuration Errors:');
        config.validation.errors.forEach(error => {
            console.log(`   - ${error}`);
        });
    }
}

/**
 * Create default environment file
 * @param {string} filePath - Path to create .env file
 */
function createDefaultEnvFile(filePath = '.env') {
    const defaultEnv = `# Transaction Relay Server Configuration

# Server Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# Security Configuration
ALLOWED_ORIGINS=*
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000

# Casper Network Configuration
CASPER_NODE_ADDRESS=http://136.243.187.84:7777
CASPER_CHAIN_NAME=casper-test
CONTRACT_HASH=hash-YOUR-CONTRACT-HASH

# Facilitator Configuration
FACILITATOR_KEY_PATH=./keys/facilitator-secret.pem
GAS_PAYMENT=2500000000

# Monitoring Configuration
DEPLOY_TIMEOUT_MS=300000
DEPLOY_CHECK_INTERVAL_MS=5000

# Logging Configuration
LOG_LEVEL=info
ENABLE_ACCESS_LOGS=true

# Request Configuration
REQUEST_SIZE_LIMIT=10mb
REQUEST_TIMEOUT_MS=30000
`;
    
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, defaultEnv);
            console.log(`✅ Created default environment file: ${filePath}`);
        } else {
            console.log(`ℹ️  Environment file already exists: ${filePath}`);
        }
    } catch (error) {
        console.error(`❌ Failed to create environment file: ${error.message}`);
    }
}

module.exports = {
    loadConfig,
    validateConfig,
    getConfig,
    printConfigSummary,
    createDefaultEnvFile
};