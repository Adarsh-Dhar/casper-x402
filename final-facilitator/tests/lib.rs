// Test library for casper-vault-facilitator
// This file ensures all test modules are compiled and run

pub mod common;

// Import all test modules
mod test_admin;
mod test_fees;
mod test_transactions;
mod test_integration;
mod test_security;
mod test_queries;
mod test_property;

// Re-export common utilities for use in other test files
pub use common::*;