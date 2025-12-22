/**
 * Debug key creation to see what's happening
 */

const { Keys } = require('casper-js-sdk');
const fs = require('fs');

console.log('Testing key creation...');

try {
    const keyPair = Keys.Ed25519.new();
    console.log('✅ Key pair created');
    
    console.log('Public key:', keyPair.publicKey.toHex());
    console.log('Account hash:', keyPair.publicKey.toAccountHashStr());
    
    // Test export methods
    console.log('\nTesting export methods...');
    
    try {
        console.log('Attempting to export public key...');
        keyPair.exportPublicKeyInPem('./keys/debug-public.pem');
        console.log('✅ Public key export completed');
        
        // Check if file exists
        if (fs.existsSync('./keys/debug-public.pem')) {
            console.log('✅ Public key file exists');
            const content = fs.readFileSync('./keys/debug-public.pem', 'utf8');
            console.log('File content length:', content.length);
        } else {
            console.log('❌ Public key file does not exist');
        }
    } catch (error) {
        console.log('❌ Public key export failed:', error.message);
    }
    
    try {
        console.log('Attempting to export private key...');
        keyPair.exportPrivateKeyInPem('./keys/debug-private.pem');
        console.log('✅ Private key export completed');
        
        // Check if file exists
        if (fs.existsSync('./keys/debug-private.pem')) {
            console.log('✅ Private key file exists');
            const content = fs.readFileSync('./keys/debug-private.pem', 'utf8');
            console.log('File content length:', content.length);
        } else {
            console.log('❌ Private key file does not exist');
        }
    } catch (error) {
        console.log('❌ Private key export failed:', error.message);
    }
    
} catch (error) {
    console.error('❌ Key creation failed:', error.message);
    console.error('Stack:', error.stack);
}

console.log('\nListing keys directory:');
try {
    const files = fs.readdirSync('./keys');
    console.log('Files:', files);
} catch (error) {
    console.log('Error reading keys directory:', error.message);
}