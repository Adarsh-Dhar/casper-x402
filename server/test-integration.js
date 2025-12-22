#!/usr/bin/env node

/**
 * Simple integration test for the Casper X402 server
 */

const SERVER_URL = 'http://localhost:4402';

async function testEndpoint(name, url, options = {}) {
  try {
    console.log(`\n🧪 Testing ${name}...`);
    const response = await fetch(url, options);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));
    console.log(`   Body:`, JSON.stringify(data, null, 2));
    
    return { success: true, status: response.status, data };
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting Casper X402 Integration Tests');
  console.log(`📡 Server URL: ${SERVER_URL}`);
  
  // Test 1: Health check
  await testEndpoint('Health Check', `${SERVER_URL}/health`);
  
  // Test 2: Server info
  await testEndpoint('Server Info', `${SERVER_URL}/api/info`);
  
  // Test 3: Facilitator health (proxy)
  await testEndpoint('Facilitator Health', `${SERVER_URL}/facilitator/health`);
  
  // Test 4: Supported tokens (proxy)
  await testEndpoint('Supported Tokens', `${SERVER_URL}/facilitator/supported-tokens`);
  
  // Test 5: Fee estimation (proxy)
  await testEndpoint('Fee Estimation', `${SERVER_URL}/facilitator/estimate-fees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transaction_size: 250,
      instruction_count: 1,
      uses_lookup_tables: false,
      is_payment_required: true
    })
  });
  
  // Test 6: Protected endpoint without payment (should return 402)
  await testEndpoint('Premium Content (No Payment)', `${SERVER_URL}/api/premium-content`);
  
  // Test 7: Protected endpoint with mock payment
  await testEndpoint('Premium Content (Mock Payment)', `${SERVER_URL}/api/premium-content`, {
    headers: {
      'X-Payment': JSON.stringify({
        transaction_hash: 'mock-hash-123',
        signature: 'mock-signature',
        amount: '1000000000',
        timestamp: Date.now()
      })
    }
  });
  
  console.log('\n✅ Integration tests completed!');
  console.log('\n📝 Notes:');
  console.log('   - Make sure the server is running: npm run dev');
  console.log('   - The facilitator should start automatically');
  console.log('   - Some tests may fail if facilitator is not ready');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests, testEndpoint };