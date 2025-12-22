/**
 * Test payment processing to isolate the error
 */

require('dotenv').config();
const CasperService = require('./facilitator/services/casper-service');

async function testPayment() {
    console.log('Testing payment processing...');
    
    try {
        const casperService = new CasperService();
        
        console.log('✅ CasperService created');
        console.log('Contract hash:', casperService.contractHash);
        console.log('Facilitator keys loaded:', !!casperService.facilitatorKeyPair);
        
        // Test payment data
        const paymentData = {
            userPublicKey: "01851581eF945997deED8FCEC38a328452cf73ef42D8fF769fa226A5d89BE70020",
            recipient: "account-hash-26553db654781fdfd912ca5af5e12dac99e9893aa32a7c3e41bc1b6980701f7c",
            amount: "1000000000000000000",
            nonce: 123456,
            deadline: 1766403079,
            userSignature: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
        };
        
        console.log('Testing processPayment...');
        const result = await casperService.processPayment(paymentData);
        
        console.log('✅ Payment processed successfully!');
        console.log('Result:', result);
        
    } catch (error) {
        console.error('❌ Payment processing failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testPayment();