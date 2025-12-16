/**
 * Adapter for integrating settlement requests with existing facilitator service
 */

const { processPaymentAuthorization } = require('../index');

/**
 * Convert settlement request to payment authorization format
 * @param {Object} settlementRequest - Settlement request from /settle endpoint
 * @param {string} settlementRequest.owner_public_key - User's public key
 * @param {string} settlementRequest.amount - Payment amount
 * @param {number} settlementRequest.nonce - Transaction nonce
 * @param {string} settlementRequest.signature - Payment signature
 * @param {string} recipient - Recipient address (will be added as parameter)
 * @returns {Object} - Payment authorization object for facilitator service
 */
function buildPaymentAuthorization(settlementRequest, recipient = null) {
    const { owner_public_key, amount, nonce, signature } = settlementRequest;
    
    // Calculate deadline (1 hour from now)
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    
    // Use a default recipient if none provided (for testing)
    const defaultRecipient = recipient || 'account-hash-0000000000000000000000000000000000000000000000000000000000000000';
    
    return {
        userPublicKey: owner_public_key,
        recipient: defaultRecipient,
        amount: amount,
        nonce: nonce,
        deadline: deadline,
        signature: signature
    };
}

/**
 * Process settlement request through facilitator service
 * @param {Object} settlementRequest - Settlement request object
 * @param {string} recipient - Optional recipient address
 * @returns {Promise<Object>} - Processing result from facilitator
 */
async function processSettlement(settlementRequest, recipient = null) {
    try {
        // Build payment authorization from settlement request
        const authorization = buildPaymentAuthorization(settlementRequest, recipient);
        
        // Process through existing facilitator service
        const result = await processPaymentAuthorization(authorization);
        
        return {
            success: result.success,
            deployHash: result.deployHash,
            cost: result.cost,
            error: result.error,
            authorization: authorization // Include for debugging
        };
    } catch (error) {
        return {
            success: false,
            error: `Settlement processing failed: ${error.message}`,
            details: error.stack
        };
    }
}

/**
 * Validate that facilitator service is properly configured
 * @returns {Object} - Validation result
 */
function validateFacilitatorConfig() {
    const errors = [];
    
    try {
        // Check if required facilitator functions are available
        if (typeof processPaymentAuthorization !== 'function') {
            errors.push('processPaymentAuthorization function not available');
        }
        
        // Check if facilitator configuration exists
        const fs = require('fs');
        const path = require('path');
        
        // Check for facilitator key file (from CONFIG in index.js)
        const keyPath = './keys/facilitator-secret.pem';
        if (!fs.existsSync(path.resolve(__dirname, '..', keyPath))) {
            errors.push(`Facilitator key file not found at ${keyPath}`);
        }
        
    } catch (error) {
        errors.push(`Configuration validation error: ${error.message}`);
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Extract settlement parameters for logging/debugging
 * @param {Object} settlementRequest - Settlement request object
 * @returns {Object} - Sanitized parameters for logging
 */
function extractSettlementParams(settlementRequest) {
    const { owner_public_key, amount, nonce, signature } = settlementRequest;
    
    return {
        userPublicKey: owner_public_key,
        amount: amount,
        nonce: nonce,
        signatureLength: signature ? signature.length : 0,
        signaturePreview: signature ? signature.substring(0, 8) + '...' : 'none'
    };
}

module.exports = {
    buildPaymentAuthorization,
    processSettlement,
    validateFacilitatorConfig,
    extractSettlementParams
};