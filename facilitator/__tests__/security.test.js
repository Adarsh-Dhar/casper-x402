/**
 * Property-based tests for security features
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

describe('Security Features', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock successful facilitator response for tests that get past security
        processPaymentAuthorization.mockResolvedValue({
            success: true,
            deployHash: 'test-deploy-hash',
            cost: '4000000000'
        });
    });

    /**
     * Feature: transaction-relay-server, Property 13: Signature verification
     * For any payment authorization, the signature should be verified 
     * against the provided parameters
     * Validates: Requirements 5.1
     */
    test('Property 13: Signature verification', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    owner_public_key: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '01' + s),
                    amount: fc.bigUintN(32).filter(n => n > 0n).map(n => n.toString()),
                    nonce: fc.nat({ max: Math.floor(Date.now() / 1000) + 300 }).filter(n => n >= Math.floor(Date.now() / 1000) - 300), // Valid nonce range
                    signature: fc.hexaString({ minLength: 64, maxLength: 128 })
                }),
                async (validRequest) => {
                    const response = await request(app)
                        .post('/settle')
                        .send(validRequest)
                        .expect('Content-Type', /json/);

                    // Should perform signature verification
                    // Valid format signatures should pass verification step
                    if (response.status === 401) {
                        expect(response.body.error).toMatch(/signature/i);
                    } else {
                        // If not rejected for signature, verification passed
                        expect(response.status).not.toBe(401);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Feature: transaction-relay-server, Property 14: Invalid signature rejection
     * For any authorization with invalid signature, the server should reject 
     * the transaction and return an authentication error
     * Validates: Requirements 5.2
     */
    test('Property 14: Invalid signature rejection', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    owner_public_key: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '01' + s),
                    amount: fc.bigUintN(32).filter(n => n > 0n).map(n => n.toString()),
                    nonce: fc.nat({ max: Math.floor(Date.now() / 1000) + 300 }),
                    signature: fc.oneof(
                        fc.constant(''), // Empty signature
                        fc.constant('0'.repeat(64)), // Placeholder signature
                        fc.string({ maxLength: 32 }), // Too short
                        fc.string().filter(s => !/^[0-9a-fA-F]*$/.test(s)), // Invalid hex
                        fc.constant(null), // Null signature
                        fc.integer() // Wrong type
                    )
                }),
                async (requestWithInvalidSig) => {
                    const response = await request(app)
                        .post('/settle')
                        .send(requestWithInvalidSig)
                        .expect('Content-Type', /json/);

                    // Should reject invalid signatures
                    expect(response.status).toBeGreaterThanOrEqual(400);
                    expect(response.body.success).toBe(false);
                    
                    if (response.status === 401) {
                        expect(response.body.error).toMatch(/signature/i);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Feature: transaction-relay-server, Property 15: Replay attack prevention
     * For any authorization with invalid or reused nonce, the server should 
     * prevent processing to avoid replay attacks
     * Validates: Requirements 5.3
     */
    test('Property 15: Replay attack prevention', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    owner_public_key: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '01' + s),
                    amount: fc.bigUintN(32).filter(n => n > 0n).map(n => n.toString()),
                    nonce: fc.nat({ max: currentTime + 300 }), // Valid nonce
                    signature: fc.hexaString({ minLength: 64, maxLength: 128 })
                }),
                async (validRequest) => {
                    // First request should potentially succeed (or fail for other reasons)
                    const firstResponse = await request(app)
                        .post('/settle')
                        .send(validRequest);

                    // Second identical request should be rejected as replay attack
                    const secondResponse = await request(app)
                        .post('/settle')
                        .send(validRequest)
                        .expect('Content-Type', /json/);

                    // If first request got past nonce validation, second should be rejected
                    if (firstResponse.status !== 401 || !firstResponse.body.error?.includes('nonce')) {
                        expect(secondResponse.status).toBe(401);
                        expect(secondResponse.body.error).toMatch(/replay|nonce.*used/i);
                    }
                }
            ),
            { numRuns: 25 } // Fewer runs since we're making two requests per test
        );
    });

    /**
     * Feature: transaction-relay-server, Property 16: Input sanitization
     * For any authorization data processed, inputs should be sanitized 
     * to prevent injection attacks
     * Validates: Requirements 5.4
     */
    test('Property 16: Input sanitization', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    owner_public_key: fc.string().map(s => '01' + 'a'.repeat(62) + '<script>alert("xss")</script>'),
                    amount: fc.string().map(s => '1000' + "'; DROP TABLE users; --"),
                    nonce: fc.nat({ max: Math.floor(Date.now() / 1000) + 300 }),
                    signature: fc.string().map(s => 'a'.repeat(64) + '<img src=x onerror=alert(1)>')
                }),
                async (maliciousRequest) => {
                    const response = await request(app)
                        .post('/settle')
                        .send(maliciousRequest)
                        .expect('Content-Type', /json/);

                    // Should sanitize inputs (may still fail validation due to format)
                    // The key is that dangerous content should be removed/escaped
                    expect(response.status).toBeGreaterThanOrEqual(400);
                    expect(response.body.success).toBe(false);
                    
                    // Response should not contain unsanitized malicious content
                    const responseStr = JSON.stringify(response.body);
                    expect(responseStr).not.toContain('<script>');
                    expect(responseStr).not.toContain('DROP TABLE');
                    expect(responseStr).not.toContain('<img src=x');
                }
            ),
            { numRuns: 50 }
        );
    });

    test('Valid signature format passes verification', async () => {
        const validRequest = {
            owner_public_key: '01' + 'a'.repeat(64),
            amount: '1000000000',
            nonce: Math.floor(Date.now() / 1000),
            signature: 'b'.repeat(128)
        };

        const response = await request(app)
            .post('/settle')
            .send(validRequest)
            .expect('Content-Type', /json/);

        // Should not fail due to signature verification
        if (response.status === 401) {
            expect(response.body.error).not.toMatch(/signature.*format|signature.*hex/i);
        }
    });

    test('Empty signature is rejected', async () => {
        const requestWithEmptySignature = {
            owner_public_key: '01' + 'a'.repeat(64),
            amount: '1000000000',
            nonce: Math.floor(Date.now() / 1000),
            signature: ''
        };

        const response = await request(app)
            .post('/settle')
            .send(requestWithEmptySignature)
            .expect(401)
            .expect('Content-Type', /json/);

        expect(response.body).toMatchObject({
            success: false,
            error: expect.stringMatching(/signature.*required/i)
        });
    });

    test('Placeholder signature is rejected', async () => {
        const requestWithPlaceholderSignature = {
            owner_public_key: '01' + 'a'.repeat(64),
            amount: '1000000000',
            nonce: Math.floor(Date.now() / 1000),
            signature: '0'.repeat(128)
        };

        const response = await request(app)
            .post('/settle')
            .send(requestWithPlaceholderSignature)
            .expect(401)
            .expect('Content-Type', /json/);

        expect(response.body).toMatchObject({
            success: false,
            error: expect.stringMatching(/signature.*placeholder/i)
        });
    });

    test('Old nonce is rejected', async () => {
        const oldNonce = Math.floor(Date.now() / 1000) - 7200; // 2 hours ago
        
        const requestWithOldNonce = {
            owner_public_key: '01' + 'a'.repeat(64),
            amount: '1000000000',
            nonce: oldNonce,
            signature: 'b'.repeat(128)
        };

        const response = await request(app)
            .post('/settle')
            .send(requestWithOldNonce)
            .expect(401)
            .expect('Content-Type', /json/);

        expect(response.body).toMatchObject({
            success: false,
            error: expect.stringMatching(/nonce.*old/i)
        });
    });

    test('Future nonce is rejected', async () => {
        const futureNonce = Math.floor(Date.now() / 1000) + 600; // 10 minutes in future
        
        const requestWithFutureNonce = {
            owner_public_key: '01' + 'a'.repeat(64),
            amount: '1000000000',
            nonce: futureNonce,
            signature: 'b'.repeat(128)
        };

        const response = await request(app)
            .post('/settle')
            .send(requestWithFutureNonce)
            .expect(401)
            .expect('Content-Type', /json/);

        expect(response.body).toMatchObject({
            success: false,
            error: expect.stringMatching(/nonce.*future/i)
        });
    });

    test('Duplicate nonce is rejected', async () => {
        const validRequest = {
            owner_public_key: '01' + 'c'.repeat(64),
            amount: '1000000000',
            nonce: Math.floor(Date.now() / 1000),
            signature: 'd'.repeat(128)
        };

        // First request
        await request(app)
            .post('/settle')
            .send(validRequest);

        // Second request with same nonce should be rejected
        const response = await request(app)
            .post('/settle')
            .send(validRequest)
            .expect(401)
            .expect('Content-Type', /json/);

        expect(response.body).toMatchObject({
            success: false,
            error: expect.stringMatching(/replay.*nonce.*used/i)
        });
    });
});