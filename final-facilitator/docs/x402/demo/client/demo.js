/**
 * Casper x402 Client Demo
 * 
 * Demonstrates how to interact with x402 protected APIs using the Casper network.
 * Shows the complete flow: attempt access -> receive 402 -> make payment -> retry with payment.
 */

require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const CasperClient = require('./services/casper-client');
const PaymentClient = require('./services/payment-client');

class X402Demo {
    constructor() {
        this.protectedApiUrl = process.env.PROTECTED_API_URL || 'http://localhost:3002';
        this.facilitatorUrl = process.env.FACILITATOR_URL || 'http://localhost:3001';
        this.casperClient = new CasperClient();
        this.paymentClient = new PaymentClient(this.casperClient, this.facilitatorUrl);
    }

    /**
     * Run the complete x402 demo
     */
    async runDemo() {
        console.log('🚀 Casper x402 Payment Protocol Demo');
        console.log('====================================\n');

        try {
            // Step 1: Load payer keys
            console.log('📋 Step 1: Loading payer credentials...');
            await this.casperClient.loadPayerKeys();
            const payerInfo = this.casperClient.getPayerInfo();
            console.log(`✅ Payer loaded: ${payerInfo.accountHash}`);
            console.log(`   Public Key: ${payerInfo.publicKey}\n`);

            // Step 2: Check API info
            console.log('📋 Step 2: Checking protected API info...');
            const apiInfo = await this.getApiInfo();
            console.log(`✅ API Info retrieved:`);
            console.log(`   Service: ${apiInfo.service}`);
            console.log(`   Network: ${apiInfo.network}`);
            console.log(`   Facilitator: ${apiInfo.facilitator}`);
            console.log(`   Available endpoints: ${Object.keys(apiInfo.endpoints).length}\n`);

            // Step 3: Attempt to access protected endpoint (should get 402)
            console.log('📋 Step 3: Attempting to access protected endpoint...');
            const unauthorizedResponse = await this.attemptUnauthorizedAccess('/protected');
            console.log(`❌ Access denied with status: ${unauthorizedResponse.status}`);
            console.log(`   Error: ${unauthorizedResponse.data.error}`);
            console.log(`   Payment required: ${unauthorizedResponse.data.payment.price}\n`);

            // Step 4: Process payment and retry
            console.log('📋 Step 4: Processing payment and retrying...');
            const paymentInfo = unauthorizedResponse.data.payment;
            const accessResponse = await this.accessWithPayment('/protected', paymentInfo);
            console.log(`✅ Access granted with status: ${accessResponse.status}`);
            console.log(`   Message: ${accessResponse.data.message}`);
            console.log(`   Content received: ${JSON.stringify(accessResponse.data.data.content, null, 2)}\n`);

            // Step 5: Test multiple endpoints
            console.log('📋 Step 5: Testing multiple protected endpoints...');
            await this.testMultipleEndpoints();

            // Step 6: Test data processing endpoint
            console.log('📋 Step 6: Testing data processing endpoint...');
            await this.testDataProcessing();

            console.log('🎉 Demo completed successfully!');
            console.log('\nSummary:');
            console.log('- Successfully loaded Casper wallet credentials');
            console.log('- Demonstrated x402 payment protocol flow');
            console.log('- Accessed multiple protected endpoints');
            console.log('- Processed payments through Casper facilitator');
            console.log('- Received protected content after payment');

        } catch (error) {
            console.error('❌ Demo failed:', error.message);
            if (error.response) {
                console.error('   Response:', error.response.data);
            }
            process.exit(1);
        }
    }

    /**
     * Get API information
     */
    async getApiInfo() {
        try {
            const response = await axios.get(`${this.protectedApiUrl}/info`);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get API info: ${error.message}`);
        }
    }

    /**
     * Attempt unauthorized access to get payment requirements
     */
    async attemptUnauthorizedAccess(endpoint) {
        try {
            const response = await axios.get(`${this.protectedApiUrl}${endpoint}`);
            throw new Error('Expected 402 but got success response');
        } catch (error) {
            if (error.response && error.response.status === 402) {
                return error.response;
            }
            throw error;
        }
    }

    /**
     * Access endpoint with payment
     */
    async accessWithPayment(endpoint, paymentInfo) {
        try {
            // Create payment
            console.log('   💰 Creating payment...');
            const payment = await this.paymentClient.createPayment({
                amount: paymentInfo.tokenAmount,
                tokenSymbol: paymentInfo.tokenSymbol,
                endpoint: endpoint,
                description: 'API access payment'
            });
            console.log(`   ✅ Payment created: ${payment.deployHash}`);

            // Create payment header
            const paymentHeader = this.createPaymentHeader(payment);

            // Make request with payment
            console.log('   🔄 Retrying request with payment...');
            const response = await axios.get(`${this.protectedApiUrl}${endpoint}`, {
                headers: {
                    'X-Payment': paymentHeader
                }
            });

            return response;
        } catch (error) {
            throw new Error(`Failed to access with payment: ${error.message}`);
        }
    }

    /**
     * Test multiple endpoints
     */
    async testMultipleEndpoints() {
        const endpoints = [
            { path: '/premium', method: 'GET' },
            { path: '/stream', method: 'GET' }
        ];

        for (const endpoint of endpoints) {
            try {
                console.log(`   Testing ${endpoint.method} ${endpoint.path}...`);
                
                // Get payment requirements
                const unauthorizedResponse = await this.attemptUnauthorizedAccess(endpoint.path);
                const paymentInfo = unauthorizedResponse.data.payment;
                
                // Access with payment
                const response = await this.accessWithPayment(endpoint.path, paymentInfo);
                console.log(`   ✅ ${endpoint.path}: ${response.status} - ${response.data.message}`);
                
            } catch (error) {
                console.log(`   ❌ ${endpoint.path}: ${error.message}`);
            }
        }
        console.log();
    }

    /**
     * Test data processing endpoint
     */
    async testDataProcessing() {
        try {
            const testData = {
                items: ['item1', 'item2', 'item3'],
                timestamp: new Date().toISOString(),
                metadata: { source: 'demo', version: '1.0' }
            };

            // Attempt unauthorized access
            try {
                await axios.post(`${this.protectedApiUrl}/data`, { data: testData });
                throw new Error('Expected 402 but got success response');
            } catch (error) {
                if (error.response && error.response.status === 402) {
                    const paymentInfo = error.response.data.payment;
                    console.log(`   💰 Payment required: ${paymentInfo.price}`);

                    // Create payment
                    const payment = await this.paymentClient.createPayment({
                        amount: paymentInfo.tokenAmount,
                        tokenSymbol: paymentInfo.tokenSymbol,
                        endpoint: '/data',
                        description: 'Data processing payment'
                    });

                    // Create payment header
                    const paymentHeader = this.createPaymentHeader(payment);

                    // Retry with payment
                    const response = await axios.post(`${this.protectedApiUrl}/data`, 
                        { data: testData },
                        {
                            headers: {
                                'X-Payment': paymentHeader
                            }
                        }
                    );

                    console.log(`   ✅ Data processed: ${response.data.message}`);
                    console.log(`   📊 Results: ${JSON.stringify(response.data.data.results, null, 2)}`);
                } else {
                    throw error;
                }
            }
        } catch (error) {
            console.log(`   ❌ Data processing failed: ${error.message}`);
        }
        console.log();
    }

    /**
     * Create payment header for HTTP request
     */
    createPaymentHeader(payment) {
        const paymentData = {
            userPublicKey: payment.userPublicKey,
            amount: payment.amount,
            tokenSymbol: payment.tokenSymbol,
            nonce: payment.nonce,
            deadline: payment.deadline,
            signature: payment.signature
        };

        const paymentJson = JSON.stringify(paymentData);
        const paymentBase64 = Buffer.from(paymentJson).toString('base64');
        return `casper ${paymentBase64}`;
    }
}

// Run demo if called directly
if (require.main === module) {
    const demo = new X402Demo();
    demo.runDemo().catch(error => {
        console.error('Demo failed:', error);
        process.exit(1);
    });
}

module.exports = X402Demo;