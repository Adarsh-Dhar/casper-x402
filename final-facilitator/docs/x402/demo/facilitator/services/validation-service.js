/**
 * Validation Service
 * 
 * Handles validation of requests and parameters for the x402 facilitator
 */

class ValidationService {
    constructor() {
        this.maxAmount = BigInt('1000000000000000000000'); // 1000 tokens with 18 decimals
        this.minAmount = BigInt('1000000000000000'); // 0.001 tokens with 18 decimals
        this.maxDeadline = 24 * 60 * 60; // 24 hours in seconds
    }

    /**
     * Validate fee estimate request
     */
    validateFeeEstimateRequest(data) {
        const errors = [];
        
        if (data.transactionSize !== undefined) {
            if (!Number.isInteger(data.transactionSize) || data.transactionSize <= 0) {
                errors.push('transactionSize must be a positive integer');
            }
            if (data.transactionSize > 100000) {
                errors.push('transactionSize too large (max 100KB)');
            }
        }
        
        if (data.instructionCount !== undefined) {
            if (!Number.isInteger(data.instructionCount) || data.instructionCount <= 0) {
                errors.push('instructionCount must be a positive integer');
            }
            if (data.instructionCount > 50) {
                errors.push('instructionCount too large (max 50)');
            }
        }
        
        if (data.tokenSymbol !== undefined) {
            if (typeof data.tokenSymbol !== 'string' || data.tokenSymbol.length === 0) {
                errors.push('tokenSymbol must be a non-empty string');
            }
            if (!/^[A-Z]{2,10}$/.test(data.tokenSymbol)) {
                errors.push('tokenSymbol must be 2-10 uppercase letters');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate sign transaction request
     */
    validateSignRequest(data) {
        const errors = [];
        
        // Validate user public key
        if (!data.userPublicKey) {
            errors.push('userPublicKey is required');
        } else if (!this.isValidPublicKey(data.userPublicKey)) {
            errors.push('userPublicKey must be a valid hex string starting with 01 or 02');
        }
        
        // Validate amount
        if (!data.amount) {
            errors.push('amount is required');
        } else if (!this.isValidAmount(data.amount)) {
            errors.push('amount must be a valid positive number string');
        }
        
        // Validate nonce
        if (data.nonce === undefined || data.nonce === null) {
            errors.push('nonce is required');
        } else if (!Number.isInteger(data.nonce) || data.nonce < 0) {
            errors.push('nonce must be a non-negative integer');
        }
        
        // Validate deadline
        if (!data.deadline) {
            errors.push('deadline is required');
        } else if (!this.isValidDeadline(data.deadline)) {
            errors.push('deadline must be a valid future timestamp');
        }
        
        // Validate transaction (optional)
        if (data.transaction !== undefined && typeof data.transaction !== 'string') {
            errors.push('transaction must be a string');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate send transaction request
     */
    validateSendRequest(data) {
        const errors = [];
        
        // Validate signed transaction
        if (!data.signedTransaction) {
            errors.push('signedTransaction is required');
        } else if (typeof data.signedTransaction !== 'string') {
            errors.push('signedTransaction must be a string');
        }
        
        // Validate user signature
        if (!data.userSignature) {
            errors.push('userSignature is required');
        } else if (!this.isValidSignature(data.userSignature)) {
            errors.push('userSignature must be a valid hex string');
        }
        
        // Validate payment proof (optional)
        if (data.paymentProof !== undefined && typeof data.paymentProof !== 'string') {
            errors.push('paymentProof must be a string');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate payment request
     */
    validatePaymentRequest(data) {
        const errors = [];
        
        // Validate user public key
        if (!data.userPublicKey) {
            errors.push('userPublicKey is required');
        } else if (!this.isValidPublicKey(data.userPublicKey)) {
            errors.push('userPublicKey must be a valid hex string starting with 01 or 02');
        }
        
        // Validate recipient (optional, defaults to facilitator)
        if (data.recipient && !this.isValidAccountHash(data.recipient)) {
            errors.push('recipient must be a valid account hash');
        }
        
        // Validate amount
        if (!data.amount) {
            errors.push('amount is required');
        } else if (!this.isValidAmount(data.amount)) {
            errors.push('amount must be a valid positive number string');
        } else if (!this.isAmountInRange(data.amount)) {
            errors.push(`amount must be between ${this.minAmount} and ${this.maxAmount}`);
        }
        
        // Validate token symbol (optional, defaults to CSPR)
        if (data.tokenSymbol && !this.isValidTokenSymbol(data.tokenSymbol)) {
            errors.push('tokenSymbol must be 2-10 uppercase letters');
        }
        
        // Validate nonce
        if (data.nonce === undefined || data.nonce === null) {
            errors.push('nonce is required');
        } else if (!Number.isInteger(data.nonce) || data.nonce < 0) {
            errors.push('nonce must be a non-negative integer');
        }
        
        // Validate deadline
        if (!data.deadline) {
            errors.push('deadline is required');
        } else if (!this.isValidDeadline(data.deadline)) {
            errors.push('deadline must be a valid future timestamp');
        }
        
        // Validate user signature
        if (!data.userSignature) {
            errors.push('userSignature is required');
        } else if (!this.isValidSignature(data.userSignature)) {
            errors.push('userSignature must be a valid hex string');
        }
        
        // Validate metadata (optional)
        if (data.metadata !== undefined) {
            if (typeof data.metadata !== 'object' || data.metadata === null) {
                errors.push('metadata must be an object');
            } else if (JSON.stringify(data.metadata).length > 1000) {
                errors.push('metadata too large (max 1KB)');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Check if public key is valid
     */
    isValidPublicKey(publicKey) {
        return typeof publicKey === 'string' &&
               /^0[12][0-9a-fA-F]{64}$/.test(publicKey);
    }

    /**
     * Check if account hash is valid
     */
    isValidAccountHash(accountHash) {
        return typeof accountHash === 'string' &&
               accountHash.startsWith('account-hash-') &&
               accountHash.length === 77 &&
               /^account-hash-[0-9a-fA-F]{64}$/.test(accountHash);
    }

    /**
     * Check if amount is valid
     */
    isValidAmount(amount) {
        if (typeof amount === 'string') {
            return /^\d+$/.test(amount) && amount !== '0';
        }
        if (typeof amount === 'number') {
            return Number.isInteger(amount) && amount > 0;
        }
        return false;
    }

    /**
     * Check if amount is within acceptable range
     */
    isAmountInRange(amount) {
        try {
            const amountBigInt = BigInt(amount);
            return amountBigInt >= this.minAmount && amountBigInt <= this.maxAmount;
        } catch {
            return false;
        }
    }

    /**
     * Check if token symbol is valid
     */
    isValidTokenSymbol(tokenSymbol) {
        return typeof tokenSymbol === 'string' &&
               /^[A-Z]{2,10}$/.test(tokenSymbol);
    }

    /**
     * Check if deadline is valid
     */
    isValidDeadline(deadline) {
        if (!Number.isInteger(deadline)) {
            return false;
        }
        
        const currentTime = Math.floor(Date.now() / 1000);
        const maxDeadline = currentTime + this.maxDeadline;
        
        return deadline > currentTime && deadline <= maxDeadline;
    }

    /**
     * Check if signature is valid format
     */
    isValidSignature(signature) {
        return typeof signature === 'string' &&
               /^[0-9a-fA-F]+$/.test(signature) &&
               signature.length >= 64;
    }

    /**
     * Check if contract hash is valid
     */
    isValidContractHash(contractHash) {
        return typeof contractHash === 'string' &&
               contractHash.startsWith('hash-') &&
               contractHash.length === 69 &&
               /^hash-[0-9a-fA-F]{64}$/.test(contractHash);
    }

    /**
     * Sanitize string input
     */
    sanitizeString(input) {
        if (typeof input !== 'string') {
            return input;
        }
        
        return input
            .replace(/\0/g, '') // Remove null bytes
            .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
            .trim();
    }

    /**
     * Validate and sanitize request data
     */
    sanitizeRequest(data) {
        const sanitized = {};
        
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeString(value);
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }

    /**
     * Check rate limiting (simple implementation)
     */
    checkRateLimit(clientId, maxRequests = 100, windowMs = 60000) {
        // In production, use Redis or a proper rate limiting solution
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // This is a simplified implementation
        // In practice, you'd track requests per client
        return {
            allowed: true,
            remaining: maxRequests - 1,
            resetTime: now + windowMs
        };
    }
}

module.exports = ValidationService;