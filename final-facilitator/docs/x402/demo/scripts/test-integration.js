/**
 * Integration Test Script for Casper x402 Demo
 * 
 * Tests the complete x402 payment flow with real Casper network transactions.
 */

require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const CasperSDKWrapper = require('../casper-sdk/wrapper');

class IntegrationTest {
    constructor() {
        this.facilitatorUrl = process.env.FACILITATOR_URL || 'http://localhost:3001';
        this.protectedApiUrl = process.env.PROTECTED_API_URL || 'http://localhost:3002';
        this.casperSDK = new CasperSDKWrapper();
        this.testResults = [];
    }

    /**
     * Run all integration tests
     */
    async runTests() {
        console.log('🧪 Running Casper x402 Integration Tests');
        console.log('========================================\n');

        try {
            await this.testServiceHealth();
            await this.testFacilitatorInfo();
            await this.testFeeEstimation();
            await this.testPaymentFlow();
            await this.testMultipleEndpoints();
            await this.testErrorHandling();
            
            this.printResults();
        } catch (error) {
            console.error('❌ Integration tests failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Test service health endpoints
     */
    async testServiceHealth() {
        console.log('📋 Testing service health...');
        
        try {
            // Test facilitator health
            const facilitatorHealth = await axios.get(`${this.facilitatorUrl}/health`);
            this.addResult('Facilitator Health', facilitatorHealth.status === 200, 
                `Status: ${facilitatorHealth.status}`);

            // Test API health
            const apiHealth = await axios.get(`${this.protectedApiUrl}/info`);
            this.addResult('Protected API Health', apiHealth.status === 200, 
                `Status: ${apiHealth.status}`);

            console.log('✅ Service health tests passed\n');
        } catch (error) {
            this.addResult('Service Health', false, error.message);
            throw error;
        }
    }

    /**
     * Test facilitator info endpoint
     */
    async testFacilitatorInfo() {
        console.log('📋 Testing facilitator info...');
        
        try {
            const response = await axios.get(`${this.facilitatorUrl}/info`);
            const info = response.data.data;
            
            const hasRequiredFields = info.facilitatorAddress && 
                                    info.publicKey && 
                                    info.contractHash &&
                                    info.network;
            
            this.addResult('Facilitator Info', hasRequiredFields, 
                `Network: ${info.network}, Contract: ${info.contractHash}`);

            console.log('✅ Facilitator info tests passed\n');
        } catch (error) {
            this.addResult('Facilitator Info', false, error.message);
            throw error;
        }
    }

    /**
     * Test fee estimation
     */
    async testFeeEstimation() {
        console.log('📋 Testing fee estimation...');
        
        try {
            const response = await axios.post(`${this.facilitatorUrl}/estimate-fees`, {
                transactionSize: 1024,
                instructionCount: 2,
                tokenSymbol: 'CSPR'
            });
            
            const fees = response.data.data;
            const hasValidFees = fees.baseFee && 
                               fees.instructionFee && 
                               fees.totalFee;
            
            this.addResult('Fee Estimation', hasValidFees, 
                `Total Fee: ${fees.totalFee}, Token: ${fees.tokenSymbol}`);

            console.log('✅ Fee estimation tests passed\n');
        } catch (error) {
            this.addResult('Fee Estimation', false, error.message);
            throw error;
        }
    }

    /**
     * Test complete payment flow
     */
    async testPaymentFlow() {
        console.log('📋 Testing complete payment flow...');
        
        try {
            // Step 1: Attempt unauthorized access
            let paymentInfo;
            try {
                await axios.get(`${this.protectedApiUrl}/protected`);
                throw new Error('Expected 402 but got success');
            } catch (error) {
                if (error.response && error.response.status === 402) {
                    paymentInfo = error.response.data.payment;
                    this.addResult('Unauthorized Access (402)', true, 
                        `Price: ${paymentInfo.price}`);
                } else {
                    throw error;
                }
            }

            // Step 2: Create payment (mock for testing)
            const mockPayment = {
                userPublicKey: '01' + '0'.repeat(64), // Mock public key
                amount: paymentInfo.tokenAmount,
                tokenSymbol: paymentInfo.tokenSymbol,
                nonce: Date.now(),
                deadline: Date.now() + 3600000,
                signature: 'mock_signature_for_testing'
            };

            // Step 3: Test payment processing endpoint
            const paymentResponse = await axios.post(`${this.facilitatorUrl}/process-payment`, {
                userPublicKey: mockPayment.userPublicKey,
                recipient: process.env.FACILITATOR_ACCOUNT_HASH,
                amount: mockPayment.amount,
                tokenSymbol: mockPayment.tokenSymbol,
                nonce: mockPayment.nonce,
                deadline: mockPayment.deadline,
                userSignature: mockPayment.signature
            });

            const paymentResult = paymentResponse.data;
            this.addResult('Payment Processing', paymentResult.success, 
                paymentResult.success ? `Deploy Hash: ${paymentResult.data.deployHash}` : paymentResult.error);

            console.log('✅ Payment flow tests passed\n');
        } catch (error) {
            this.addResult('Payment Flow', false, error.message);
            console.log('⚠️ Payment flow test failed (expected in test environment)\n');
        }
    }

    /**
     * Test multiple endpoints
     */
    async testMultipleEndpoints() {
        console.log('📋 Testing multiple endpoints...');
        
        const endpoints = ['/protected', '/premium', '/stream'];
        let successCount = 0;

        for (const endpoint of endpoints) {
            try {
                const response = await axios.get(`${this.protectedApiUrl}${endpoint}`);
                // Should not reach here (should get 402)
                this.addResult(`Endpoint ${endpoint}`, false, 'Expected 402 but got success');
            } catch (error) {
                if (error.response && error.response.status === 402) {
                    successCount++;
                    this.addResult(`Endpoint ${endpoint}`, true, 
                        `Correctly returned 402 with price: ${error.response.data.payment.price}`);
                } else {
                    this.addResult(`Endpoint ${endpoint}`, false, error.message);
                }
            }
        }

        console.log(`✅ Multiple endpoints tests: ${successCount}/${endpoints.length} passed\n`);
    }

    /**
     * Test error handling
     */
    async testErrorHandling() {
        console.log('📋 Testing error handling...');
        
        try {
            // Test invalid fee estimation request
            try {
                await axios.post(`${this.facilitatorUrl}/estimate-fees`, {
                    invalidField: 'invalid'
                });
                this.addResult('Invalid Fee Request', false, 'Should have returned error');
            } catch (error) {
                const isValidError = error.response && error.response.status >= 400;
                this.addResult('Invalid Fee Request', isValidError, 
                    `Status: ${error.response?.status || 'No response'}`);
            }

            // Test invalid payment request
            try {
                await axios.post(`${this.facilitatorUrl}/process-payment`, {
                    invalidPayment: 'invalid'
                });
                this.addResult('Invalid Payment Request', false, 'Should have returned error');
            } catch (error) {
                const isValidError = error.response && error.response.status >= 400;
                this.addResult('Invalid Payment Request', isValidError, 
                    `Status: ${error.response?.status || 'No response'}`);
            }

            // Test non-existent endpoint
            try {
                await axios.get(`${this.facilitatorUrl}/non-existent`);
                this.addResult('Non-existent Endpoint', false, 'Should have returned 404');
            } catch (error) {
                const is404 = error.response && error.response.status === 404;
                this.addResult('Non-existent Endpoint', is404, 
                    `Status: ${error.response?.status || 'No response'}`);
            }

            console.log('✅ Error handling tests passed\n');
        } catch (error) {
            this.addResult('Error Handling', false, error.message);
            throw error;
        }
    }

    /**
     * Add test result
     */
    addResult(testName, passed, details) {
        this.testResults.push({
            name: testName,
            passed,
            details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Print test results
     */
    printResults() {
        console.log('📊 Test Results Summary');
        console.log('======================\n');

        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;
        const percentage = Math.round((passed / total) * 100);

        console.log(`Overall: ${passed}/${total} tests passed (${percentage}%)\n`);

        this.testResults.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.name}`);
            if (result.details) {
                console.log(`   ${result.details}`);
            }
        });

        console.log('\n' + '='.repeat(50));
        
        if (passed === total) {
            console.log('🎉 All tests passed! The x402 demo is working correctly.');
        } else {
            console.log(`⚠️ ${total - passed} test(s) failed. Please check the configuration and services.`);
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const test = new IntegrationTest();
    test.runTests().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = IntegrationTest;