#!/usr/bin/env node

const fetch = require('node-fetch');

async function testRealTransaction() {
  // console.log('🧪 Testing real Casper transaction...');
  
  const response = await fetch('http://localhost:4402/api/casper/test-real-transaction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fromPublicKey: '0202c9bda7c0da47cf0bbcd9972f8f40be72a81fa146df672c60595ca1807627403e',
      toPublicKey: '02037a9634b3d340f3ea6f7403f95d9698b23fca03623ac94b619a96898b897b0dad',
      amount: '2500000000' // 2.5 CSPR
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    // console.log('✅ Transaction successful!');
    // console.log('   Deploy hash:', result.deployHash);
    // console.log('   Explorer URL:', result.explorerUrl);
  } else {
    // console.log('❌ Transaction failed:', result.error);
  }
}

testRealTransaction().catch(console.error);