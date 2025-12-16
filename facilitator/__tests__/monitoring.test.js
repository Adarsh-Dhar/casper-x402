/**
 * Property-based tests for transaction monitoring
 */

const request = require('supertest');
const fc = require('fast-check');
const { app } = require('../server');

// Mock the facilitator service
jest.mock('../index', () => ({
    processPaymentAuthorization: jest.fn(),
    monitorDeploy: jest.fn()
}));

const { monitorDeploy } = require('../index');

describe('Transaction Monitoring', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * Feature: transaction-relay-server, Property 11: Transaction status monitoring
     * For any deploy hash, the monitoring system should provide current 
     * transaction status information
     * Validates: Requirements 4.2
     */
    test('Property 11: Transaction status monitoring', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.hexaString({ minLength: 32, maxLength: 64 }), // Valid deploy hash
                fc.boolean(), // Success or failure
                async (deployHash, shouldSucceed) => {
                    // Mock monitor response based on shouldSucceed
                    if (shouldSucceed) {
                        monitorDeploy.mockResolvedValue({
                            success: true,
                            cost: '4000000000',
                            result: { Success: { cost: '4000000000' } }
                        });
                    } else {
                        monitorDeploy.mockResolvedValue({
                            success: false,
                            error: 'Deploy execution failed'
                        });
                    }

                    const response = await request(app)
                        .get(`/status/${deployHash}`)
                        .expect('Content-Type', /json/);

                    // Should always provide status information
                    expect(response.body).toHaveProperty('success');
                    expect(response.body).toHaveProperty('deployHash', deployHash);
                    expect(response.body).toHaveProperty('status');
                    expect(response.body).toHaveProperty('monitoringTimeMs');
                    
                    // Status should be one of expected values
                    expect(['completed', 'failed', 'pending', 'unknown']).toContain(response.body.status);
                    
                    if (shouldSucceed && response.status === 200) {
                        expect(response.body.status).toBe('completed');
                        expect(response.body).toHaveProperty('cost');
                    } else if (!shouldSucceed && response.status === 200) {
                        expect(response.body.status).toBe('failed');
                        expect(response.body).toHaveProperty('error');
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    test('Valid deploy hash monitoring returns status', async () => {
        const deployHash = 'a'.repeat(64);
        
        monitorDeploy.mockResolvedValue({
            success: true,
            cost: '3500000000',
            result: { Success: { cost: '3500000000' } }
        });

        const response = await request(app)
            .get(`/status/${deployHash}`)
            .expect(200)
            .expect('Content-Type', /json/);

        expect(response.body).toMatchObject({
            success: true,
            deployHash: deployHash,
            status: 'completed',
            cost: '3500000000'
        });
        
        expect(response.body).toHaveProperty('monitoringTimeMs');
        expect(typeof response.body.monitoringTimeMs).toBe('number');
    });

    test('Failed deploy monitoring returns failure status', async () => {
        const deployHash = 'b'.repeat(64);
        
        monitorDeploy.mockResolvedValue({
            success: false,
            error: 'Insufficient balance'
        });

        const response = await request(app)
            .get(`/status/${deployHash}`)
            .expect(200)
            .expect('Content-Type', /json/);

        expect(response.body).toMatchObject({
            success: true, // Monitoring succeeded, but deploy failed
            deployHash: deployHash,
            status: 'failed',
            error: 'Insufficient balance'
        });
    });

    test('Invalid deploy hash format is rejected', async () => {
        const invalidHashes = [
            'invalid-hash',
            '123',
            'xyz!@#',
            '',
            'g'.repeat(64) // Contains invalid hex character
        ];

        for (const invalidHash of invalidHashes) {
            const response = await request(app)
                .get(`/status/${invalidHash}`)
                .expect(400)
                .expect('Content-Type', /json/);

            expect(response.body).toMatchObject({
                success: false,
                error: expect.stringMatching(/invalid|format/i)
            });
        }
    });

    test('Monitoring timeout is handled gracefully', async () => {
        const deployHash = 'c'.repeat(64);
        
        monitorDeploy.mockRejectedValue(new Error('Deploy monitoring timeout - deploy may still be processing'));

        const response = await request(app)
            .get(`/status/${deployHash}`)
            .expect(202)
            .expect('Content-Type', /json/);

        expect(response.body).toMatchObject({
            success: false,
            deployHash: deployHash,
            status: 'pending',
            error: expect.stringMatching(/timeout/i)
        });
        
        expect(response.body).toHaveProperty('monitoringTimeMs');
    });

    test('Monitoring errors are handled', async () => {
        const deployHash = 'd'.repeat(64);
        
        monitorDeploy.mockRejectedValue(new Error('Network connection failed'));

        const response = await request(app)
            .get(`/status/${deployHash}`)
            .expect(500)
            .expect('Content-Type', /json/);

        expect(response.body).toMatchObject({
            success: false,
            deployHash: deployHash,
            status: 'unknown',
            error: 'Error monitoring deploy status'
        });
    });

    test('Deploy hash parameter validation', async () => {
        // Test missing deploy hash
        const response = await request(app)
            .get('/status/')
            .expect(404); // Should hit 404 handler

        expect(response.body).toMatchObject({
            success: false,
            error: 'Endpoint not found'
        });
    });

    test('Monitoring provides comprehensive status information', async () => {
        const deployHash = 'e'.repeat(64);
        
        monitorDeploy.mockResolvedValue({
            success: true,
            cost: '4200000000',
            result: { 
                Success: { 
                    cost: '4200000000',
                    transfers: ['transfer-hash-123']
                } 
            }
        });

        const response = await request(app)
            .get(`/status/${deployHash}`)
            .expect(200)
            .expect('Content-Type', /json/);

        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('deployHash');
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('cost');
        expect(response.body).toHaveProperty('result');
        expect(response.body).toHaveProperty('monitoringTimeMs');
        
        // Verify monitoring was called with correct hash
        expect(monitorDeploy).toHaveBeenCalledWith(deployHash);
    });
});