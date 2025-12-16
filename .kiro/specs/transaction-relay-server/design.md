# Transaction Relay Server Design Document

## Overview

The Transaction Relay Server is an Express.js-based HTTP API that facilitates gasless payment settlements on the Casper blockchain. The system acts as an intermediary between client applications and the blockchain, handling gas payments and transaction complexity on behalf of users. The server integrates with the existing facilitator service to process payment authorizations through the `claim_payment` smart contract entry point.

## Architecture

The system follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                       │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP POST /settle
                      │ { owner_public_key, amount, nonce, signature }
┌─────────────────────▼───────────────────────────────────────┐
│                Express.js HTTP Server                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Validation    │  │   Conversion    │  │   Response   │ │
│  │     Layer       │  │     Layer       │  │    Layer     │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────┬───────────────────────────────────────┘
                      │ Processed Authorization
┌─────────────────────▼───────────────────────────────────────┐
│                 Facilitator Service                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Deploy        │  │   Signing       │  │  Monitoring  │ │
│  │  Creation       │  │   & Sending     │  │    Layer     │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────┬───────────────────────────────────────┘
                      │ Signed Deploy
┌─────────────────────▼───────────────────────────────────────┐
│                  Casper Network                             │
│              (claim_payment contract)                       │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### HTTP Server Component
- **Express.js Application**: Main server handling HTTP requests
- **Route Handler**: Processes POST /settle requests
- **Middleware Stack**: Request validation, error handling, logging
- **Response Formatter**: Standardizes API responses

### Validation Layer
- **Input Validator**: Ensures required fields are present and properly formatted
- **Signature Verifier**: Validates cryptographic signatures (future enhancement)
- **Nonce Checker**: Prevents replay attacks through nonce validation

### Data Conversion Layer
- **CLValue Converter**: Transforms JavaScript types to Casper CLValue types
  - `owner_public_key` → `CLPublicKey`
  - `amount` → `CLU256`
  - `nonce` → `CLU64`
  - `signature` → `CLString`

### Facilitator Integration
- **Deploy Creator**: Builds blockchain transaction objects
- **Key Manager**: Handles facilitator private key operations
- **Network Client**: Manages communication with Casper network
- **Transaction Monitor**: Tracks deploy status and provides feedback

## Data Models

### Settlement Request
```typescript
interface SettlementRequest {
  owner_public_key: string;  // Hex-encoded public key
  amount: string;           // Token amount as string
  nonce: number;           // Anti-replay nonce
  signature: string;       // Cryptographic signature
}
```

### Settlement Response
```typescript
interface SettlementResponse {
  success: boolean;
  deployHash?: string;     // Blockchain transaction hash
  cost?: string;          // Gas cost in CSPR
  error?: string;         // Error message if failed
}
```

### Authorization Object (Internal)
```typescript
interface PaymentAuthorization {
  userPublicKey: string;
  recipient: string;
  amount: string;
  nonce: number;
  deadline: number;
  signature: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*
### Property Reflection

After reviewing all identified properties, several can be consolidated to eliminate redundancy:

- Properties 3.1-3.4 (individual parameter conversions) can be combined into a single comprehensive conversion property
- Properties 4.3-4.4 (transaction failure/success reporting) can be combined into a general transaction status reporting property
- Properties 2.1-2.4 (facilitator operations) can be streamlined to focus on core functionality

**Property 1: Valid request acceptance**
*For any* valid settlement request containing all required fields (owner_public_key, amount, nonce, signature), the server should accept the request and return a success response
**Validates: Requirements 1.1**

**Property 2: Required field validation**
*For any* HTTP request to /settle endpoint, the server should accept only requests that contain all required fields (owner_public_key, amount, nonce, signature)
**Validates: Requirements 1.2**

**Property 3: Malformed request rejection**
*For any* malformed or incomplete settlement request, the server should reject it and return an appropriate error response
**Validates: Requirements 1.3**

**Property 4: Parameter conversion correctness**
*For any* valid settlement request, all parameters should be correctly converted to their corresponding CLValue types (owner_public_key→CLPublicKey, amount→CLU256, nonce→CLU64, signature→CLString)
**Validates: Requirements 1.4, 3.1, 3.2, 3.3, 3.4**

**Property 5: Gas fee payment**
*For any* valid payment authorization, the facilitator should pay gas fees within the expected range (3-5 CSPR)
**Validates: Requirements 2.1**

**Property 6: Deploy signing**
*For any* blockchain deploy created, it should be signed using the facilitator's private key
**Validates: Requirements 2.2**

**Property 7: Correct entry point usage**
*For any* deploy created from a settlement request, it should target the claim_payment entry point
**Validates: Requirements 2.3**

**Property 8: Network dispatch**
*For any* signed deploy, it should be dispatched to the Casper network for processing
**Validates: Requirements 2.4**

**Property 9: Conversion error handling**
*For any* invalid parameter that cannot be converted to CLValue format, the server should return an error response with conversion failure details
**Validates: Requirements 3.5**

**Property 10: Deploy hash return**
*For any* successfully submitted deploy, the server should return the deploy hash to the client
**Validates: Requirements 4.1**

**Property 11: Transaction status monitoring**
*For any* deploy hash, the monitoring system should provide current transaction status information
**Validates: Requirements 4.2**

**Property 12: Transaction outcome reporting**
*For any* completed transaction (success or failure), the server should capture and report the outcome with appropriate details
**Validates: Requirements 4.3, 4.4**

**Property 13: Signature verification**
*For any* payment authorization, the signature should be verified against the provided parameters
**Validates: Requirements 5.1**

**Property 14: Invalid signature rejection**
*For any* authorization with invalid signature, the server should reject the transaction and return an authentication error
**Validates: Requirements 5.2**

**Property 15: Replay attack prevention**
*For any* authorization with invalid or reused nonce, the server should prevent processing to avoid replay attacks
**Validates: Requirements 5.3**

**Property 16: Input sanitization**
*For any* authorization data processed, inputs should be sanitized to prevent injection attacks
**Validates: Requirements 5.4**

## Error Handling

The system implements comprehensive error handling at multiple layers:

### HTTP Layer Errors
- **400 Bad Request**: Malformed JSON, missing required fields
- **401 Unauthorized**: Invalid signature verification
- **422 Unprocessable Entity**: Valid JSON but invalid parameter values
- **500 Internal Server Error**: Unexpected server errors, blockchain communication failures

### Conversion Layer Errors
- **Invalid Public Key Format**: Malformed hex strings, incorrect key length
- **Invalid Amount Format**: Non-numeric values, negative amounts, overflow conditions
- **Invalid Nonce Format**: Non-integer values, out-of-range values
- **Invalid Signature Format**: Empty signatures, malformed signature strings

### Blockchain Layer Errors
- **Network Connectivity**: Casper node unavailable, timeout errors
- **Deploy Failures**: Insufficient balance, expired deadline, invalid nonce
- **Gas Estimation**: Insufficient facilitator balance for gas fees

### Security Layer Errors
- **Replay Attacks**: Duplicate nonce detection and prevention
- **Signature Verification**: Cryptographic validation failures
- **Input Validation**: Injection attack prevention, parameter sanitization

## Testing Strategy

The testing approach combines unit testing for specific functionality with property-based testing for comprehensive correctness validation.

### Unit Testing Approach
- **Express Route Testing**: Verify HTTP endpoint behavior with specific examples
- **Conversion Function Testing**: Test CLValue conversion with known inputs/outputs
- **Error Handling Testing**: Validate specific error conditions and responses
- **Integration Testing**: Test facilitator service integration points

### Property-Based Testing Approach
- **Framework**: Use `fast-check` for JavaScript property-based testing
- **Test Configuration**: Minimum 100 iterations per property test to ensure thorough coverage
- **Generator Strategy**: Create smart generators that produce valid input ranges for each parameter type
- **Property Annotation**: Each property-based test must include a comment referencing the design document property using format: `**Feature: transaction-relay-server, Property {number}: {property_text}**`

### Test Coverage Requirements
- All correctness properties must be implemented as property-based tests
- Each property-based test validates exactly one correctness property from this design
- Unit tests complement property tests by covering specific examples and edge cases
- Integration tests verify end-to-end functionality with the facilitator service

### Test Implementation Guidelines
- Property tests should avoid mocking to validate real functionality
- Generators should constrain inputs to valid ranges intelligently
- Test failures should provide clear feedback about which property was violated
- Both unit and property tests are essential for comprehensive validation