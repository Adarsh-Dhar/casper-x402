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
      fromPublicKey: '0202742321905bbc93ab2bcc0505b207e31180cbae251c48ee95246b44ee832df271',
      toPublicKey: '0203310ba99e2a5f3b9ef21f342e4c9c74560cef7fe0270d164275a855dfe73cda61',
      amount: '100000000' // 2.5 CSPR
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