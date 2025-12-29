// derive_pub_from_pem.cjs
const { readFile } = require('fs/promises');
const pkg = require('casper-js-sdk'); // CommonJS import
const { PrivateKey, KeyAlgorithm } = pkg;

(async () => {
  try {
    const pem = await readFile('secret_key_1.pem', 'utf8');
    const pk = await PrivateKey.fromPem(pem, KeyAlgorithm.SECP256K1);
    console.log(pk.publicKey.toHex());
  } catch (err) {
    console.error('ERROR deriving pubkey:', err?.toString?.() || err);
    process.exit(1);
  }
})();
