# Requirements Document

## Introduction

The Odra Vault Facilitator is a smart contract system built on Casper using the Odra framework that provides vault-based token accounting functionality similar to Solana Foundation's Kora. The system enables secure deposit, withdrawal, and transfer operations with comprehensive fee management, role-based access control, and administrative oversight.

## Glossary

- **Vault_System**: The main Odra smart contract managing token accounting and operations
- **CEP18_Token**: Casper Enhancement Proposal 18 compliant fungible token standard
- **Admin**: The primary administrative role with full system control
- **Operator**: A secondary role with limited operational permissions
- **User**: Regular participants who can deposit, withdraw, and transfer tokens
- **Fee_BPS**: Fee rate expressed in basis points (1 BPS = 0.01%)
- **Deposit**: Operation to add tokens to the vault system
- **Withdrawal**: Operation to remove tokens from the vault system
- **Transfer**: Operation to move tokens between user accounts within the vault
- **Pause_State**: System-wide operational halt mechanism

## Requirements

### Requirement 1: Token Model Integration

**User Story:** As a system architect, I want to integrate with existing CEP-18 tokens or deploy new ones, so that the vault can manage various token types.

#### Acceptance Criteria

1. WHEN the system is initialized, THE Vault_System SHALL accept a list of supported CEP18_Token contract hashes
2. WHEN a new token is added to the supported list, THE Vault_System SHALL validate the token implements CEP-18 standard
3. WHEN token operations are performed, THE Vault_System SHALL interact with external CEP18_Token contracts
4. THE Vault_System SHALL maintain a registry of supported tokens with their contract hashes
5. WHEN an unsupported token is used in operations, THE Vault_System SHALL reject the transaction

### Requirement 2: Core Deposit Operations

**User Story:** As a user, I want to deposit tokens into the vault, so that I can participate in the token accounting system.

#### Acceptance Criteria

1. WHEN a user calls deposit with valid token and amount, THE Vault_System SHALL transfer tokens from user to vault
2. WHEN a deposit is made, THE Vault_System SHALL update the user's balance in internal accounting
3. WHEN a deposit occurs, THE Vault_System SHALL deduct applicable fees before crediting user balance
4. WHEN deposit fees are collected, THE Vault_System SHALL accumulate them in the fee collection account
5. WHEN a deposit is successful, THE Vault_System SHALL emit a Deposit event with user, token, amount, and fees
6. IF the system is paused, THEN THE Vault_System SHALL reject all deposit operations
7. IF the deposit would exceed per-user caps, THEN THE Vault_System SHALL reject the transaction
8. IF the deposit would exceed global caps, THEN THE Vault_System SHALL reject the transaction

### Requirement 3: Core Withdrawal Operations

**User Story:** As a user, I want to withdraw tokens from the vault, so that I can access my deposited funds.

#### Acceptance Criteria

1. WHEN a user calls withdraw with valid token and amount, THE Vault_System SHALL verify sufficient user balance
2. WHEN a withdrawal is processed, THE Vault_System SHALL deduct withdrawal fees from the requested amount
3. WHEN a withdrawal occurs, THE Vault_System SHALL transfer net tokens from vault to user's external account
4. WHEN a withdrawal is successful, THE Vault_System SHALL update internal balance accounting
5. WHEN a withdrawal completes, THE Vault_System SHALL emit a Withdrawal event with user, token, amount, and fees
6. IF the system is paused, THEN THE Vault_System SHALL reject all withdrawal operations
7. IF the user has insufficient balance, THEN THE Vault_System SHALL reject the withdrawal
8. IF the withdrawal would violate minimum balance requirements, THEN THE Vault_System SHALL reject the transaction

### Requirement 4: Internal Transfer Operations

**User Story:** As a user, I want to transfer tokens to other users within the vault, so that I can move funds without external transactions.

#### Acceptance Criteria

1. WHEN a user initiates a transfer, THE Vault_System SHALL verify sufficient sender balance
2. WHEN a transfer is processed, THE Vault_System SHALL deduct transfer fees from the amount
3. WHEN a transfer occurs, THE Vault_System SHALL update both sender and recipient balances
4. WHEN a transfer completes, THE Vault_System SHALL emit a Transfer event with sender, recipient, token, amount, and fees
5. IF the system is paused, THEN THE Vault_System SHALL reject all transfer operations
6. IF the sender has insufficient balance, THEN THE Vault_System SHALL reject the transfer
7. IF the recipient is not whitelisted (when whitelist is active), THEN THE Vault_System SHALL reject the transfer

### Requirement 5: Administrative Role Management

**User Story:** As an admin, I want to manage system parameters and roles, so that I can maintain proper system operation.

#### Acceptance Criteria

1. WHEN the contract is initialized, THE Vault_System SHALL set the deployer as the initial Admin
2. WHEN an admin sets fees, THE Vault_System SHALL validate fee rates are within acceptable bounds (0-1000 BPS)
3. WHEN an admin updates the pause state, THE Vault_System SHALL immediately affect all user operations
4. WHEN an admin adds or removes operators, THE Vault_System SHALL update the operator registry
5. WHEN an admin transfers admin rights, THE Vault_System SHALL update the admin address
6. THE Vault_System SHALL restrict administrative functions to the current Admin address only
7. WHEN administrative actions occur, THE Vault_System SHALL emit appropriate AdminAction events

### Requirement 6: Operator Role Functions

**User Story:** As an operator, I want to perform limited administrative functions, so that I can assist with system operations without full admin access.

#### Acceptance Criteria

1. WHEN an operator manages user limits, THE Vault_System SHALL allow updates to per-user caps
2. WHEN an operator manages whitelists, THE Vault_System SHALL allow adding/removing addresses
3. WHEN an operator performs emergency actions, THE Vault_System SHALL allow temporary operational pauses
4. THE Vault_System SHALL restrict operator functions to addresses designated by the Admin
5. WHEN operator actions occur, THE Vault_System SHALL emit OperatorAction events
6. IF a non-operator attempts operator functions, THEN THE Vault_System SHALL reject the transaction

### Requirement 7: Fee Management System

**User Story:** As an admin, I want to configure and collect fees, so that the system can generate revenue and cover operational costs.

#### Acceptance Criteria

1. WHEN fees are configured, THE Vault_System SHALL store deposit, withdrawal, and transfer fee rates separately
2. WHEN fee calculations are performed, THE Vault_System SHALL use basis points with proper precision handling
3. WHEN fees are collected, THE Vault_System SHALL accumulate them in designated fee collection accounts
4. WHEN an admin withdraws fees, THE Vault_System SHALL transfer accumulated fees to the admin address
5. THE Vault_System SHALL maintain separate fee accounting for each supported token
6. WHEN fee rates are updated, THE Vault_System SHALL apply new rates to subsequent operations only
7. WHEN fee operations occur, THE Vault_System SHALL emit FeeCollection and FeeWithdrawal events

### Requirement 8: Security and Limits System

**User Story:** As an admin, I want to enforce security limits and controls, so that the system operates within safe parameters.

#### Acceptance Criteria

1. WHEN per-user limits are set, THE Vault_System SHALL enforce maximum deposit and balance caps per user
2. WHEN global limits are configured, THE Vault_System SHALL enforce system-wide deposit and balance caps
3. WHEN whitelist mode is enabled, THE Vault_System SHALL only allow operations from whitelisted addresses
4. WHEN blacklist entries exist, THE Vault_System SHALL reject operations from blacklisted addresses
5. THE Vault_System SHALL validate all limits before processing any operation
6. WHEN limits are exceeded, THE Vault_System SHALL emit LimitExceeded events with details
7. IF emergency conditions are detected, THEN THE Vault_System SHALL allow admin to pause operations immediately

### Requirement 9: Event Emission and Observability

**User Story:** As a system integrator, I want comprehensive event logging, so that I can build indexing and monitoring systems.

#### Acceptance Criteria

1. WHEN deposits occur, THE Vault_System SHALL emit Deposit events with user, token, amount, fees, and timestamp
2. WHEN withdrawals occur, THE Vault_System SHALL emit Withdrawal events with user, token, amount, fees, and timestamp
3. WHEN transfers occur, THE Vault_System SHALL emit Transfer events with sender, recipient, token, amount, fees, and timestamp
4. WHEN administrative actions occur, THE Vault_System SHALL emit AdminAction events with action type and parameters
5. WHEN operator actions occur, THE Vault_System SHALL emit OperatorAction events with operator and action details
6. WHEN fee operations occur, THE Vault_System SHALL emit FeeCollection and FeeWithdrawal events
7. WHEN system state changes occur, THE Vault_System SHALL emit StateChange events with old and new values
8. THE Vault_System SHALL include block timestamp and transaction hash in all events where possible

### Requirement 10: State Management and Storage

**User Story:** As a system architect, I want efficient state management, so that the contract operates with optimal gas usage and performance.

#### Acceptance Criteria

1. THE Vault_System SHALL store user balances using Odra dictionaries keyed by (Address, Token) pairs
2. THE Vault_System SHALL maintain global parameters in efficient storage structures
3. THE Vault_System SHALL use appropriate data types for all numeric values to prevent overflow
4. THE Vault_System SHALL implement proper serialization for all stored data structures
5. WHEN state is accessed, THE Vault_System SHALL use efficient lookup mechanisms
6. THE Vault_System SHALL minimize storage operations to reduce gas costs
7. THE Vault_System SHALL implement proper state validation on all updates

### Requirement 11: Error Handling and Recovery

**User Story:** As a developer, I want comprehensive error handling, so that I can diagnose and resolve issues effectively.

#### Acceptance Criteria

1. WHEN invalid parameters are provided, THE Vault_System SHALL revert with descriptive error messages
2. WHEN unauthorized access is attempted, THE Vault_System SHALL revert with "Unauthorized" error
3. WHEN insufficient balance conditions occur, THE Vault_System SHALL revert with "InsufficientBalance" error
4. WHEN system is paused, THE Vault_System SHALL revert with "SystemPaused" error
5. WHEN limits are exceeded, THE Vault_System SHALL revert with specific limit violation messages
6. WHEN external contract calls fail, THE Vault_System SHALL handle failures gracefully
7. THE Vault_System SHALL provide consistent error message formatting across all functions

### Requirement 12: Cross-Contract Integration

**User Story:** As a system integrator, I want seamless integration with CEP-18 tokens, so that the vault can work with existing token ecosystems.

#### Acceptance Criteria

1. WHEN interacting with CEP18_Token contracts, THE Vault_System SHALL use standard CEP-18 entrypoints
2. WHEN token transfers are required, THE Vault_System SHALL call transfer_from on the token contract
3. WHEN token balances are queried, THE Vault_System SHALL call balance_of on the token contract
4. THE Vault_System SHALL handle token contract call failures appropriately
5. WHEN token contracts are added, THE Vault_System SHALL validate their CEP-18 compliance
6. THE Vault_System SHALL maintain contract hash storage for all supported tokens
7. WHEN cross-contract calls are made, THE Vault_System SHALL handle gas estimation properly