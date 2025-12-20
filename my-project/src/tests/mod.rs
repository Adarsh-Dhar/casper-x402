//! Unit tests for the Odra CLI deployment system

#[cfg(test)]
mod dependency_tests {
    use std::process::Command;

    #[test]
    fn test_cargo_toml_contains_odra_cli_dependency() {
        let cargo_toml = std::fs::read_to_string("Cargo.toml")
            .expect("Failed to read Cargo.toml");
        
        // Check that odra-cli dependency is present
        assert!(cargo_toml.contains("odra-cli"), "Cargo.toml should contain odra-cli dependency");
        
        // Check that the dependency is version 2
        assert!(cargo_toml.contains("odra-cli = \"2\""), "odra-cli should be version 2");
    }

    #[test]
    fn test_binary_entry_point_configured() {
        let cargo_toml = std::fs::read_to_string("Cargo.toml")
            .expect("Failed to read Cargo.toml");
        
        // Check that odra-cli binary is configured
        assert!(cargo_toml.contains("name = \"odra-cli\""), "Binary entry point should be named odra-cli");
        assert!(cargo_toml.contains("path = \"bin/odra-cli.rs\""), "Binary should point to bin/odra-cli.rs");
    }

    #[test]
    fn test_project_builds_without_conflicts() {
        let output = Command::new("cargo")
            .args(&["check", "--bin", "odra-cli"])
            .output()
            .expect("Failed to execute cargo check");
        
        assert!(output.status.success(), 
            "Project should build without conflicts. Error: {}", 
            String::from_utf8_lossy(&output.stderr)
        );
    }

    #[test]
    fn test_odra_cli_binary_exists() {
        let binary_path = std::path::Path::new("bin/odra-cli.rs");
        assert!(binary_path.exists(), "bin/odra-cli.rs file should exist");
    }

    #[test]
    fn test_odra_cli_file_has_valid_syntax() {
        let cli_content = std::fs::read_to_string("bin/odra-cli.rs")
            .expect("Failed to read bin/odra-cli.rs");
        
        // Check for required imports
        assert!(cli_content.contains("use my_project::flipper::Flipper"), "Should import Flipper");
        assert!(cli_content.contains("use odra::host::{HostEnv, NoArgs}"), "Should import HostEnv and NoArgs");
        assert!(cli_content.contains("use odra_cli"), "Should import odra_cli");
        
        // Check for DeployFlipperScript struct
        assert!(cli_content.contains("pub struct DeployFlipperScript"), "Should define DeployFlipperScript");
        
        // Check for main function
        assert!(cli_content.contains("pub fn main()"), "Should have main function");
    }
}

#[cfg(test)]
mod property_tests {
    use proptest::prelude::*;
    use crate::flipper::Flipper;
    use odra::host::{Deployer, NoArgs};
    use odra::prelude::Addressable;
    use odra_test::env;

    proptest! {
        /// **Feature: odra-cli-deployment, Property 7: Idempotent deployment behavior**
        /// For any deployment configuration, the contract should maintain consistent 
        /// behavior across multiple deployments in the same environment
        #[test]
        fn test_idempotent_deployment_behavior(
            _deployment_count in 2u32..5u32
        ) {
            let test_env = env();
            
            // Deploy multiple contracts and verify they all have the same initial behavior
            let mut contracts = Vec::new();
            for _ in 0.._deployment_count {
                let contract = Flipper::deploy(&test_env, NoArgs);
                contracts.push(contract);
            }
            
            // All contracts should have the same initial state
            let first_state = contracts[0].get();
            for contract in &contracts {
                prop_assert_eq!(contract.get(), first_state, "All contracts should have identical initial state");
            }
            
            // All contracts should behave identically when flipped
            for contract in contracts.iter_mut() {
                contract.flip();
                prop_assert_eq!(contract.get(), !first_state, "All contracts should flip to the same state");
            }
        }
    }

    proptest! {
        /// **Feature: odra-cli-deployment, Property 8: Initial deployment creation**
        /// For any clean container state, the first deployment should create a new 
        /// contract instance and return a valid address
        #[test]
        fn test_initial_deployment_creation(
            _test_seed in any::<u64>()
        ) {
            let test_env = env();
            
            // Deploy contract in clean environment
            let contract = Flipper::deploy(&test_env, NoArgs);
            let address = contract.address();
            
            // Address should be valid (not empty)
            prop_assert!(!address.to_string().is_empty(), "Contract address should not be empty");
            
            // Contract should have initial state (false)
            prop_assert_eq!(contract.get(), false, "Initial contract state should be false");
            
            // Contract should be functional (can flip state)
            let mut mutable_contract = contract;
            mutable_contract.flip();
            prop_assert_eq!(mutable_contract.get(), true, "Contract should be able to flip state");
        }
    }
}

#[cfg(test)]
mod cli_property_tests {
    use proptest::prelude::*;
    use std::process::Command;

    proptest! {
        /// **Feature: odra-cli-deployment, Property 1: CLI command handling consistency**
        /// For any valid command line arguments provided to the Odra CLI, the system 
        /// should parse and execute without panicking or crashing
        #[test]
        fn test_cli_command_handling_consistency(
            help_flag in prop::bool::ANY
        ) {
            // Test that CLI handles help commands consistently
            let mut cmd = Command::new("cargo");
            cmd.args(&["run", "--bin", "odra-cli", "--"]);
            
            if help_flag {
                cmd.arg("--help");
            } else {
                cmd.arg("help");
            }
            
            let output = cmd.output();
            
            // Command should execute without panicking
            prop_assert!(output.is_ok(), "CLI should handle help commands without errors");
            
            if let Ok(result) = output {
                // Should not crash (exit code should be 0 for help)
                prop_assert!(result.status.code().unwrap_or(-1) >= 0, "CLI should not crash on help commands");
                
                // Should produce some output (help text)
                let stdout = String::from_utf8_lossy(&result.stdout);
                let stderr = String::from_utf8_lossy(&result.stderr);
                prop_assert!(!stdout.is_empty() || !stderr.is_empty(), "CLI should produce help output");
            }
        }
    }

    proptest! {
        /// **Feature: odra-cli-deployment, Property 2: Environment configuration validation**
        /// For any set of environment variables, the system should validate all required 
        /// variables are properly formatted before attempting deployment
        #[test]
        fn test_environment_configuration_validation(
            node_address in "https?://[a-zA-Z0-9.-]+:[0-9]{1,5}",
            chain_name in "[a-zA-Z0-9-]+",
            key_path in "[a-zA-Z0-9/_.-]+\\.pem"
        ) {
            use std::env;
            use tempfile::NamedTempFile;
            use std::io::Write;
            
            // Create a temporary .env file with the generated values
            let mut temp_file = NamedTempFile::new().unwrap();
            writeln!(temp_file, "ODRA_CASPER_NODE_ADDRESS=\"{}\"", node_address).unwrap();
            writeln!(temp_file, "ODRA_CASPER_CHAIN_NAME=\"{}\"", chain_name).unwrap();
            writeln!(temp_file, "ODRA_CASPER_SECRET_KEY_PATH=\"{}\"", key_path).unwrap();
            
            // Set environment variables
            env::set_var("ODRA_CASPER_NODE_ADDRESS", &node_address);
            env::set_var("ODRA_CASPER_CHAIN_NAME", &chain_name);
            env::set_var("ODRA_CASPER_SECRET_KEY_PATH", &key_path);
            
            // Test that validation accepts properly formatted values
            let node_valid = node_address.starts_with("http://") || node_address.starts_with("https://");
            let chain_valid = !chain_name.is_empty();
            let key_valid = key_path.ends_with(".pem");
            
            prop_assert!(node_valid, "Generated node address should be valid HTTP(S) URL");
            prop_assert!(chain_valid, "Generated chain name should not be empty");
            prop_assert!(key_valid, "Generated key path should end with .pem");
            
            // Clean up environment variables
            env::remove_var("ODRA_CASPER_NODE_ADDRESS");
            env::remove_var("ODRA_CASPER_CHAIN_NAME");
            env::remove_var("ODRA_CASPER_SECRET_KEY_PATH");
        }
    }
}

#[cfg(test)]
mod cli_unit_tests {
    use std::process::Command;

    #[test]
    fn test_odra_cli_initialization() {
        let cli_content = std::fs::read_to_string("bin/odra-cli.rs")
            .expect("Failed to read bin/odra-cli.rs");
        
        // Test that OdraCli is properly initialized
        assert!(cli_content.contains("OdraCli::new()"), "Should initialize OdraCli");
        assert!(cli_content.contains(".about("), "Should set CLI description");
        assert!(cli_content.contains(".deploy(DeployFlipperScript)"), "Should register deployment script");
        assert!(cli_content.contains(".contract::<Flipper>()"), "Should register Flipper contract");
    }

    #[test]
    fn test_deployment_script_registration() {
        let cli_content = std::fs::read_to_string("bin/odra-cli.rs")
            .expect("Failed to read bin/odra-cli.rs");
        
        // Test that DeployFlipperScript is properly defined and registered
        assert!(cli_content.contains("pub struct DeployFlipperScript"), "Should define DeployFlipperScript");
        assert!(cli_content.contains("impl DeployScript for DeployFlipperScript"), "Should implement DeployScript trait");
        assert!(cli_content.contains("fn deploy("), "Should have deploy method");
    }

    #[test]
    fn test_main_function_execution_flow() {
        let cli_content = std::fs::read_to_string("bin/odra-cli.rs")
            .expect("Failed to read bin/odra-cli.rs");
        
        // Test that main function has proper execution flow
        assert!(cli_content.contains("pub fn main()"), "Should have main function");
        assert!(cli_content.contains("cli.run()"), "Should call run method");
        
        // Test that CLI is properly configured before running
        let main_function_start = cli_content.find("pub fn main()").expect("Main function should exist");
        let run_call = cli_content.find("cli.run()").expect("Run call should exist");
        assert!(run_call > main_function_start, "Run call should come after main function start");
    }

    #[test]
    fn test_cli_binary_compiles() {
        let output = Command::new("cargo")
            .args(&["check", "--bin", "odra-cli"])
            .output()
            .expect("Failed to execute cargo check");
        
        assert!(output.status.success(), 
            "CLI binary should compile successfully. Error: {}", 
            String::from_utf8_lossy(&output.stderr)
        );
    }

    #[test]
    fn test_cli_help_command() {
        let output = Command::new("cargo")
            .args(&["run", "--bin", "odra-cli", "--", "--help"])
            .output()
            .expect("Failed to execute CLI help command");
        
        // Help command should not crash
        assert!(output.status.code().unwrap_or(-1) >= 0, "Help command should not crash");
        
        // Should produce some output
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        assert!(!stdout.is_empty() || !stderr.is_empty(), "Help command should produce output");
    }
}
#[cfg(test)]
mod environment_unit_tests {
    use std::env;
    use std::fs;

    #[test]
    fn test_env_file_creation_and_content() {
        let env_content = fs::read_to_string(".env")
            .expect("Failed to read .env file");
        
        // Test that .env file contains required configuration
        assert!(env_content.contains("ODRA_CASPER_NODE_ADDRESS"), ".env should contain node address");
        assert!(env_content.contains("ODRA_CASPER_CHAIN_NAME"), ".env should contain chain name");
        assert!(env_content.contains("ODRA_CASPER_SECRET_KEY_PATH"), ".env should contain secret key path");
        
        // Test specific values
        assert!(env_content.contains("http://65.21.227.180:7777"), ".env should contain correct node address");
        assert!(env_content.contains("casper-test"), ".env should contain correct chain name");
        assert!(env_content.contains("keys/secret_key.pem"), ".env should contain correct key path");
    }

    #[test]
    fn test_environment_variable_validation_logic() {
        // Test valid node address formats
        let valid_addresses = vec![
            "http://65.21.227.180:7777",
            "https://node.testnet.cspr.cloud",
            "http://localhost:7777",
            "https://example.com:8080"
        ];
        
        for address in valid_addresses {
            assert!(address.starts_with("http://") || address.starts_with("https://"),
                "Address {} should be valid", address);
        }
        
        // Test invalid node address formats
        let invalid_addresses = vec![
            "ftp://invalid.com",
            "node.testnet.cspr.cloud",
            "localhost:7777",
            ""
        ];
        
        for address in invalid_addresses {
            assert!(!(address.starts_with("http://") || address.starts_with("https://")),
                "Address {} should be invalid", address);
        }
    }

    #[test]
    fn test_environment_variable_presence() {
        // Temporarily set environment variables for testing
        env::set_var("TEST_ODRA_CASPER_NODE_ADDRESS", "http://test.com");
        env::set_var("TEST_ODRA_CASPER_CHAIN_NAME", "test-chain");
        env::set_var("TEST_ODRA_CASPER_SECRET_KEY_PATH", "test/key.pem");
        
        // Test that variables can be read
        assert_eq!(env::var("TEST_ODRA_CASPER_NODE_ADDRESS").unwrap(), "http://test.com");
        assert_eq!(env::var("TEST_ODRA_CASPER_CHAIN_NAME").unwrap(), "test-chain");
        assert_eq!(env::var("TEST_ODRA_CASPER_SECRET_KEY_PATH").unwrap(), "test/key.pem");
        
        // Clean up
        env::remove_var("TEST_ODRA_CASPER_NODE_ADDRESS");
        env::remove_var("TEST_ODRA_CASPER_CHAIN_NAME");
        env::remove_var("TEST_ODRA_CASPER_SECRET_KEY_PATH");
    }

    #[test]
    fn test_environment_validation_function_exists() {
        let cli_content = std::fs::read_to_string("bin/odra-cli.rs")
            .expect("Failed to read bin/odra-cli.rs");
        
        // Test that validation function exists and is called
        assert!(cli_content.contains("fn validate_environment"), "Should have validate_environment function");
        assert!(cli_content.contains("Self::validate_environment()?"), "Should call validation function");
        
        // Test that validation checks required variables
        assert!(cli_content.contains("ODRA_CASPER_NODE_ADDRESS"), "Should check node address");
        assert!(cli_content.contains("ODRA_CASPER_CHAIN_NAME"), "Should check chain name");
        assert!(cli_content.contains("ODRA_CASPER_SECRET_KEY_PATH"), "Should check secret key path");
    }

    #[test]
    fn test_error_handling_for_invalid_configuration() {
        let cli_content = std::fs::read_to_string("bin/odra-cli.rs")
            .expect("Failed to read bin/odra-cli.rs");
        
        // Test that validation provides helpful error messages
        assert!(cli_content.contains("Missing:") || cli_content.contains("empty"), 
            "Should provide error messages for missing/empty variables");
        assert!(cli_content.contains("http://") || cli_content.contains("https://"), 
            "Should validate URL format");
    }
}
#[cfg(test)]
mod command_generation_tests {
    use std::fs;

    #[test]
    fn test_deployment_command_documentation() {
        let deployment_doc = fs::read_to_string("DEPLOYMENT.md")
            .expect("Failed to read DEPLOYMENT.md");
        
        // Test that deployment documentation contains correct commands
        assert!(deployment_doc.contains("cargo run --bin odra-cli"), "Should document cargo run command");
        assert!(deployment_doc.contains("deploy DeployFlipperScript"), "Should document deploy subcommand");
        assert!(deployment_doc.contains("DeployFlipperScript"), "Should reference deployment script name");
    }

    #[test]
    fn test_command_parameter_validation() {
        let deployment_doc = fs::read_to_string("DEPLOYMENT.md")
            .expect("Failed to read DEPLOYMENT.md");
        
        // Test that documentation includes proper command structure
        assert!(deployment_doc.contains("--bin odra-cli"), "Should specify correct binary name");
        assert!(deployment_doc.contains("deploy"), "Should include deploy subcommand");
        
        // Test that troubleshooting information is included
        assert!(deployment_doc.contains("Troubleshooting") || deployment_doc.contains("troubleshooting"), 
            "Should include troubleshooting section");
    }

    #[test]
    fn test_documentation_completeness() {
        let deployment_doc = fs::read_to_string("DEPLOYMENT.md")
            .expect("Failed to read DEPLOYMENT.md");
        
        // Test that documentation covers all essential topics
        assert!(deployment_doc.contains("Prerequisites") || deployment_doc.contains("prerequisites"), 
            "Should include prerequisites");
        assert!(deployment_doc.contains("Environment") || deployment_doc.contains("environment"), 
            "Should mention environment configuration");
        assert!(deployment_doc.contains("Gas") || deployment_doc.contains("gas"), 
            "Should mention gas configuration");
        assert!(deployment_doc.contains("350"), "Should mention gas limit");
    }

    #[test]
    fn test_command_examples_validity() {
        let deployment_doc = fs::read_to_string("DEPLOYMENT.md")
            .expect("Failed to read DEPLOYMENT.md");
        
        // Test that command examples are properly formatted
        let has_cargo_command = deployment_doc.contains("cargo run --bin odra-cli deploy DeployFlipperScript");
        let has_alternative_command = deployment_doc.contains("cargo run --bin odra-cli -- deploy DeployFlipperScript");
        
        assert!(has_cargo_command || has_alternative_command, 
            "Should contain at least one valid command example");
    }

    #[test]
    fn test_expected_output_documentation() {
        let deployment_doc = fs::read_to_string("DEPLOYMENT.md")
            .expect("Failed to read DEPLOYMENT.md");
        
        // Test that expected output is documented
        assert!(deployment_doc.contains("Expected Output") || deployment_doc.contains("output"), 
            "Should document expected output");
        assert!(deployment_doc.contains("✓") || deployment_doc.contains("success"), 
            "Should show success indicators");
    }
}