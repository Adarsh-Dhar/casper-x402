/**
 * Manual key creation by writing PEM content directly
 */

const { Keys } = require('casper-js-sdk');
const fs = require('fs');

console.log('Creating keys manually...');

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

// Create simple key files with the hex keys
const facilitatorPrivateKeyHex = facilitatorKeyPair.privateKey;
const payerPrivateKeyHex = payerKeyPair.privateKey;

// Write key files in a simple format
fs.writeFileSync('./keys/facilitator-public.pem', `-----BEGIN PUBLIC KEY-----
${facilitatorPublicKey}
-----END PUBLIC KEY-----`);

fs.writeFileSync('./keys/facilitator-secret.pem', `-----BEGIN PRIVATE KEY-----
${facilitatorPrivateKeyHex}
-----END PRIVATE KEY-----`);

fs.writeFileSync('./keys/payer-public.pem', `-----BEGIN PUBLIC KEY-----
${payerPublicKey}
-----END PUBLIC KEY-----`);

fs.writeFileSync('./keys/payer-secret.pem', `-----BEGIN PRIVATE KEY-----
${payerPrivateKeyHex}
-----END PRIVATE KEY-----`);

// Update .env file
const envPath = './.env';
let envContent = fs.readFileSync(envPath, 'utf8');

envContent = envContent.replace(/FACILITATOR_PUBLIC_KEY=.*/, `FACILITATOR_PUBLIC_KEY=${facilitatorPublicKey}`);
envContent = envContent.replace(/FACILITATOR_ACCOUNT_HASH=.*/, `FACILITATOR_ACCOUNT_HASH=${facilitatorAccountHash}`);
envContent = envContent.replace(/PAYER_PUBLIC_KEY=.*/, `PAYER_PUBLIC_KEY=${payerPublicKey}`);
envContent = envContent.replace(/PAYER_ACCOUNT_HASH=.*/, `PAYER_ACCOUNT_HASH=${payerAccountHash}`);

fs.writeFileSync(envPath, envContent);

console.log('\n✅ Keys created and .env updated!');
console.log('\nFiles created:');
console.log('- keys/facilitator-public.pem');
console.log('- keys/facilitator-secret.pem');
console.log('- keys/payer-public.pem');
console.log('- keys/payer-secret.pem');