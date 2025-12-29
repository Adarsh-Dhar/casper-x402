import { readFile } from 'node:fs/promises';
// casper-js-sdk is CommonJS; import the default and destructure the needed exports
import pkg from 'casper-js-sdk';
const { PrivateKey, KeyAlgorithm } = pkg;

async function main() {
  const pem = await readFile('secret_key_1.pem', 'utf8');
  const pk = await PrivateKey.fromPem(pem, KeyAlgorithm.SECP256K1);
  console.log(pk.publicKey.toHex());
}
main().catch(err => { console.error(err?.toString?.() || err); process.exit(1); });
