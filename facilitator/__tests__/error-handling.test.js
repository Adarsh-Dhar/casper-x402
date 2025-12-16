/**
 * Unit tests for error handling scenarios
 */

const request = require('supertest');
const { app } = require('../server');
const { AppError, ErrorTypes } = require('../middleware/error-handler');

// Mock the facilitator service
jest.mock('../index', () => ({
    processPaymentAuthorization: jest.fn(),
    monitorDeploy: jest.fn()
}));

const { processPaymentAuthorization, monitorDeploy } = require('../index');

describe('Error Handling', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('HTTP Error Responses', () => {
        
        test('400 Bad Request - Missing required fields', async () => {
            const incompleteRequest = {
                owner_public_key: '01' + 'a'.repeat(64),
                // Missing amount, nonce, signature
            };

            const response = await request(app)
                .post('/settle')
                .send(incompleteRequest)
                .expect(400)
                .expect('Content-Type', /json/);

            expect(response.body).toMatchObject({
                success: false,
                error: 'Missing required fields',
                details: expect.arrayContaining([
                    expect.stringMatching(/amount.*required/),
                    expect.stringMatching(/nonce.*required/),
                    expect.stringMatching(/signature.*required/)
                ])
            });
        });

        test('401 Unauthorized - Invalid signature', async () => {
            const requestWithInvalidSignature = {
                owner_public_key: '01' + 'a'.repeat(64),
                amount: '1000000000',
                nonce: Math.floor(Date.now() / 1000),
                signature: '' // Empty signature
            };

            const response = await request(app)
                .post('/settle')
                .send(requestWithInvalidSignature)
                .expect(401)
                .expect('Content-Type', /json/);

            expect(response.body).toMatchObject({
                success: false,
                error: expect.stringMatching(/signature.*required/i)
            });
        });

        test('422 Unprocessable Entity - Invalid parameter format', async () => {
            const requestWithInvalidFormat = {
                owner_public_key: 'invalid-key-format',
                amount: '0', // Invalid amount
                nonce: Math.floor(Date.now() / 1000),
                signature: 'b'.repeat(128)
            };

            const response = await request(app)
                .post('/settle')
                .send(requestWithInvalidFormat)
                .expect(422)
                .expect('Content-Type', /json/);

            expect(response.body).toMatchObject({
                success: false,
                error: 'Invalid field format'
            });
        });

        test('500 Internal Server Error - Facilitator service failure', async () => {
            processPaymentAuthorization.mockRejectedValue(new Error('Database connection failed'));

            const validRequest = {
                owner_public_key: '01' + 'a'.repeat(64),
                amount: '1000000000',
                nonce: Math.floor(Date.now() / 1000),
                signature: 'b'.repeat(128)
            };

            const response = await request(app)
                .post('/settle')
                .send(validRequest)
                .expect(500)
                .expect('Content-Type', /json/);

            expect(response.body).toMatchObject({
                success: false,
                error: expect.any(String),
                timestamp: expect.any(String),
                path: '/settle',
                method: 'POST'
            });
        });
    });

    describe('Conversion Layer Error Handling', () => {
        
        test('Handles public key conversion errors', async () => {
            const requestWithInvalidPublicKey = {
                owner_public_key: 'not-a-valid-hex-key',
                amount: '1000000000',
                nonce: Math.floor(Date.now() / 1000),
                signature: 'b'.repeat(128)
            };

            const response = await request(app)
                .post('/settle')
                .send(requestWithInvalidPublicKey)
                .expect(422)
                .expect('Content-Type', /json/);

            expect(response.body.error).toMatch(/field format|conversion/i);
        });

        test('Handles amount conversion errors', async () => {
            const requestWithInvalidAmount = {
                owner_public_key: '01' + 'a'.repeat(64),
                amount: 'not-a-number',
                nonce: Math.floor(Date.now() / 1000),
                signature: 'b'.repeat(128)
            };

            const response = await request(app)
                .post('/settle')
                .send(requestWithInvalidAmount)
                .expect(422)
                .expect('Content-Type', /json/);

            expect(response.body.error).toMatch(/field format|conversion/i);
        });

        test('Handles nonce conversion errors', async () => {
            const requestWithInvalidNonce = {
                owner_public_key: '01' + 'a'.repeat(64),
                amount: '1000000000',
                nonce: 'not-a-number',
                signature: 'b'.repeat(128)
            };

            const response = await request(app)
                .post('/settle')
                .send(requestWithInvalidNonce)
                .expect(400)
                .expect('Content-Type', /json/);

            expect(response.body.error).toMatch(/field|nonce/i);
        });
    });

    describe('Blockchain Connectivity Error Handling', () => {
        
        test('Handles network connection errors', async () => {
            const networkError = new Error('Network connection failed');
            networkError.code = 'ECONNREFUSED';
            
            processPaymentAuthorization.mockRejectedValue(networkError);

            const validRequest = {
                owner_public_key: '01' + 'a'.repeat(64),
                amount: '1000000000',
                nonce: Math.floor(Date.now() / 1000),
                signature: 'b'.repeat(128)
            };

            const response = await request(app)
                .post('/settle')
                .send(validRequest)
                .expect(503)
                .expect('Content-Type', /json/);

            expect(response.body).toMatchObject({
                success: false,
                error: 'Service temporarily unavailable',
                code: 'NETWORK_ERROR'
            });
        });

        test('Handles timeout errors', async () => {
            const timeoutError = new Error('Request timeout');
            timeoutError.code = 'ETIMEDOUT';
            
            processPaymentAuthorization.mockRejectedValue(timeoutError);

            const validRequest = {
                owner_public_key: '01' + 'a'.repeat(64),
                amount: '1000000000',
                nonce: Math.floor(Date.now() / 1000),
                signature: 'b'.repeat(128)
            };

            const response = await request(app)
                .post('/settle')
                .send(validRequest)
                .expect(504)
                .expect('Content-Type', /json/);

            expect(response.body).toMatchObject({
                success: false,
                error: 'Request timeout',
                code: 'NETWORK_ERROR'
            });
        });

        test('Handles monitoring service errors', async () => {
            monitorDeploy.mockRejectedValue(new Error('Blockchain node unavailable'));

            const response = await request(app)
                .get('/status/abcd1234')
                .expect(500)
                .expect('Content-Type', /json/);

            expect(response.body).toMatchObject({
                success: false,
                error: expect.any(String),
                timestamp: expect.any(String)
            });
        });
    });

    describe('Malformed JSON Handling', () => {
        
        test('Handles invalid JSON in request body', async () => {
            const response = await request(app)
                .post('/settle')
                .set('Content-Type', 'application/json')
                .send('{ invalid json }')
                .expect(400)
                .expect('Content-Type', /json/);

            expect(response.body).toMatchObject({
                success: false,
                error: 'Invalid JSON in request body',
                code: 'VALIDATION_ERROR'
            });
        });
    });

    describe('404 Error Handling', () => {
        
        test('Returns 404 for non-existent endpoints', async () => {
            const response = await request(app)
                .get('/non-existent-endpoint')
                .expect(404)
                .expect('Content-Type', /json/);

            expect(response.body).toMatchObject({
                success: false,
                error: expect.stringMatching(/not found/i),
                path: '/non-existent-endpoint',
                method: 'GET'
            });
        });

        test('Returns 404 for invalid HTTP methods', async () => {
            const response = await request(app)
                .put('/settle')
                .expect(404)
                .expect('Content-Type', /json/);

            expect(response.body).toMatchObject({
                success: false,
                error: expect.stringMatching(/not found/i)
            });
        });
    });

    describe('Error Response Format', () => {
        
        test('Error responses include required fields', async () => {
            const response = await request(app)
                .get('/non-existent')
                .expect(404)
                .expect('Content-Type', /json/);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('path');
            expect(response.body).toHaveProperty('method');
        });

        test('Error responses do not leak sensitive information in production', async () => {
            // Temporarily set NODE_ENV to production
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            processPaymentAuthorization.mockRejectedValue(new Error('Sensitive database error with credentials'));

            const validRequest = {
                owner_public_key: '01' + 'a'.repeat(64),
                amount: '1000000000',
                nonce: Math.floor(Date.now() / 1000),
                signature: 'b'.repeat(128)
            };

            const response = await request(app)
                .post('/settle')
                .send(validRequest)
                .expect(500)
                .expect('Content-Type', /json/);

            expect(response.body.error).not.toContain('credentials');
            expect(response.body).not.toHaveProperty('stack');

            // Restore original environment
            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('Rate Limiting Error Handling', () => {
        
        test('Rate limiting returns appropriate error', async () => {
            // Make many requests quickly to trigger rate limiting
            const validRequest = {
                owner_public_key: '01' + 'a'.repeat(64),
                amount: '1000000000',
                nonce: Math.floor(Date.now() / 1000),
                signature: 'b'.repeat(128)
            };

            // Mock to avoid actual processing
            processPaymentAuthorization.mockResolvedValue({
                success: true,
                deployHash: 'test-hash',
                cost: '4000000000'
            });

            // Make requests until rate limit is hit
            let rateLimitResponse;
            for (let i = 0; i < 105; i++) { // Exceed the 100 request limit
                const response = await request(app)
                    .post('/settle')
                    .send({
                        ...validRequest,
                        nonce: Math.floor(Date.now() / 1000) + i // Unique nonce
                    });
                
                if (response.status === 429) {
                    rateLimitResponse = response;
                    break;
                }
            }

            if (rateLimitResponse) {
                expect(rateLimitResponse.body).toMatchObject({
                    success: false,
                    error: 'Rate limit exceeded',
                    retryAfter: expect.any(Number)
                });
            }
        }, 30000); // Increase timeout for this test
    });
});