import { Request, Response, NextFunction, RequestHandler } from 'express';
import fetch from 'node-fetch';

export interface PaymentRequest extends Request {
  payment?: {
    verified: boolean;
    deploy_hash: string;
    sender: string;
    recipient: string;
    amount: string;
    timestamp: number;
  };
}

interface RouteConfig {
  payTo?: string;
  amount?: string;
  description?: string;
}

interface CasperX402Config {
  payTo: string;
  amount: string;
  facilitatorUrl?: string;
  networkName?: string;
  routes?: Record<string, RouteConfig>;
  debug?: boolean;
}

interface PaymentData {
  deploy_hash: string;
  sender: string;
  network?: string;
}

interface FacilitatorResponse {
  success?: boolean;
  valid?: boolean;
  error?: string;
  timestamp?: number;
  [key: string]: any;
}

const isHex = (value: string): boolean => /^[0-9a-fA-F]+$/.test(value);

const isValidDeployHash = (value: string): boolean => value.length === 64 && isHex(value);

const isValidPublicKeyHex = (value: string): boolean =>
  (value.length === 66 || value.length === 68) && isHex(value);

export const createCasperX402Middleware = (config: CasperX402Config): RequestHandler => {
  const {
    payTo,
    amount,
    facilitatorUrl = 'http://localhost:8080',
    networkName = 'casper-custom',
    routes = {},
    debug = false,
  } = config;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const paymentReq = req as PaymentRequest;
    const routeKey = `${req.method} ${req.path}`;
    const routeConfig = routes[routeKey];

    if (!routeConfig) {
      return next();
    }

    if (debug) {
      console.log('\n🔍 x402 Middleware Check:');
      console.log('   Method:', req.method);
      console.log('   Path:', req.path);
      console.log('   URL:', req.url);
      console.log('   Route Key:', routeKey);
      console.log('   Available Routes:', Object.keys(routes));
      console.log('   Route Config Found:', routeConfig ? '✅ Yes' : '❌ No');
      console.log('   Payment Header:', req.headers['x-payment'] ? '✅ Present' : '❌ Missing');
      console.log('   🔒 Route IS protected, checking payment...\n');
    }

    const paymentHeader = req.headers['x-payment'] as string | undefined;

    if (!paymentHeader) {
      console.log(`💳 Payment required for ${routeKey}`);

      const paymentAmount = routeConfig.amount || amount;
      const paymentRecipient = routeConfig.payTo || payTo;

      if (debug) {
        console.log('   Recipient:', paymentRecipient);
        console.log('   Amount:', paymentAmount);
        console.log('   Network:', networkName);
      }

      res.status(402);
      res.set({
        'X-Pay-To': paymentRecipient,
        'X-Pay-Amount': paymentAmount,
        'X-Pay-Network': networkName,
        'Content-Type': 'application/json',
      });

      res.json({
        error: 'Payment Required',
        message: 'This resource requires payment to access',
        payment: {
          recipient: paymentRecipient,
          amount: paymentAmount,
          network: networkName,
          description: routeConfig.description || 'Premium content access',
        },
      });
      return;
    }

    try {
      if (debug) {
        console.log('🔐 Verifying payment with facilitator...');
      }

      let paymentData: PaymentData;
      try {
        paymentData = JSON.parse(paymentHeader) as PaymentData;
      } catch {
        res.status(400).json({
          error: 'Invalid payment header',
          message: 'Payment proof must be valid JSON',
        });
        return;
      }
      const { deploy_hash, sender } = paymentData;

      if (debug) {
        console.log('   Deploy Hash:', deploy_hash);
        console.log('   Sender:', sender);
      }

      if (!deploy_hash || !sender) {
        console.error('❌ Invalid payment header: missing deploy_hash or sender');
        res.status(400).json({
          error: 'Invalid payment header',
          message: 'Missing deploy_hash or sender in payment proof',
        });
        return;
      }

      if (!isValidDeployHash(deploy_hash)) {
        res.status(400).json({
          error: 'Invalid payment header',
          message: 'deploy_hash must be a 64-character hex string',
        });
        return;
      }

      if (!isValidPublicKeyHex(sender)) {
        res.status(400).json({
          error: 'Invalid payment header',
          message: 'sender must be a valid Casper public key hex string',
        });
        return;
      }

      if (paymentData.network && paymentData.network !== networkName) {
        res.status(400).json({
          error: 'Invalid payment header',
          message: `network must match ${networkName}`,
        });
        return;
      }

      const verifyUrl = `${facilitatorUrl}/verify_payment`;
      if (debug) {
        console.log(`   Calling facilitator: ${verifyUrl}`);
      }

      const facilitatorResponse = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deploy_hash,
          sender,
          recipient: routeConfig.payTo || payTo,
          amount: routeConfig.amount || amount,
          network: networkName,
        }),
      });

      if (!facilitatorResponse.ok) {
        const errorText = await facilitatorResponse.text();
        let errorData: FacilitatorResponse = {};
        try {
          errorData = JSON.parse(errorText) as FacilitatorResponse;
        } catch {
          errorData = { error: errorText };
        }
        console.error('❌ Payment verification failed:', errorData);
        res.status(402).json({
          error: 'Payment verification failed',
          message: errorData.error || 'Failed to verify payment',
        });
        return;
      }

      const verificationText = await facilitatorResponse.text();
      let verificationResult: FacilitatorResponse = {};
      try {
        verificationResult = JSON.parse(verificationText) as FacilitatorResponse;
      } catch {
        verificationResult = { error: verificationText };
      }

      const isVerified = verificationResult.success === true || verificationResult.valid === true;
      if (!isVerified) {
        res.status(402).json({
          error: 'Payment verification failed',
          message: verificationResult.error || 'Failed to verify payment',
        });
        return;
      }
      console.log('✅ Payment verified successfully');

      paymentReq.payment = {
        verified: true,
        deploy_hash,
        sender,
        recipient: routeConfig.payTo || payTo,
        amount: routeConfig.amount || amount,
        timestamp: verificationResult.timestamp || Date.now(),
      };

      if (debug) {
        console.log('✅ Passing request to route handler\n');
      }

      next();
    } catch (error) {
      console.error('❌ Error verifying payment:', error);
      res.status(500).json({
        error: 'Payment verification error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
};
