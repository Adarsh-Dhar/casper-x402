/*!
# Token Management Example

This example demonstrates how to manage supported tokens in the Casper Facilitator,
including adding tokens, calculating exchange rates, and handling token operations.

## Usage:
```bash
cargo run --example token_management
```
*/

use std::collections::HashMap;

#[derive(Debug, Clone)]
struct Token {
    pub contract_hash: String,
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub is_active: bool,
    pub exchange_rate: Option<f64>, // Rate to lamports
    pub min_transfer: Option<u64>,
    pub max_transfer: Option<u64>,
}

#[derive(Debug)]
struct TokenRegistry {
    tokens: HashMap<String, Token>,
    admin: String,
}

impl TokenRegistry {
    fn new(admin: String) -> Self {
        Self {
            tokens: HashMap::new(),
            admin,
        }
    }

    fn add_token(&mut self, token: Token) -> Result<(), String> {
        if self.tokens.contains_key(&token.symbol) {
            return Err(format!("Token {} already exists", token.symbol));
        }

        if token.decimals > 18 {
            return Err("Token decimals cannot exceed 18".to_string());
        }

        println!("✅ Added token: {} ({})", token.name, token.symbol);
        self.tokens.insert(token.symbol.clone(), token);
        Ok(())
    }

    fn remove_token(&mut self, symbol: &str) -> Result<(), String> {
        if !self.tokens.contains_key(symbol) {
            return Err(format!("Token {} not found", symbol));
        }

        self.tokens.remove(symbol);
        println!("🗑️ Removed token: {}", symbol);
        Ok(())
    }

    fn update_exchange_rate(&mut self, symbol: &str, new_rate: f64) -> Result<(), String> {
        let token = self.tokens.get_mut(symbol)
            .ok_or_else(|| format!("Token {} not found", symbol))?;

        let old_rate = token.exchange_rate;
        token.exchange_rate = Some(new_rate);
        
        println!("📈 Updated {} exchange rate: {:?} → {}", 
                symbol, old_rate, new_rate);
        Ok(())
    }

    fn toggle_token_status(&mut self, symbol: &str) -> Result<(), String> {
        let token = self.tokens.get_mut(symbol)
            .ok_or_else(|| format!("Token {} not found", symbol))?;

        token.is_active = !token.is_active;
        let status = if token.is_active { "ACTIVE" } else { "INACTIVE" };
        println!("🔄 Token {} status: {}", symbol, status);
        Ok(())
    }

    fn get_supported_tokens(&self) -> Vec<&Token> {
        self.tokens.values().filter(|t| t.is_active).collect()
    }

    fn calculate_token_value(&self, symbol: &str, amount: u64) -> Result<u64, String> {
        let token = self.tokens.get(symbol)
            .ok_or_else(|| format!("Token {} not found", symbol))?;

        let rate = token.exchange_rate
            .ok_or_else(|| format!("No exchange rate set for {}", symbol))?;

        let base_units = 10_u64.pow(token.decimals as u32);
        let value_in_lamports = ((amount as f64 / base_units as f64) * rate) as u64;
        
        Ok(value_in_lamports)
    }
}

fn main() {
    println!("🪙 Token Management Examples");
    println!("=============================\n");

    // Initialize token registry
    let mut registry = TokenRegistry::new("admin_account_hash".to_string());

    // Example 1: Add popular tokens
    println!("Example 1: Adding Tokens to Registry");
    println!("------------------------------------");

    let tokens_to_add = vec![
        Token {
            contract_hash: "hash-usdc123456789abcdef".to_string(),
            symbol: "USDC".to_string(),
            name: "USD Coin".to_string(),
            decimals: 6,
            is_active: true,
            exchange_rate: Some(1.0), // 1 USDC = 1 lamport
            min_transfer: Some(1_000_000), // 1 USDC minimum
            max_transfer: Some(1_000_000_000_000), // 1M USDC maximum
        },
        Token {
            contract_hash: "hash-cspr987654321fedcba".to_string(),
            symbol: "CSPR".to_string(),
            name: "Casper Token".to_string(),
            decimals: 9,
            is_active: true,
            exchange_rate: Some(0.05), // 1 CSPR = 0.05 lamports
            min_transfer: Some(1_000_000_000), // 1 CSPR minimum
            max_transfer: Some(1_000_000_000_000_000), // 1M CSPR maximum
        },
        Token {
            contract_hash: "hash-weth111222333444555".to_string(),
            symbol: "WETH".to_string(),
            name: "Wrapped Ethereum".to_string(),
            decimals: 18,
            is_active: true,
            exchange_rate: Some(2500.0), // 1 WETH = 2500 lamports
            min_transfer: Some(1_000_000_000_000_000), // 0.001 WETH minimum
            max_transfer: Some(100_000_000_000_000_000_000), // 100 WETH maximum
        },
    ];

    for token in tokens_to_add {
        if let Err(e) = registry.add_token(token) {
            println!("❌ Error: {}", e);
        }
    }

    // Example 2: List supported tokens
    println!("\nExample 2: Supported Tokens");
    println!("---------------------------");
    
    let supported = registry.get_supported_tokens();
    println!("Currently supported tokens: {}", supported.len());
    
    for token in &supported {
        println!("  {} ({}):", token.name, token.symbol);
        println!("    Contract: {}", token.contract_hash);
        println!("    Decimals: {}", token.decimals);
        println!("    Exchange rate: {:?} lamports", token.exchange_rate);
        println!("    Transfer limits: {:?} - {:?}", token.min_transfer, token.max_transfer);
        println!();
    }

    // Example 3: Exchange rate updates
    println!("Example 3: Exchange Rate Management");
    println!("-----------------------------------");

    // Simulate market price changes
    let rate_updates = vec![
        ("CSPR", 0.048),  // CSPR price drops
        ("WETH", 2650.0), // WETH price increases
        ("USDC", 1.001),  // USDC slight premium
    ];

    for (symbol, new_rate) in rate_updates {
        if let Err(e) = registry.update_exchange_rate(symbol, new_rate) {
            println!("❌ Error: {}", e);
        }
    }

    // Example 4: Token value calculations
    println!("\nExample 4: Token Value Calculations");
    println!("-----------------------------------");

    let test_amounts = vec![
        ("USDC", 5_000_000),      // 5 USDC
        ("CSPR", 100_000_000_000), // 100 CSPR
        ("WETH", 1_000_000_000_000_000_000), // 1 WETH
    ];

    for (symbol, amount) in test_amounts {
        match registry.calculate_token_value(symbol, amount) {
            Ok(value) => {
                let human_amount = format_token_amount(amount, 
                    registry.tokens.get(symbol).unwrap().decimals);
                println!("{} {} = {} lamports", human_amount, symbol, value);
            }
            Err(e) => println!("❌ Error calculating {}: {}", symbol, e),
        }
    }

    // Example 5: Token status management
    println!("\nExample 5: Token Status Management");
    println!("----------------------------------");

    // Temporarily disable WETH
    if let Err(e) = registry.toggle_token_status("WETH") {
        println!("❌ Error: {}", e);
    }

    println!("Active tokens after disabling WETH: {}", 
             registry.get_supported_tokens().len());

    // Re-enable WETH
    if let Err(e) = registry.toggle_token_status("WETH") {
        println!("❌ Error: {}", e);
    }

    println!("Active tokens after re-enabling WETH: {}", 
             registry.get_supported_tokens().len());

    // Example 6: Fee calculation in different tokens
    println!("\nExample 6: Cross-Token Fee Calculations");
    println!("--------------------------------------");

    let base_fee_lamports = 25000; // 25,000 lamports
    println!("Base fee: {} lamports", base_fee_lamports);
    println!("Equivalent fees in supported tokens:");

    for token in registry.get_supported_tokens() {
        if let Some(rate) = token.exchange_rate {
            let token_fee = calculate_fee_in_token(base_fee_lamports, rate, token.decimals);
            let human_readable = format_token_amount(token_fee, token.decimals);
            println!("  {}: {} {} (raw: {})", 
                    token.symbol, human_readable, token.symbol, token_fee);
        }
    }

    // Example 7: Validation and error handling
    println!("\nExample 7: Validation and Error Handling");
    println!("----------------------------------------");

    // Try to add duplicate token
    let duplicate_token = Token {
        contract_hash: "hash-duplicate".to_string(),
        symbol: "USDC".to_string(), // Duplicate symbol
        name: "Duplicate USDC".to_string(),
        decimals: 6,
        is_active: true,
        exchange_rate: Some(1.0),
        min_transfer: None,
        max_transfer: None,
    };

    if let Err(e) = registry.add_token(duplicate_token) {
        println!("✅ Correctly rejected duplicate token: {}", e);
    }

    // Try to update non-existent token
    if let Err(e) = registry.update_exchange_rate("NONEXISTENT", 1.0) {
        println!("✅ Correctly handled missing token: {}", e);
    }

    // Try to add token with too many decimals
    let invalid_token = Token {
        contract_hash: "hash-invalid".to_string(),
        symbol: "INVALID".to_string(),
        name: "Invalid Token".to_string(),
        decimals: 25, // Too many decimals
        is_active: true,
        exchange_rate: Some(1.0),
        min_transfer: None,
        max_transfer: None,
    };

    if let Err(e) = registry.add_token(invalid_token) {
        println!("✅ Correctly rejected invalid decimals: {}", e);
    }

    println!("\n✅ Token management examples completed!");
    println!("Final registry contains {} tokens", registry.tokens.len());
}

fn format_token_amount(amount: u64, decimals: u8) -> String {
    let divisor = 10_u64.pow(decimals as u32);
    let whole = amount / divisor;
    let fraction = amount % divisor;
    
    if fraction == 0 {
        format!("{}", whole)
    } else {
        let fraction_str = format!("{:0width$}", fraction, width = decimals as usize);
        let trimmed = fraction_str.trim_end_matches('0');
        if trimmed.is_empty() {
            format!("{}", whole)
        } else {
            format!("{}.{}", whole, trimmed)
        }
    }
}

fn calculate_fee_in_token(fee_lamports: u64, exchange_rate: f64, decimals: u8) -> u64 {
    let base_units = 10_u64.pow(decimals as u32);
    ((fee_lamports as f64 / exchange_rate) * base_units as f64) as u64
}