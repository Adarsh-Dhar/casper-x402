/**
 * Casper Service
 * 
 * Handles all Casper blockchain interactions including:
 * - Contract calls
 * - Transaction signing and sending
 * - Deploy status monitoring
 * - Account and token information
 */

const { CasperClient, CLPublicKey, CLValueBuilder, RuntimeArgs, DeployUtil, Keys } = require('casper-js-sdk');
const fs = require('fs');
const path = require('path');

class CasperService {
    constructor() {
        this.nodeAddress = process.env.CASPER_NODE_ADDRESS;
        this.chainName = process.env.CASPER_CHAIN_NAME;
        this.contractHash = process.env.FACILITATOR_CONTRACT_HASH;
        this.tokenContractHash = process.env.CEP18_TOKEN_CONTRACT_HASH;
        this.gasPayment = process.env.GAS_PAYMENT || '2500000000';
        
        this.client = new CasperClient(this.nodeAddress);
        this.facilitatorKeyPair = null;
        
        this.loadFacilitatorKeys();
    }

    /**
     * Load facilitator key pair from file
     */
    loadFacilitatorKeys() {
        try {
            const keyPath = path.resolve(process.env.FACILITATOR_PRIVATE_KEY_PATH);
            if (fs.existsSync(keyPath)) {
                this.facilitatorKeyPair = Keys.Ed25519.loadKeyPairFromPrivateFile(keyPath);
                console.log('✅ Facilitator keys loaded successfully');
                console.log(`   Account: ${this.facilitatorKeyPair.publicKey.toAccountHashStr()}`);
            } else {
                console.warn('⚠️ Facilitator key file not found, some operations may fail');
            }
        } catch (error) {
            console.error('❌ Error loading facilitator keys:', error.message);
        }
    }

    /**
     * Get facilitator information
     */
    async getFacilitatorInfo() {
        if (!this.facilitatorKeyPair) {
            throw new Error('Facilitator keys not loaded');
        }

        return {
            publicKey: this.facilitatorKeyPair.publicKey.toHex(),
            accountHash: this.facilitatorKeyPair.publicKey.toAccountHashStr(),
            contractHash: this.contractHash,
            network: this.chainName,
            nodeAddress: this.nodeAddress
        };
    }

    /**
     * Create a deploy for the facilitator contract
     */
    createDeploy(entryPoint, args, paymentAmount = null) {
        if (!this.facilitatorKeyPair) {
            throw new Error('Facilitator keys not loaded');
        }

        const payment = paymentAmount || this.gasPayment;
        
        const deploy = DeployUtil.makeDeploy(
            new DeployUtil.DeployParams(
                this.facilitatorKeyPair.publicKey,
                this.chainName
            ),
            DeployUtil.ExecutableDeployItem.newStoredContractByHash(
                Buffer.from(this.contractHash.replace('hash-', ''), 'hex'),
                entryPoint,
                args
            ),
            DeployUtil.standardPayment(payment)
        );

        return deploy;
    }

    /**
     * Sign and send a deploy
     */
    async signAndSendDeploy(deploy) {
        if (!this.facilitatorKeyPair) {
            throw new Error('Facilitator keys not loaded');
        }

        const signedDeploy = DeployUtil.signDeploy(deploy, this.facilitatorKeyPair);
        const deployHash = await this.client.putDeploy(signedDeploy);
        
        return deployHash;
    }

    /**
     * Process a payment through the facilitator contract
     */
    async processPayment(paymentData) {
        const { userPublicKey, recipient, amount, nonce, deadline, userSignature } = paymentData;

        // Parse user public key
        const userPubKey = CLPublicKey.fromHex(userPublicKey);
        
        // Build runtime arguments
        const args = RuntimeArgs.fromMap({
            user_pubkey: userPubKey,
            recipient: CLValueBuilder.byteArray(Buffer.from(recipient.replace('account-hash-', ''), 'hex')),
            amount: CLValueBuilder.u256(amount),
            nonce: CLValueBuilder.u64(nonce),
            deadline: CLValueBuilder.u64(deadline),
            signature: CLValueBuilder.string(userSignature),
        });

        // Create and send deploy
        const deploy = this.createDeploy('claim_payment', args);
        const deployHash = await this.signAndSendDeploy(deploy);

        return {
            deployHash,
            status: 'submitted',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Estimate transaction fees
     */
    async estimateFees(params) {
        const { transactionSize = 1024, instructionCount = 2, tokenSymbol = 'CSPR' } = params;
        
        // Base fee calculation (5 lamports per byte)
        const baseFee = transactionSize * 5;
        
        // Instruction fee (1000 lamports per instruction)
        const instructionFee = instructionCount * 1000;
        
        // Priority fee (based on network congestion)
        const networkCongestion = await this.getNetworkCongestion();
        const priorityMultiplier = 1.0 + (networkCongestion * 0.1);
        const priorityFee = Math.floor((baseFee + instructionFee) * (priorityMultiplier - 1.0));
        
        const totalFee = baseFee + instructionFee + priorityFee;
        
        // Convert to token if not CSPR
        let feeInToken = totalFee;
        if (tokenSymbol !== 'CSPR') {
            const exchangeRate = await this.getTokenExchangeRate(tokenSymbol);
            feeInToken = Math.floor(totalFee / exchangeRate);
        }

        return {
            baseFee,
            instructionFee,
            priorityFee,
            totalFee,
            feeInToken,
            tokenSymbol,
            transactionSize,
            instructionCount,
            networkCongestion,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get network congestion level (mock implementation)
     */
    async getNetworkCongestion() {
        // In a real implementation, this would query network metrics
        // For demo purposes, return a random value between 1-10
        return Math.floor(Math.random() * 10) + 1;
    }

    /**
     * Get token exchange rate (mock implementation)
     */
    async getTokenExchangeRate(tokenSymbol) {
        // Mock exchange rates
        const rates = {
            'USDC': 1.0,
            'CSPR': 0.05,
            'WETH': 2500.0
        };
        
        return rates[tokenSymbol] || 1.0;
    }

    /**
     * Get deploy status
     */
    async getDeployStatus(deployHash) {
        try {
            const [deploy, raw] = await this.client.getDeploy(deployHash);
            
            if (raw.execution_results && raw.execution_results.length > 0) {
                const result = raw.execution_results[0].result;
                
                if (result.Success) {
                    return {
                        status: 'completed',
                        result: 'success',
                        cost: result.Success.cost,
                        errorMessage: null
                    };
                } else if (result.Failure) {
                    return {
                        status: 'failed',
                        result: 'failure',
                        cost: null,
                        errorMessage: result.Failure.error_message
                    };
                }
            }
            
            return {
                status: 'pending',
                result: 'pending',
                cost: null,
                errorMessage: null
            };
        } catch (error) {
            if (error.message.includes('deploy not found')) {
                return {
                    status: 'not_found',
                    result: 'not_found',
                    cost: null,
                    errorMessage: 'Deploy not found'
                };
            }
            throw error;
        }
    }

    /**
     * Monitor deploy until completion
     */
    async monitorDeploy(deployHash, timeoutMs = 300000) {
        const startTime = Date.now();
        const checkInterval = 5000; // 5 seconds
        
        while (Date.now() - startTime < timeoutMs) {
            const status = await this.getDeployStatus(deployHash);
            
            if (status.status === 'completed' || status.status === 'failed') {
                return status;
            }
            
            // Wait before next check
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        
        throw new Error('Deploy monitoring timeout');
    }

    /**
     * Get supported tokens (mock implementation)
     */
    async getSupportedTokens() {
        // In a real implementation, this would query the contract
        return [
            {
                symbol: 'CSPR',
                name: 'Casper Token',
                contractHash: 'native',
                decimals: 9,
                exchangeRate: 0.05
            },
            {
                symbol: 'USDC',
                name: 'USD Coin',
                contractHash: this.tokenContractHash,
                decimals: 6,
                exchangeRate: 1.0
            }
        ];
    }

    /**
     * Validate account hash format
     */
    validateAccountHash(accountHash) {
        return accountHash && 
               typeof accountHash === 'string' && 
               accountHash.startsWith('account-hash-') &&
               accountHash.length === 77; // account-hash- + 64 hex chars
    }

    /**
     * Validate public key format
     */
    validatePublicKey(publicKey) {
        try {
            CLPublicKey.fromHex(publicKey);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate contract hash format
     */
    validateContractHash(contractHash) {
        return contractHash && 
               typeof contractHash === 'string' && 
               contractHash.startsWith('hash-') &&
               contractHash.length === 69; // hash- + 64 hex chars
    }

    /**
     * Get account balance (mock implementation)
     */
    async getAccountBalance(accountHash, tokenSymbol = 'CSPR') {
        // In a real implementation, this would query the blockchain
        // For demo purposes, return a mock balance
        return {
            balance: '1000000000000000000', // 1 token with 18 decimals
            tokenSymbol,
            accountHash,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Create a signature for a message
     */
    signMessage(message) {
        if (!this.facilitatorKeyPair) {
            throw new Error('Facilitator keys not loaded');
        }

        // In a real implementation, this would create a proper signature
        // For demo purposes, return a mock signature
        const messageBytes = Buffer.from(message, 'utf8');
        const signature = this.facilitatorKeyPair.sign(messageBytes);
        
        return signature.toString('hex');
    }

    /**
     * Verify a signature
     */
    verifySignature(message, signature, publicKey) {
        try {
            const pubKey = CLPublicKey.fromHex(publicKey);
            const messageBytes = Buffer.from(message, 'utf8');
            const signatureBytes = Buffer.from(signature, 'hex');
            
            // In a real implementation, this would verify the signature
            // For demo purposes, return true if signature is not empty
            return signature && signature.length > 0;
        } catch {
            return false;
        }
    }
}

module.exports = CasperService;