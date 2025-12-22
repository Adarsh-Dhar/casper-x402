/**
 * Key Generation Script for Casper x402 Demo
 * 
 * Generates new key pairs for facilitator and payer accounts.
 */

require('dotenv').config({ path: '../.env' });
const CasperSDKWrapper = require('../casper-sdk/wrapper');
const fs = require('fs');
const path = require('path');

class KeyGenerator {
    constructor() {
        this.casperSDK = new CasperSDKWrapper();
        this.keysDir = path.resolve(__dirname, '../keys');
    }

    /**
     * Generate all required keys
     */
    async generateKeys() {
        console.log('🔐 Generating Casper x402 Demo Keys');
        console.log('==================================\n');

        try {
            // Ensure keys directory exists
            if (!fs.existsSync(this.keysDir)) {
                fs.mkdirSync(this.keysDir, { recursive: true });
                console.log('📁 Created keys directory');
            }

            // Generate facilitator keys
            console.log('🔑 Generating facilitator keys...');
            const facilitatorKeyPair = this.casperSDK.generateKeyPair();
            const facilitatorPaths = this.casperSDK.saveKeyPair(facilitatorKeyPair, this.keysDir, 'facilitator');

            console.log('✅ Facilitator keys generated:');
            console.log(`   Public Key: ${facilitatorKeyPair.publicKey.toHex()}`);
            console.log(`   Account Hash: ${facilitatorKeyPair.publicKey.toAccountHashStr()}`);
            console.log(`   Files: ${facilitatorPaths.publicKeyPath}, ${facilitatorPaths.privateKeyPath}\n`);

            // Generate payer keys
            console.log('🔑 Generating payer keys...');
            const payerKeyPair = this.casperSDK.generateKeyPair();
            const payerPaths = this.casperSDK.saveKeyPair(payerKeyPair, this.keysDir, 'payer');

            console.log('✅ Payer keys generated:');
            console.log(`   Public Key: ${payerKeyPair.publicKey.toHex()}`);
            console.log(`   Account Hash: ${payerKeyPair.publicKey.toAccountHashStr()}`);
            console.log(`   Files: ${payerPaths.publicKeyPath}, ${payerPaths.privateKeyPath}\n`);

            // Generate additional test keys
            console.log('🔑 Generating additional test keys...');
            const testKeyPair = this.casperSDK.generateKeyPair();
            const testPaths = this.casperSDK.saveKeyPair(testKeyPair, this.keysDir, 'test');

            console.log('✅ Test keys generated:');
            console.log(`   Public Key: ${testKeyPair.publicKey.toHex()}`);
            console.log(`   Account Hash: ${testKeyPair.publicKey.toAccountHashStr()}`);
            console.log(`   Files: ${testPaths.publicKeyPath}, ${testPaths.privateKeyPath}\n`);

            // Create key info file
            const keyInfo = {
                facilitator: {
                    publicKey: facilitatorKeyPair.publicKey.toHex(),
                    accountHash: facilitatorKeyPair.publicKey.toAccountHashStr(),
                    files: {
                        public: 'facilitator-public.pem',
                        private: 'facilitator-secret.pem'
                    }
                },
                payer: {
                    publicKey: payerKeyPair.publicKey.toHex(),
                    accountHash: payerKeyPair.publicKey.toAccountHashStr(),
                    files: {
                        public: 'payer-public.pem',
                        private: 'payer-secret.pem'
                    }
                },
                test: {
                    publicKey: testKeyPair.publicKey.toHex(),
                    accountHash: testKeyPair.publicKey.toAccountHashStr(),
                    files: {
                        public: 'test-public.pem',
                        private: 'test-secret.pem'
                    }
                },
                generated: new Date().toISOString(),
                network: process.env.CASPER_CHAIN_NAME || 'casper-test'
            };

            fs.writeFileSync(
                path.join(this.keysDir, 'key-info.json'),
                JSON.stringify(keyInfo, null, 2)
            );

            console.log('📄 Key information saved to key-info.json');

            // Update .env file with new values
            this.updateEnvFile(keyInfo);

            console.log('\n🎉 Key generation completed successfully!');
            console.log('\nNext steps:');
            console.log('1. Fund the accounts on the Casper testnet');
            console.log('2. Deploy your contracts using the facilitator account');
            console.log('3. Update .env file with contract hashes');
            console.log('4. Start the demo services');

        } catch (error) {
            console.error('❌ Key generation failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Update .env file with generated key information
     */
    updateEnvFile(keyInfo) {
        try {
            const envPath = path.resolve(__dirname, '../.env');
            let envContent = '';

            // Read existing .env file if it exists
            if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, 'utf8');
            } else {
                // Copy from .env.example
                const examplePath = path.resolve(__dirname, '../.env.example');
                if (fs.existsSync(examplePath)) {
                    envContent = fs.readFileSync(examplePath, 'utf8');
                }
            }

            // Update key-related values
            const updates = {
                'FACILITATOR_PUBLIC_KEY': keyInfo.facilitator.publicKey,
                'FACILITATOR_ACCOUNT_HASH': keyInfo.facilitator.accountHash,
                'PAYER_PUBLIC_KEY': keyInfo.payer.publicKey,
                'PAYER_ACCOUNT_HASH': keyInfo.payer.accountHash,
                'FACILITATOR_PRIVATE_KEY_PATH': './keys/facilitator-secret.pem',
                'PAYER_PRIVATE_KEY_PATH': './keys/payer-secret.pem'
            };

            // Apply updates
            for (const [key, value] of Object.entries(updates)) {
                const regex = new RegExp(`^${key}=.*$`, 'm');
                if (regex.test(envContent)) {
                    envContent = envContent.replace(regex, `${key}=${value}`);
                } else {
                    envContent += `\n${key}=${value}`;
                }
            }

            // Write updated .env file
            fs.writeFileSync(envPath, envContent);
            console.log('✅ Updated .env file with new key information');

        } catch (error) {
            console.warn('⚠️ Failed to update .env file:', error.message);
            console.log('Please manually update your .env file with the generated key information.');
        }
    }

    /**
     * Validate existing keys
     */
    async validateKeys() {
        console.log('🔍 Validating existing keys...\n');

        const keyFiles = [
            'facilitator-secret.pem',
            'facilitator-public.pem',
            'payer-secret.pem',
            'payer-public.pem'
        ];

        let allValid = true;

        for (const keyFile of keyFiles) {
            const keyPath = path.join(this.keysDir, keyFile);
            
            if (!fs.existsSync(keyPath)) {
                console.log(`❌ Missing: ${keyFile}`);
                allValid = false;
                continue;
            }

            try {
                if (keyFile.includes('secret')) {
                    // Try to load private key
                    const keyPair = this.casperSDK.loadKeyPairFromFile(keyPath);
                    console.log(`✅ Valid: ${keyFile} (${keyPair.publicKey.toAccountHashStr()})`);
                } else {
                    // Just check if file exists and is readable
                    fs.readFileSync(keyPath, 'utf8');
                    console.log(`✅ Valid: ${keyFile}`);
                }
            } catch (error) {
                console.log(`❌ Invalid: ${keyFile} - ${error.message}`);
                allValid = false;
            }
        }

        console.log(`\n${allValid ? '✅' : '❌'} Key validation ${allValid ? 'passed' : 'failed'}`);
        return allValid;
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'generate';

    const generator = new KeyGenerator();

    switch (command) {
        case 'generate':
            await generator.generateKeys();
            break;
        case 'validate':
            await generator.validateKeys();
            break;
        case 'help':
            console.log('Casper x402 Key Generator');
            console.log('========================');
            console.log('');
            console.log('Commands:');
            console.log('  generate  - Generate new key pairs (default)');
            console.log('  validate  - Validate existing key files');
            console.log('  help      - Show this help message');
            break;
        default:
            console.error(`Unknown command: ${command}`);
            console.log('Use "help" to see available commands');
            process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}

module.exports = KeyGenerator;