/**
 * Facilitator Service Status Check
 */

const axios = require('axios');

const FACILITATOR_URL = 'http://localhost:3001';

async function checkStatus() {
    console.log('🔍 Facilitator Service Status Check');
    console.log('===================================\n');
    
    try {
        const response = await axios.get(`${FACILITATOR_URL}/health`);
        const health = response.data;
        
        console.log('✅ Service Status: RUNNING');
        console.log(`📍 URL: ${FACILITATOR_URL}`);
        console.log(`🕐 Uptime: ${Math.floor(health.uptime)} seconds`);
        console.log(`🌐 Network: ${health.config.casperNode}`);
        console.log(`⛓️  Chain: ${health.config.chainName}`);
        console.log(`🔒 Rate Limit: ${health.config.rateLimitMax} requests/window`);
        console.log(`📦 Version: ${health.version}`);
        console.log(`🏗️  Environment: ${health.environment}`);
        
        console.log('\n📡 Available Endpoints:');
        console.log(`   GET  ${FACILITATOR_URL}/health`);
        console.log(`   POST ${FACILITATOR_URL}/settle`);
        console.log(`   GET  ${FACILITATOR_URL}/status/:deployHash`);
        
        console.log('\n🎯 Ready for x402 Transactions!');
        console.log('\n💡 Next Steps:');
        console.log('   1. Fund facilitator account with testnet CSPR');
        console.log('   2. Connect your frontend to POST /settle endpoint');
        console.log('   3. Submit x402 payment authorizations');
        
    } catch (error) {
        console.log('❌ Service Status: NOT RUNNING');
        console.log(`   Error: ${error.message}`);
        console.log('\n💡 To start the service:');
        console.log('   cd facilitator && npm start');
    }
}

checkStatus();