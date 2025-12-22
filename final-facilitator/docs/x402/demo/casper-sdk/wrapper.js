/**
 * Casper SDK Wrapper
 * 
 * Provides a simplified interface for common Casper blockchain operations
 * used in the x402 payment protocol demo.
 */

const { 
    CasperClient, 
    CLPublicKey, 
    CLValueBuilder, 
    RuntimeArgs, 
    DeployUtil, 
    Keys,
    CLAccountHash,
    CLByteArray,
    CLU256,
    CLU64,
    CLString
} = require('casper-js-sdk');
const fs = require('fs');
const crypto = require('crypto');

class CasperSDKWrapper {
    constructor(nodeAddress, chainName) {
        this.nodeAddress = nodeAddress || process.env.CASPER_NODE_ADDRESS;
        this.chainName = chainName || process.env.CASPER_CHAIN_NAME;
        this.client = new CasperClient(this.nodeAddress);
    }

    /**
     * Load key pair from PEM file
     */
    loadKeyPairFromFile(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`Key file not found: ${filePath}`);
            }
            return Keys.Ed25519.loadKeyPairFromPrivateFile(filePath);
        } catch (error) {
            throw new Error(`Failed to load key pair: ${error.message}`);
        }
    }

    /**
     * Generate new key pair
     */
    generateKeyPair() {
        return Keys.Ed25519.new();
    }

    /**
     * Save key pair to files
     */
    saveKeyPair(keyPair, directory, baseName = 'key') {
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        const publicKeyPath = `${directory}/${baseName}-public.pem`;
        const privateKeyPath = `${directory}/${baseName}-secret.pem`;

        keyPair.exportPublicKeyInPem(publicKeyPath);
        keyPair.exportPrivateKeyInPem(privateKeyPath);

        return { publicKeyPath, privateKeyPath };
    }

    /**
     * Get account hash from public key
     */
    getAccountHash(publicKey) {
        if (typeof publicKey === 'string') {
            publicKey = CLPublicKey.fromHex(publicKey);
        }
        return publicKey.toAccountHashStr();
    }

    /**
     * Get account info
     */
    async getAccountInfo(publicKey) {
        try {
            const accountHash = this.getAccountHash(publicKey);
            const stateRootHash = await this.client.nodeClient.getStateRootHash();
            const accountData = await this.client.nodeClient.getBlockState(
                stateRootHash,
                accountHash,
                []
            );

            return {
                accountHash,
                balance: accountData.Account?.mainPurse || '0',
                namedKeys: accountData.Account?.namedKeys || [],
                associatedKeys: accountData.Account?.associatedKeys || []
            };
        } catch (error) {
            throw new Error(`Failed to get account info: ${error.message}`);
        }
    }

    /**
     * Get account balance
     */
    async getAccountBalance(publicKey) {
        try {
            const accountHash = this.getAccountHash(publicKey);
            const stateRootHash = await this.client.nodeClient.getStateRootHash();
            const balance = await this.client.balanceOfByAccountHash(stateRootHash, accountHash);
            return balance.toString();
        } catch (error) {
            throw new Error(`Failed to get account balance: ${error.message}`);
        }
    }

    /**
     * Create a deploy for contract call
     */
    createContractCallDeploy(
        keyPair,
        contractHash,
        entryPoint,
        runtimeArgs,
        paymentAmount = '2500000000'
    ) {
        const deployParams = new DeployUtil.DeployParams(
            keyPair.publicKey,
            this.chainName,
            1, // Gas price
            1800000, // TTL (30 minutes)
            Date.now()
        );

        const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
            Buffer.from(contractHash.replace('hash-', ''), 'hex'),
            entryPoint,
            runtimeArgs
        );

        const payment = DeployUtil.standardPayment(paymentAmount);

        return DeployUtil.makeDeploy(deployParams, session, payment);
    }

    /**
     * Sign a deploy
     */
    signDeploy(deploy, keyPair) {
        return DeployUtil.signDeploy(deploy, keyPair);
    }

    /**
     * Send a deploy
     */
    async sendDeploy(deploy) {
        try {
            const deployHash = await this.client.putDeploy(deploy);
            return deployHash;
        } catch (error) {
            throw new Error(`Failed to send deploy: ${error.message}`);
        }
    }

    /**
     * Sign and send a deploy
     */
    async signAndSendDeploy(deploy, keyPair) {
        const signedDeploy = this.signDeploy(deploy, keyPair);
        return await this.sendDeploy(signedDeploy);
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
                        errorMessage: null,
                        deploy: deploy
                    };
                } else if (result.Failure) {
                    return {
                        status: 'failed',
                        result: 'failure',
                        cost: null,
                        errorMessage: result.Failure.error_message,
                        deploy: deploy
                    };
                }
            }
            
            return {
                status: 'pending',
                result: 'pending',
                cost: null,
                errorMessage: null,
                deploy: deploy
            };
        } catch (error) {
            if (error.message.includes('deploy not found')) {
                return {
                    status: 'not_found',
                    result: 'not_found',
                    cost: null,
                    errorMessage: 'Deploy not found',
                    deploy: null
                };
            }
            throw new Error(`Failed to get deploy status: ${error.message}`);
        }
    }

    /**
     * Wait for deploy to complete
     */
    async waitForDeploy(deployHash, timeoutMs = 300000, checkIntervalMs = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            const status = await this.getDeployStatus(deployHash);
            
            if (status.status === 'completed' || status.status === 'failed') {
                return status;
            }
            
            await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
        }
        
        throw new Error('Deploy monitoring timeout');
    }

    /**
     * Build runtime arguments for claim_payment
     */
    buildClaimPaymentArgs(userPublicKey, recipient, amount, nonce, deadline, signature) {
        const pubKey = typeof userPublicKey === 'string' 
            ? CLPublicKey.fromHex(userPublicKey) 
            : userPublicKey;

        const recipientBytes = Buffer.from(
            recipient.replace('account-hash-', ''), 
            'hex'
        );

        return RuntimeArgs.fromMap({
            user_pubkey: pubKey,
            recipient: CLValueBuilder.byteArray(recipientBytes),
            amount: CLValueBuilder.u256(amount),
            nonce: CLValueBuilder.u64(nonce),
            deadline: CLValueBuilder.u64(deadline),
            signature: CLValueBuilder.string(signature)
        });
    }

    /**
     * Build runtime arguments for transfer
     */
    buildTransferArgs(recipient, amount) {
        const recipientBytes = Buffer.from(
            recipient.replace('account-hash-', ''), 
            'hex'
        );

        return RuntimeArgs.fromMap({
            recipient: CLValueBuilder.byteArray(recipientBytes),
            amount: CLValueBuilder.u256(amount)
        });
    }

    /**
     * Build runtime arguments for approve
     */
    buildApproveArgs(spender, amount) {
        const spenderBytes = Buffer.from(
            spender.replace('account-hash-', ''), 
            'hex'
        );

        return RuntimeArgs.fromMap({
            spender: CLValueBuilder.byteArray(spenderBytes),
            amount: CLValueBuilder.u256(amount)
        });
    }

    /**
     * Create message for signing (EIP-712 style)
     */
    createPaymentMessage(chainName, contractHash, recipient, amount, nonce, deadline) {
        const message = [
            `Chain: ${chainName}`,
            `Contract: ${contractHash}`,
            `Recipient: ${recipient}`,
            `Amount: ${amount}`,
            `Nonce: ${nonce}`,
            `Deadline: ${deadline}`
        ].join('\n');

        return message;
    }

    /**
     * Sign a message
     */
    signMessage(message, keyPair) {
        const messageBytes = Buffer.from(message, 'utf8');
        const signature = keyPair.sign(messageBytes);
        return signature.toString('hex');
    }

    /**
     * Verify a signature
     */
    verifySignature(message, signature, publicKey) {
        try {
            const pubKey = typeof publicKey === 'string' 
                ? CLPublicKey.fromHex(publicKey) 
                : publicKey;
            
            const messageBytes = Buffer.from(message, 'utf8');
            const signatureBytes = Buffer.from(signature, 'hex');
            
            return pubKey.verify(messageBytes, signatureBytes);
        } catch (error) {
            return false;
        }
    }

    /**
     * Get current nonce for account
     */
    async getAccountNonce(accountHash, contractHash) {
        try {
            const stateRootHash = await this.client.nodeClient.getStateRootHash();
            
            // Query the nonce from contract storage
            const result = await this.client.nodeClient.queryContractDictionary(
                stateRootHash,
                contractHash,
                'nonces',
                accountHash.replace('account-hash-', '')
            );

            return result ? parseInt(result.toString()) : 0;
        } catch (error) {
            // If nonce doesn't exist, return 0
            return 0;
        }
    }

    /**
     * Get token balance
     */
    async getTokenBalance(accountHash, tokenContractHash) {
        try {
            const stateRootHash = await this.client.nodeClient.getStateRootHash();
            
            const result = await this.client.nodeClient.queryContractDictionary(
                stateRootHash,
                tokenContractHash,
                'balances',
                accountHash.replace('account-hash-', '')
            );

            return result ? result.toString() : '0';
        } catch (error) {
            return '0';
        }
    }

    /**
     * Parse public key from various formats
     */
    parsePublicKey(publicKey) {
        if (typeof publicKey === 'string') {
            return CLPublicKey.fromHex(publicKey);
        }
        return publicKey;
    }

    /**
     * Format account hash
     */
    formatAccountHash(accountHash) {
        if (accountHash.startsWith('account-hash-')) {
            return accountHash;
        }
        return `account-hash-${accountHash}`;
    }

    /**
     * Format contract hash
     */
    formatContractHash(contractHash) {
        if (contractHash.startsWith('hash-')) {
            return contractHash;
        }
        return `hash-${contractHash}`;
    }

    /**
     * Convert motes to CSPR
     */
    motesToCSPR(motes) {
        return (BigInt(motes) / BigInt(1000000000)).toString();
    }

    /**
     * Convert CSPR to motes
     */
    csprToMotes(cspr) {
        return (BigInt(Math.floor(parseFloat(cspr) * 1000000000))).toString();
    }

    /**
     * Generate random nonce
     */
    generateNonce() {
        return Date.now() + Math.floor(Math.random() * 1000000);
    }

    /**
     * Generate deadline (current time + duration in seconds)
     */
    generateDeadline(durationSeconds = 3600) {
        return Date.now() + (durationSeconds * 1000);
    }

    /**
     * Validate account hash format
     */
    isValidAccountHash(accountHash) {
        return accountHash && 
               typeof accountHash === 'string' && 
               accountHash.startsWith('account-hash-') &&
               accountHash.length === 77;
    }

    /**
     * Validate contract hash format
     */
    isValidContractHash(contractHash) {
        return contractHash && 
               typeof contractHash === 'string' && 
               contractHash.startsWith('hash-') &&
               contractHash.length === 69;
    }

    /**
     * Validate public key format
     */
    isValidPublicKey(publicKey) {
        try {
            CLPublicKey.fromHex(publicKey);
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = CasperSDKWrapper;
