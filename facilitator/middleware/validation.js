/**
 * Validation middleware for settlement requests
 */

/**
 * Validate settlement request fields
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateSettlementRequest(req, res, next) {
    const { owner_public_key, amount, nonce, signature } = req.body;
    const errors = [];

    // Check required fields presence
    if (!owner_public_key) {
        errors.push('owner_public_key is required');
    }
    if (!amount) {
        errors.push('amount is required');
    }
    if (nonce === undefined || nonce === null) {
        errors.push('nonce is required');
    }
    if (!signature) {
        errors.push('signature is required');
    }

    // If any required fields are missing, return early
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            details: errors
        });
    }

    // Validate field formats
    try {
        // Validate owner_public_key format (hex string, should start with 01 or 02)
        if (typeof owner_public_key !== 'string') {
            errors.push('owner_public_key must be a string');
        } else if (!/^0[12][0-9a-fA-F]{64}$/.test(owner_public_key)) {
            errors.push('owner_public_key must be a valid 66-character hex string starting with 01 or 02');
        }

        // Validate amount format (should be a numeric string)
        if (typeof amount !== 'string') {
            errors.push('amount must be a string');
        } else if (!/^\d+$/.test(amount)) {
            errors.push('amount must be a numeric string');
        } else if (amount === '0') {
            errors.push('amount must be greater than 0');
        }

        // Validate nonce format (should be a non-negative integer)
        if (!Number.isInteger(nonce) || nonce < 0) {
            errors.push('nonce must be a non-negative integer');
        }

        // Validate signature format (hex string)
        if (typeof signature !== 'string') {
            errors.push('signature must be a string');
        } else if (!/^[0-9a-fA-F]+$/.test(signature)) {
            errors.push('signature must be a valid hex string');
        } else if (signature.length < 64) {
            errors.push('signature must be at least 64 characters long');
        }

    } catch (error) {
        errors.push(`Validation error: ${error.message}`);
    }

    // If validation errors exist, return them
    if (errors.length > 0) {
        return res.status(422).json({
            success: false,
            error: 'Invalid field format',
            details: errors
        });
    }

    // Validation passed, continue to next middleware
    next();
}

/**
 * Sanitize input to prevent injection attacks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function sanitizeInput(req, res, next) {
    if (req.body) {
        // Sanitize string fields by removing potentially dangerous characters
        const sanitizeString = (str) => {
            if (typeof str !== 'string') return str;
            
            // Remove null bytes, control characters, and script tags
            return str
                .replace(/\0/g, '') // null bytes
                .replace(/[\x00-\x1F\x7F]/g, '') // control characters
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // script tags
                .trim();
        };

        // Sanitize each field
        if (req.body.owner_public_key) {
            req.body.owner_public_key = sanitizeString(req.body.owner_public_key);
        }
        if (req.body.amount) {
            req.body.amount = sanitizeString(req.body.amount);
        }
        if (req.body.signature) {
            req.body.signature = sanitizeString(req.body.signature);
        }
    }

    next();
}

module.exports = {
    validateSettlementRequest,
    sanitizeInput
};