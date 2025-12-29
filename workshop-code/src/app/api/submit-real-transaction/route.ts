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

    const serverUrl = (process.env.SERVER_URL || 'http://localhost:4402').replace(/\/+$/, '');

    // x402-pay: server-side signer submits a real CSPR transfer to the node
    if (step === 'x402-pay') {
      const payTo = clean(body?.payTo);
      const payAmount = clean(body?.payAmount);

      const nodeUrlRaw = (
        process.env.CASPER_NODE_URL || process.env.NEXT_PUBLIC_CASPER_NODE_URL || 'https://node.testnet.casper.network/rpc'
      ).trim();
      // allow reassignment so we can fallback to a public node if the configured node is unreachable
      let nodeUrl = nodeUrlRaw.endsWith('/rpc') ? nodeUrlRaw : nodeUrlRaw.replace(/\/+$/, '') + '/rpc';
      const chainName = (
        process.env.CASPER_NETWORK_NAME || process.env.NEXT_PUBLIC_CASPER_NETWORK_NAME || 'casper-test'
      ).trim();

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

      // Load server-side signer (workshop demo key)
      const pemPath = path.join(process.cwd(), 'secret_key_1.pem');
      const pem = await readFile(pemPath, 'utf8');
      const privateKey = await PrivateKey.fromPem(pem, KeyAlgorithm.SECP256K1);
      const senderPublicKey = privateKey.publicKey.toHex();

      // lightweight JSON-RPC helper
      const rpcRequest = async (method: string, params: unknown, id: number) => {
        let rpcResponse: Response;
        try {
          rpcResponse = await fetch(nodeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, jsonrpc: '2.0', method, params }),
          });
        } catch (err: any) {
          throw new Error(`RPC fetch failed to ${nodeUrl}: ${err instanceof Error ? err.message : String(err)}`);
        }

        // Non-2xx HTTP from RPC node
        if (!rpcResponse.ok) {
          const text = await rpcResponse.text().catch(() => '(failed to read body)');
          throw new Error(`RPC HTTP ${rpcResponse.status}: ${text}`);
        }

        const rpcBody = await rpcResponse.json().catch((err: any) => {
          throw new Error(`Failed to parse RPC response JSON: ${err instanceof Error ? err.message : String(err)}`);
        });

        if (rpcBody?.error) {
          const message = typeof rpcBody.error?.message === 'string' ? rpcBody.error.message : 'RPC error';
          throw new Error(message);
        }

        return rpcBody?.result;
      };

      const paymentAmount = '100000000';
      const requiredTotalMotes = (BigInt(payAmount) + BigInt(paymentAmount)).toString();

      // Check sender balance
      let senderBalanceMotes = '0';
      try {
        // Try chain_get_state_root_hash, fallback to info_get_status
        let stateRootHash = '';
        try {
          const chainRoot = (await rpcRequest('chain_get_state_root_hash', {}, 1)) as { state_root_hash?: unknown };
          stateRootHash = typeof chainRoot?.state_root_hash === 'string' ? chainRoot.state_root_hash : '';
        } catch (err) {
          // ignore and fallback
        }

        if (!stateRootHash) {
          const status = (await rpcRequest('info_get_status', {}, 1)) as any;
          stateRootHash =
            (typeof status?.state_root_hash === 'string' && status.state_root_hash) ||
            (typeof status?.result?.state_root_hash === 'string' && status.result.state_root_hash) ||
            (typeof status?.last_added_block_info?.state_root_hash === 'string' && status.last_added_block_info.state_root_hash) ||
            '';
        }

        const accountInfo = (await rpcRequest('state_get_account_info', { public_key: senderPublicKey }, 2)) as any;
        const mainPurse = typeof accountInfo?.account?.main_purse === 'string' ? accountInfo.account.main_purse : '';
        if (stateRootHash && mainPurse) {
          const balanceResult = (await rpcRequest('state_get_balance', { state_root_hash: stateRootHash, purse_uref: mainPurse }, 3)) as any;
          senderBalanceMotes = typeof balanceResult?.balance_value === 'string' ? balanceResult.balance_value : '0';
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
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

      // Log balance info
      const balanceInCSPR = (BigInt(senderBalanceMotes) / BigInt(1_000_000_000)).toString();
      const requiredInCSPR = (BigInt(requiredTotalMotes) / BigInt(1_000_000_000)).toString();
      console.log('💰 Balance check:');
      console.log(`   Sender: ${senderPublicKey}`);
      console.log(`   Balance: ${senderBalanceMotes} motes (${balanceInCSPR} CSPR)`);
      console.log(`   Required: ${requiredTotalMotes} motes (${requiredInCSPR} CSPR)`);
      console.log(`   Pay amount: ${payAmount} motes`);
      console.log(`   Gas/payment: ${paymentAmount} motes`);

      if (BigInt(senderBalanceMotes) < BigInt(requiredTotalMotes)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Insufficient funds',
            message: `Insufficient funds. Need ${requiredTotalMotes} motes total (${requiredInCSPR} CSPR). You have ${senderBalanceMotes} motes (${balanceInCSPR} CSPR).`,
            senderPublicKey,
            senderBalanceMotes,
            senderBalanceCSPR: balanceInCSPR,
            requiredTotalMotes,
            requiredCSPR: requiredInCSPR,
            payAmount,
            paymentAmount,
          },
          { status: 400 }
        );
      }

      console.log('✅ Sufficient funds, proceeding with transaction...');

      // Fetch node time so we can choose a deploy timestamp safely in the past
      let nodeTimeIso = '';
      try {
        const status = (await rpcRequest('info_get_status', {}, 9)) as any;
        nodeTimeIso =
          (typeof status?.last_added_block_info?.timestamp === 'string' && status.last_added_block_info.timestamp) ||
          (typeof status?.result?.last_added_block_info?.timestamp === 'string' && status.result.last_added_block_info.timestamp) ||
          (typeof status?.result?.timestamp === 'string' && status.result.timestamp) ||
          (typeof status?.timestamp === 'string' && status.timestamp) ||
          '';
      } catch (err) {
        // ignore — we'll fallback to local time
      }

      const nodeTime = nodeTimeIso ? new Date(nodeTimeIso) : new Date();
      // Choose a deploy timestamp safely behind node time by a buffer to avoid "timestamp in the future" errors.
      // Use a 5 minute buffer and also ensure we don't accidentally pick a timestamp in the future relative to the server's clock.
      const bufferMs = 5 * 60_000; // 5 minutes
      let deployTimestamp = new Date(nodeTime.getTime() - bufferMs);
      const nowLocal = new Date();
      if (deployTimestamp.getTime() >= nowLocal.getTime()) {
        // If nodeTime appears ahead of our local clock for some reason, fall back to local time minus buffer
        deployTimestamp = new Date(nowLocal.getTime() - bufferMs);
      }
      console.log('Node time (iso):', nodeTimeIso || '(local) ' + nowLocal.toISOString());
      console.log(`Using deploy timestamp (buffer ${bufferMs}ms):`, deployTimestamp.toISOString());
      const deploy = makeCsprTransferDeploy({
        senderPublicKeyHex: senderPublicKey,
        recipientPublicKeyHex: payTo,
        transferAmount: payAmount,
        chainName,
        paymentAmount,
        timestamp: deployTimestamp.toISOString(),
      });

      deploy.sign(privateKey);

      // Use resolved nodeUrl for RPC handler
      const rpcHandler = new HttpHandler(nodeUrl);
      const rpcClient = new RpcClient(rpcHandler);

      // Helper to serialize deploy for debugging (convert Uint8Array/Buffer to hex)
      const hexify = (v: any): any => {
        if (v instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(v))) {
          return Buffer.from(v).toString('hex');
        }
        if (Array.isArray(v)) return v.map(hexify);
        if (v && typeof v === 'object') {
          const out: any = {};
          for (const [k, val] of Object.entries(v)) {
            try {
              out[k] = hexify(val);
            } catch (err) {
              out[k] = String(val);
            }
          }
          return out;
        }
        return v;
      };

      let submitResult: any;
      try {
        submitResult = await rpcClient.putDeploy(deploy);
      } catch (err: any) {
        // Extract SDK/RPC error details when available
        console.error('RPC putDeploy error:', err);
        const sdkErr = err && err.sourceErr ? err.sourceErr : err;
        const sdkMsg = sdkErr && sdkErr.message ? sdkErr.message : String(sdkErr);

        // Build a debug payload containing the deploy structure and RPC error
        const debug = {
          rpcNode: nodeUrl,
          sdkError: sdkMsg,
          rawError: (() => {
            try {
              return JSON.parse(JSON.stringify(sdkErr));
            } catch (_) {
              return String(sdkErr);
            }
          })(),
          deploy: hexify(deploy),
        };

        // Return detailed JSON to help debugging 'Invalid Deploy'
        return NextResponse.json(
          {
            success: false,
            error: 'Deploy submission failed',
            message: sdkMsg,
            debug,
          },
          { status: 500 }
        );
      }

      const deployHashOut =
        typeof (submitResult as { deployHash?: { toHex?: () => string } })?.deployHash?.toHex === 'function'
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

    // create-deploy: proxy to server-side deploy creation
    if (step === 'create-deploy') {
      const createResponse = await fetch(`${serverUrl}/api/casper/create-deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPublicKey: fromPub,
          toPublicKey: toPub,
          amount: amount,
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json().catch(() => ({ error: createResponse.statusText }));
        throw new Error(`Deploy creation failed: ${error.error || JSON.stringify(error)}`);
      }

      const createResult = await createResponse.json();

      return NextResponse.json({
        success: true,
        deployHash: createResult.deployHash,
        deployJson: createResult.deployJson,
        message: 'Deploy created successfully.',
      });
    }

    // submit-transaction: proxy signed deploy submission to server
    if (step === 'submit-transaction') {
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
          deployHash: cleanHash,
        }),
      });

      if (!submitResponse.ok) {
        const error = await submitResponse.json().catch(() => ({ error: submitResponse.statusText }));
        console.error('Backend Error:', error);
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
          status: 'SUBMITTED',
        },
      });
    }

    throw new Error('Invalid step parameter');
  } catch (error) {
    console.error('❌ Real transaction API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Real transaction failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
