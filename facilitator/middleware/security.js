/**
 * Security middleware for signature verification and replay attack prevention
 */

// In-memory nonce tracking (in production, use Redis or database)
const usedNonces = new Map();

// Cleanup old nonces periodically (older than 1 hour)
setInterval(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [key, timestamp] of usedNonces.entries()) {
        if (timestamp < oneHourAgo) {
            usedNonces.delete(key);
        }
    }
}, 5 * 60 * 1000); // Run cleanup every 5 minutes

/**
 * Verify signature (placeholder implementation)
 * In production, this would use cryptographic verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function verifySignature(req, res, next) {
    const { owner_public_key, amount, nonce, signature } = req.body;
    
    try {
        // Basic signature validation (format check)
        if (!signature || typeof signature !== 'string') {
            return res.status(401).json({
                success: false,
                error: 'Invalid signature: signature is required'
            });
        }
        
        if (signature.length < 64) {
            return res.status(401).json({
                success: false,
                error: 'Invalid signature: signature too short'
            });
        }
        
        if (!/^[0-9a-fA-F]+$/.test(signature)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid signature: signature must be hex string'
            });
        }
        
        // Placeholder for cryptographic verification
        // In production, reconstruct the message and verify signature
        // const message = `${owner_public_key}:${amount}:${nonce}`;
        // const isValid = verifyCryptographicSignature(message, signature, owner_public_key);
        
        // For now, reject empty signatures as a basic check
        if (signature === '0'.repeat(signature.length)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid signature: signature appears to be placeholder'
            });
        }
        
        // Add signature verification result to request for logging
        req.signatureVerified = true;
        
        next();
        
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: `Signature verification failed: ${error.message}`
        });
    }
}

/**
 * Prevent replay attacks through nonce tracking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function preventReplayAttacks(req, res, next) {
    const { owner_public_key, nonce } = req.body;
    
    try {
        // Create unique key for this user's nonce
        const nonceKey = `${owner_public_key}:${nonce}`;
        
        // Check if this nonce has been used before
        if (usedNonces.has(nonceKey)) {
            return res.status(401).json({
                success: false,
                error: 'Replay attack detected: nonce has already been used'
            });
        }
        
        // Validate nonce is reasonable (not too old or too far in future)
        const currentTime = Math.floor(Date.now() / 1000);
        const maxNonceAge = 3600; // 1 hour
        
        // For simplicity, treat nonce as timestamp-based
        // In production, use a more sophisticated nonce scheme
        if (nonce < (currentTime - maxNonceAge)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid nonce: nonce is too old'
            });
        }
        
        if (nonce > (currentTime + 300)) { // 5 minutes in future
            return res.status(401).json({
                success: false,
                error: 'Invalid nonce: nonce is too far in future'
            });
        }
        
        // Mark this nonce as used
        usedNonces.set(nonceKey, Date.now());
        
        // Add nonce validation result to request
        req.nonceValidated = true;
        
        next();
        
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: `Nonce validation failed: ${error.message}`
        });
    }
}

/**
 * Additional input sanitization for security
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function enhancedSanitization(req, res, next) {
    if (req.body) {
        try {
            // Additional sanitization beyond basic validation
            Object.keys(req.body).forEach(key => {
                if (typeof req.body[key] === 'string') {
                    // Remove potential SQL injection patterns
                    req.body[key] = req.body[key]
                        .replace(/['";\\]/g, '') // Remove quotes and backslashes
                        .replace(/\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION)\b/gi, '') // Remove SQL keywords
                        .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
                        .trim();
                }
            });
            
            next();
            
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: `Input sanitization failed: ${error.message}`
            });
        }
    } else {
        next();
    }
}

/**
 * Rate limiting middleware (simple implementation)
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 */
function createRateLimiter(maxRequests = 100, windowMs = 15 * 60 * 1000) {
    const requests = new Map();
    
    // Cleanup old entries
    setInterval(() => {
        const cutoff = Date.now() - windowMs;
        for (const [ip, timestamps] of requests.entries()) {
            const validTimestamps = timestamps.filter(t => t > cutoff);
            if (validTimestamps.length === 0) {
                requests.delete(ip);
            } else {
                requests.set(ip, validTimestamps);
            }
        }
    }, windowMs / 4);
    
    return (req, res, next) => {
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        
        if (!requests.has(clientIp)) {
            requests.set(clientIp, []);
        }
        
        const clientRequests = requests.get(clientIp);
        const recentRequests = clientRequests.filter(t => t > (now - windowMs));
        
        if (recentRequests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
        
        recentRequests.push(now);
        requests.set(clientIp, recentRequests);
        
        next();
    };
}

/**
 * Get nonce statistics (for debugging/monitoring)
 * @returns {Object} - Nonce usage statistics
 */
function getNonceStats() {
    return {
        totalTrackedNonces: usedNonces.size,
        oldestNonce: usedNonces.size > 0 ? Math.min(...usedNonces.values()) : null,
        newestNonce: usedNonces.size > 0 ? Math.max(...usedNonces.values()) : null
    };
}

module.exports = {
    verifySignature,
    preventReplayAttacks,
    enhancedSanitization,
    createRateLimiter,
    getNonceStats
};