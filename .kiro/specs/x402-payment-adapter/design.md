# X402 Payment Adapter Design Document

## Overview

The X402 Payment Adapter is a React-based frontend solution that provides seamless integration for HTTP 402 payment flows with Casper blockchain. The system consists of a custom React hook (`useX402`) that encapsulates payment logic and a demo interface that showcases the functionality. The adapter automatically intercepts 402 payment required responses, facilitates wallet-based payment authorization through csprclick, and retries requests with payment headers to enable gasless payment experiences.

The system integrates with the existing facilitator backend service and leverages the current csprclick wallet infrastructure already present in the application.

## Architecture

The system follows a hook-based architecture with clear separation between payment logic, wallet integration, and UI components:

```
┌─────────────────────────────────────────────────────────────┐
│                    React Application                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Demo UI       │  │   useX402       │  │   ClickUI    │ │
│  │  Component      │  │     Hook        │  │  Integration │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP Request
┌─────────────────────▼───────────────────────────────────────┐
│                Facilitator Backend                          │
│              (Returns 402 + Payment Requirements)           │
└─────────────────────┬───────────────────────────────────────┘
                      │ 402 Response
┌─────────────────────▼───────────────────────────────────────┐
│                X402 Payment Flow                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Parse 402     │  │   Construct     │  │   Wallet     │ │
│  │   Response      │  │   Payment       │  │   Signing    │ │
│  │                 │  │   Intent        │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────┬───────────────────────────────────────┘
                      │ Retry with X-PAYMENT Header
┌─────────────────────▼───────────────────────────────────────┐
│                Facilitator Backend                          │
│              (Processes Payment & Returns Content)          │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### useX402 Hook
- **Primary Interface**: `fetchWithPayment(url: string, options?: RequestInit)`
- **Dependencies**: `@make-software/csprclick-react` for wallet integration
- **State Management**: Leverages React's built-in state and effect hooks
- **Error Handling**: Throws descriptive errors for different failure scenarios

### Payment Flow Manager
- **402 Detection**: Monitors HTTP response status codes
- **Requirement Parser**: Extracts payment details from JSON responses
- **Intent Constructor**: Builds payment payload with exact formatting
- **Header Builder**: Creates X-PAYMENT header with signed authorization

### Wallet Integration Layer
- **Connection Validator**: Ensures wallet is connected before payment operations
- **Message Signer**: Interfaces with csprclick's signMessage functionality
- **Public Key Manager**: Retrieves active account public key for signatures
- **Cancellation Handler**: Manages user cancellation scenarios

### Demo Interface Component
- **Wallet UI**: Integrates ClickUI for connection management
- **Payment Trigger**: Button to initiate payment flow testing
- **Status Display**: Shows payment results and error messages
- **Logging Interface**: Displays payment flow debugging information

## Data Models

### Payment Requirements (from 402 Response)
```typescript
interface PaymentRequirements {
  amount: string;              // Token amount in motes
  nonce: number;              // Anti-replay nonce from backend
  token_contract_hash: string; // CEP-18 contract hash
  chain_name: string;         // Casper network identifier
}
```

### Payment Intent Payload
```typescript
interface PaymentIntent {
  payload: string;            // Formatted as "x402-casper:{chain}:{contract}:{amount}:{nonce}"
  signature: string;          // Hex-encoded wallet signature
  publicKey: string;          // User's public key
}
```

### X-PAYMENT Header Structure
```typescript
interface XPaymentHeader {
  signature: string;          // Hex signature from wallet
  public_key: string;         // User's public key
  amount: string;            // Payment amount
  nonce: number;             // Nonce value
  payload_str: string;       // Original payload string (optional)
}
```

### Hook Return Interface
```typescript
interface UseX402Return {
  fetchWithPayment: (url: string, options?: RequestInit) => Promise<Response>;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*
### Property Reflection

After reviewing all identified properties, several can be consolidated to eliminate redundancy:

- Properties 1.2 and 1.3 (HTTP request handling) can be combined into a single comprehensive request handling property
- Properties 2.1 and 2.2 (402 parsing) can be combined into a single parsing property
- Properties 5.1 and 5.2 (header construction) can be combined into a single header creation property
- Properties 5.3, 5.4, and 5.5 (retry logic) can be combined into a single retry property
- Properties 6.3, 6.4, and 6.5 (demo interface behavior) can be combined into a single demo flow property
- Properties 7.1, 7.2, 7.3, and 7.4 (error handling) can be combined into comprehensive error handling properties

**Property 1: HTTP request handling**
*For any* valid URL and request options, fetchWithPayment should make HTTP requests and return non-402 responses without additional processing
**Validates: Requirements 1.2, 1.3**

**Property 2: 402 response parsing**
*For any* 402 response with valid JSON, the adapter should extract all required payment fields (amount, nonce, token_contract_hash, chain_name)
**Validates: Requirements 2.1, 2.2**

**Property 3: Malformed response error handling**
*For any* 402 response with missing or malformed payment requirements, the adapter should throw descriptive errors
**Validates: Requirements 2.3**

**Property 4: Automatic payment flow initiation**
*For any* 402 response received, the adapter should automatically proceed to payment authorization without user intervention
**Validates: Requirements 2.4**

**Property 5: Payment payload formatting**
*For any* valid payment requirements, the constructed payload should follow the exact format "x402-casper:{chain_name}:{contract_hash}:{amount}:{nonce}"
**Validates: Requirements 3.1**

**Property 6: Value preservation in payload**
*For any* payment requirements from a 402 response, the constructed payload should use the exact values without modification
**Validates: Requirements 3.2**

**Property 7: Wallet connection validation**
*For any* payment signature request, the adapter should verify wallet connection and throw appropriate errors when disconnected
**Validates: Requirements 4.1, 4.2**

**Property 8: Wallet signature integration**
*For any* payment payload and connected wallet, the adapter should call clickRef.signMessage with the correct payload and public key
**Validates: Requirements 4.3**

**Property 9: Signature result handling**
*For any* wallet signature operation, the adapter should handle both successful signatures (returning hex format) and user cancellations (throwing errors)
**Validates: Requirements 4.4, 4.5**

**Property 10: Payment header construction**
*For any* successful signature, the adapter should construct a JSON X-PAYMENT header containing all required fields (signature, public_key, amount, nonce, payload_str)
**Validates: Requirements 5.1, 5.2**

**Property 11: Request retry with payment**
*For any* original request and payment header, the retry should preserve the original URL and options while adding the X-PAYMENT header
**Validates: Requirements 5.3, 5.4, 5.5**

**Property 12: Demo interface flow**
*For any* payment button interaction, the demo should trigger the facilitator endpoint and display appropriate success or error messages
**Validates: Requirements 6.3, 6.4, 6.5**

**Property 13: Comprehensive error handling**
*For any* failure in the payment flow, the adapter should throw descriptive errors that indicate the specific failure point and preserve original error information
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

## Error Handling

The system implements comprehensive error handling at multiple layers to provide clear feedback and maintain system stability:

### HTTP Layer Errors
- **Network Failures**: Connection timeouts, DNS resolution failures, server unavailability
- **HTTP Status Errors**: Non-402 error responses (400, 401, 403, 500, etc.)
- **Response Format Errors**: Invalid JSON, missing response body, malformed content

### Payment Flow Errors
- **Missing Payment Requirements**: 402 responses without required payment fields
- **Invalid Payment Data**: Malformed amounts, invalid contract hashes, missing nonces
- **Wallet Connection Errors**: No active wallet, disconnected wallet, unsupported wallet

### Wallet Integration Errors
- **Signature Failures**: User cancellation, wallet errors, invalid signatures
- **Public Key Errors**: Missing public key, invalid key format, key mismatch
- **Message Signing Errors**: Payload formatting issues, signing service failures

### Demo Interface Errors
- **UI State Errors**: Component mounting failures, state update errors
- **Display Errors**: Content rendering failures, message display issues
- **User Interaction Errors**: Button click failures, form submission errors

## Testing Strategy

The testing approach combines unit testing for specific functionality with property-based testing for comprehensive correctness validation.

### Unit Testing Approach
- **Hook Testing**: Verify useX402 hook behavior with React Testing Library
- **Component Testing**: Test demo interface rendering and user interactions
- **Integration Testing**: Test wallet integration with mocked csprclick
- **Error Scenario Testing**: Validate specific error conditions and responses

### Property-Based Testing Approach
- **Framework**: Use `@fast-check/jest` for TypeScript property-based testing
- **Test Configuration**: Minimum 100 iterations per property test to ensure thorough coverage
- **Generator Strategy**: Create smart generators for URLs, payment data, and wallet states
- **Property Annotation**: Each property-based test must include a comment referencing the design document property using format: `**Feature: x402-payment-adapter, Property {number}: {property_text}**`

### Test Coverage Requirements
- All correctness properties must be implemented as property-based tests
- Each property-based test validates exactly one correctness property from this design
- Unit tests complement property tests by covering specific examples and edge cases
- Integration tests verify end-to-end functionality with wallet and backend services

### Test Implementation Guidelines
- Property tests should avoid excessive mocking to validate real functionality
- Generators should constrain inputs to valid ranges intelligently (valid URLs, proper JSON structures)
- Test failures should provide clear feedback about which property was violated
- Both unit and property tests are essential for comprehensive validation
- Mock wallet operations carefully to test both success and failure scenarios
- Test React component behavior using appropriate testing utilities

### Specific Testing Considerations
- **Wallet Mocking**: Mock csprclick integration to test various wallet states and responses
- **HTTP Mocking**: Mock fetch requests to test 402 flows and retry logic
- **Error Injection**: Systematically inject errors at different points to test error handling
- **React Testing**: Use React Testing Library for component testing with proper async handling
- **Property Generators**: Create generators for valid payment requirements, URLs, and wallet states