import { NextRequest, NextResponse } from 'next/server';

// Helper to strip whitespace
const clean = (str: any) => (typeof str === 'string' ? str.trim().replace(/[\r\n\s]/g, '') : str);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { step, activeAccount, paymentInfo, signature, deployHash } = body;
    
    // Clean inputs immediately
    const fromPub = clean(activeAccount?.public_key);
    const toPub = clean(paymentInfo?.pay_to);
    const amount = clean(paymentInfo?.amount);
    const cleanSig = clean(signature);
    const cleanHash = clean(deployHash);

    const serverUrl = process.env.SERVER_URL || 'http://localhost:4402';

    if (step === 'create-deploy') {
      // Step 1: Create deploy
      const createResponse = await fetch(`${serverUrl}/api/casper/create-deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPublicKey: fromPub,
          toPublicKey: toPub,
          amount: amount
        })
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(`Deploy creation failed: ${error.error}`);
      }
      
      const createResult = await createResponse.json();
      
      return NextResponse.json({
        success: true,
        deployHash: createResult.deployHash,
        deployJson: createResult.deployJson, 
        message: 'Deploy created successfully.'
      });
      
    } else if (step === 'submit-transaction') {
      // Step 2: Submit signed transaction
      console.log('📤 Submitting signed transaction...');
      console.log('   Signature Length:', cleanSig?.length);

      const submitResponse = await fetch(`${serverUrl}/api/casper/submit-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPublicKey: fromPub,
          toPublicKey: toPub,
          amount: amount,
          signature: cleanSig,
          deployHash: cleanHash
        })
      });
      
      if (!submitResponse.ok) {
        const error = await submitResponse.json();
        console.error("Backend Error:", error);
        throw new Error(error.error || error.message || 'Transaction submission failed');
      }
      
      const submitResult = await submitResponse.json();
      
      return NextResponse.json({
        success: true,
        deployHash: submitResult.deployHash,
        explorerUrl: submitResult.explorerUrl,
        message: 'Real transaction submitted',
        details: {
          from: fromPub,
          to: toPub,
          amount: amount,
          status: 'SUBMITTED'
        }
      });
    } else {
      throw new Error('Invalid step parameter');
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