/**
 * Generate Casper key pair for the facilitator
 */

const { Keys } = require('casper-js-sdk');
const fs = require('fs');

// Generate Ed25519 key pair
const keyPair = Keys.Ed25519.new();

// Save private key
const privateKeyPem = keyPair.exportPrivateKeyInPem();
fs.writeFileSync('./keys/facilitator-secret.pem', privateKeyPem);

// Save public key
const publicKeyPem = keyPair.exportPublicKeyInPem();
fs.writeFileSync('./keys/facilitator-public.pem', publicKeyPem);

console.log('✅ Generated Casper key pair:');
console.log('   Private key: ./keys/facilitator-secret.pem');
console.log('   Public key: ./keys/facilitator-public.pem');
console.log('   Account hash:', keyPair.publicKey.toAccountHashStr());
console.log('   Public key hex:', keyPair.publicKey.toHex());