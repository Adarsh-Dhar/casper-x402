/**
 * Integration tests for the complete transaction relay server
 */

const request = require('supertest');
const { app } = require('../server');

// Mock the facilitator service
jest.mock('../index', () => ({
    processPaymentAuthorization: jest.fn(),
    monitorDeploy: jest.fn()
}));

const { processPaymentAuthorization, monitorDeploy } = require('../index');

describe('Transaction Relay Server Integration', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Complete settlement flow works end-to-end', async () => {
        // Mock successful facilitator response
        processPaymentAuthorization.mockResolvedValue({
            success: true,
            deployHash: 'integration-test-deploy-hash',
            cost: '4000000000'
        });

        const validRequest = {
            owner_public_key: '01' + 'a'.repeat(64),
            amount: '1000000000',
            nonce: Math.floor(Date.now() / 1000),
            signature: 'b'.repeat(128)
        };

        // 1. Submit settlement request
        const settlementResponse = await request(app)
            .post('/settle')
            .send(validRequest)
            .expect(200)
            .expect('Content-Type', /json/);

        expect(settlementResponse.body).toMatchObject({
            success: true,
            deployHash: 'integration-test-deploy-hash',
            cost: '4000000000',
            message: 'Settlement processed successfully'
        });

        // 2. Monitor the transaction
        monitorDeploy.mockResolvedValue({
            success: true,
            cost: '4000000000',
            result: { Success: { cost: '4000000000' } }
        });

        const monitoringResponse = await request(app)
            .get(`/status/${settlementResponse.body.deployHash}`)
            .expect(200)
            .expect('Content-Type', /json/);

        expect(monitoringResponse.body).toMatchObject({
            success: true,
            deployHash: 'integration-test-deploy-hash',
            status: 'completed',
            cost: '4000000000'
        });

        // Verify facilitator was called correctly
        expect(processPaymentAuthorization).toHaveBeenCalledWith(
            expect.objectContaining({
                userPublicKey: validRequest.owner_public_key,
                amount: validRequest.amount,
                nonce: validRequest.nonce,
                signature: validRequest.signature
            })
        );

        expect(monitorDeploy).toHaveBeenCalledWith('integration-test-deploy-hash');
    });

    test('Error handling works across the entire flow', async () => {
        // Mock facilitator failure
        processPaymentAuthorization.mockResolvedValue({
            success: false,
            error: 'Insufficient balance for transaction'
        });

        const validRequest = {
            owner_public_key: '01' + 'c'.repeat(64),
            amount: '1000000000',
            nonce: Math.floor(Date.now() / 1000),
            signature: 'd'.repeat(128)
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
        expect(typeof response.body.processingTimeMs).toBe('number');
    });

    test('Health check provides comprehensive system status', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200)
            .expect('Content-Type', /json/);

        expect(response.body).toMatchObject({
            status: 'ok',
            service: 'transaction-relay-server',
            timestamp: expect.any(String),
            uptime: expect.any(Number),
            environment: 'test'
        });

        expect(response.body).toHaveProperty('config');
        expect(response.body.config).toHaveProperty('casperNode');
        expect(response.body.config).toHaveProperty('chainName');
        expect(response.body.config).toHaveProperty('rateLimitMax');
    });

    test('Server handles multiple concurrent requests', async () => {
        // Mock successful responses
        processPaymentAuthorization.mockResolvedValue({
            success: true,
            deployHash: 'concurrent-test-hash',
            cost: '4000000000'
        });

        const requests = [];
        for (let i = 0; i < 5; i++) {
            const validRequest = {
                owner_public_key: '01' + i.toString().repeat(64),
                amount: '1000000000',
                nonce: Math.floor(Date.now() / 1000) + i,
                signature: i.toString().repeat(128)
            };

            requests.push(
                request(app)
                    .post('/settle')
                    .send(validRequest)
            );
        }

        const responses = await Promise.all(requests);

        // All requests should succeed
        responses.forEach(response => {
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        // Facilitator should have been called for each request
        expect(processPaymentAuthorization).toHaveBeenCalledTimes(5);
    });

    test('Validation pipeline works correctly', async () => {
        const testCases = [
            {
                name: 'Missing required field',
                request: {
                    owner_public_key: '01' + 'a'.repeat(64),
                    amount: '1000000000',
                    // Missing nonce and signature
                },
                expectedStatus: 400,
                expectedError: /missing required fields/i
            },
            {
                name: 'Invalid field format',
                request: {
                    owner_public_key: 'invalid-key',
                    amount: '1000000000',
                    nonce: Math.floor(Date.now() / 1000),
                    signature: 'b'.repeat(128)
                },
                expectedStatus: 422,
                expectedError: /invalid field format/i
            },
            {
                name: 'Invalid signature',
                request: {
                    owner_public_key: '01' + 'a'.repeat(64),
                    amount: '1000000000',
                    nonce: Math.floor(Date.now() / 1000),
                    signature: '' // Empty signature
                },
                expectedStatus: 401,
                expectedError: /signature.*required/i
            }
        ];

        for (const testCase of testCases) {
            const response = await request(app)
                .post('/settle')
                .send(testCase.request)
                .expect(testCase.expectedStatus)
                .expect('Content-Type', /json/);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toMatch(testCase.expectedError);
        }
    });

    test('Server provides consistent API responses', async () => {
        // Test that all endpoints return consistent response format
        const endpoints = [
            { method: 'get', path: '/health', expectedStatus: 200 },
            { method: 'get', path: '/nonexistent', expectedStatus: 404 },
            { method: 'get', path: '/status/invalid-hash', expectedStatus: 400 }
        ];

        for (const endpoint of endpoints) {
            const response = await request(app)[endpoint.method](endpoint.path);
            
            expect(response.status).toBe(endpoint.expectedStatus);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.body).toHaveProperty('success');
            
            if (endpoint.expectedStatus >= 400) {
                expect(response.body.success).toBe(false);
                expect(response.body).toHaveProperty('error');
            }
        }
    });
});