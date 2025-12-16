/**
 * CLValue conversion utilities for Casper blockchain
 */

const { CLPublicKey, CLValueBuilder } = require('casper-js-sdk');

/**
 * Convert owner_public_key string to CLPublicKey
 * @param {string} publicKeyHex - Hex-encoded public key string
 * @returns {CLPublicKey} - Casper CLPublicKey object
 * @throws {Error} - If conversion fails
 */
function convertPublicKey(publicKeyHex) {
    try {
        if (typeof publicKeyHex !== 'string') {
            throw new Error('Public key must be a string');
        }
        
        if (!/^0[12][0-9a-fA-F]{64}$/.test(publicKeyHex)) {
            throw new Error('Invalid public key format: must be 66-character hex string starting with 01 or 02');
        }

        return CLPublicKey.fromHex(publicKeyHex);
    } catch (error) {
        throw new Error(`Failed to convert public key: ${error.message}`);
    }
}

/**
 * Convert amount string to CLU256
 * @param {string} amountStr - Amount as string
 * @returns {CLValue} - Casper CLU256 value
 * @throws {Error} - If conversion fails
 */
function convertAmount(amountStr) {
    try {
        if (typeof amountStr !== 'string') {
            throw new Error('Amount must be a string');
        }
        
        if (!/^\d+$/.test(amountStr)) {
            throw new Error('Invalid amount format: must be a numeric string');
        }
        
        if (amountStr === '0') {
            throw new Error('Amount must be greater than 0');
        }

        // Check for reasonable bounds to prevent overflow
        if (amountStr.length > 78) { // U256 max is about 78 digits
            throw new Error('Amount too large: exceeds U256 maximum');
        }

        return CLValueBuilder.u256(amountStr);
    } catch (error) {
        throw new Error(`Failed to convert amount: ${error.message}`);
    }
}

/**
 * Convert nonce number to CLU64
 * @param {number} nonceNum - Nonce as number
 * @returns {CLValue} - Casper CLU64 value
 * @throws {Error} - If conversion fails
 */
function convertNonce(nonceNum) {
    try {
        if (!Number.isInteger(nonceNum)) {
            throw new Error('Nonce must be an integer');
        }
        
        if (nonceNum < 0) {
            throw new Error('Nonce must be non-negative');
        }
        
        if (nonceNum > Number.MAX_SAFE_INTEGER) {
            throw new Error('Nonce too large: exceeds safe integer range');
        }

        return CLValueBuilder.u64(nonceNum);
    } catch (error) {
        throw new Error(`Failed to convert nonce: ${error.message}`);
    }
}

/**
 * Convert signature string to CLString
 * @param {string} signatureStr - Signature as hex string
 * @returns {CLValue} - Casper CLString value
 * @throws {Error} - If conversion fails
 */
function convertSignature(signatureStr) {
    try {
        if (typeof signatureStr !== 'string') {
            throw new Error('Signature must be a string');
        }
        
        if (!/^[0-9a-fA-F]+$/.test(signatureStr)) {
            throw new Error('Invalid signature format: must be a hex string');
        }
        
        if (signatureStr.length < 64) {
            throw new Error('Signature too short: must be at least 64 characters');
        }
        
        if (signatureStr.length > 512) { // Reasonable upper bound
            throw new Error('Signature too long: exceeds maximum length');
        }

        return CLValueBuilder.string(signatureStr);
    } catch (error) {
        throw new Error(`Failed to convert signature: ${error.message}`);
    }
}

/**
 * Convert all settlement request parameters to CLValues
 * @param {Object} settlementRequest - Settlement request object
 * @param {string} settlementRequest.owner_public_key - Public key hex string
 * @param {string} settlementRequest.amount - Amount string
 * @param {number} settlementRequest.nonce - Nonce number
 * @param {string} settlementRequest.signature - Signature hex string
 * @returns {Object} - Object with converted CLValues
 * @throws {Error} - If any conversion fails
 */
function convertSettlementRequest(settlementRequest) {
    const { owner_public_key, amount, nonce, signature } = settlementRequest;
    
    try {
        return {
            userPublicKey: convertPublicKey(owner_public_key),
            amount: convertAmount(amount),
            nonce: convertNonce(nonce),
            signature: convertSignature(signature)
        };
    } catch (error) {
        throw new Error(`Settlement request conversion failed: ${error.message}`);
    }
}

/**
 * Validate conversion inputs without actually converting
 * @param {Object} settlementRequest - Settlement request object
 * @returns {Object} - Validation result with success flag and errors
 */
function validateConversionInputs(settlementRequest) {
    const { owner_public_key, amount, nonce, signature } = settlementRequest;
    const errors = [];

    try {
        convertPublicKey(owner_public_key);
    } catch (error) {
        errors.push(`Public key: ${error.message}`);
    }

    try {
        convertAmount(amount);
    } catch (error) {
        errors.push(`Amount: ${error.message}`);
    }

    try {
        convertNonce(nonce);
    } catch (error) {
        errors.push(`Nonce: ${error.message}`);
    }

    try {
        convertSignature(signature);
    } catch (error) {
        errors.push(`Signature: ${error.message}`);
    }

    return {
        success: errors.length === 0,
        errors
    };
}

module.exports = {
    convertPublicKey,
    convertAmount,
    convertNonce,
    convertSignature,
    convertSettlementRequest,
    validateConversionInputs
};