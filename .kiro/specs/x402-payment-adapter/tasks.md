# Implementation Plan

- [x] 1. Set up project structure and dependencies
  - Verify existing csprclick dependencies are compatible
  - Add property-based testing framework (@fast-check/jest)
  - Create hooks directory structure in frontend/src
  - _Requirements: 1.1, 1.4_

- [ ] 2. Implement core useX402 hook
- [x] 2.1 Create basic hook structure and interface
  - Write TypeScript interfaces for PaymentRequirements, PaymentIntent, and XPaymentHeader
  - Implement basic useX402 hook that returns fetchWithPayment function
  - Set up csprclick integration with useClickRef
  - _Requirements: 1.1, 1.2_

- [x] 2.2 Write property test for hook interface
  - **Property 1: HTTP request handling**
  - **Validates: Requirements 1.2, 1.3**

- [x] 2.3 Implement HTTP request handling logic
  - Add initial fetch request functionality in fetchWithPayment
  - Handle non-402 responses by returning them directly
  - Add basic error handling for network failures
  - _Requirements: 1.2, 1.3_

- [x] 2.4 Write property test for request handling
  - **Property 1: HTTP request handling**
  - **Validates: Requirements 1.2, 1.3**

- [ ] 3. Implement 402 response handling
- [x] 3.1 Add 402 detection and parsing logic
  - Detect 402 status codes in responses
  - Parse JSON response to extract payment requirements
  - Validate required fields (amount, nonce, token_contract_hash, chain_name)
  - _Requirements: 2.1, 2.2_

- [x] 3.2 Write property test for 402 parsing
  - **Property 2: 402 response parsing**
  - **Validates: Requirements 2.1, 2.2**

- [x] 3.3 Add error handling for malformed responses
  - Handle missing or invalid payment requirement fields
  - Throw descriptive errors with specific failure details
  - _Requirements: 2.3_

- [x] 3.4 Write property test for malformed response handling
  - **Property 3: Malformed response error handling**
  - **Validates: Requirements 2.3**

- [ ] 4. Implement payment intent construction
- [x] 4.1 Create payment payload formatting logic
  - Construct payload string with exact format: "x402-casper:{chain_name}:{contract_hash}:{amount}:{nonce}"
  - Preserve exact values from 402 response without modification
  - Add payload logging for debugging purposes
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4.2 Write property test for payload formatting
  - **Property 5: Payment payload formatting**
  - **Validates: Requirements 3.1**

- [x] 4.3 Write property test for value preservation
  - **Property 6: Value preservation in payload**
  - **Validates: Requirements 3.2**

- [ ] 5. Implement wallet integration
- [x] 5.1 Add wallet connection validation
  - Check if wallet is connected through csprclick
  - Throw appropriate error when wallet is not connected
  - Validate active account and public key availability
  - _Requirements: 4.1, 4.2_

- [x] 5.2 Write property test for wallet validation
  - **Property 7: Wallet connection validation**
  - **Validates: Requirements 4.1, 4.2**

- [x] 5.3 Implement wallet signing functionality
  - Call clickRef.signMessage with payment payload and public key
  - Handle successful signatures and extract hex format
  - Handle user cancellation scenarios with appropriate errors
  - _Requirements: 4.3, 4.4, 4.5_

- [x] 5.4 Write property test for wallet signing
  - **Property 8: Wallet signature integration**
  - **Validates: Requirements 4.3**

- [x] 5.5 Write property test for signature handling
  - **Property 9: Signature result handling**
  - **Validates: Requirements 4.4, 4.5**

- [ ] 6. Implement payment header construction and retry logic
- [x] 6.1 Create X-PAYMENT header construction
  - Build header object with signature, public_key, amount, nonce, payload_str
  - Serialize payment data as JSON for header value
  - _Requirements: 5.1, 5.2_

- [x] 6.2 Write property test for header construction
  - **Property 10: Payment header construction**
  - **Validates: Requirements 5.1, 5.2**

- [x] 6.3 Implement request retry with payment header
  - Preserve original URL and request options
  - Merge X-PAYMENT header with existing headers
  - Return successful retry response to caller
  - _Requirements: 5.3, 5.4, 5.5_

- [x] 6.4 Write property test for request retry
  - **Property 11: Request retry with payment**
  - **Validates: Requirements 5.3, 5.4, 5.5**

- [ ] 7. Add comprehensive error handling
- [x] 7.1 Implement error handling throughout payment flow
  - Add descriptive errors for each failure point
  - Preserve and propagate original error information
  - Distinguish between different error types (network, wallet, parsing)
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 7.2 Write property test for error handling
  - **Property 13: Comprehensive error handling**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 8. Checkpoint - Ensure all hook tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Create demo interface component
- [x] 9.1 Build basic demo UI structure
  - Create demo component with ClickUI integration for wallet connection
  - Add payment trigger button with clear labeling
  - Set up basic styling and layout
  - _Requirements: 6.1, 6.2_

- [x] 9.2 Implement payment flow integration
  - Connect payment button to useX402 hook
  - Call facilitator backend endpoint to trigger 402 response
  - Handle successful payment completion with content display
  - _Requirements: 6.3, 6.4_

- [x] 9.3 Add demo error handling and display
  - Display appropriate error messages for payment failures
  - Log errors to console for debugging
  - Show user-friendly error messages in UI
  - _Requirements: 6.5, 7.5_

- [x] 9.4 Write property test for demo interface flow
  - **Property 12: Demo interface flow**
  - **Validates: Requirements 6.3, 6.4, 6.5**

- [ ] 10. Update main App component
- [x] 10.1 Integrate demo component into existing App
  - Add demo component to App.tsx alongside existing components
  - Ensure proper integration with existing ClickUI and theme system
  - Test integration with existing wallet connection flow
  - _Requirements: 6.1_

- [x] 10.2 Write unit tests for App integration
  - Test demo component rendering in App context
  - Verify wallet connection integration works properly
  - _Requirements: 6.1, 6.2_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.