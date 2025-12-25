use std::collections::HashMap;
use std::convert::Infallible;
use warp::Filter;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct SignTransactionRequest {
    transaction: String,
    signer_key: Option<String>,
    sig_verify: Option<bool>,
}

#[derive(Debug, Serialize)]
struct SignTransactionResponse {
    signed_transaction: String,
    signer_pubkey: String,
    signature: String,
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: String,
    timestamp: String,
    version: String,
}

#[derive(Debug, Serialize)]
struct ConfigResponse {
    contract_hash: String,
    network: String,
    supported_tokens: Vec<String>,
    fee_rates: FeeRates,
    endpoints: HashMap<String, String>,
}

#[derive(Debug, Serialize)]
struct FeeRates {
    base_rate: u64,
    instruction_rate: u64,
    priority_multiplier: f64,
}

#[derive(Debug, Deserialize)]
struct EstimateFeeRequest {
    transaction_size: Option<u64>,
    instruction_count: Option<u32>,
    uses_lookup_tables: Option<bool>,
    is_payment_required: Option<bool>,
}

#[derive(Debug, Serialize)]
struct EstimateFeeResponse {
    fee_in_lamports: u64,
    fee_in_token: Option<u64>,
    signer_pubkey: String,
    payment_address: String,
    breakdown: FeeBreakdown,
}

#[derive(Debug, Serialize)]
struct FeeBreakdown {
    base_fee: u64,
    instruction_fee: u64,
    priority_fee: u64,
    total_fee: u64,
}

#[derive(Debug, Serialize)]
struct SupportedTokensResponse {
    tokens: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct PaymentVerificationRequest {
    deploy_hash: String,
    amount: String,
    recipient: String,
    sender: Option<String>,
    public_key: Option<String>,
    signature: Option<String>,
    network: Option<String>,
    timestamp: Option<u64>,
}

#[derive(Debug, Serialize)]
struct PaymentVerificationResponse {
    valid: bool,
    message: String,
    transaction_hash: Option<String>,
    timestamp: u64,
}

async fn health_handler() -> Result<impl warp::Reply, Infallible> {
    let response = HealthResponse {
        status: "ok".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        version: "0.1.0".to_string(),
    };
    Ok(warp::reply::json(&response))
}

async fn config_handler() -> Result<impl warp::Reply, Infallible> {
    let mut endpoints = HashMap::new();
    endpoints.insert("health".to_string(), "/health".to_string());
    endpoints.insert("config".to_string(), "/get_config".to_string());
    endpoints.insert("estimate_fees".to_string(), "/estimate_tx_fees".to_string());
    endpoints.insert("sign_transaction".to_string(), "/sign_tx".to_string());
    endpoints.insert("supported_tokens".to_string(), "/get_supported_tokens".to_string());

    let response = ConfigResponse {
        contract_hash: std::env::var("CONTRACT_HASH")
            .unwrap_or_else(|_| "6a545487ba47c62bdf02f68a9d8ada590fef2a1d28778dd5b346d63927e61b4a".to_string()),
        network: "casper-test".to_string(),
        supported_tokens: vec!["CSPR".to_string()],
        fee_rates: FeeRates {
            base_rate: 100000000, // 0.1 CSPR
            instruction_rate: 10000000, // 0.01 CSPR per instruction
            priority_multiplier: 1.5,
        },
        endpoints,
    };
    Ok(warp::reply::json(&response))
}

async fn estimate_fees_handler(request: EstimateFeeRequest) -> Result<impl warp::Reply, Infallible> {
    let transaction_size = request.transaction_size.unwrap_or(250);
    let instruction_count = request.instruction_count.unwrap_or(1);
    
    let base_fee = 100000000; // 0.1 CSPR
    let instruction_fee = instruction_count as u64 * 10000000; // 0.01 CSPR per instruction
    let priority_fee = (base_fee as f64 * 0.1) as u64; // 10% priority fee
    let total_fee = base_fee + instruction_fee + priority_fee;

    let response = EstimateFeeResponse {
        fee_in_lamports: total_fee,
        fee_in_token: Some(total_fee), // Same for CSPR
        signer_pubkey: "01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef".to_string(),
        payment_address: "account-hash-0123456789abcdef0123456789abcdef01234567".to_string(),
        breakdown: FeeBreakdown {
            base_fee,
            instruction_fee,
            priority_fee,
            total_fee,
        },
    };
    Ok(warp::reply::json(&response))
}

async fn sign_transaction_handler(request: SignTransactionRequest) -> Result<impl warp::Reply, Infallible> {
    // For demo purposes, return a mock signed transaction
    let response = SignTransactionResponse {
        signed_transaction: format!("signed_{}", request.transaction),
        signer_pubkey: "01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef".to_string(),
        signature: "mock_signature_".to_string() + &hex::encode(&[1, 2, 3, 4, 5, 6, 7, 8]),
    };
    Ok(warp::reply::json(&response))
}

async fn send_transaction_handler(_request: SignTransactionRequest) -> Result<impl warp::Reply, Infallible> {
    // For demo purposes, return a mock transaction hash
    let response = serde_json::json!({
        "transaction_hash": format!("tx_hash_{}", hex::encode(&[9, 10, 11, 12, 13, 14, 15, 16])),
        "status": "submitted"
    });
    Ok(warp::reply::json(&response))
}

async fn supported_tokens_handler() -> Result<impl warp::Reply, Infallible> {
    let response = SupportedTokensResponse {
        tokens: vec!["CSPR".to_string()],
    };
    Ok(warp::reply::json(&response))
}

async fn verify_payment_handler(request: PaymentVerificationRequest) -> Result<impl warp::Reply, Infallible> {
    let sender_ok = request
        .sender
        .as_deref()
        .map(|s| !s.is_empty())
        .unwrap_or(false);
    let public_key_ok = request
        .public_key
        .as_deref()
        .map(|s| !s.is_empty())
        .unwrap_or(false);
    let signature_ok = request
        .signature
        .as_deref()
        .map(|s| !s.is_empty())
        .unwrap_or(false);

    let valid = !request.deploy_hash.is_empty()
        && (sender_ok || (public_key_ok && signature_ok))
        && !request.amount.is_empty();

    let now = request.timestamp.unwrap_or_else(|| chrono::Utc::now().timestamp() as u64);

    let response = PaymentVerificationResponse {
        valid,
        message: if valid { 
            "Payment verified successfully".to_string() 
        } else { 
            "Invalid payment data".to_string() 
        },
        transaction_hash: if valid { 
            Some(request.deploy_hash.clone()) 
        } else { 
            None 
        },
        timestamp: now,
    };
    Ok(warp::reply::json(&response))
}

#[tokio::main]
async fn main() {
    // Enable logging
    if std::env::var("RUST_LOG").is_err() {
        std::env::set_var("RUST_LOG", "info");
    }
    env_logger::init();

    let port = std::env::var("FACILITATOR_PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()
        .unwrap_or(8080);

    println!("🚀 Starting Casper Facilitator Server on port {}", port);

    // CORS configuration
    let cors = warp::cors()
        .allow_any_origin()
        .allow_headers(vec!["content-type", "authorization", "x-payment"])
        .allow_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"]);

    // Health endpoint
    let health = warp::path("health")
        .and(warp::get())
        .and_then(health_handler);

    // Config endpoint
    let config = warp::path("get_config")
        .and(warp::get())
        .and_then(config_handler);

    // Estimate fees endpoint
    let estimate_fees = warp::path("estimate_tx_fees")
        .and(warp::post())
        .and(warp::body::json())
        .and_then(estimate_fees_handler);

    // Sign transaction endpoint
    let sign_tx = warp::path("sign_tx")
        .and(warp::post())
        .and(warp::body::json())
        .and_then(sign_transaction_handler);

    // Send transaction endpoint
    let send_tx = warp::path("send_tx")
        .and(warp::post())
        .and(warp::body::json())
        .and_then(send_transaction_handler);

    // Supported tokens endpoint
    let supported_tokens = warp::path("get_supported_tokens")
        .and(warp::get())
        .and_then(supported_tokens_handler);

    // Payment verification endpoint
    let verify_payment = warp::path("verify_payment")
        .and(warp::post())
        .and(warp::body::json())
        .and_then(verify_payment_handler);

    // Combine all routes
    let routes = health
        .or(config)
        .or(estimate_fees)
        .or(sign_tx)
        .or(send_tx)
        .or(supported_tokens)
        .or(verify_payment)
        .with(cors);

    println!("📡 Facilitator endpoints:");
    println!("   • Health: http://localhost:{}/health", port);
    println!("   • Config: http://localhost:{}/get_config", port);
    println!("   • Estimate Fees: http://localhost:{}/estimate_tx_fees", port);
    println!("   • Sign Transaction: http://localhost:{}/sign_tx", port);
    println!("   • Supported Tokens: http://localhost:{}/get_supported_tokens", port);
    println!("   • Verify Payment: http://localhost:{}/verify_payment", port);

    warp::serve(routes)
        .run(([127, 0, 0, 1], port))
        .await;
}
