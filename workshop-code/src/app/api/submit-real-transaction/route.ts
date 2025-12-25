import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  HttpHandler,
  KeyAlgorithm,
  makeCsprTransferDeploy,
  PrivateKey,
  RpcClient,
} from 'casper-js-sdk';
import { sub } from 'date-fns';

// Helper to strip whitespace
const clean = (value: unknown): string =>
  (typeof value === 'string' ? value.trim().replace(/[\r\n\s]/g, '') : '');

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

    if (step === 'x402-pay') {
      const payTo = clean(body?.payTo);
      const payAmount = clean(body?.payAmount);
      const nodeUrl =
        (process.env.CASPER_NODE_URL || process.env.NEXT_PUBLIC_CASPER_NODE_URL || 'https://node.testnet.casper.network/rpc')
          .trim();
      const chainName =
        (process.env.CASPER_NETWORK_NAME || process.env.NEXT_PUBLIC_CASPER_NETWORK_NAME || 'casper-custom').trim();

      if (!payTo || !payAmount) {
        return NextResponse.json(
          { success: false, error: 'Invalid request', message: 'Missing payTo or payAmount' },
          { status: 400 }
        );
      }

      const minimumTransferMotes = BigInt('100000000');
      if (BigInt(payAmount) < minimumTransferMotes) {
        return NextResponse.json(
          {
            success: false,
            error: 'Transfer amount too small',
            message: `Minimum native transfer amount is ${minimumTransferMotes.toString()} motes.`,
            requiredMinimumMotes: minimumTransferMotes.toString(),
            payTo,
            payAmount,
          },
          { status: 400 }
        );
      }

      const pemPath = path.join(process.cwd(), 'secret_key_1.pem');
      const pem = await readFile(pemPath, 'utf8');

      const privateKey = await PrivateKey.fromPem(pem, KeyAlgorithm.SECP256K1);
      const senderPublicKey = privateKey.publicKey.toHex();

      const rpcRequest = async (method: string, params: unknown, id: number) => {
        const rpcResponse = await fetch(nodeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, jsonrpc: '2.0', method, params }),
        });
        const rpcBody = (await rpcResponse.json()) as {
          result?: unknown;
          error?: { message?: unknown };
        };
        if (rpcBody?.error) {
          const message = typeof rpcBody.error?.message === 'string' ? rpcBody.error.message : 'RPC error';
          throw new Error(message);
        }
        return rpcBody?.result as unknown;
      };

      const paymentAmount = '100000000';
      const requiredTotalMotes = (BigInt(payAmount) + BigInt(paymentAmount)).toString();

      let senderBalanceMotes = '0';
      try {
        const stateRoot = (await rpcRequest('chain_get_state_root_hash', {}, 1)) as { state_root_hash?: unknown };
        const stateRootHash = typeof stateRoot?.state_root_hash === 'string' ? stateRoot.state_root_hash : '';
        const accountInfo = (await rpcRequest('state_get_account_info', { public_key: senderPublicKey }, 2)) as {
          account?: { main_purse?: unknown };
        };
        const mainPurse = typeof accountInfo?.account?.main_purse === 'string' ? accountInfo.account.main_purse : '';
        if (stateRootHash && mainPurse) {
          const balanceResult = (await rpcRequest(
            'state_get_balance',
            { state_root_hash: stateRootHash, purse_uref: mainPurse },
            3
          )) as { balance_value?: unknown };
          senderBalanceMotes = typeof balanceResult?.balance_value === 'string' ? balanceResult.balance_value : '0';
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : '';
        if (message.toLowerCase().includes('no such account')) {
          return NextResponse.json(
            {
              success: false,
              error: 'Sender account not found',
              message: `Sender account not found on ${chainName}. Fund this public key on testnet, then retry.`,
              senderPublicKey,
              senderBalanceMotes: '0',
              requiredTotalMotes,
              payAmount,
              paymentAmount,
            },
            { status: 400 }
          );
        }
        throw e;
      }

      if (BigInt(senderBalanceMotes) < BigInt(requiredTotalMotes)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Insufficient funds',
            message: `Insufficient funds. Need ${requiredTotalMotes} motes total.`,
            senderPublicKey,
            senderBalanceMotes,
            requiredTotalMotes,
            payAmount,
            paymentAmount,
          },
          { status: 400 }
        );
      }

      const deploy = makeCsprTransferDeploy({
        senderPublicKeyHex: senderPublicKey,
        recipientPublicKeyHex: payTo,
        transferAmount: payAmount,
        chainName,
        paymentAmount,
        timestamp: (sub(new Date(), { seconds: 2 })).toDateString(),
      });

      console.log("deploy", deploy)

      deploy.sign(privateKey);

      console.log("deploy1", deploy)


      const rpcHandler = new HttpHandler("http://34.222.193.169:7777/rpc");
      console.log("rpcHandler", rpcHandler)
      const rpcClient = new RpcClient(rpcHandler);
      console.log("rpcClient", rpcClient)
      const submitResult = await rpcClient.putDeploy(deploy);
      console.log("submit result", submitResult)
      const deployHashOut =
        typeof (submitResult as { deployHash?: { toHex?: () => string; toString: () => string } })?.deployHash?.toHex ===
        'function'
          ? (submitResult as { deployHash: { toHex: () => string } }).deployHash.toHex()
          : String((submitResult as { deployHash?: { toString: () => string } })?.deployHash);

      return NextResponse.json({
        success: true,
        senderPublicKey,
        senderBalanceMotes,
        requiredTotalMotes,
        payAmount,
        paymentAmount,
        deployHash: deployHashOut,
        explorerUrl: `https://testnet.cspr.live/deploy/${deployHashOut}`,
      });
    }

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
