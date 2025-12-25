// server/index.ts or server/server.ts

import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import { createCasperX402Middleware } from './middleware/casperX402';
import dotenv from 'dotenv';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

dotenv.config();

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '4402', 10);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Types
interface CasperConfig {
  payTo: string;
  amount: string;
  facilitatorUrl: string;
  networkName: string;
  contractHash: string;
}

interface PaymentInfo {
  deploy_hash: string;
  sender: string;
  amount: string;
  timestamp: number;
}

interface RouteConfig {
  payTo: string;
  amount: string;
  description: string;
}

// Extend Express Request type to include payment info
declare global {
  namespace Express {
    interface Request {
      payment?: PaymentInfo;
    }
  }
}

// Configuration
const CASPER_CONFIG: CasperConfig = {
  payTo: process.env.CASPER_PAY_TO || '0202c9bda7c0da47cf0bbcd9972f8f40be72a81fa146df672c60595ca1807627403e',
  amount: process.env.CASPER_AMOUNT || '1000000000', // 1 CSPR in motes
  facilitatorUrl: process.env.FACILITATOR_URL || 'http://localhost:8080',
  networkName: process.env.CASPER_NETWORK_NAME || 'casper-test',
  contractHash: process.env.CASPER_CONTRACT_HASH || '',
};

const facilitatorPort = (() => {
  try {
    const url = new URL(CASPER_CONFIG.facilitatorUrl);
    return url.port ? parseInt(url.port, 10) : 8080;
  } catch {
    return 8080;
  }
})();

let facilitatorProcess: ChildProcessWithoutNullStreams | null = null;

const isFacilitatorHealthy = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 750);

    const response = await fetch(`${CASPER_CONFIG.facilitatorUrl}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
};

const startFacilitator = async (): Promise<void> => {
  if (facilitatorProcess) return;
  if (process.env.DISABLE_FACILITATOR_AUTOSTART === '1' || process.env.DISABLE_FACILITATOR_AUTOSTART === 'true') {
    return;
  }

  const alreadyHealthy = await isFacilitatorHealthy();
  if (alreadyHealthy) return;

  const facilitatorStandaloneDir = resolve(process.cwd(), '../facilitator-standalone');
  const prebuiltBinary = resolve(facilitatorStandaloneDir, 'target', 'debug', 'facilitator-server');

  const env = {
    ...process.env,
    FACILITATOR_PORT: String(facilitatorPort),
    CONTRACT_HASH: process.env.CASPER_CONTRACT_HASH || process.env.CONTRACT_HASH || '',
    RUST_LOG: process.env.RUST_LOG || 'info',
  };

  const spawnArgs = existsSync(prebuiltBinary)
    ? { cmd: prebuiltBinary, args: [] as string[] }
    : { cmd: 'cargo', args: ['run'] };

  facilitatorProcess = spawn(spawnArgs.cmd, spawnArgs.args, {
    cwd: facilitatorStandaloneDir,
    env,
    stdio: 'pipe',
  });

  facilitatorProcess.stdout.pipe(process.stdout);
  facilitatorProcess.stderr.pipe(process.stderr);

  facilitatorProcess.on('exit', (code, signal) => {
    facilitatorProcess = null;
    console.error(`❌ Facilitator exited (code=${code}, signal=${signal})`);
  });

  const shutdown = () => {
    if (!facilitatorProcess) return;
    facilitatorProcess.kill('SIGTERM');
    facilitatorProcess = null;
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  process.once('exit', shutdown);
};

// Apply x402 middleware with route configuration
app.use(createCasperX402Middleware({
  ...CASPER_CONFIG,
  debug: process.env.X402_DEBUG === 'true' || process.env.X402_DEBUG === '1',
  routes: {
    // Define protected routes
    'GET /api/premium-content': {
      payTo: CASPER_CONFIG.payTo,
      amount: CASPER_CONFIG.amount,
      description: 'Access to premium content',
    } as RouteConfig,
    'GET /api/premium-data': {
      payTo: CASPER_CONFIG.payTo,
      amount: '500000000', // 0.5 CSPR
      description: 'Access to premium data',
    } as RouteConfig,
  },
}));

// Health check endpoint (not protected)
app.get('/health', (req: Request, res: Response): void => {
  console.log('✅ Health check endpoint hit');
  res.status(200).send('OK');
});

// Server info endpoint (not protected)
app.get('/api/info', (req: Request, res: Response): void => {
  res.json({
    network: CASPER_CONFIG.networkName,
    contract_hash: CASPER_CONFIG.contractHash,
    facilitator_url: CASPER_CONFIG.facilitatorUrl,
    supported_tokens: ['CSPR'],
  });
});

// Protected endpoint: Premium content
app.get('/api/premium-content', (req: Request, res: Response): void => {
  // If we reach here, payment has been verified by middleware
  console.log('✅ Serving premium content to:', req.payment?.sender);
  
  res.json({
    message: '🎉 Premium Content Unlocked!',
    content: `
Welcome to the premium content area!

This content is only accessible after successful payment verification.

Payment Details:
- Deploy Hash: ${req.payment?.deploy_hash}
- Sender: ${req.payment?.sender}
- Amount: ${req.payment?.amount} motes
- Verified at: ${new Date(req.payment?.timestamp || 0).toISOString()}

Thank you for your payment on Casper Network!
    `.trim(),
    data: {
      premium: true,
      timestamp: new Date().toISOString(),
      payment: req.payment,
    },
  });
});

// Protected endpoint: Premium data
app.get('/api/premium-data', (req: Request, res: Response): void => {
  console.log('✅ Serving premium data to:', req.payment?.sender);
  
  res.json({
    data: {
      secret: 'This is secret premium data',
      value: 42,
      insights: ['Insight 1', 'Insight 2', 'Insight 3'],
    },
    payment: req.payment,
  });
});

// Facilitator proxy endpoints (for monitoring/debugging)
app.get('/facilitator/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await fetch(`${CASPER_CONFIG.facilitatorUrl}/health`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Facilitator health check failed',
      message: errorMessage,
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// 404 handler
app.use((req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Start server
app.listen(PORT, (): void => {
  void startFacilitator();
  console.log('🚀 Casper x402 Server Started');
  console.log('================================');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🌐 Network: ${CASPER_CONFIG.networkName}`);
  console.log(`💰 Recipient: ${CASPER_CONFIG.payTo}`);
  console.log(`🔧 Facilitator: ${CASPER_CONFIG.facilitatorUrl}`);
  console.log('================================');
  console.log('Protected endpoints:');
  console.log(`  - GET /api/premium-content (${CASPER_CONFIG.amount} motes)`);
  console.log(`  - GET /api/premium-data (500000000 motes)`);
  console.log('================================');
});

export default app;
