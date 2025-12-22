/**
 * Debug Casper SDK calls to find the filter error
 */

require('dotenv').config();
const { CLPublicKey, CLValueBuilder, RuntimeArgs } = require('casper-js-sdk');

async function debugCasperCalls() {
    console.log('Testing Casper SDK calls...');
    
    try {
        // Test CLPublicKey parsing
        console.log('Testing CLPublicKey...');
        const userPublicKey = "01851581eF945997deED8FCEC38a328452cf73ef42D8fF769fa226A5d89BE70020";
        const userPubKey = CLPublicKey.fromHex(userPublicKey);
        console.log('✅ CLPublicKey parsed successfully');
        
        // Test CLValueBuilder calls
        console.log('Testing CLValueBuilder...');
        const recipient = "account-hash-26553db654781fdfd912ca5af5e12dac99e9893aa32a7c3e41bc1b6980701f7c";
        const amount = "1000000000000000000";
        const nonce = 123456;
        const deadline = 1766403079;
        const userSignature = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
        
        console.log('Creating CLValue for recipient...');
        const recipientBytes = Buffer.from(recipient.replace('account-hash-', ''), 'hex');
        const recipientCLValue = CLValueBuilder.byteArray(recipientBytes);
        console.log('✅ Recipient CLValue created');
        
        console.log('Creating CLValue for amount...');
        const amountCLValue = CLValueBuilder.u256(amount);
        console.log('✅ Amount CLValue created');
        
        console.log('Creating CLValue for nonce...');
        const nonceCLValue = CLValueBuilder.u64(nonce);
        console.log('✅ Nonce CLValue created');
        
        console.log('Creating CLValue for deadline...');
        const deadlineCLValue = CLValueBuilder.u64(deadline);
        console.log('✅ Deadline CLValue created');
        
        console.log('Creating CLValue for signature...');
        const signatureCLValue = CLValueBuilder.string(userSignature);
        console.log('✅ Signature CLValue created');
        
        // Test RuntimeArgs
        console.log('Testing RuntimeArgs...');
        const args = RuntimeArgs.fromMap({
            user_pubkey: userPubKey,
            recipient: recipientCLValue,
            amount: amountCLValue,
            nonce: nonceCLValue,
            deadline: deadlineCLValue,
            signature: signatureCLValue,
        });
        console.log('✅ RuntimeArgs created successfully');
        
        console.log('🎉 All Casper SDK calls successful!');
        
    } catch (error) {
        console.error('❌ Casper SDK call failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

debugCasperCalls();