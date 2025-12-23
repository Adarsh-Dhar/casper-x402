import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { step, activeAccount, paymentInfo, signature, deployHash } = body;
    
    const serverUrl = process.env.SERVER_URL || 'http://localhost:4402';
    
    if (step === 'create-deploy') {
      // Step 1: Create deploy for signing
      console.log('📝 Creating deploy for signing...');
      console.log('👤 From:', activeAccount.public_key);
      console.log('👤 To:', paymentInfo.pay_to);
      console.log('💰 Amount:', paymentInfo.amount, 'motes');
      
      const createResponse = await fetch(`${serverUrl}/api/casper/create-deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromPublicKey: activeAccount.public_key,
          toPublicKey: paymentInfo.pay_to,
          amount: paymentInfo.amount
        })
      });
      
      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(`Deploy creation failed: ${error.error}`);
      }
      
      const createResult = await createResponse.json();
      console.log('✅ Deploy created:', createResult.deployHash);
      
      return NextResponse.json({
        success: true,
        deployHash: createResult.deployHash,
        deployJson: createResult.deployJson, // Include the deploy JSON for wallet signing
        message: 'Deploy created successfully. Please sign the deploy with your wallet.'
      });
      
    } else if (step === 'submit-transaction') {
      // Step 2: Submit signed transaction
      console.log('📤 Submitting signed transaction...');
      console.log('👤 From:', activeAccount.public_key);
      console.log('👤 To:', paymentInfo.pay_to);
      console.log('💰 Amount:', paymentInfo.amount, 'motes');
      console.log('🔑 Deploy hash:', deployHash);
      
      const submitResponse = await fetch(`${serverUrl}/api/casper/submit-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromPublicKey: activeAccount.public_key,
          toPublicKey: paymentInfo.pay_to,
          amount: paymentInfo.amount,
          signature: signature,
          deployHash: deployHash
        })
      });
      
      if (!submitResponse.ok) {
        const error = await submitResponse.json();
        throw new Error(`Transaction submission failed: ${error.error}`);
      }
      
      const submitResult = await submitResponse.json();
      
      if (submitResult.success) {
        console.log('🎉 REAL TRANSACTION SUBMITTED TO CASPER TESTNET!');
        console.log('   Deploy hash:', submitResult.deployHash);
        console.log('   Explorer URL:', submitResult.explorerUrl);
        
        return NextResponse.json({
          success: true,
          deployHash: submitResult.deployHash,
          explorerUrl: submitResult.explorerUrl,
          message: 'Real transaction submitted to Casper testnet',
          details: {
            from: activeAccount.public_key,
            to: paymentInfo.pay_to,
            amount: paymentInfo.amount,
            amountCSPR: parseInt(paymentInfo.amount) / 1000000000,
            network: 'casper-test',
            timestamp: new Date().toISOString(),
            status: 'SUBMITTED TO CASPER TESTNET'
          }
        });
      } else {
        throw new Error(submitResult.error || 'Transaction submission failed');
      }
    } else {
      throw new Error('Invalid step parameter. Must be "create-deploy" or "submit-transaction"');
    }
    
  } catch (error) {
    console.error('❌ Real transaction API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Real transaction failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}