import express from "express";
import cors from "cors";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 4402;
const FACILITATOR_PORT = process.env.FACILITATOR_PORT || 8080;
const CASPER_CONTRACT_HASH = process.env.CASPER_CONTRACT_HASH;
const CASPER_PAY_TO = process.env.CASPER_PAY_TO;
const FACILITATOR_BASE_URL = `http://localhost:${FACILITATOR_PORT}`;

let facilitatorProcess: ChildProcess | null = null;

// Middleware
app.use(express.json());
app.use(cors({
  origin: "http://localhost:3000",
  exposedHeaders: ["X-PAYMENT-RESPONSE", "X-PAYMENT-REQUIRED"]
}));

async function startFacilitator() {
  try {
    const facilitatorPath = path.resolve(__dirname, "../../final-facilitator");
    
    console.log(`Starting Casper facilitator at ${facilitatorPath}...`);
    
    facilitatorProcess = spawn("cargo", ["run", "--bin", "facilitator-server"], {
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
      console.log(`[Facilitator] ${data.toString()}`);
    });

    facilitatorProcess.stderr?.on("data", (data: Buffer) => {
      console.error(`[Facilitator Error] ${data.toString()}`);
    });

    facilitatorProcess.on("close", (code: number) => {
      console.log(`Facilitator process exited with code ${code}`);
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
      amount: "1000000000", // 1 CSPR in motes
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
    const verificationResponse = await fetch(`${FACILITATOR_BASE_URL}/verify_payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    
    if (verificationResponse.ok) {
      const result = await verificationResponse.json();
      if (result.valid) {
        return next(); // Payment verified, continue
      }
    }
    
    // Payment verification failed
    res.status(402);
    return res.json({
      error: "Payment Verification Failed",
      message: "The provided payment could not be verified"
    });
    
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
  console.log('\n🛑 Shutting down server...');
  if (facilitatorProcess) {
    facilitatorProcess.kill();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
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
      console.log(`🚀 X402 Casper server running at http://localhost:${PORT}`);
      console.log(`📋 API info available at http://localhost:${PORT}/api/info`);
      console.log(`🏥 Health check at http://localhost:${PORT}/health`);
      console.log(`🔗 Facilitator at ${FACILITATOR_BASE_URL}`);
      console.log(`📜 Contract hash: ${CASPER_CONTRACT_HASH}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
