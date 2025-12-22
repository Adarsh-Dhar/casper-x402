/**
 * Simple key creation script that works
 */

const { Keys } = require('casper-js-sdk');
const fs = require('fs');

// Generate facilitator keys
console.log('Creating facilitator keys...');
const facilitatorKeyPair = Keys.Ed25519.new();
facilitatorKeyPair.exportPublicKeyInPem('./keys/facilitator-public.pem');
facilitatorKeyPair.exportPrivateKeyInPem('./keys/facilitator-secret.pem');

console.log('Facilitator Public Key:', facilitatorKeyPair.publicKey.toHex());
console.log('Facilitator Account Hash:', facilitatorKeyPair.publicKey.toAccountHashStr());

// Generate payer keys
console.log('\nCreating payer keys...');
const payerKeyPair = Keys.Ed25519.new();
payerKeyPair.exportPublicKeyInPem('./keys/payer-public.pem');
payerKeyPair.exportPrivateKeyInPem('./keys/payer-secret.pem');

console.log('Payer Public Key:', payerKeyPair.publicKey.toHex());
console.log('Payer Account Hash:', payerKeyPair.publicKey.toAccountHashStr());

console.log('\n✅ Keys created successfully!');