/**
 * Debug deploy creation and sending
 */

require('dotenv').config();
const { CasperClient, CLPublicKey, CLValueBuilder, RuntimeArgs, DeployUtil, Keys } = require('casper-js-sdk');
const path = require('path');

async function debugDeploy() {
    console.log('Testing deploy creation and sending...');
    
    try {
        // Initialize client
        const nodeAddress = process.env.CASPER_NODE_ADDRESS;
        const chainName = process.env.CASPER_CHAIN_NAME;
        const contractHash = process.env.FACILITATOR_CONTRACT_HASH;
        
        console.log('Node:', nodeAddress);
        console.log('Chain:', chainName);
        console.log('Contract:', contractHash);
        
        const client = new CasperClient(nodeAddress);
        console.log('✅ CasperClient created');
        
        // Load keys
        const keyPath = path.resolve('./keys/facilitator-secret.pem');
        console.log('Key path:', keyPath);
        
        const facilitatorKeyPair = Keys.Ed25519.loadKeyPairFromPrivateFile(keyPath);
        console.log('✅ Keys loaded');
        console.log('Account:', facilitatorKeyPair.publicKey.toAccountHashStr());
        
        // Create runtime arguments
        const userPublicKey = "01851581eF945997deED8FCEC38a328452cf73ef42D8fF769fa226A5d89BE70020";
        const recipient = "account-hash-26553db654781fdfd912ca5af5e12dac99e9893aa32a7c3e41bc1b6980701f7c";
        const amount = "1000000000000000000";
        const nonce = 123456;
        const deadline = 1766403079;
        const userSignature = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
        
        const userPubKey = CLPublicKey.fromHex(userPublicKey);
        const args = RuntimeArgs.fromMap({
            user_pubkey: userPubKey,
            recipient: CLValueBuilder.byteArray(Buffer.from(recipient.replace('account-hash-', ''), 'hex')),
            amount: CLValueBuilder.u256(amount),
            nonce: CLValueBuilder.u64(nonce),
            deadline: CLValueBuilder.u64(deadline),
            signature: CLValueBuilder.string(userSignature),
        });
        console.log('✅ Runtime args created');
        
        // Create deploy params
        console.log('Creating deploy params...');
        const deployParams = new DeployUtil.DeployParams(
            facilitatorKeyPair.publicKey,
            chainName
        );
        console.log('✅ Deploy params created');
        
        const deploy = DeployUtil.makeDeploy(
            deployParams,
            DeployUtil.ExecutableDeployItem.newStoredContractByHash(
                Buffer.from(contractHash.replace('hash-', ''), 'hex'),
                'claim_payment',
                args
            ),
            DeployUtil.standardPayment('2500000000')
        );
        console.log('✅ Deploy created');
        
        // Sign deploy
        const signedDeploy = DeployUtil.signDeploy(deploy, facilitatorKeyPair);
        console.log('✅ Deploy signed');
        
        // Send deploy
        console.log('Sending deploy to network...');
        const deployHash = await client.putDeploy(signedDeploy);
        console.log('✅ Deploy sent successfully!');
        console.log('Deploy hash:', deployHash);
        
        console.log('🎉 Real transaction created on Casper network!');
        console.log(`🔗 Explorer: https://testnet.cspr.live/deploy/${deployHash}`);
        
    } catch (error) {
        console.error('❌ Deploy failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

debugDeploy();