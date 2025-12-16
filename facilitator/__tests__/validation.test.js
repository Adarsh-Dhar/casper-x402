/**
 * Property-based tests for request validation
 */

const request = require('supertest');
const fc = require('fast-check');
const { app } = require('../server');

describe('Request Validation', () => {
    
    /**
     * Feature: transaction-relay-server, Property 2: Required field validation
     * For any HTTP request to /settle endpoint, the server should accept only 
     * requests that contain all required fields (owner_public_key, amount, nonce, signature)
     * Validates: Requirements 1.2
     */
    test('Property 2: Required field validation', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generator for requests with all required fields
                fc.record({
                    owner_public_key: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => '01' + s.slice(2)),
                    amount: fc.bigUintN(64).map(n => n.toString()),
                    nonce: fc.nat(),
                    signature: fc.hexaString({ minLength: 64, maxLength: 128 })
                }),
                async (completeRequest) => {
                    const response = await request(app)
                        .post('/settle')
                        .send(completeRequest)
                        .expect('Content-Type', /json/);
                    
                    // Should not fail due to missing fields (may fail for other reasons)
                    if (response.status === 400) {
                        expect(response.body.error).not.toBe('Missing required fields');
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: transaction-relay-server, Property 3: Malformed request rejection
     * For any malformed or incomplete settlement request, the server should 
     * reject it and return an appropriate error response
     * Validates: Requirements 1.3
     */
    test('Property 3: Malformed request rejection', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generator for incomplete requests (missing at least one field)
                fc.oneof(
                    // Missing owner_public_key
                    fc.record({
                        amount: fc.bigUintN(64).map(n => n.toString()),
                        nonce: fc.nat(),
                        signature: fc.hexaString({ minLength: 64, maxLength: 128 })
                    }),
                    // Missing amount
                    fc.record({
                        owner_public_key: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => '01' + s.slice(2)),
                        nonce: fc.nat(),
                        signature: fc.hexaString({ minLength: 64, maxLength: 128 })
                    }),
                    // Missing nonce
                    fc.record({
                        owner_public_key: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => '01' + s.slice(2)),
                        amount: fc.bigUintN(64).map(n => n.toString()),
                        signature: fc.hexaString({ minLength: 64, maxLength: 128 })
                    }),
                    // Missing signature
                    fc.record({
                        owner_public_key: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => '01' + s.slice(2)),
                        amount: fc.bigUintN(64).map(n => n.toString()),
                        nonce: fc.nat()
                    }),
                    // Empty object
                    fc.constant({})
                ),
                async (incompleteRequest) => {
                    const response = await request(app)
                        .post('/settle')
                        .send(incompleteRequest)
                        .expect('Content-Type', /json/);
                    
                    // Should reject incomplete requests
                    expect(response.status).toBe(400);
                    expect(response.body.success).toBe(false);
                    expect(response.body.error).toBe('Missing required fields');
                    expect(response.body.details).toBeInstanceOf(Array);
                    expect(response.body.details.length).toBeGreaterThan(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('Invalid field formats are rejected', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.oneof(
                    // Invalid owner_public_key format
                    fc.record({
                        owner_public_key: fc.oneof(
                            fc.string().filter(s => !/^0[12][0-9a-fA-F]{64}$/.test(s)),
                            fc.integer(),
                            fc.constant(null)
                        ),
                        amount: fc.bigUintN(64).map(n => n.toString()),
                        nonce: fc.nat(),
                        signature: fc.hexaString({ minLength: 64, maxLength: 128 })
                    }),
                    // Invalid amount format
                    fc.record({
                        owner_public_key: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => '01' + s.slice(2)),
                        amount: fc.oneof(
                            fc.string().filter(s => !/^\d+$/.test(s) || s === '0'),
                            fc.integer(),
                            fc.constant(null)
                        ),
                        nonce: fc.nat(),
                        signature: fc.hexaString({ minLength: 64, maxLength: 128 })
                    }),
                    // Invalid nonce format
                    fc.record({
                        owner_public_key: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => '01' + s.slice(2)),
                        amount: fc.bigUintN(64).map(n => n.toString()),
                        nonce: fc.oneof(
                            fc.string(),
                            fc.float(),
                            fc.integer().filter(n => n < 0)
                        ),
                        signature: fc.hexaString({ minLength: 64, maxLength: 128 })
                    }),
                    // Invalid signature format
                    fc.record({
                        owner_public_key: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => '01' + s.slice(2)),
                        amount: fc.bigUintN(64).map(n => n.toString()),
                        nonce: fc.nat(),
                        signature: fc.oneof(
                            fc.string().filter(s => !/^[0-9a-fA-F]+$/.test(s) || s.length < 64),
                            fc.integer(),
                            fc.constant('')
                        )
                    })
                ),
                async (invalidRequest) => {
                    const response = await request(app)
                        .post('/settle')
                        .send(invalidRequest)
                        .expect('Content-Type', /json/);
                    
                    // Should reject invalid formats
                    expect([400, 422]).toContain(response.status);
                    expect(response.body.success).toBe(false);
                    expect(response.body).toHaveProperty('error');
                }
            ),
            { numRuns: 50 }
        );
    });

    test('Input sanitization removes dangerous content', async () => {
        const maliciousRequest = {
            owner_public_key: '01' + '0'.repeat(64) + '<script>alert("xss")</script>',
            amount: '1000\0\x01',
            nonce: 0,
            signature: 'abc123<script>alert("xss")</script>' + '0'.repeat(58)
        };

        const response = await request(app)
            .post('/settle')
            .send(maliciousRequest)
            .expect('Content-Type', /json/);

        // Should sanitize the input (may still fail validation due to format)
        if (response.body.receivedData) {
            expect(response.body.receivedData.owner_public_key).not.toContain('<script>');
            expect(response.body.receivedData.amount).not.toContain('\0');
            expect(response.body.receivedData.signature).not.toContain('<script>');
        }
    });
});