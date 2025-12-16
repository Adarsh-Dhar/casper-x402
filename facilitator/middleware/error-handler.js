/**
 * Comprehensive error handling middleware
 */

/**
 * Custom error class for application errors
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Error types for consistent error handling
 */
const ErrorTypes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    CONVERSION_ERROR: 'CONVERSION_ERROR',
    SIGNATURE_ERROR: 'SIGNATURE_ERROR',
    NONCE_ERROR: 'NONCE_ERROR',
    FACILITATOR_ERROR: 'FACILITATOR_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
};

/**
 * Create standardized error response
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {boolean} isDevelopment - Whether in development mode
 * @returns {Object} - Standardized error response
 */
function createErrorResponse(error, req, isDevelopment = false) {
    const response = {
        success: false,
        error: error.message || 'An error occurred',
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method
    };
    
    // Add error code if available
    if (error.code) {
        response.code = error.code;
    }
    
    // Add stack trace in development
    if (isDevelopment && error.stack) {
        response.stack = error.stack;
    }
    
    // Add request ID if available
    if (req.id) {
        response.requestId = req.id;
    }
    
    return response;
}

/**
 * Log error with appropriate level
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 */
function logError(error, req) {
    const logData = {
        message: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    };
    
    if (error.statusCode >= 500) {
        console.error('Server Error:', logData);
    } else if (error.statusCode >= 400) {
        console.warn('Client Error:', logData);
    } else {
        console.info('Error:', logData);
    }
}

/**
 * Global error handling middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function globalErrorHandler(error, req, res, next) {
    // Log the error
    logError(error, req);
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    let statusCode = 500;
    let errorResponse;
    
    // Handle different error types
    if (error instanceof AppError) {
        statusCode = error.statusCode;
        errorResponse = createErrorResponse(error, req, isDevelopment);
    } else if (error.name === 'ValidationError') {
        statusCode = 400;
        errorResponse = createErrorResponse(
            new AppError(error.message, 400, ErrorTypes.VALIDATION_ERROR),
            req,
            isDevelopment
        );
    } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
        statusCode = 400;
        errorResponse = createErrorResponse(
            new AppError('Invalid JSON in request body', 400, ErrorTypes.VALIDATION_ERROR),
            req,
            isDevelopment
        );
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        statusCode = 503;
        errorResponse = createErrorResponse(
            new AppError('Service temporarily unavailable', 503, ErrorTypes.NETWORK_ERROR),
            req,
            isDevelopment
        );
    } else if (error.code === 'ETIMEDOUT') {
        statusCode = 504;
        errorResponse = createErrorResponse(
            new AppError('Request timeout', 504, ErrorTypes.NETWORK_ERROR),
            req,
            isDevelopment
        );
    } else {
        // Unknown error - don't leak details in production
        const message = isDevelopment ? error.message : 'Internal server error';
        errorResponse = createErrorResponse(
            new AppError(message, 500, ErrorTypes.INTERNAL_ERROR),
            req,
            isDevelopment
        );
    }
    
    // Send error response
    res.status(statusCode).json(errorResponse);
}

/**
 * Async error wrapper for route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Wrapped function that catches async errors
 */
function asyncErrorHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Handle 404 errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function notFoundHandler(req, res, next) {
    const error = new AppError(
        `Endpoint not found: ${req.method} ${req.originalUrl}`,
        404,
        'NOT_FOUND'
    );
    next(error);
}

/**
 * Validation error helper
 * @param {string} message - Error message
 * @param {Array} details - Validation error details
 * @returns {AppError} - Validation error
 */
function createValidationError(message, details = []) {
    const error = new AppError(message, 400, ErrorTypes.VALIDATION_ERROR);
    error.details = details;
    return error;
}

/**
 * Conversion error helper
 * @param {string} message - Error message
 * @param {string} parameter - Parameter that failed conversion
 * @returns {AppError} - Conversion error
 */
function createConversionError(message, parameter) {
    const error = new AppError(message, 422, ErrorTypes.CONVERSION_ERROR);
    error.parameter = parameter;
    return error;
}

/**
 * Security error helper
 * @param {string} message - Error message
 * @param {string} type - Security error type
 * @returns {AppError} - Security error
 */
function createSecurityError(message, type = 'SECURITY_ERROR') {
    return new AppError(message, 401, type);
}

module.exports = {
    AppError,
    ErrorTypes,
    globalErrorHandler,
    asyncErrorHandler,
    notFoundHandler,
    createValidationError,
    createConversionError,
    createSecurityError,
    createErrorResponse,
    logError
};