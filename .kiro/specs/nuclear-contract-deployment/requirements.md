# Requirements Document

## Introduction

This document specifies the requirements for a Nuclear Contract Deployment Fix workflow that resolves persistent "Missing Argument" errors when deploying Casper smart contracts using the Odra framework. The system will provide a comprehensive clean-build-test-deploy pipeline that eliminates stale WASM artifacts and ensures successful contract deployment to the Casper casper-custom.

## Glossary

- **Nuclear_Deployment_System**: The complete workflow that performs clean builds, verification tests, and automated deployment
- **Odra_Framework**: The Rust framework used for building Casper smart contracts
- **WASM_Artifact**: The WebAssembly binary file generated from Rust contract code
- **Casper_casper-custom**: The test network for the Casper blockchain
- **Deploy_Hash**: A unique identifier for a blockchain transaction on Casper
- **Missing_Argument_Error**: The "User error: 64658" that occurs when deploying contracts with mismatched argument expectations
- **Stale_Binary**: An outdated WASM file that contains old contract initialization logic

## Requirements

### Requirement 1

**User Story:** As a contract developer, I want to perform a nuclear clean of all build artifacts, so that I can eliminate any stale WASM binaries that might cause deployment errors.

#### Acceptance Criteria

1. WHEN the nuclear clean process is initiated, THEN the Nuclear_Deployment_System SHALL force-delete the entire target directory to remove all Rust build artifacts
2. WHEN cleaning WASM artifacts, THEN the Nuclear_Deployment_System SHALL force-delete the entire wasm directory to remove all compiled contract binaries
3. WHEN the clean process completes, THEN the Nuclear_Deployment_System SHALL verify that both target and wasm directories have been completely removed
4. WHEN directories cannot be deleted, THEN the Nuclear_Deployment_System SHALL report the specific error and halt the process

### Requirement 2

**User Story:** As a contract developer, I want to rebuild my contract with fresh compilation, so that I can generate a new WASM binary that matches my current contract code.

#### Acceptance Criteria

1. WHEN the rebuild process starts, THEN the Nuclear_Deployment_System SHALL execute cargo odra build with the casper backend target
2. WHEN the build completes successfully, THEN the Nuclear_Deployment_System SHALL verify that a new WASM file has been generated in the wasm directory
3. WHEN detecting the output filename, THEN the Nuclear_Deployment_System SHALL automatically identify the generated WASM file regardless of naming convention (snake_case or CamelCase)
4. WHEN the build fails, THEN the Nuclear_Deployment_System SHALL capture and display the compilation errors to the developer
5. WHEN multiple WASM files exist, THEN the Nuclear_Deployment_System SHALL select the most recently created file for deployment

### Requirement 3

**User Story:** As a contract developer, I want to verify my contract logic locally before network deployment, so that I can ensure the contract initializes correctly with zero arguments.

#### Acceptance Criteria

1. WHEN creating verification tests, THEN the Nuclear_Deployment_System SHALL generate a test case named test_deploy_no_args using the Odra testing framework
2. WHEN running the verification test, THEN the Nuclear_Deployment_System SHALL call Cep18Permit::deploy with the test environment and no initialization arguments
3. WHEN the test executes, THEN the Nuclear_Deployment_System SHALL verify that contract deployment succeeds without argument-related errors
4. WHEN running cargo odra test, THEN the Nuclear_Deployment_System SHALL execute all tests and confirm they pass before proceeding to network deployment
5. WHEN any test fails, THEN the Nuclear_Deployment_System SHALL halt the deployment process and report the test failure details

### Requirement 4

**User Story:** As a contract developer, I want an automated deployment script that dynamically handles WASM file detection, so that I don't need to hardcode filenames that might change.

#### Acceptance Criteria

1. WHEN the deployment script starts, THEN the Nuclear_Deployment_System SHALL automatically scan the wasm directory and identify the first available WASM file
2. WHEN detecting the WASM file, THEN the Nuclear_Deployment_System SHALL print the filename to confirm which binary is being deployed
3. WHEN cleaning previous deployments, THEN the Nuclear_Deployment_System SHALL delete any existing deploy_final.json file to prevent conflicts
4. WHEN the WASM file is not found, THEN the Nuclear_Deployment_System SHALL report an error and halt the deployment process
5. WHEN multiple WASM files exist, THEN the Nuclear_Deployment_System SHALL use the first one found and warn about the selection

### Requirement 5

**User Story:** As a contract developer, I want to generate and sign deployment transactions locally, so that I can prepare the contract for network submission.

#### Acceptance Criteria

1. WHEN generating the deploy, THEN the Nuclear_Deployment_System SHALL use casper-client make-deploy targeting the casper-custom network
2. WHEN creating the deploy, THEN the Nuclear_Deployment_System SHALL use the auto-detected WASM file as the session code
3. WHEN signing the deploy, THEN the Nuclear_Deployment_System SHALL use the private key from the configured .pem file
4. WHEN the deploy generation fails, THEN the Nuclear_Deployment_System SHALL capture and display the casper-client error message
5. WHEN the deploy is successfully created, THEN the Nuclear_Deployment_System SHALL save it as a JSON file for network submission

### Requirement 6

**User Story:** As a contract developer, I want to submit deployment transactions to the Casper casper-custom with proper authentication, so that my contract can be deployed to the blockchain.

#### Acceptance Criteria

1. WHEN submitting to the network, THEN the Nuclear_Deployment_System SHALL send the signed deploy JSON to https://node.casper-custom.cspr.cloud/rpc
2. WHEN making network requests, THEN the Nuclear_Deployment_System SHALL use the API key 019b2b7d-e2ba-752e-a21d-81383b1fd6fe in the request headers
3. WHEN handling SSL on macOS, THEN the Nuclear_Deployment_System SHALL use ssl.CERT_NONE context to avoid certificate verification issues
4. WHEN the network request succeeds, THEN the Nuclear_Deployment_System SHALL return the deploy hash for transaction tracking
5. WHEN the network request fails, THEN the Nuclear_Deployment_System SHALL capture and display the specific error response

### Requirement 7

**User Story:** As a contract developer, I want automatic retry logic for timestamp-related deployment failures, so that temporary timing issues don't prevent successful deployment.

#### Acceptance Criteria

1. WHEN the network returns a "timestamp in the future" error, THEN the Nuclear_Deployment_System SHALL wait 5 seconds before retrying
2. WHEN retrying the deployment, THEN the Nuclear_Deployment_System SHALL use the same signed JSON without regenerating the deploy
3. WHEN the retry succeeds, THEN the Nuclear_Deployment_System SHALL return the successful deployment result
4. WHEN multiple timestamp errors occur, THEN the Nuclear_Deployment_System SHALL retry up to 3 times before failing
5. WHEN all retries are exhausted, THEN the Nuclear_Deployment_System SHALL report the persistent timing issue to the developer

### Requirement 8

**User Story:** As a contract developer, I want a single command execution that performs the complete nuclear deployment workflow, so that I can resolve deployment issues with minimal manual intervention.

#### Acceptance Criteria

1. WHEN executing the nuclear deployment command, THEN the Nuclear_Deployment_System SHALL perform clean, build, test, and deploy operations in sequence
2. WHEN any step in the workflow fails, THEN the Nuclear_Deployment_System SHALL halt execution and report the specific failure point
3. WHEN the complete workflow succeeds, THEN the Nuclear_Deployment_System SHALL provide the final deploy hash and confirmation of successful deployment
4. WHEN logging workflow progress, THEN the Nuclear_Deployment_System SHALL provide clear status updates for each major step
5. WHEN the workflow completes, THEN the Nuclear_Deployment_System SHALL summarize the total execution time and final deployment status