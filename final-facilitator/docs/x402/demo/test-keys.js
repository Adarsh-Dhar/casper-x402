/**
 * Test key generation to verify Casper SDK functionality
 */

const { Keys } = require('casper-js-sdk');
const fs = require('fs');
const path = require('path');

async function testKeyGeneration() {
    console.log('Testing Casper key generation...');
    
    try {
        // Generate a new key pair
        const keyPair = Keys.Ed25519.new();
        console.log('✅ Key pair generated successfully');
        
        // Get public key and account hash
        const publicKey = keyPair.publicKey.toHex();
        const accountHash = keyPair.publicKey.toAccountHashStr();
        
        console.log(`Public Key: ${publicKey}`);
        console.log(`Account Hash: ${accountHash}`);
        
        // Test key export methods
        const keysDir = './keys';
        if (!fs.existsSync(keysDir)) {
            fs.mkdirSync(keysDir, { recursive: true });
        }
        
        // Try different export methods
        try {
            keyPair.exportPublicKeyInPem(`${keysDir}/test-public.pem`);
            console.log('✅ Public key exported successfully');
        } catch (error) {
            console.log('❌ Public key export failed:', error.message);
        }
        
        try {
            keyPair.exportPrivateKeyInPem(`${keysDir}/test-private.pem`);
            console.log('✅ Private key exported successfully');
        } catch (error) {
            console.log('❌ Private key export failed:', error.message);
        }
        
        // Alternative method - write keys manually
        try {
            const publicKeyPem = keyPair.publicKey.toPem();
            const privateKeyPem = keyPair.privateKey.toPem();
            
            fs.writeFileSync(`${keysDir}/manual-public.pem`, publicKeyPem);
            fs.writeFileSync(`${keysDir}/manual-private.pem`, privateKeyPem);
            console.log('✅ Manual key export successful');
        } catch (error) {
            console.log('❌ Manual key export failed:', error.message);
        }
        
        console.log('\n🎉 Key generation test completed!');
        
    } catch (error) {
        console.error('❌ Key generation test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testKeyGeneration();