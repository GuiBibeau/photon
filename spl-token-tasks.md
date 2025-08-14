# SPL Token Core Instructions - Task List

## Overview

This task list covers the implementation of missing core SPL Token instructions and features for the `@photon/spl-token` package. The focus is on completing SPL Token Program functionality before moving to Token-2022 extensions.

---

## Epic 1: Multisignature Support

**Goal**: Implement multisignature account support for secure multi-party token operations

### ✅ SPL-1: Implement InitializeMultisig instruction

**Priority**: High | **Story Points**: 3 | **Labels**: `feature`, `spl-token`, `multisig`  
**Dependencies**: SDK core modules  
**Status**: Completed - Branch: `feat/spl-1-initialize-multisig`

**Description**:
Create the InitializeMultisig instruction to set up multisignature accounts that require M-of-N signatures for operations.

**Acceptance Criteria**:
- Implement `createInitializeMultisigInstruction`:
  - Accept multisig account address
  - Accept array of signer public keys (2-11 signers)
  - Accept M value (required signatures)
  - Validate M <= N (total signers)
- Instruction structure:
  - Instruction discriminator: 2
  - M value encoding (u8)
  - Account layout validation
- Account requirements:
  - Multisig account (writable)
  - Rent sysvar
  - All signer accounts (read-only)
- Error handling:
  - Invalid signer count (< 2 or > 11)
  - Invalid M value
  - Duplicate signers detection
- Type definitions:
  - `MultisigConfig` interface
  - Signer array validation

**Technical Notes**:
```typescript
export interface MultisigConfig {
  m: number; // Required signatures
  signers: Address[]; // 2-11 signer addresses
}

export function createInitializeMultisigInstruction(
  multisig: Address,
  config: MultisigConfig
): Instruction
```

---

### SPL-2: Add InitializeMultisig2 instruction

**Priority**: Medium | **Story Points**: 2 | **Labels**: `feature`, `spl-token`, `multisig`  
**Dependencies**: SPL-1

**Description**:
Implement the modern version of InitializeMultisig that doesn't require the rent sysvar.

**Acceptance Criteria**:
- Implement `createInitializeMultisig2Instruction`:
  - Same parameters as InitializeMultisig
  - Instruction discriminator: 19
  - No rent sysvar required
- Account optimization:
  - Reduced account list
  - Same validation logic
- Backwards compatibility:
  - Support both versions
  - Auto-select based on feature detection
- Documentation:
  - When to use each version
  - Migration guide

---

### SPL-3: Create multisig helper utilities

**Priority**: Medium | **Story Points**: 3 | **Labels**: `feature`, `spl-token`, `multisig`  
**Dependencies**: SPL-2

**Description**:
Build helper functions for working with multisignature accounts, including validation and signature collection.

**Acceptance Criteria**:
- Implement utilities:
  - `createMultisigAccount`: Full account creation flow
  - `isMultisigAccount`: Type guard
  - `getMultisigInfo`: Parse multisig data
  - `validateMultisigSigners`: Check signer requirements
- Signature helpers:
  - Collect partial signatures
  - Combine signatures
  - Verify signature count
- Integration with existing instructions:
  - Auto-detect multisig requirements
  - Add signers array to configs
- Error handling:
  - Missing signatures
  - Invalid signers
  - Unauthorized signers

---

## Epic 2: Checked Instructions

**Goal**: Implement checked variants of instructions that validate decimals for additional safety

### SPL-4: Implement TransferChecked instruction

**Priority**: Highest | **Story Points**: 3 | **Labels**: `feature`, `spl-token`, `checked`  
**Dependencies**: SDK core modules

**Description**:
Create the TransferChecked instruction that includes decimal validation for safer transfers.

**Acceptance Criteria**:
- Implement `createTransferCheckedInstruction`:
  - All parameters from Transfer
  - Additional `decimals` parameter (u8)
  - Instruction discriminator: 12
- Validation:
  - Decimals match mint configuration
  - Amount is valid for decimals
  - Prevent precision errors
- Account layout:
  - Source account (writable)
  - Mint account (read-only)
  - Destination account (writable)
  - Owner/delegate (signer)
- Error scenarios:
  - Decimal mismatch
  - Overflow/underflow
  - Invalid amount format
- Type safety:
  - `TransferCheckedConfig` interface
  - Decimal-aware amount type

**Technical Notes**:
```typescript
export interface TransferCheckedConfig extends TransferConfig {
  decimals: number;
  mint: Address;
}
```

---

### SPL-5: Add ApproveChecked instruction

**Priority**: High | **Story Points**: 2 | **Labels**: `feature`, `spl-token`, `checked`  
**Dependencies**: SPL-4

**Description**:
Implement ApproveChecked instruction for decimal-validated delegation.

**Acceptance Criteria**:
- Implement `createApproveCheckedInstruction`:
  - Instruction discriminator: 13
  - Include decimals validation
  - Include mint reference
- Parameters:
  - All from Approve instruction
  - Decimals (u8)
  - Mint address
- Account requirements:
  - Token account (writable)
  - Mint (read-only)
  - Delegate (read-only)
  - Owner (signer)
- Validation:
  - Decimals match mint
  - Amount within bounds

---

### SPL-6: Create MintToChecked instruction

**Priority**: High | **Story Points**: 2 | **Labels**: `feature`, `spl-token`, `checked`  
**Dependencies**: SPL-4

**Description**:
Build MintToChecked instruction with decimal validation for minting operations.

**Acceptance Criteria**:
- Implement `createMintToCheckedInstruction`:
  - Instruction discriminator: 14
  - Decimals parameter
  - Amount validation
- Minting validation:
  - Check mint decimals
  - Validate amount format
  - Check supply limits
- Error handling:
  - Decimal mismatch
  - Supply overflow
  - Authority validation

---

### SPL-7: Build BurnChecked instruction

**Priority**: High | **Story Points**: 2 | **Labels**: `feature`, `spl-token`, `checked`  
**Dependencies**: SPL-4

**Description**:
Implement BurnChecked instruction for validated token burning.

**Acceptance Criteria**:
- Implement `createBurnCheckedInstruction`:
  - Instruction discriminator: 15
  - Decimals validation
  - Amount verification
- Burn validation:
  - Check account balance
  - Validate decimals
  - Update supply correctly
- Special cases:
  - Cannot burn native SOL
  - Use CloseAccount for WSOL
- Error scenarios:
  - Insufficient balance
  - Decimal mismatch
  - Invalid mint

---

## Epic 3: Native SOL Support

**Goal**: Add support for wrapped SOL (WSOL) operations

### SPL-8: Implement SyncNative instruction

**Priority**: High | **Story Points**: 3 | **Labels**: `feature`, `spl-token`, `native`  
**Dependencies**: SDK core modules

**Description**:
Create SyncNative instruction to synchronize wrapped SOL token accounts with their underlying lamport balance.

**Acceptance Criteria**:
- Implement `createSyncNativeInstruction`:
  - Instruction discriminator: 17
  - Single account parameter
  - No additional data
- Functionality:
  - Update token amount to match lamports
  - Handle rent-exempt minimum
  - Calculate available balance
- Account requirements:
  - Native token account (writable)
  - Must be NATIVE_MINT token
- Use cases:
  - After SOL deposit
  - Before SOL withdrawal
  - Balance reconciliation
- Helper functions:
  - `isNativeAccount`: Check if WSOL
  - `calculateSyncAmount`: Get expected amount

**Technical Notes**:
```typescript
export function createSyncNativeInstruction(
  account: Address
): Instruction {
  // Sync wrapped SOL balance
}
```

---

### SPL-9: Create WSOL helper utilities

**Priority**: High | **Story Points**: 3 | **Labels**: `feature`, `spl-token`, `native`  
**Dependencies**: SPL-8

**Description**:
Build comprehensive utilities for working with wrapped SOL accounts.

**Acceptance Criteria**:
- Implement WSOL helpers:
  - `createWrappedNativeAccount`: Full WSOL setup
  - `wrapSOL`: Convert SOL to WSOL
  - `unwrapSOL`: Convert WSOL to SOL
  - `getWrappedNativeAmount`: Calculate amount
- Account management:
  - Create temporary accounts
  - Handle rent exemption
  - Auto-close on unwrap
- Transaction builders:
  - Combine multiple instructions
  - Optimize for fees
  - Handle edge cases
- Constants:
  - `NATIVE_MINT` address
  - Rent-exempt minimum
  - Helper type guards

---

## Epic 4: Advanced Account Management

**Goal**: Implement advanced account initialization and management features

### SPL-10: Add InitializeAccount2 instruction

**Priority**: Medium | **Story Points**: 3 | **Labels**: `feature`, `spl-token`, `accounts`  
**Dependencies**: SDK core modules

**Description**:
Implement InitializeAccount2 which includes the owner in the instruction data rather than as a separate account.

**Acceptance Criteria**:
- Implement `createInitializeAccount2Instruction`:
  - Instruction discriminator: 16
  - Owner in instruction data
  - Reduced account list
- Data encoding:
  - Owner public key (32 bytes)
  - Proper serialization
- Benefits:
  - Fewer accounts needed
  - Reduced transaction size
  - Same functionality
- Compatibility:
  - Support both versions
  - Auto-selection logic
  - Migration guide

---

### SPL-11: Create InitializeAccount3 instruction

**Priority**: Low | **Story Points**: 3 | **Labels**: `feature`, `spl-token`, `accounts`  
**Dependencies**: SPL-10

**Description**:
Build InitializeAccount3 with additional features and optimizations.

**Acceptance Criteria**:
- Implement `createInitializeAccount3Instruction`:
  - Instruction discriminator: 18
  - Enhanced parameters
  - Additional validation
- New features:
  - Owner in data
  - Optional parameters
  - Extended metadata
- Use cases:
  - Advanced account setup
  - Custom configurations
  - Future compatibility

---

## Epic 5: Authority Management

**Goal**: Complete authority management functionality

### SPL-12: Enhance SetAuthority instruction

**Priority**: High | **Story Points**: 3 | **Labels**: `feature`, `spl-token`, `authority`  
**Dependencies**: SDK core modules

**Description**:
Enhance the existing SetAuthority instruction with all authority types and validation.

**Acceptance Criteria**:
- Complete implementation:
  - All AuthorityType variants
  - Null authority support (disable)
  - Authority validation
- Authority types:
  - MintTokens (0)
  - FreezeAccount (1)
  - AccountOwner (2)
  - CloseAccount (3)
- Validation:
  - Current authority check
  - Valid new authority
  - Type compatibility
- Helper functions:
  - `disableAuthority`: Set to null
  - `transferAuthority`: Change owner
  - `validateAuthorityType`: Type checking

---

## Epic 6: Account Parsing and Validation

**Goal**: Implement comprehensive account data parsing and validation

### SPL-13: Create account data parsers

**Priority**: Highest | **Story Points**: 5 | **Labels**: `feature`, `spl-token`, `parsing`  
**Dependencies**: SDK codecs

**Description**:
Build parsers for all SPL Token account types with proper validation and type safety.

**Acceptance Criteria**:
- Implement parsers:
  - `parseMintAccount`: Decode mint data
  - `parseTokenAccount`: Decode token account
  - `parseMultisigAccount`: Decode multisig
- Data structures:
  - Mint: supply, decimals, authorities
  - Token: mint, owner, amount, state
  - Multisig: M, N, signers
- Validation:
  - Data length checks
  - Field validation
  - State consistency
- Type definitions:
  - `MintAccount` interface
  - `TokenAccount` interface  
  - `MultisigAccount` interface
- Error handling:
  - Invalid data length
  - Corrupted data
  - Unknown account type

**Technical Notes**:
```typescript
export interface MintAccount {
  mintAuthority: Address | null;
  supply: bigint;
  decimals: number;
  isInitialized: boolean;
  freezeAuthority: Address | null;
}
```

---

### SPL-14: Add account state validation

**Priority**: High | **Story Points**: 3 | **Labels**: `feature`, `spl-token`, `validation`  
**Dependencies**: SPL-13

**Description**:
Implement comprehensive validation for account states and transitions.

**Acceptance Criteria**:
- State validators:
  - `isValidMint`: Check mint validity
  - `isValidTokenAccount`: Check token account
  - `isAccountFrozen`: Check freeze state
  - `hasValidOwner`: Ownership validation
- State checks:
  - Initialization status
  - Freeze status
  - Close status
  - Authority presence
- Transition validation:
  - Valid state changes
  - Authority requirements
  - Balance requirements
- Error messages:
  - Clear descriptions
  - Actionable feedback
  - State details

---

## Epic 7: Testing and Integration

**Goal**: Comprehensive testing of all SPL Token functionality

### SPL-15: Write instruction unit tests

**Priority**: Highest | **Story Points**: 5 | **Labels**: `test`, `spl-token`  
**Dependencies**: All instruction implementations

**Description**:
Create thorough unit tests for all SPL Token instructions.

**Test Coverage**:
- Instruction creation:
  - All parameters
  - Edge cases
  - Invalid inputs
- Serialization:
  - Correct encoding
  - Data layout
  - Account ordering
- Multisig scenarios:
  - Signer validation
  - M-of-N logic
  - Partial signing
- Checked instructions:
  - Decimal validation
  - Amount verification
  - Error cases
- Native SOL:
  - Sync operations
  - Wrap/unwrap flows
  - Balance calculations

---

### SPL-16: Create integration tests

**Priority**: High | **Story Points**: 5 | **Labels**: `test`, `spl-token`, `integration`  
**Dependencies**: SPL-15

**Description**:
Build end-to-end integration tests simulating real token operations.

**Test Scenarios**:
- Complete workflows:
  - Create mint → Create ATA → Mint tokens → Transfer
  - Multisig setup → Multisig transfer → Authority change
  - Wrap SOL → Transfer WSOL → Unwrap SOL
- Error scenarios:
  - Insufficient balance
  - Invalid authority
  - Frozen accounts
  - Decimal mismatches
- Performance tests:
  - Batch operations
  - Large transfers
  - Many accounts
- Compatibility:
  - With existing tokens
  - Cross-program calls
  - Different RPC providers

---

### SPL-17: Add mock testing utilities

**Priority**: Medium | **Story Points**: 3 | **Labels**: `test`, `spl-token`, `mocks`  
**Dependencies**: SPL-15

**Description**:
Create mock utilities for testing SPL Token operations without network calls.

**Acceptance Criteria**:
- Mock implementations:
  - Mock mint accounts
  - Mock token accounts
  - Mock RPC responses
  - Mock signers
- Test helpers:
  - Account factories
  - Transaction builders
  - State validators
- Simulation:
  - Instruction effects
  - Balance changes
  - State transitions
- Documentation:
  - Usage examples
  - Best practices
  - Common patterns

---

## Epic 8: Documentation and Examples

**Goal**: Comprehensive documentation for SPL Token functionality

### SPL-18: Write API documentation

**Priority**: High | **Story Points**: 3 | **Labels**: `doc`, `spl-token`  
**Dependencies**: All implementations

**Description**:
Create detailed API documentation for all SPL Token functions and types.

**Documentation Sections**:
- Getting started:
  - Installation
  - Basic concepts
  - Quick examples
- Instruction reference:
  - All instructions
  - Parameters
  - Return types
  - Error codes
- Advanced topics:
  - Multisig operations
  - Checked instructions
  - WSOL handling
  - Authority management
- Migration guide:
  - From @solana/spl-token
  - Breaking changes
  - Feature parity

---

### SPL-19: Create example applications

**Priority**: Medium | **Story Points**: 3 | **Labels**: `doc`, `spl-token`, `examples`  
**Dependencies**: SPL-18

**Description**:
Build example applications demonstrating SPL Token usage.

**Examples to Create**:
- Basic operations:
  - Create and mint tokens
  - Transfer tokens
  - Burn tokens
- Advanced features:
  - Multisig wallet
  - WSOL operations
  - Checked transfers
  - Freeze/thaw accounts
- Real-world scenarios:
  - Token vesting
  - Escrow service
  - Token swap
  - Staking rewards

---

## Summary

This task list covers the implementation of core SPL Token functionality currently missing from the `@photon/spl-token` package. The implementation follows a logical progression:

1. **Multisignature Support** - Essential for secure multi-party operations
2. **Checked Instructions** - Critical for production safety with decimal validation
3. **Native SOL Support** - Required for DeFi and DEX interactions
4. **Advanced Account Management** - Optimized account initialization
5. **Authority Management** - Complete control over token operations
6. **Account Parsing** - Essential for reading on-chain state
7. **Testing** - Comprehensive test coverage
8. **Documentation** - User guides and examples

## Implementation Priority

### Phase 1: Critical Features (Must Have)
- Account parsing (SPL-13, SPL-14) - Required for reading token state
- Checked instructions (SPL-4 to SPL-7) - Essential for production safety
- Native SOL support (SPL-8, SPL-9) - Required for DeFi

### Phase 2: Important Features (Should Have)
- Multisig support (SPL-1 to SPL-3) - Important for security
- Authority management (SPL-12) - Complete control features
- Testing (SPL-15 to SPL-17) - Quality assurance

### Phase 3: Nice to Have
- Advanced account initialization (SPL-10, SPL-11) - Optimizations
- Documentation and examples (SPL-18, SPL-19) - Developer experience

Each task includes detailed acceptance criteria and maintains consistency with the existing SDK architecture, using zero dependencies and leveraging the core SDK modules for codecs, addresses, and transaction building.