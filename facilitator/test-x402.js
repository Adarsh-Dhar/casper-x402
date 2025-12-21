/**
 * Test script for x402 transactions
 * This script tests the facilitator's ability to process payment authorizations
 */

const axios = require('axios');
const { CasperClient, CLPublicKey, CLValueBuilder } = require('casper-js-sdk');

// Test configuration
const FACILITATOR_URL = 'http://localhost:3001';
const CONTRACT_HASH = 'hash-937627b2d99b08199fad92f566495f4979e4fa5b8f4ecefba632be9b310c6cbb';

/**
 * Test the facilitator health endpoint
 */
async function testHealth() {
    console.log('🏥 Testing health endpoint...');
    try {
        const response = await axios.get(`${FACILITATOR_URL}/health`);
        console.log('✅ Health check passed:', response.data);
        return true;
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        return false;
    }
}

/**
 * Create a mock x402 settlement request
 */
function createMockSettlementRequest() {
    // Use the facilitator's public key as a mock user public key for testing
    const mockPublicKey = '01682FA591f79eC7dCcaAdBf3a4C11d37b913e224F901730f6AaA1Dd545AE553E7';
    const mockRecipient = 'account-hash-' + '1'.repeat(64); // Mock recipient account hash
    
    // Use current timestamp as nonce (as expected by the security middleware)
    const currentTimestamp = Math.floor(Date.now() / 1000);
    
    const settlementRequest = {
        owner_public_key: mockPublicKey,
        recipient: mockRecipient,
        amount: '1000000000000000000', // 1 token with 18 decimals
        nonce: currentTimestamp,
        deadline: currentTimestamp + 3600, // 1 hour from now
        signature: '1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        chainName: 'casper-test',
        contractHash: CONTRACT_HASH
    };
    
    return settlementRequest;
}

/**
 * Test the settlement endpoint with a mock request
 */
async function testSettlement() {
    console.log('\n💰 Testing settlement endpoint...');
    
    const settlementRequest = createMockSettlementRequest();
    console.log('Settlement request:', {
        owner_public_key: settlementRequest.owner_public_key.substring(0, 20) + '...',
        recipient: settlementRequest.recipient.substring(0, 20) + '...',
        amount: settlementRequest.amount,
        nonce: settlementRequest.nonce,
        deadline: new Date(settlementRequest.deadline * 1000).toISOString()
    });
    
    try {
        const response = await axios.post(`${FACILITATOR_URL}/settle`, settlementRequest, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
        });
        
        console.log('✅ Settlement request processed:', response.data);
        
        if (response.data.deployHash) {
            console.log('📋 Deploy hash:', response.data.deployHash);
            
            // Test the status endpoint
            await testDeployStatus(response.data.deployHash);
        }
        
        return true;
    } catch (error) {
        if (error.response) {
            console.error('❌ Settlement failed:', error.response.data);
        } else {
            console.error('❌ Settlement request failed:', error.message);
        }
        return false;
    }
}

/**
 * Test the deploy status endpoint
 */
async function testDeployStatus(deployHash) {
    console.log('\n📊 Testing deploy status endpoint...');
    
    try {
        const response = await axios.get(`${FACILITATOR_URL}/status/${deployHash}`, {
            timeout: 10000 // 10 second timeout
        });
        
        console.log('✅ Deploy status retrieved:', response.data);
        return true;
    } catch (error) {
        if (error.response) {
            console.error('❌ Status check failed:', error.response.data);
        } else {
            console.error('❌ Status request failed:', error.message);
        }
        return false;
    }
}

/**
 * Test network connectivity to Casper testnet
 */
async function testNetworkConnectivity() {
    console.log('\n🌐 Testing network connectivity...');
    
    try {
        const response = await axios.post('https://node.testnet.casper.network/rpc', {
            jsonrpc: '2.0',
            method: 'info_get_status',
            params: [],
            id: 1
        }, {
            timeout: 10000
        });
        
        if (response.data && response.data.result) {
            console.log('✅ Connected to Casper testnet');
            console.log('   Node version:', response.data.result.api_version);
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Network connectivity failed:', error.message);
        return false;
    }
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('🧪 x402 Transaction Facilitator Test Suite');
    console.log('==========================================\n');
    
    const results = {
        health: false,
        network: false,
        settlement: false
    };
    
    // Test network connectivity first
    results.network = await testNetworkConnectivity();
    
    // Test facilitator health
    results.health = await testHealth();
    
    // Only test settlement if health check passes
    if (results.health) {
        results.settlement = await testSettlement();
    } else {
        console.log('\n⚠️  Skipping settlement test - facilitator not healthy');
    }
    
    // Print summary
    console.log('\n📋 Test Summary:');
    console.log('================');
    console.log(`Network Connectivity: ${results.network ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Facilitator Health: ${results.health ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Settlement Processing: ${results.settlement ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = Object.values(results).every(result => result);
    console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (!allPassed) {
        console.log('\n💡 Troubleshooting:');
        if (!results.network) {
            console.log('   - Check internet connection');
            console.log('   - Verify Casper testnet is accessible');
        }
        if (!results.health) {
            console.log('   - Make sure facilitator service is running on port 3001');
            console.log('   - Check facilitator logs for errors');
        }
        if (!results.settlement) {
            console.log('   - Verify contract hash is correct');
            console.log('   - Check facilitator key permissions');
            console.log('   - Ensure sufficient CSPR balance for gas');
        }
    }
    
    process.exit(allPassed ? 0 : 1);
}

// Handle command line arguments
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log('x402 Transaction Facilitator Test Suite');
        console.log('Usage: node test-x402.js [options]');
        console.log('');
        console.log('Options:');
        console.log('  --help, -h     Show this help message');
        console.log('  --health       Test only health endpoint');
        console.log('  --network      Test only network connectivity');
        console.log('  --settlement   Test only settlement endpoint');
        console.log('');
        console.log('Examples:');
        console.log('  node test-x402.js              # Run all tests');
        console.log('  node test-x402.js --health     # Test health only');
        process.exit(0);
    }
    
    if (args.includes('--health')) {
        testHealth().then(result => process.exit(result ? 0 : 1));
    } else if (args.includes('--network')) {
        testNetworkConnectivity().then(result => process.exit(result ? 0 : 1));
    } else if (args.includes('--settlement')) {
        testSettlement().then(result => process.exit(result ? 0 : 1));
    } else {
        runTests();
    }
}

module.exports = {
    testHealth,
    testSettlement,
    testDeployStatus,
    testNetworkConnectivity,
    createMockSettlementRequest
};