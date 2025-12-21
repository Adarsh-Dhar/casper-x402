const { CLPublicKey, CLValueBuilder } = require('casper-js-sdk');

const testKey = '01682FA591f79eC7dCcaAdBf3a4C11d37b913e224F901730f6AaA1Dd545AE553E7';

console.log('Testing public key:', testKey);
console.log('Length:', testKey.length);

try {
    const pubKey = CLPublicKey.fromHex(testKey);
    console.log('✅ CLPublicKey.fromHex succeeded:', pubKey);
    
    try {
        const clValue = CLValueBuilder.publicKey(pubKey);
        console.log('✅ CLValueBuilder.publicKey succeeded:', clValue);
    } catch (e) {
        console.log('❌ CLValueBuilder.publicKey failed:', e.message);
    }
} catch (e) {
    console.log('❌ CLPublicKey.fromHex failed:', e.message);
}

// Try with a different format
const testKey2 = '01682fa591f79ec7dccaadbf3a4c11d37b913e224f901730f6aaa1dd545ae553e7';
console.log('\nTesting lowercase key:', testKey2);
try {
    const pubKey2 = CLPublicKey.fromHex(testKey2);
    console.log('✅ CLPublicKey.fromHex succeeded:', pubKey2);
    
    try {
        const clValue2 = CLValueBuilder.publicKey(pubKey2);
        console.log('✅ CLValueBuilder.publicKey succeeded:', clValue2);
    } catch (e) {
        console.log('❌ CLValueBuilder.publicKey failed:', e.message);
    }
} catch (e) {
    console.log('❌ CLPublicKey.fromHex failed:', e.message);
}