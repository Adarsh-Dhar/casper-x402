const { Keys } = require('casper-js-sdk');
const fs = require('fs');

console.log('Available Keys methods:', Object.getOwnPropertyNames(Keys));
console.log('Available Ed25519 methods:', Object.getOwnPropertyNames(Keys.Ed25519));

try {
    const privateKeyPem = fs.readFileSync('./keys/facilitator-secret.pem', 'utf8');
    console.log('Private key content:', privateKeyPem);
    
    // Try different methods
    console.log('\nTrying Keys.Ed25519.parsePrivateKey...');
    try {
        const keyPair1 = Keys.Ed25519.parsePrivateKey(privateKeyPem);
        console.log('Success with parsePrivateKey:', keyPair1);
    } catch (e) {
        console.log('Failed with parsePrivateKey:', e.message);
    }
    
    console.log('\nTrying Keys.Ed25519.loadKeyPairFromPrivateFile...');
    try {
        const keyPair2 = Keys.Ed25519.loadKeyPairFromPrivateFile('./keys/facilitator-secret.pem');
        console.log('Success with loadKeyPairFromPrivateFile:', keyPair2);
    } catch (e) {
        console.log('Failed with loadKeyPairFromPrivateFile:', e.message);
    }
    
} catch (error) {
    console.error('Error:', error.message);
}