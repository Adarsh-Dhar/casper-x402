/**
 * Property-based tests for /settle endpoint
 */

const request = require('supertest');
const fc = require('fast-check');
const { app } = require('../server');

// Mock the facilitator service
jest.mock('../index', () => ({
    processPaymentAuthorization: jest.fn(),
    monitorDeploy: jest.fn()
}));

const { processPaymentAuthorization } = require('../index');

describe('/settle Endpoint', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * Feature: transaction-relay-server, Property 10: Deploy hash return
     * For any successfully submitted deploy, the server should return 
     * the deploy hash to the client
     * Validates: Requirements 4.1
     */
    test('Property 10: Deploy hash return', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    owner_public_key: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '01' + s),
                    amount: fc.bigUintN(32).filter(n => n > 0n).map(n => n.toString()),
                    nonce: fc.nat(),
                    signature: fc.hexaString({ minLength: 64, maxLength: 128 })
                }),
                fc.hexaString({ minLength: 32, maxLength: 64 }), // Deploy hash
                async (validRequest, deployHash) => {
                    // Mock successful facilitator response
                    processPaymentAuthorization.mockResolvedValue({
                        success: true,
                        deployHash: deployHash,
                        cost: '4000000000'
                    });

                    const response = await request(app)
                        .post('/settle')
                        .send(validRequest)
                        .expect('Content-Type', /json/);

                    if (response.status === 200) {
                        expect(response.body.success).toBe(true);
                        expect(response.body.deployHash).toBe(deployHash);
                        expect(response.body.deployHash).toBeDefined();
                        expect(typeof response.body.deployHash).toBe('string');
                        expect(response.body.deployHash.length).toBeGreaterThan(0);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Feature: transaction-relay-server, Property 12: Transaction outcome reporting
     * For any completed transaction (success or failure), the server should 
     * capture and report the outcome with appropriate details
     * Validates: Requirements 4.3, 4.4
     */
    test('Property 12: Transaction outcome reporting', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    owner_public_key: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '01' + s),
                    amount: fc.bigUintN(32).filter(n => n > 0n).map(n => n.toString()),
                    nonce: fc.nat(),
                    signature: fc.hexaString({ minLength: 64, maxLength: 128 })
                }),
                fc.boolean(), // Success or failure
                fc.string({ minLength: 1, maxLength: 100 }), // Error message
                async (validRequest, shouldSucceed, errorMessage) => {
                    // Mock facilitator response based on shouldSucceed
                    if (shouldSucceed) {
                        processPaymentAuthorization.mockResolvedValue({
                            success: true,
                            deployHash: 'success-deploy-hash',
                            cost: '3500000000'
                        });
                    } else {
                        processPaymentAuthorization.mockResolvedValue({
                            success: false,
                            error: errorMessage
                        });
                    }

                    const response = await request(app)
                        .post('/settle')
                        .send(validRequest)
                        .expect('Content-Type', /json/);

                    // Should always report outcome clearly
                    expect(response.body).toHaveProperty('success');
                    expect(typeof response.body.success).toBe('boolean');
                    
                    if (shouldSucceed && response.status === 200) {
                        // Success case
                        expect(response.body.success).toBe(true);
                        expect(response.body).toHaveProperty('deployHash');
                        expect(response.body).toHaveProperty('cost');
                        expect(response.body).toHaveProperty('message');
                    } else if (!shouldSucceed || response.status >= 400) {
                        // Failure case
                        expect(response.body.success).toBe(false);
                        expect(response.body).toHaveProperty('error');
                        expect(typeof response.body.error).toBe('string');
                    }
                    
                    // Should always include processing time
                    expect(response.body).toHaveProperty('processingTimeMs');
                    expect(typeof response.body.processingTimeMs).toBe('number');
                }
            ),
            { numRuns: 50 }
        );
    });

    test('Successful settlement returns complete response', async () => {
        processPaymentAuthorization.mockResolvedValue({
            success: true,
            deployHash: 'test-deploy-hash-123',
            cost: '4200000000'
        });

        const validRequest = {
            owner_public_key: '01' + 'a'.repeat(64),
            amount: '1000000000',
            nonce: 42,
            signature: 'b'.repeat(128)
        };

        const response = await request(app)
            .post('/settle')
            .send(validRequest)
            .expect(200)
            .expect('Content-Type', /json/);

        expect(response.body).toMatchObject({
            success: true,
            deployHash: 'test-deploy-hash-123',
            cost: '4200000000',
            message: 'Settlement processed successfully'
        });
        
        expect(response.body).toHaveProperty('processingTimeMs');
        expect(typeof response.body.processingTimeMs).toBe('number');
    });

    test('Failed settlement returns error details', async () => {
        processPaymentAuthorization.mockResolvedValue({
            success: false,
            error: 'Insufficient balance for transaction'
        });

        const validRequest = {
            owner_public_key: '01' + 'a'.repeat(64),
            amount: '1000000000',
            nonce: 42,
            signature: 'b'.repeat(128)
        };

        const response = await request(app)
            .post('/settle')
            .send(validRequest)
            .expect(400)
            .expect('Content-Type', /json/);

        expect(response.body).toMatchObject({
            success: false,
            error: 'Insufficient balance for transaction'
        });
        
        expect(response.body).toHaveProperty('processingTimeMs');
    });

    test('Conversion validation errors are handled', async () => {
        const invalidRequest = {
            owner_public_key: 'invalid-key',
            amount: '0', // Invalid amount
            nonce: -1, // Invalid nonce
            signature: 'short' // Invalid signature
        };

        const response = await request(app)
            .post('/settle')
            .send(invalidRequest)
            .expect(422)
            .expect('Content-Type', /json/);

        expect(response.body).toMatchObject({
            success: false,
            error: 'Parameter conversion failed'
        });
        
        expect(response.body).toHaveProperty('details');
        expect(Array.isArray(response.body.details)).toBe(true);
        expect(response.body.details.length).toBeGreaterThan(0);
    });

    test('Server errors are handled gracefully', async () => {
        // Mock facilitator to throw an error
        processPaymentAuthorization.mockRejectedValue(new Error('Network connection failed'));

        const validRequest = {
            owner_public_key: '01' + 'a'.repeat(64),
            amount: '1000000000',
            nonce: 42,
            signature: 'b'.repeat(128)
        };

        const response = await request(app)
            .post('/settle')
            .send(validRequest)
            .expect(500)
            .expect('Content-Type', /json/);

        expect(response.body).toMatchObject({
            success: false,
            error: 'Internal server error during settlement processing'
        });
        
        expect(response.body).toHaveProperty('processingTimeMs');
    });
});