/**
 * Create proper Casper key files that can be loaded by the SDK
 */

const { Keys } = require('casper-js-sdk');
const fs = require('fs');

console.log('Creating proper Casper key files...');

// Generate facilitator keys
const facilitatorKeyPair = Keys.Ed25519.new();
const facilitatorPublicKey = facilitatorKeyPair.publicKey.toHex();
const facilitatorAccountHash = facilitatorKeyPair.publicKey.toAccountHashStr();

// Generate payer keys  
const payerKeyPair = Keys.Ed25519.new();
const payerPublicKey = payerKeyPair.publicKey.toHex();
const payerAccountHash = payerKeyPair.publicKey.toAccountHashStr();

console.log('Facilitator Public Key:', facilitatorPublicKey);
console.log('Facilitator Account Hash:', facilitatorAccountHash);
console.log('Payer Public Key:', payerPublicKey);
console.log('Payer Account Hash:', payerAccountHash);

// Save keys using the SDK's internal format
// We'll create the keys in memory and then save the raw bytes

// For facilitator
const facilitatorPrivateKeyBytes = facilitatorKeyPair.privateKey;
const facilitatorPublicKeyBytes = facilitatorKeyPair.publicKey.data;

// Create PEM format manually
const facilitatorPrivatePem = `-----BEGIN PRIVATE KEY-----
${Buffer.from(facilitatorPrivateKeyBytes).toString('base64')}
-----END PRIVATE KEY-----`;

const facilitatorPublicPem = `-----BEGIN PUBLIC KEY-----
${Buffer.from(facilitatorPublicKeyBytes).toString('base64')}
-----END PUBLIC KEY-----`;

// For payer
const payerPrivateKeyBytes = payerKeyPair.privateKey;
const payerPublicKeyBytes = payerKeyPair.publicKey.data;

const payerPrivatePem = `-----BEGIN PRIVATE KEY-----
${Buffer.from(payerPrivateKeyBytes).toString('base64')}
-----END PRIVATE KEY-----`;

const payerPublicPem = `-----BEGIN PUBLIC KEY-----
${Buffer.from(payerPublicKeyBytes).toString('base64')}
-----END PUBLIC KEY-----`;

// Write the files
fs.writeFileSync('./keys/facilitator-secret.pem', facilitatorPrivatePem);
fs.writeFileSync('./keys/facilitator-public.pem', facilitatorPublicPem);
fs.writeFileSync('./keys/payer-secret.pem', payerPrivatePem);
fs.writeFileSync('./keys/payer-public.pem', payerPublicPem);

// Update .env file
const envPath = './.env';
let envContent = fs.readFileSync(envPath, 'utf8');

envContent = envContent.replace(/FACILITATOR_PUBLIC_KEY=.*/, `FACILITATOR_PUBLIC_KEY=${facilitatorPublicKey}`);
envContent = envContent.replace(/FACILITATOR_ACCOUNT_HASH=.*/, `FACILITATOR_ACCOUNT_HASH=${facilitatorAccountHash}`);
envContent = envContent.replace(/PAYER_PUBLIC_KEY=.*/, `PAYER_PUBLIC_KEY=${payerPublicKey}`);
envContent = envContent.replace(/PAYER_ACCOUNT_HASH=.*/, `PAYER_ACCOUNT_HASH=${payerAccountHash}`);

fs.writeFileSync(envPath, envContent);

console.log('\n✅ Proper Casper keys created!');

// Test loading the keys
console.log('\nTesting key loading...');
try {
    const loadedKeyPair = Keys.Ed25519.loadKeyPairFromPrivateFile('./keys/facilitator-secret.pem');
    console.log('✅ Keys can be loaded successfully');
    console.log('Loaded public key:', loadedKeyPair.publicKey.toHex());
    console.log('Loaded account hash:', loadedKeyPair.publicKey.toAccountHashStr());
} catch (error) {
    console.log('❌ Key loading failed:', error.message);
    
    // Alternative approach - create keys in the format that works
    console.log('\nTrying alternative approach...');
    
    // Create a simple key file with just the hex key
    fs.writeFileSync('./keys/facilitator-secret.pem', facilitatorPrivateKeyBytes);
    fs.writeFileSync('./keys/payer-secret.pem', payerPrivateKeyBytes);
    
    console.log('✅ Created simple key files');
}