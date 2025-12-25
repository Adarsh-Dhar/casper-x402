import express from "express";
import cors from "cors";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { CasperTransactionService } from "./casperService.js";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4402;
const FACILITATOR_PORT = process.env.FACILITATOR_PORT || 8080;
const CASPER_CONTRACT_HASH = process.env.CASPER_CONTRACT_HASH;
const CASPER_PAY_TO = process.env.CASPER_PAY_TO;
const CASPER_NODE_URL = process.env.CASPER_NODE_URL || 'https://node.casper-test.casper.network/rpc';
const CASPER_NETWORK_NAME = process.env.CASPER_NETWORK_NAME || 'casper-test';
const FACILITATOR_BASE_URL = `http://localhost:${FACILITATOR_PORT}`;

let facilitatorProcess: ChildProcess | null = null;

// Initialize Casper transaction service
const casperService = new CasperTransactionService(CASPER_NODE_URL, CASPER_NETWORK_NAME);

// Middleware
app.use(express.json());
app.use(cors({
  origin: "http://localhost:3000",
  exposedHeaders: ["X-PAYMENT-RESPONSE", "X-PAYMENT-REQUIRED"]
}));

async function startFacilitator() {
  try {
    const facilitatorPath = path.resolve(__dirname, "../../facilitator-standalone");
    
    // console.log(`Starting Casper facilitator at ${facilitatorPath}...`);
    
    facilitatorProcess = spawn("cargo", ["run"], {
      cwd: facilitatorPath,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        RUST_LOG: "info",
        FACILITATOR_PORT: FACILITATOR_PORT.toString(),
        CONTRACT_HASH: CASPER_CONTRACT_HASH
      }
    });

    facilitatorProcess.stdout?.on("data", (data: Buffer) => {
      // console.log(`[Facilitator] ${data.toString()}`);
    });

    facilitatorProcess.stderr?.on("data", (data: Buffer) => {
      console.error(`[Facilitator Error] ${data.toString()}`);
    });

    facilitatorProcess.on("close", (code: number) => {
      // console.log(`Facilitator process exited with code ${code}`);
    });

    // Wait a bit for the server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } catch (error) {
    console.error("Failed to start facilitator:", error);
  }
}

// Custom X402 middleware for Casper
async function casperX402Middleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const paymentHeader = req.headers['x-payment'] as string;
  
  if (!paymentHeader) {
    // Payment required - return 402 with payment challenge
    const paymentChallenge = {
      network: "casper-test",
      contract_hash: CASPER_CONTRACT_HASH,
      pay_to: CASPER_PAY_TO,
      amount: "2500000000", // 2.5 CSPR in motes (minimum transfer amount on Casper casper-test)
      description: "Premium workshop content access",
      facilitator_url: FACILITATOR_BASE_URL
    };
    
    res.status(402);
    res.setHeader('X-PAYMENT-REQUIRED', JSON.stringify(paymentChallenge));
    return res.json({
      error: "Payment Required",
      message: "This endpoint requires payment to access",
      payment_info: paymentChallenge
    });
  }
  
  try {
    // Verify payment with facilitator
    const paymentData = JSON.parse(paymentHeader);
    // console.log('🔍 Received payment data:', JSON.stringify(paymentData, null, 2));
    
    const verificationResponse = await fetch(`${FACILITATOR_BASE_URL}/verify_payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    
    // console.log('📡 Facilitator response status:', verificationResponse.status);
    
    if (verificationResponse.ok) {
      const result = await verificationResponse.json();
      // console.log('📋 Facilitator response:', JSON.stringify(result, null, 2));
      
      if (result.valid) {
        return next(); // Payment verified, continue
      }
      
      // Payment verification failed
      res.status(402);
      return res.json({
        error: "Payment Verification Failed",
        message: "The provided payment could not be verified",
        details: result.message || "Unknown verification error"
      });
    } else {
      // Facilitator returned an error
      let errorMessage = `Facilitator error: ${verificationResponse.status}`;
      try {
        const errorText = await verificationResponse.text();
        // console.log('❌ Facilitator error response:', errorText);
        errorMessage = errorText;
      } catch (parseError) {
        // console.log('❌ Could not parse facilitator error response');
      }
      
      res.status(402);
      return res.json({
        error: "Payment Verification Failed",
        message: "The facilitator rejected the payment",
        details: errorMessage
      });
    }
    
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500);
    return res.json({
      error: "Payment Processing Error",
      message: "Unable to process payment verification"
    });
  }
}

// Routes
app.get("/health", (_req, res) => {
  res.json({ 
    status: "ok",
    facilitator_url: FACILITATOR_BASE_URL,
    contract_hash: CASPER_CONTRACT_HASH
  });
});

app.get("/api/info", async (_req, res) => {
  try {
    const configResponse = await fetch(`${FACILITATOR_BASE_URL}/get_config`);
    if (configResponse.ok) {
      const config = await configResponse.json();
      res.json({
        server: "X402 Casper Workshop Server",
        network: config.network,
        contract_hash: config.contract_hash,
        facilitator_url: FACILITATOR_BASE_URL,
        supported_tokens: config.supported_tokens,
        endpoints: {
          premium_content: "/api/premium-content",
          health: "/health",
          info: "/api/info"
        }
      });
    } else {
      throw new Error("Facilitator not available");
    }
  } catch (error) {
    res.status(500).json({
      error: "Unable to fetch server info",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Temporary deploy storage (in production, use Redis or database)
const deployStorage = new Map<string, any>();

// Real Casper transaction endpoints
app.post("/api/casper/create-deploy", async (req, res) => {
  try {
    const { fromPublicKey, toPublicKey, amount } = req.body;

    // console.log('🔄 Creating deploy for signing');
    // console.log('   From:', fromPublicKey);
    // console.log('   To:', toPublicKey);
    // console.log('   Amount:', amount);

    // Validate request (skip signature for create-deploy)
    const validation = casperService.validateTransaction({
      fromPublicKey,
      toPublicKey,
      amount,
      signature: '' // No signature needed for create-deploy
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Create deploy
    const { deploy, deployHash } = await casperService.createTransferDeploy(
      fromPublicKey,
      toPublicKey,
      amount
    );

    // Store deploy temporarily for later use
    deployStorage.set(deployHash, deploy);
    
    // Clean up old deploys (keep only last 100)
    if (deployStorage.size > 100) {
      const firstKey = deployStorage.keys().next().value;
      if (firstKey) {
        deployStorage.delete(firstKey);
      }
    }

    res.json({
      success: true,
      deployHash,
      deployJson: JSON.stringify(deploy), // Include deploy JSON for wallet signing
      message: 'Deploy created successfully. Sign the deployHash with your wallet.'
    });

  } catch (error) {
    console.error('❌ Error creating deploy:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post("/api/casper/test-real-transaction", async (req, res) => {
  try {
    const { fromPublicKey, toPublicKey, amount } = req.body;

    // console.log('🧪 Testing REAL transaction with private key signing');
    // console.log('   From:', fromPublicKey);
    // console.log('   To:', toPublicKey);
    // console.log('   Amount:', amount, 'motes');

    // Use the actual private key for testing
    const privateKeyHex = 'b71ff22c7be8da23b6ec04f036fdf5e6e3c1d600147ddf61e2e18e3fce5349fb';
    
    // Create deploy
    const { deploy, deployHash } = await casperService.createTransferDeploy(
      fromPublicKey,
      toPublicKey,
      amount
    );

    // console.log('✅ Deploy created for testing:', deployHash);

    // Sign with actual private key
    const result = await casperService.submitSignedDeployWithPrivateKey(
      deploy,
      privateKeyHex,
      fromPublicKey
    );

    if (result.success) {
      // console.log('🎉 TEST TRANSACTION SUCCESSFUL!');
      // console.log('   Deploy hash:', result.deployHash);
      // console.log('   Explorer:', result.explorerUrl);
    }

    res.json(result);

  } catch (error) {
    console.error('❌ Test transaction failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post("/api/casper/submit-transaction", async (req, res) => {
  try {
    const { fromPublicKey, toPublicKey, amount, signature, deployHash } = req.body;

    // console.log('🚀 Submitting real Casper transaction');
    // console.log('   From:', fromPublicKey);
    // console.log('   To:', toPublicKey);
    // console.log('   Amount:', amount, 'motes');
    // console.log('   Deploy hash:', deployHash);

    // Validate request
    const validation = casperService.validateTransaction({
      fromPublicKey,
      toPublicKey,
      amount,
      signature
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Retrieve the stored deploy
    const deploy = deployStorage.get(deployHash);
    
    if (!deploy) {
      return res.status(400).json({
        success: false,
        error: 'Deploy not found. Please create a new deploy first.'
      });
    }

    // console.log('✅ Retrieved stored deploy for hash:', deployHash);

    // Submit signed deploy
    const result = await casperService.submitSignedDeploy(
      deploy,
      signature,
      fromPublicKey
    );

    // Clean up the stored deploy after use
    deployStorage.delete(deployHash);

    if (result.success) {
      // console.log('✅ Transaction submitted successfully');
      // console.log('   Deploy hash:', result.deployHash);
      // console.log('   Explorer:', result.explorerUrl);
    } else {
      console.error('❌ Transaction failed:', result.error);
    }

    res.json(result);

  } catch (error) {
    console.error('❌ Error submitting transaction:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get("/api/casper/balance/:publicKey", async (req, res) => {
  try {
    const { publicKey } = req.params;
    const balance = await casperService.getAccountBalance(publicKey);
    
    res.json({
      success: true,
      publicKey,
      balance,
      balanceCSPR: (parseInt(balance) / 1000000000).toFixed(9)
    });

  } catch (error) {
    console.error('❌ Error fetching balance:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Protected endpoint with payment requirement
app.get("/api/premium-content", casperX402Middleware, (_req, res) => {
  res.json({
    message: "🎉 Welcome to premium content!",
    content: "This is exclusive content that requires payment to access.",
    redirect: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    timestamp: new Date().toISOString()
  });
});

// Facilitator proxy endpoints
app.get("/facilitator/health", async (_req, res) => {
  try {
    const response = await fetch(`${FACILITATOR_BASE_URL}/health`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(503).json({ error: "Facilitator unavailable" });
  }
});

app.get("/facilitator/supported-tokens", async (_req, res) => {
  try {
    const response = await fetch(`${FACILITATOR_BASE_URL}/get_supported_tokens`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(503).json({ error: "Facilitator unavailable" });
  }
});

app.post("/facilitator/estimate-fees", async (req, res) => {
  try {
    const response = await fetch(`${FACILITATOR_BASE_URL}/estimate_tx_fees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(503).json({ error: "Facilitator unavailable" });
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  // console.log('\n🛑 Shutting down server...');
  if (facilitatorProcess) {
    facilitatorProcess.kill();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  // console.log('\n🛑 Shutting down server...');
  if (facilitatorProcess) {
    facilitatorProcess.kill();
  }
  process.exit(0);
});

async function startServer() {
  try {
    // Start facilitator first
    await startFacilitator();
    
    app.listen(PORT, () => {
      // console.log(`🚀 X402 Casper server running at http://localhost:${PORT}`);
      // console.log(`📋 API info available at http://localhost:${PORT}/api/info`);
      // console.log(`🏥 Health check at http://localhost:${PORT}/health`);
      // console.log(`🔗 Facilitator at ${FACILITATOR_BASE_URL}`);
      // console.log(`📜 Contract hash: ${CASPER_CONTRACT_HASH}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
