# Implementation Plan

- [x] 1. Set up project structure and core interfaces
  - Create directory structure for nuclear deployment modules
  - Define result data classes and configuration models
  - Set up Python project with required dependencies (subprocess, urllib, ssl, shutil, pathlib)
  - Create main deployment script entry point
  - _Requirements: 8.1, 8.4_

- [x] 2. Implement nuclear clean module
  - [x] 2.1 Create nuclear clean function with directory removal logic
    - Implement force deletion of target/ and wasm/ directories using shutil.rmtree
    - Add verification checks to ensure directories are completely removed
    - Handle permission errors with appropriate error messages
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Write property test for nuclear clean completeness
    - **Property 1: Nuclear clean completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [x] 2.3 Add error handling for directory removal failures
    - Implement specific error reporting when directories cannot be deleted
    - Add rollback logic for partial cleanup failures
    - _Requirements: 1.4_

  - [x] 2.4 Write unit tests for clean module error handling
    - Test permission error scenarios
    - Test partial cleanup failure recovery
    - _Requirements: 1.4_

- [ ] 3. Implement fresh build module
  - [x] 3.1 Create build execution function
    - Execute cargo odra build -b casper via subprocess
    - Capture build output and error streams
    - Validate build success through return codes
    - _Requirements: 2.1, 2.4_

  - [x] 3.2 Implement WASM file detection logic
    - Scan wasm/ directory for .wasm files using glob patterns
    - Handle multiple WASM files by selecting most recent
    - Support both snake_case and CamelCase naming conventions
    - _Requirements: 2.2, 2.3, 2.5_

  - [ ] 3.3 Write property test for build artifact consistency
    - **Property 2: Build artifact consistency**
    - **Validates: Requirements 2.2, 2.3, 2.5**

  - [ ] 3.4 Write unit tests for build module
    - Test build command execution
    - Test WASM file detection with various naming patterns
    - Test error handling for build failures
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 4. Implement local verification module
  - [x] 4.1 Create test generation function
    - Generate test_deploy_no_args test case in appropriate test file
    - Use Odra testing framework with TestEnv
    - Ensure test calls Cep18Permit::deploy with no arguments
    - _Requirements: 3.1, 3.2_

  - [x] 4.2 Implement test execution and validation
    - Execute cargo odra test via subprocess
    - Parse test output to determine pass/fail status
    - Handle test failures with detailed error reporting
    - _Requirements: 3.3, 3.4, 3.5_

  - [ ] 4.3 Write property test for local verification round trip
    - **Property 3: Local verification round trip**
    - **Validates: Requirements 3.2, 3.3**

  - [ ] 4.4 Write unit tests for verification module
    - Test test generation logic
    - Test test execution and result parsing
    - Test error handling for test failures
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement deploy generation module
  - [x] 6.1 Create deploy generation function
    - Execute casper-client make-deploy with detected WASM file
    - Target casper-test network with appropriate parameters
    - Use configured private key for signing
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 6.2 Add deploy file management
    - Clean up existing deploy_final.json files
    - Save generated deploy JSON to file
    - Validate deploy JSON format and content
    - _Requirements: 4.3, 5.5_

  - [ ] 6.3 Write property test for deploy generation determinism
    - **Property 4: Deploy generation determinism**
    - **Validates: Requirements 5.2, 5.3, 5.5**

  - [ ] 6.4 Add error handling for deploy generation
    - Capture and display casper-client error messages
    - Handle missing private key files
    - Validate WASM file accessibility
    - _Requirements: 5.4_

  - [ ] 6.5 Write unit tests for deploy generation module
    - Test deploy command execution
    - Test file cleanup and JSON saving
    - Test error handling scenarios
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 7. Implement network submission module
  - [x] 7.1 Create network submission function
    - Send deploy JSON to Casper testnet RPC endpoint
    - Include API key authentication in headers
    - Configure SSL context for macOS compatibility
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 7.2 Add response parsing and hash extraction
    - Parse successful RPC responses for deploy hash
    - Handle various response formats from Casper network
    - Return deploy hash for transaction tracking
    - _Requirements: 6.4_

  - [ ] 7.3 Write property test for network submission idempotency
    - **Property 5: Network submission idempotency**
    - **Validates: Requirements 6.2, 6.4**

  - [ ] 7.4 Add network error handling
    - Capture and display specific network error responses
    - Handle connection failures and timeouts
    - Provide clear error messages for authentication failures
    - _Requirements: 6.5_

  - [ ] 7.5 Write unit tests for network submission module
    - Test HTTP request construction
    - Test response parsing logic
    - Test error handling scenarios
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 8. Implement retry logic module
  - [x] 8.1 Create timestamp error detection and retry logic
    - Detect "timestamp in the future" errors in responses
    - Implement 5-second delay before retry attempts
    - Reuse same deploy JSON without regeneration
    - _Requirements: 7.1, 7.2_

  - [x] 8.2 Add retry limit and exhaustion handling
    - Limit retries to maximum of 3 attempts
    - Report persistent timing issues when retries exhausted
    - Return successful results when retry succeeds
    - _Requirements: 7.3, 7.4, 7.5_

  - [ ] 8.3 Write property test for retry logic convergence
    - **Property 6: Retry logic convergence**
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [ ] 8.4 Write unit tests for retry logic module
    - Test timestamp error detection
    - Test retry delay and limit enforcement
    - Test successful retry scenarios
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 9. Implement main workflow orchestration
  - [x] 9.1 Create main deployment workflow function
    - Orchestrate clean, build, test, deploy, submit phases in sequence
    - Handle phase failures with appropriate error reporting
    - Provide progress logging for each major step
    - _Requirements: 8.1, 8.2, 8.4_

  - [x] 9.2 Add workflow completion and reporting
    - Provide final deploy hash and success confirmation
    - Calculate and report total execution time
    - Generate comprehensive deployment summary
    - _Requirements: 8.3, 8.5_

  - [ ] 9.3 Write property test for workflow atomicity
    - **Property 7: Workflow atomicity**
    - **Validates: Requirements 8.2, 8.4**

  - [ ] 9.4 Write integration tests for complete workflow
    - Test end-to-end deployment scenarios
    - Test workflow failure and recovery
    - Test cross-platform compatibility
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 10. Create deployment script and CLI interface
  - [x] 10.1 Create deploy_nuclear.py script
    - Implement command-line interface for nuclear deployment
    - Add configuration options and help documentation
    - Integrate all modules into single executable script
    - _Requirements: 8.1_

  - [x] 10.2 Add logging and progress reporting
    - Implement comprehensive logging throughout workflow
    - Add progress indicators for long-running operations
    - Provide clear status updates for each phase
    - _Requirements: 8.4_

  - [ ] 10.3 Write end-to-end tests for CLI script
    - Test command-line argument parsing
    - Test complete deployment workflow execution
    - Test error scenarios and user feedback
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.