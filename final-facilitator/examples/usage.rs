use final_facilitator::simple_lib::*;

fn main() {
    // Example usage of admin token utilities
    println!("=== Admin Token Utilities ===");
    
    // Initialize ATAs
    let success = admin::initialize_atas(
        Some(1000),  // compute_unit_price
        Some(200000), // compute_unit_limit
        Some(10),     // chunk_size
        None,         // fee_payer_key
    );
    println!("ATA initialization success: {}", success);
    
    // Find missing ATAs
    let address = Address::zero();
    let missing_atas = admin::find_missing_atas(&address);
    println!("Missing ATAs count: {}", missing_atas.len());
    
    println!("\n=== Fee Calculation ===");
    
    // Calculate fees
    let fee_calc = fee::estimate_kora_fee(
        1024,  // transaction_size
        true,  // is_payment_required
        100000, // base_fee_lamports
    );
    
    println!("Total fee: {} lamports", fee_calc.total_fee_lamports);
    println!("Base fee: {} lamports", fee_calc.base_fee);
    println!("Kora signature fee: {} lamports", fee_calc.kora_signature_fee);
    
    // Calculate fee in token
    let token_fee = fee::calculate_fee_in_token(fee_calc.total_fee_lamports, Some(1.5));
    if let Some(fee) = token_fee {
        println!("Fee in token: {} units", fee);
    }
    
    // Calculate fee payer outflow
    let outflow = fee::calculate_fee_payer_outflow(1024, true);
    println!("Fee payer outflow: {} lamports", outflow);
    
    println!("\n=== Price Calculator ===");
    
    // Create price calculator
    let calculator = price::PriceCalculator::new(50000)
        .with_margin(1.2)
        .with_fixed_fee(75000);
    
    let required_fee = calculator.get_required_lamports_with_fixed();
    println!("Required fee (fixed): {} lamports", required_fee);
    
    let margin_fee = calculator.get_required_lamports_with_margin(60000);
    println!("Required fee (with margin): {} lamports", margin_fee);
    
    let total_cost = calculator.estimate_total_cost(1024, 5);
    println!("Total estimated cost: {} lamports", total_cost);
    
    let fee_rate = calculator.get_fee_rate(1024);
    println!("Fee rate: {:.2} lamports per byte", fee_rate);
    
    let priority_fee = calculator.calculate_priority_fee(7);
    println!("Priority fee (congestion level 7): {} lamports", priority_fee);
}