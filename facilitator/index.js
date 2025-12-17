/**
 * Facilitator Service - Claims payments on behalf of users
 * This service monitors for payment authorization requests and submits them to the blockchain
 */

const { CasperClient, CLPublicKey, CLValueBuilder, RuntimeArgs, DeployUtil } = require('casper-js-sdk');
const fs = require('fs');

// Configuration
const CONFIG = {
    nodeAddress: 'http://136.243.187.84:7777', // Testnet RPC node
    chainName: 'casper-test',
    contractHash: 'hash-YOUR-CONTRACT-HASH', // Replace with deployed contract hash
    facilitatorKeyPath: './keys/facilitator-secret.pem', // Facilitator's private key
    gasPayment: '2500000000', // 2.5 CSPR for gas
};

/**
 * Load facilitator's key pair
 * @returns {Object} - Key pair object
 */
function loadFacilitatorKeys() {
    const privateKeyPem = fs.readFileSync(CONFIG.facilitatorKeyPath, 'utf8');
    const keyPair = CasperClient.loadKeyPairFromPrivateFile(privateKeyPem);
    return keyPair;
}

/**
 * Create a deploy for claim_payment
 * @param {Object} authorization - Payment authorization object
 * @param {Object} keyPair - Facilitator's key pair
 * @returns {Deploy} - Casper deploy object
 */
function createClaimPaymentDeploy(authorization, keyPair) {
    const { userPublicKey, recipient, amount, nonce, deadline, signature } = authorization;

    // Parse public key
    const userPubKey = CLPublicKey.fromHex(userPublicKey);
    
    // Build runtime arguments
    const args = RuntimeArgs.fromMap({
        user_pubkey: CLValueBuilder.publicKey(userPubKey),
        recipient: CLValueBuilder.byteArray(Buffer.from(recipient.replace('account-hash-', ''), 'hex')),
        amount: CLValueBuilder.u256(amount),
        nonce: CLValueBuilder.u64(nonce),
        deadline: CLValueBuilder.u64(deadline),
        signature: CLValueBuilder.string(signature),
    });

    // Create deploy
    const deploy = DeployUtil.makeDeploy(
        new DeployUtil.DeployParams(
            CLPublicKey.fromHex(keyPair.publicKey.toHex()),
            CONFIG.chainName,
            1, // Gas price (typically 1)
            1800000 // TTL (30 minutes)
        ),
        DeployUtil.ExecutableDeployItem.newStoredContractByHash(
            Buffer.from(CONFIG.contractHash.replace('hash-', ''), 'hex'),
            'claim_payment',
            args
        ),
        DeployUtil.standardPayment(CONFIG.gasPayment)
    );

    return deploy;
}

/**
 * Sign and send a deploy to the network
 * @param {Deploy} deploy - Deploy object
 * @param {Object} keyPair - Facilitator's key pair
 * @returns {Promise<string>} - Deploy hash
 */
async function signAndSendDeploy(deploy, keyPair) {
    // Sign the deploy
    const signedDeploy = deploy.sign([keyPair]);

    // Create Casper client
    const client = new CasperClient(CONFIG.nodeAddress);

    // Send deploy
    const deployHash = await client.putDeploy(signedDeploy);

    return deployHash;
}

/**
 * Monitor deploy status
 * @param {string} deployHash - Deploy hash to monitor
 * @returns {Promise<Object>} - Deploy result
 */
async function monitorDeploy(deployHash) {
    const client = new CasperClient(CONFIG.nodeAddress);
    
    console.log(`Monitoring deploy: ${deployHash}`);
    
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    
    while (attempts < maxAttempts) {
        try {
            const [deploy, raw] = await client.getDeploy(deployHash);
            
            if (raw.execution_results.length > 0) {
                const result = raw.execution_results[0].result;
                
                if (result.Success) {
                    console.log('✓ Deploy executed successfully!');
                    return {
                        success: true,
                        cost: result.Success.cost,
                        result: result.Success,
                    };
                } else if (result.Failure) {
                    console.error('✗ Deploy failed:', result.Failure.error_message);
                    return {
                        success: false,
                        error: result.Failure.error_message,
                    };
                }
            }
        } catch (error) {
            // Deploy not found yet, continue waiting
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }
    
    throw new Error('Deploy monitoring timeout - deploy may still be processing');
}

/**
 * Process a payment authorization
 * @param {Object} authorization - Payment authorization object
 * @returns {Promise<Object>} - Processing result
 */
async function processPaymentAuthorization(authorization) {
    console.log('Processing payment authorization...');
    console.log('User:', authorization.userPublicKey);
    console.log('Recipient:', authorization.recipient);
    console.log('Amount:', authorization.amount);
    console.log('Nonce:', authorization.nonce);
    console.log('Deadline:', new Date(authorization.deadline * 1000).toISOString());

    try {
        // Load facilitator keys
        const keyPair = loadFacilitatorKeys();
        console.log('Facilitator:', keyPair.publicKey.toAccountHashStr());

        // Verify deadline hasn't passed
        const now = Math.floor(Date.now() / 1000);
        if (now > authorization.deadline) {
            throw new Error('Payment authorization has expired');
        }

        // Create deploy
        console.log('\nCreating deploy...');
        const deploy = createClaimPaymentDeploy(authorization, keyPair);

        // Sign and send
        console.log('Signing and sending deploy...');
        const deployHash = await signAndSendDeploy(deploy, keyPair);
        console.log('Deploy hash:', deployHash);

        // Monitor status
        const result = await monitorDeploy(deployHash);

        return {
            success: result.success,
            deployHash,
            cost: result.cost,
            error: result.error,
        };
    } catch (error) {
        console.error('Error processing payment:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Start a simple HTTP server to receive authorization requests
 * In production, this would be a more robust API
 */
function startFacilitatorService() {
    const http = require('http');
    const port = 3000;

    const server = http.createServer(async (req, res) => {
        if (req.method === 'POST' && req.url === '/claim-payment') {
            let body = '';
            
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    const authorization = JSON.parse(body);
                    const result = await processPaymentAuthorization(authorization);
                    
                    res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: error.message }));
                }
            });
        } else if (req.method === 'GET' && req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', service: 'facilitator' }));
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    server.listen(port, () => {
        console.log(`Facilitator service running on port ${port}`);
        console.log(`POST /claim-payment - Submit payment authorization`);
        console.log(`GET /health - Check service status`);
    });
}

/**
 * Example: Process a single authorization from command line
 */
async function exampleProcessAuthorization() {
    const exampleAuth = {
        userPublicKey: '01abc123...', // Replace with actual public key
        recipient: 'account-hash-abc123...', // Replace with actual recipient
        amount: '1000000000', // 1 token with 9 decimals
        nonce: 0,
        deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        signature: '1a2b3c...', // Replace with actual signature
    };

    const result = await processPaymentAuthorization(exampleAuth);
    console.log('\nResult:', result);
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === 'serve') {
        startFacilitatorService();
    } else if (args[0] === 'process' && args[1]) {
        // Process a single authorization from file
        const authPath = args[1];
        const authorization = JSON.parse(fs.readFileSync(authPath, 'utf8'));
        processPaymentAuthorization(authorization).then(result => {
            console.log('Result:', JSON.stringify(result, null, 2));
            process.exit(result.success ? 0 : 1);
        });
    } else {
        console.log('Usage:');
        console.log('  node facilitator.js serve              - Start HTTP service');
        console.log('  node facilitator.js process <file>     - Process authorization from file');
    }
}

module.exports = {
    processPaymentAuthorization,
    createClaimPaymentDeploy,
    signAndSendDeploy,
    monitorDeploy,
    startFacilitatorService,
};