# Zero-Dependency Solana SDK - Detailed Task Breakdown

## Project Overview

Building a lightweight, zero-dependency TypeScript library for Solana that leverages Web Standards (WebCrypto, fetch, WebSocket) to provide a modern, tree-shakable alternative to @solana/web3.js.

---

## Epic 1: Project Setup & Infrastructure ✅

**Goal**: Establish a robust foundation with modern tooling for a production-ready SDK

### SDK-2: Initialize pnpm monorepo workspace ✅

**Priority**: Highest | **Story Points**: 2 | **Labels**: `setup`, `core`

**Description**:
Set up a pnpm workspace to manage multiple packages within the SDK. This will enable efficient dependency management, cross-package linking, and parallel development of modules.

**Acceptance Criteria**:

- Create `pnpm-workspace.yaml` with paths for all planned modules:
  - `packages/errors`
  - `packages/codecs`
  - `packages/crypto`
  - `packages/addresses`
  - `packages/rpc`
  - `packages/rpc-subscriptions`
  - `packages/signers`
  - `packages/sysvars`
  - `packages/transaction-messages`
  - `packages/transactions`
  - `packages/accounts`
- Configure root `package.json` with:
  - Workspace scripts for building all packages
  - Common devDependencies
  - Node.js engine requirements (>=20)
- Create initial folder structure with placeholder `package.json` files
- Add `.gitignore` for node_modules and build artifacts

**Technical Notes**:

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
```

---

### SDK-3: Configure TypeScript settings ✅

**Priority**: Highest | **Story Points**: 2 | **Labels**: `setup`, `core`  
**Dependencies**: SDK-2

**Description**:
Establish TypeScript configuration that enforces strict type safety while supporting the monorepo structure. Each package will have its own tsconfig that extends a shared base configuration.

**Acceptance Criteria**:

- Create root `tsconfig.base.json` with:
  - `strict: true` for maximum type safety
  - `target: "ESNext"` for modern JavaScript features
  - `module: "ESNext"` for tree-shaking support
  - `moduleResolution: "bundler"` for modern resolution
- Create package-specific `tsconfig.json` files that:
  - Extend the base configuration
  - Define package-specific paths and references
  - Configure composite projects for faster builds
- Set up path mappings for clean imports:
  - `@solana-sdk/errors` → `packages/errors/src`
  - Similar mappings for all packages
- Configure `tsconfig.build.json` for production builds

**Technical Configuration**:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true
  }
}
```

---

### SDK-4: Set up tsup bundler

**Priority**: Highest | **Story Points**: 3 | **Labels**: `setup`, `core`  
**Dependencies**: SDK-3

**Description**:
Configure tsup as the build tool to create optimized, tree-shakable bundles. Each package will be built as both ESM and CJS with proper TypeScript declarations.

**Acceptance Criteria**:

- Install tsup as a dev dependency
- Create `tsup.config.ts` in each package with:
  - Multiple entry points for granular imports
  - ESM and CJS output formats
  - Type declaration generation
  - Minification for production builds
  - Source map generation
- Configure package.json exports:
  - Conditional exports for ESM/CJS
  - Proper typing paths
  - Subpath exports for tree-shaking
- Verify tree-shaking with a test build:
  - Import single function
  - Confirm unused code is eliminated
- Add build scripts to package.json files

**Example Configuration**:

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/*/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
```

---

### SDK-5: Configure Vitest testing framework ✅

**Priority**: Highest | **Story Points**: 2 | **Labels**: `setup`, `core`  
**Dependencies**: SDK-3

**Description**:
Set up Vitest for fast, modern unit testing with native TypeScript support. Configure for both unit tests and integration tests across the monorepo.

**Acceptance Criteria**:

- Install Vitest and related testing utilities
- Create `vitest.config.ts` with:
  - TypeScript path resolution
  - Coverage reporting with c8
  - Test file patterns (`*.test.ts`, `*.spec.ts`)
  - Global test utilities
- Set up test scripts in root package.json:
  - `test`: Run all tests
  - `test:watch`: Watch mode for development
  - `test:coverage`: Generate coverage reports
- Configure coverage thresholds:
  - Minimum 80% coverage for all packages
  - 100% coverage for critical modules (crypto, transactions)
- Create example test to verify setup

**Test Environment Setup**:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    coverage: {
      reporter: ["text", "lcov", "html"],
      exclude: ["**/node_modules/**", "**/dist/**"],
    },
  },
});
```

---

### SDK-6: Set up code quality tools ✅

**Priority**: High | **Story Points**: 2 | **Labels**: `setup`, `core`  
**Dependencies**: SDK-3

**Description**:
Configure ESLint and Prettier to maintain consistent code quality and formatting across the entire codebase. Set up pre-commit hooks to enforce standards.

**Acceptance Criteria**:

- Configure ESLint with:
  - TypeScript ESLint plugin and parser
  - Recommended rules for TypeScript
  - Custom rules for SDK conventions
  - Import sorting and unused import detection
- Configure Prettier with:
  - 2-space indentation
  - Single quotes
  - No semicolons (or team preference)
  - Print width of 100
- Set up Husky and lint-staged:
  - Pre-commit hook for linting
  - Automatic formatting on commit
- Add npm scripts:
  - `lint`: Check all packages
  - `lint:fix`: Auto-fix issues
  - `format`: Run Prettier
- Create `.editorconfig` for IDE consistency

---

### SDK-7: Configure CI/CD pipeline ✅

**Priority**: High | **Story Points**: 3 | **Labels**: `setup`, `core`, `ci`  
**Dependencies**: SDK-5

**Description**:
Set up GitHub Actions for continuous integration, ensuring code quality and test coverage on every push and pull request.

**Acceptance Criteria**:

- Create `.github/workflows/ci.yml` with:
  - Trigger on push to main and all PRs
  - Matrix testing (Node 20, 22, 24)
  - Steps for:
    - Checkout with submodules
    - pnpm setup with caching
    - Install dependencies
    - Lint check
    - Type checking
    - Unit tests with coverage
    - Build all packages
- Add status checks for PR merging:
  - All tests must pass
  - Coverage thresholds met
  - No lint errors
  - Successful build
- Configure Codecov or similar for coverage tracking
- Add workflow for npm publishing (manual trigger)

---

## Epic 2: Core Infrastructure Modules

**Goal**: Build the foundational error handling and serialization systems

### SDK-9: Implement SolanaError class ✅

**Priority**: Highest | **Story Points**: 2 | **Labels**: `feature`, `errors`  
**Dependencies**: SDK-3

**Description**:
Create a custom error class that provides rich context for SDK errors, including error codes, additional data, and proper stack traces.

**Acceptance Criteria**:

- Create `SolanaError` class extending native `Error`:
  - Constructor accepts code, message, and context
  - Preserves stack trace properly
  - Serializable to JSON
- Define error code constants:
  - `INVALID_KEYPAIR`
  - `INVALID_ADDRESS`
  - `RPC_ERROR`
  - `TRANSACTION_FAILED`
  - `INSUFFICIENT_BALANCE`
  - etc.
- Implement static factory methods:
  - `SolanaError.invalidAddress(address)`
  - `SolanaError.rpcError(method, details)`
- Ensure error messages are descriptive and actionable
- Support error cause chaining (ES2022)

**Code Example**:

```typescript
export class SolanaError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, { cause });
    this.name = "SolanaError";
  }
}
```

---

### SDK-10: Create error mapping utilities ✅

**Priority**: High | **Story Points**: 3 | **Labels**: `feature`, `errors`  
**Dependencies**: SDK-9

**Description**:
Build utilities to transform various error sources (RPC errors, validation errors) into consistent SolanaError instances with proper context.

**Acceptance Criteria**:

- Implement RPC error parser:
  - Parse JSON-RPC error responses
  - Map error codes to SolanaError codes
  - Extract meaningful details from error data
- Create validation error helpers:
  - Address validation errors
  - Transaction size errors
  - Signature verification errors
- Add error enhancement utilities:
  - Add transaction logs to errors
  - Include simulation results
  - Preserve original error as cause
- Define error recovery suggestions:
  - Map common errors to solutions
  - Provide actionable next steps

---

### SDK-11: Write error module tests

**Priority**: High | **Story Points**: 2 | **Labels**: `test`, `errors`  
**Dependencies**: SDK-10

**Description**:
Comprehensive test suite for error handling, ensuring all error scenarios are properly covered and error messages are helpful.

**Test Scenarios**:

- Error construction and properties
- Stack trace preservation
- JSON serialization/deserialization
- RPC error parsing with various formats
- Error code mapping accuracy
- Context preservation through error chains
- Error message formatting
- TypeScript type inference for error codes

---

### SDK-12: Define Codec interface ✅

**Priority**: Highest | **Story Points**: 2 | **Labels**: `feature`, `codecs`  
**Dependencies**: SDK-3

**Description**:
Create a generic, composable interface for encoding and decoding data, forming the foundation for all binary serialization in the SDK.

**Acceptance Criteria**:

- Define `Codec<T>` interface with:
  - `encode(value: T): Uint8Array`
  - `decode(bytes: Uint8Array, offset?: number): [T, number]`
  - `size: number | ((value: T) => number)`
- Create `FixedSizeCodec<T>` for known-size types
- Create `VariableSizeCodec<T>` for dynamic types
- Define composition utilities:
  - `mapCodec<A, B>`: Transform codec types
  - `wrapCodec`: Add pre/post processing
- Ensure type safety throughout
- Support partial decoding (with offset)

**Interface Definition**:

```typescript
export interface Codec<T> {
  encode(value: T): Uint8Array;
  decode(bytes: Uint8Array, offset?: number): readonly [T, number];
  size: number | ((value: T) => number);
}
```

---

### SDK-13: Implement primitive codecs

**Priority**: Highest | **Story Points**: 5 | **Labels**: `feature`, `codecs`  
**Dependencies**: SDK-12

**Description**:
Build codecs for all primitive types used in Solana, ensuring correct endianness and efficient encoding/decoding.

**Acceptance Criteria**:

- Implement numeric codecs:
  - `u8`, `u16`, `u32`, `u64` (little-endian)
  - `i8`, `i16`, `i32`, `i64` (signed variants)
  - Use `DataView` for endianness handling
  - Support `bigint` for 64-bit values
- Implement byte array codecs:
  - `fixedBytes(size)`: Fixed-size byte arrays
  - `bytes`: Variable-length with size prefix
  - `publicKey`: 32-byte public key codec
- Implement string codec:
  - UTF-8 encoding
  - Length-prefixed strings
- Implement boolean codec:
  - Single byte (0 or 1)
- Optimize for performance:
  - Reuse ArrayBuffer views
  - Minimize allocations

---

### SDK-14: Create composite codec utilities

**Priority**: High | **Story Points**: 5 | **Labels**: `feature`, `codecs`  
**Dependencies**: SDK-13

**Description**:
Implement utilities for composing complex codecs from primitives, enabling structured data serialization.

**Acceptance Criteria**:

- Implement struct codec:
  - Accept object of field codecs
  - Preserve field order
  - Type-safe field access
  - Support nested structs
- Implement array codecs:
  - `array(codec, size)`: Fixed-size arrays
  - `vec(codec)`: Variable-size with length prefix
  - `set(codec)`: Unique elements only
- Implement optional codec:
  - `option(codec)`: Rust-style Option type
  - 1-byte discriminator
- Implement enum codec:
  - `enum(variants)`: Tagged unions
  - Support different codec per variant
- Add utility codecs:
  - `constant(value)`: Always encodes same value
  - `lazy(fn)`: Deferred codec resolution

**Usage Example**:

```typescript
const tokenAccountCodec = struct({
  mint: publicKey,
  owner: publicKey,
  amount: u64,
  delegate: option(publicKey),
  state: u8,
  // ...
});
```

---

### SDK-15: Write codec module tests

**Priority**: High | **Story Points**: 3 | **Labels**: `test`, `codecs`  
**Dependencies**: SDK-14

**Description**:
Thorough testing of all codec implementations, including edge cases and composition scenarios.

**Test Coverage**:

- Primitive codec round-trips
- Endianness verification
- Boundary value testing (min/max values)
- Composite codec encoding order
- Nested structure handling
- Size calculation accuracy
- Partial decoding with offsets
- Error handling for invalid data
- Performance benchmarks
- Memory leak detection

---

## Epic 3: Cryptographic Foundation

**Goal**: Implement all cryptographic operations using WebCrypto API

### SDK-17: Implement Ed25519 key generation

**Priority**: Highest | **Story Points**: 3 | **Labels**: `feature`, `crypto`  
**Dependencies**: SDK-3

**Description**:
Create secure key pair generation using the WebCrypto API's native Ed25519 support, with options for key extractability.

**Acceptance Criteria**:

- Implement `generateKeyPair()` function:
  - Returns `Promise<CryptoKeyPair>`
  - Uses `crypto.subtle.generateKey`
  - Configurable extractability
  - Proper usage flags (sign, verify)
- Add options parameter:
  - `extractable: boolean` (default: false)
  - Future extensibility
- Create `KeyPair` wrapper type:
  - Encapsulates `CryptoKeyPair`
  - Lazy public key derivation
  - Methods for common operations
- Handle browser compatibility:
  - Feature detection for Ed25519
  - Clear error messages if unsupported
- Ensure cryptographic security:
  - Use secure random source
  - No key material leakage

**Implementation**:

```typescript
export async function generateKeyPair(options?: {
  extractable?: boolean;
}): Promise<KeyPair> {
  const cryptoKeyPair = await crypto.subtle.generateKey(
    { name: "Ed25519" },
    options?.extractable ?? false,
    ["sign", "verify"]
  );
  return new KeyPair(cryptoKeyPair);
}
```

---

### SDK-18: Build message signing functionality

**Priority**: Highest | **Story Points**: 3 | **Labels**: `feature`, `crypto`  
**Dependencies**: SDK-17

**Description**:
Implement secure message signing using Ed25519 through WebCrypto, ensuring compatibility with Solana's signing requirements.

**Acceptance Criteria**:

- Create `signBytes` function:
  - Accept `CryptoKey` (private) and `Uint8Array`
  - Return `Promise<Uint8Array>` (64-byte signature)
  - Use `crypto.subtle.sign`
- Add signature type wrapper:
  - `Signature` type for type safety
  - Conversion to/from base58
  - Length validation (must be 64 bytes)
- Implement batch signing:
  - Sign multiple messages efficiently
  - Useful for multi-signature transactions
- Error handling:
  - Invalid key type
  - Wrong key usage
  - Signing failures
- Performance optimization:
  - Minimize array copies
  - Efficient promise handling

---

### SDK-19: Add signature verification

**Priority**: High | **Story Points**: 2 | **Labels**: `feature`, `crypto`  
**Dependencies**: SDK-18

**Description**:
Implement Ed25519 signature verification to validate signatures from various sources.

**Acceptance Criteria**:

- Create `verifySignature` function:
  - Parameters: public key, message, signature
  - Returns `Promise<boolean>`
  - Uses `crypto.subtle.verify`
- Support multiple key formats:
  - `CryptoKey` objects
  - Raw public key bytes
  - Base58 address strings
- Add batch verification:
  - Verify multiple signatures efficiently
  - Early exit on first failure option
- Implement secure comparison:
  - Constant-time where applicable
  - No timing attacks
- Clear API design:
  - Intuitive parameter order
  - Good TypeScript types

---

### SDK-20: Write crypto module tests

**Priority**: High | **Story Points**: 3 | **Labels**: `test`, `crypto`  
**Dependencies**: SDK-19

**Description**:
Comprehensive test suite for cryptographic operations, including test vectors and edge cases.

**Test Coverage**:

- Key generation:
  - Extractable vs non-extractable
  - Key uniqueness
  - Proper algorithm parameters
- Signing operations:
  - Known test vectors from Solana
  - Empty message handling
  - Large message handling
- Verification:
  - Valid signatures pass
  - Invalid signatures fail
  - Tampered messages detected
  - Wrong public key rejection
- Cross-compatibility:
  - Signatures from other libraries
  - Key import/export
- Performance benchmarks:
  - Key generation speed
  - Signing throughput
  - Batch operation efficiency

---

### SDK-21: Implement base58 codec

**Priority**: Highest | **Story Points**: 5 | **Labels**: `feature`, `addresses`  
**Dependencies**: SDK-3

**Description**:
Create a pure TypeScript implementation of base58 encoding/decoding using Solana's specific alphabet, optimized for performance.

**Acceptance Criteria**:

- Implement base58 encode:
  - Convert `Uint8Array` to base58 string
  - Use Solana alphabet
  - Handle leading zeros correctly
  - No external dependencies
- Implement base58 decode:
  - Convert base58 string to `Uint8Array`
  - Validate characters
  - Proper error messages
- Optimize for performance:
  - Efficient bigint arithmetic
  - Minimal allocations
  - Consider lookup tables
- Add utilities:
  - `isBase58(string)`: Validation
  - Alphabet constant export
- Ensure correctness:
  - Test against known values
  - Round-trip testing
  - Edge cases (empty, all zeros)

**Algorithm Example**:

```typescript
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE = 58n;

export function encodeBase58(bytes: Uint8Array): string {
  // Implementation details...
}
```

---

### SDK-22: Create Address type and parser

**Priority**: Highest | **Story Points**: 3 | **Labels**: `feature`, `addresses`  
**Dependencies**: SDK-21

**Description**:
Implement a type-safe Address type with validation and conversion utilities, forming the foundation for all address handling in the SDK.

**Acceptance Criteria**:

- Create `Address` opaque type:
  - Brand type for type safety
  - Cannot be confused with strings
  - Phantom type parameter optional
- Implement `address()` parser:
  - Validates base58 format
  - Checks 32-byte length
  - Returns `Address` type
  - Clear error messages
- Add Address utilities:
  - `getAddressBytes(address)`: Get Uint8Array
  - `isAddress(value)`: Type guard
  - `assertAddress(value)`: Assertion
- Create well-known addresses:
  - System Program
  - Token Program
  - Native SOL mint
- Comparison utilities:
  - `addressesEqual(a, b)`
  - `compareAddresses(a, b)` for sorting

**Type Definition**:

```typescript
export type Address = string & { readonly __brand: unique symbol };

export function address(value: string): Address {
  // Validation logic
  return value as Address;
}
```

---

### SDK-23: Build address derivation

**Priority**: High | **Story Points**: 3 | **Labels**: `feature`, `addresses`  
**Dependencies**: SDK-22

**Description**:
Implement utilities for deriving addresses from public keys and for Program Derived Addresses (PDAs).

**Acceptance Criteria**:

- Implement `getAddressFromPublicKey`:
  - Accept `CryptoKey` or bytes
  - Return `Address` type
  - Handle key extraction if needed
- Add PDA support:
  - `findProgramAddressSync`
  - Accept seeds and program ID
  - Return [address, bump]
  - Use synchronous operations
- Create PDA utilities:
  - `createProgramAddress`
  - `isProgramAddress`
  - Seed helpers
- Optimize PDA finding:
  - Start from high bump values
  - Early exit on success
- Type safety:
  - Seeds as `Uint8Array[]`
  - Program ID as `Address`

---

### SDK-24: Write address module tests

**Priority**: High | **Story Points**: 2 | **Labels**: `test`, `addresses`  
**Dependencies**: SDK-23

**Description**:
Complete test coverage for address handling, including validation, conversion, and derivation.

**Test Scenarios**:

- Base58 codec:
  - Known test vectors
  - Round-trip property testing
  - Invalid character handling
  - Performance benchmarks
- Address validation:
  - Valid addresses accepted
  - Invalid format rejected
  - Wrong length rejected
  - Clear error messages
- Address derivation:
  - Known public key → address pairs
  - PDA derivation test vectors
  - Bump seed search efficiency
- Type safety:
  - TypeScript compilation tests
  - Runtime type guards
  - Proper type inference

---

## Epic 4: RPC Communication Layer

**Goal**: Build a type-safe JSON-RPC client using native fetch

### SDK-26: Define RPC types

**Priority**: Highest | **Story Points**: 5 | **Labels**: `feature`, `rpc`  
**Dependencies**: SDK-3

**Description**:
Create comprehensive TypeScript types for all Solana JSON-RPC methods, ensuring type safety and excellent developer experience.

**Acceptance Criteria**:

- Define `SolanaRpcApi` interface:
  - All standard RPC methods
  - Proper parameter types
  - Accurate return types
  - JSDoc documentation
- Create type definitions for:
  - Commitment levels
  - Encoding options
  - Transaction details
  - Account info structures
  - Block structures
  - Signature statuses
- Add configuration types:
  - RPC config options
  - Request config per method
  - Timeout settings
- Implement type helpers:
  - Extract method names
  - Extract parameters/returns
  - Type-safe method calls
- Version compatibility:
  - Mark deprecated methods
  - Version-specific types

**Example Types**:

```typescript
export interface SolanaRpcApi {
  getAccountInfo(
    address: Address,
    config?: {
      commitment?: Commitment;
      encoding?: "base64" | "jsonParsed";
    }
  ): Promise<AccountInfo | null>;

  // More methods...
}
```

---

### SDK-27: Implement RPC client factory

**Priority**: Highest | **Story Points**: 3 | **Labels**: `feature`, `rpc`  
**Dependencies**: SDK-26

**Description**:
Create a factory function that produces type-safe RPC clients with configurable transports and middleware support.

**Acceptance Criteria**:

- Implement `createSolanaRpc`:
  - Accept endpoint URL
  - Return typed client object
  - Support configuration options
  - Enable middleware pipeline
- Add client configuration:
  - Default commitment level
  - Request timeout
  - Retry configuration
  - Custom headers
- Implement request ID generation:
  - Unique per request
  - Correlation support
- Create client utilities:
  - Health check method
  - Cluster info fetching
  - Performance metrics
- Type inference:
  - Methods from interface
  - Parameter validation
  - Return type safety

---

### SDK-28: Create HTTP transport

**Priority**: Highest | **Story Points**: 3 | **Labels**: `feature`, `rpc`  
**Dependencies**: SDK-27

**Description**:
Implement the default HTTP transport layer using the native fetch API, with proper error handling and request formatting.

**Acceptance Criteria**:

- Create fetch-based transport:
  - POST JSON-RPC requests
  - Correct Content-Type headers
  - Handle request/response cycle
  - Parse JSON responses
- Implement error handling:
  - Network errors
  - HTTP errors (4xx, 5xx)
  - JSON parsing errors
  - RPC errors (-32xxx codes)
- Add request features:
  - Timeout support
  - Abort controller integration
  - Request compression (if available)
  - Keep-alive connections
- Response processing:
  - Validate JSON-RPC format
  - Extract result or error
  - Type-safe parsing
- Performance optimizations:
  - Connection pooling hints
  - DNS prefetch
  - Efficient body streaming

**Implementation Structure**:

```typescript
export function createHttpTransport(url: string): Transport {
  return async (request) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    // Process response...
  };
}
```

---

### SDK-29: Add custom transport support

**Priority**: Medium | **Story Points**: 2 | **Labels**: `feature`, `rpc`  
**Dependencies**: SDK-28

**Description**:
Enable users to provide custom transport implementations for advanced scenarios like load balancing, caching, or special authentication.

**Acceptance Criteria**:

- Define Transport interface:
  - Accept RPC request
  - Return RPC response
  - Async operation
  - Error propagation
- Implement `createSolanaRpcFromTransport`:
  - Accept custom transport
  - Maintain type safety
  - Support middleware
- Create transport utilities:
  - Retry transport wrapper
  - Logging transport wrapper
  - Cache transport wrapper
- Example transports:
  - Load balancer transport
  - Authenticated transport
  - Mock transport for testing
- Documentation:
  - Transport interface guide
  - Example implementations
  - Best practices

---

### SDK-30: Implement core RPC methods

**Priority**: Highest | **Story Points**: 5 | **Labels**: `feature`, `rpc`  
**Dependencies**: SDK-28

**Description**:
Implement the most commonly used RPC methods with proper typing, error handling, and response parsing.

**Acceptance Criteria**:

- Implement account methods:
  - `getAccountInfo`: Fetch single account
  - `getMultipleAccounts`: Batch fetch
  - `getBalance`: SOL balance only
  - `getProgramAccounts`: Filter by program
- Implement transaction methods:
  - `sendTransaction`: Submit signed tx
  - `simulateTransaction`: Dry run
  - `getTransaction`: Fetch by signature
  - `getSignatureStatuses`: Check confirmations
- Implement block methods:
  - `getLatestBlockhash`: For tx building
  - `getBlock`: Full block data
  - `getBlockHeight`: Current height
- Implement utility methods:
  - `getMinimumBalanceForRentExemption`
  - `getSlot`: Current slot
  - `getVersion`: Node version
- Response parsing:
  - Handle null results
  - Parse bigint values
  - Decode base64 data
  - Transform to SDK types

---

### SDK-31: Write RPC module tests

**Priority**: High | **Story Points**: 3 | **Labels**: `test`, `rpc`  
**Dependencies**: SDK-30

**Description**:
Comprehensive testing of all RPC functionality including success cases, error handling, and edge cases.

**Test Coverage**:

- Mock transport testing:
  - Predefined responses
  - Error simulation
  - Latency simulation
- Method testing:
  - All parameters combinations
  - Null/undefined handling
  - Response parsing
- Error scenarios:
  - Network failures
  - Invalid responses
  - RPC errors
  - Timeout handling
- Integration patterns:
  - Middleware testing
  - Custom transport
  - Retry behavior
- Type safety:
  - Compile-time checks
  - Runtime validation

---

## Epic 5: WebSocket Subscriptions

**Goal**: Implement real-time data subscriptions using native WebSocket API

### SDK-33: Create WebSocket subscription client

**Priority**: High | **Story Points**: 5 | **Labels**: `feature`, `rpc-subscriptions`  
**Dependencies**: SDK-26

**Description**:
Build a robust WebSocket client for managing Solana RPC subscriptions with automatic reconnection and event handling.

**Acceptance Criteria**:

- Implement WebSocket manager:
  - Connection lifecycle management
  - Automatic reconnection logic
  - Exponential backoff
  - Connection state tracking
- Create subscription registry:
  - Track active subscriptions
  - Map subscription IDs to handlers
  - Clean up on disconnect
- Handle WebSocket events:
  - Parse subscription notifications
  - Route to correct handlers
  - Error event handling
- Implement connection features:
  - Ping/pong heartbeat
  - Connection timeout detection
  - Graceful shutdown
- Add configuration options:
  - Reconnect attempts
  - Heartbeat interval
  - Message queue size

**Architecture**:

```typescript
export class WebSocketSubscriptionClient {
  private ws: WebSocket | null = null;
  private subscriptions = new Map<number, SubscriptionHandler>();
  private reconnectAttempts = 0;

  // Implementation...
}
```

---

### SDK-34: Implement subscription methods

**Priority**: High | **Story Points**: 3 | **Labels**: `feature`, `rpc-subscriptions`  
**Dependencies**: SDK-33

**Description**:
Create high-level subscription methods that return AsyncIterators for ergonomic consumption of real-time data.

**Acceptance Criteria**:

- Implement account subscriptions:
  - `accountSubscribe`: Monitor account changes
  - Return AsyncIterator of updates
  - Handle data decoding
- Implement signature subscriptions:
  - `signatureSubscribe`: Transaction status
  - Support until finalized
  - Return confirmation details
- Add program subscriptions:
  - `programSubscribe`: Program accounts
  - Support filters
  - Efficient updates
- Create slot subscriptions:
  - `slotSubscribe`: New slots
  - `rootSubscribe`: Root slots
- AsyncIterator features:
  - Proper cleanup on break
  - Error propagation
  - Buffering options

**Usage Example**:

```typescript
for await (const update of rpc.accountSubscribe(address)) {
  console.log("Account updated:", update);
}
```

---

### SDK-35: Build subscription management

**Priority**: High | **Story Points**: 3 | **Labels**: `feature`, `rpc-subscriptions`  
**Dependencies**: SDK-34

**Description**:
Implement robust subscription lifecycle management including cleanup, error recovery, and resource management.

**Acceptance Criteria**:

- Create unsubscribe mechanism:
  - Clean subscription removal
  - Server notification
  - Resource cleanup
- Implement auto-cleanup:
  - On iterator break
  - On client disconnect
  - Memory leak prevention
- Add subscription options:
  - Commitment levels
  - Encoding options
  - Rate limiting
- Error recovery:
  - Resubscribe after reconnect
  - Maintain subscription state
  - Notify consumers of gaps
- Resource management:
  - Limit concurrent subscriptions
  - Queue overflow handling
  - Backpressure support

---

### SDK-36: Write subscription tests

**Priority**: Medium | **Story Points**: 3 | **Labels**: `test`, `rpc-subscriptions`  
**Dependencies**: SDK-35

**Description**:
Test WebSocket subscriptions including connection management, event delivery, and error scenarios.

**Test Scenarios**:

- Mock WebSocket testing:
  - Simulated events
  - Connection lifecycle
  - Message ordering
- Subscription flows:
  - Subscribe success
  - Event delivery
  - Unsubscribe cleanup
- Error handling:
  - Connection loss
  - Reconnection
  - Subscription recovery
- AsyncIterator behavior:
  - Proper cleanup
  - Error propagation
  - Concurrent iteration
- Memory leak detection:
  - Long-running subscriptions
  - Rapid subscribe/unsubscribe

---

## Epic 6: Transaction Building System

**Goal**: Create an immutable, type-safe transaction builder with full signing support

### SDK-38: Define Signer interface

**Priority**: Highest | **Story Points**: 2 | **Labels**: `feature`, `signers`  
**Dependencies**: SDK-3

**Description**:
Create the abstraction for transaction signers, enabling both SDK-managed keys and external wallet integration.

**Acceptance Criteria**:

- Define `Signer` interface:
  - `publicKey: Address` property
  - `sign(message: Uint8Array): Promise<Signature>`
  - Optional signer info/metadata
- Create `SignerInfo` type:
  - Public key reference
  - Signature placeholder
  - Is fee payer flag
- Add multi-signer types:
  - Collection helpers
  - Deduplication logic
  - Signer ordering
- Type safety features:
  - Branded signature type
  - Type guards
  - Async operation support

**Interface**:

```typescript
export interface Signer {
  readonly publicKey: Address;
  sign(message: Uint8Array): Promise<Signature>;
}
```

---

### SDK-39: Implement WebCrypto signer

**Priority**: Highest | **Story Points**: 3 | **Labels**: `feature`, `signers`  
**Dependencies**: SDK-38

**Description**:
Create the default signer implementation that wraps WebCrypto keys for transaction signing.

**Acceptance Criteria**:

- Implement `CryptoKeySigner`:
  - Wraps `CryptoKeyPair`
  - Implements `Signer` interface
  - Lazy public key derivation
  - Secure signing operations
- Add key management:
  - Key extraction (if allowed)
  - Key serialization helpers
  - Key metadata storage
- Create factories:
  - From generated keypair
  - From imported key
  - From seed/mnemonic (future)
- Security features:
  - Non-extractable by default
  - Usage restrictions
  - Clear security warnings

---

### SDK-40: Write signer tests

**Priority**: High | **Story Points**: 2 | **Labels**: `test`, `signers`  
**Dependencies**: SDK-39

**Description**:
Test signer implementations for correctness, security, and integration with the crypto module.

**Test Coverage**:

- Interface compliance:
  - All methods work
  - Correct types returned
  - Async behavior
- Signing operations:
  - Known message signing
  - Signature verification
  - Multiple signatures
- Key management:
  - Public key derivation
  - Key comparison
  - Metadata handling
- Security:
  - Non-extractable keys
  - Usage restrictions
  - Error on misuse

---

### SDK-41: Create transaction message builder

**Priority**: Highest | **Story Points**: 3 | **Labels**: `feature`, `transaction-messages`  
**Dependencies**: SDK-12

**Description**:
Implement the core transaction message builder with support for both legacy and versioned transactions.

**Acceptance Criteria**:

- Create `TransactionMessage` type:
  - Version (legacy or 0)
  - Fee payer
  - Recent blockhash
  - Instructions array
  - Address lookup tables (v0)
- Implement `createTransactionMessage`:
  - Accept version parameter
  - Return empty message
  - Immutable/frozen object
  - Type-safe version handling
- Add type refinements:
  - Messages with fee payer
  - Messages with blockhash
  - Complete messages
- Builder state tracking:
  - Required fields status
  - Validation state
  - Type-level guarantees

**Type Evolution**:

```typescript
type TransactionMessage = BaseMessage;
type TransactionMessageWithFeePayer = BaseMessage & { feePayer: Address };
type TransactionMessageWithLifetime = TransactionMessageWithFeePayer & {
  blockhash: Blockhash;
  lastValidBlockHeight: bigint;
};
```

---

### SDK-42: Add fee payer setter

**Priority**: Highest | **Story Points**: 2 | **Labels**: `feature`, `transaction-messages`  
**Dependencies**: SDK-41

**Description**:
Implement the function to set the fee payer on a transaction message, with proper type refinement.

**Acceptance Criteria**:

- Implement `setTransactionMessageFeePayer`:
  - Accept address and message
  - Return new frozen message
  - Update TypeScript type
  - Validate address format
- Type refinement:
  - Input: `TransactionMessage`
  - Output: `TransactionMessageWithFeePayer`
  - Compile-time guarantees
- Immutability:
  - Original unchanged
  - New object frozen
  - Deep freeze if needed
- Edge cases:
  - Changing fee payer
  - Same fee payer
  - Invalid address

---

### SDK-43: Implement lifetime setter

**Priority**: Highest | **Story Points**: 3 | **Labels**: `feature`, `transaction-messages`  
**Dependencies**: SDK-42

**Description**:
Add the ability to set transaction lifetime using a recent blockhash and last valid block height.

**Acceptance Criteria**:

- Implement `setTransactionMessageLifetimeUsingBlockhash`:
  - Accept blockhash info object
  - Set blockhash and height
  - Return refined type
  - Validate inputs
- Blockhash info type:
  - Blockhash string
  - Last valid block height
  - Optional slot info
- Alternative lifetime methods:
  - Using durable nonce (future)
  - Custom lifetime logic
- Type refinement:
  - Requires fee payer first
  - Output has lifetime
  - Ready for signing

---

### SDK-44: Build instruction management

**Priority**: Highest | **Story Points**: 3 | **Labels**: `feature`, `transaction-messages`  
**Dependencies**: SDK-43

**Description**:
Implement methods to add instructions to transaction messages while maintaining order and immutability.

**Acceptance Criteria**:

- Define `Instruction` type:
  - Program ID (Address)
  - Account keys array
  - Instruction data (Uint8Array)
- Implement instruction builders:
  - `appendTransactionMessageInstruction`
  - `prependTransactionMessageInstruction`
  - `insertTransactionMessageInstruction`
- Account management:
  - Deduplication logic
  - Signer/writable flags
  - Proper ordering
- Instruction helpers:
  - Validation logic
  - Size estimation
  - Data encoding utilities
- Maintain immutability:
  - Each operation returns new
  - Original unchanged
  - Frozen results

**Instruction Structure**:

```typescript
export interface Instruction {
  programId: Address;
  accounts: ReadonlyArray<{
    pubkey: Address;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  data: Uint8Array;
}
```

---

### SDK-45: Write message builder tests

**Priority**: High | **Story Points**: 3 | **Labels**: `test`, `transaction-messages`  
**Dependencies**: SDK-44

**Description**:
Test the transaction message builder for correctness, immutability, and type safety.

**Test Scenarios**:

- Builder flow:
  - Step-by-step building
  - Required field enforcement
  - Type refinement verification
- Immutability:
  - Objects are frozen
  - No shared references
  - Deep immutability
- Instruction handling:
  - Order preservation
  - Account deduplication
  - Size limits
- Error cases:
  - Missing fee payer
  - Missing blockhash
  - Invalid instructions
- Type tests:
  - Compile-time safety
  - Runtime validation

---

### SDK-46: Implement transaction signing

**Priority**: Highest | **Story Points**: 5 | **Labels**: `feature`, `transactions`  
**Dependencies**: SDK-44

**Description**:
Build the core transaction signing functionality with support for multiple signers and partial signing.

**Acceptance Criteria**:

- Implement `signTransaction`:
  - Accept signers and message
  - Validate prerequisites
  - Collect all signatures
  - Return signed transaction
- Prerequisites validation:
  - Fee payer is signer
  - Blockhash is set
  - All signers available
- Multi-signature support:
  - Parallel signing
  - Signature ordering
  - Missing signer detection
- Create Transaction type:
  - Message + signatures
  - Signature verification
  - Serialization ready
- Partial signing:
  - Some signers only
  - Add signatures later
  - Wallet integration

**Signing Flow**:

```typescript
export async function signTransaction(
  signers: Signer[],
  message: CompileableTransactionMessage
): Promise<Transaction> {
  // Validate, compile, sign
}
```

---

### SDK-47: Create transaction serialization

**Priority**: Highest | **Story Points**: 5 | **Labels**: `feature`, `transactions`  
**Dependencies**: SDK-46

**Description**:
Implement transaction serialization to the wire format for both legacy and versioned transactions.

**Acceptance Criteria**:

- Implement serialization:
  - Compile account keys
  - Order signatures
  - Encode instructions
  - Handle versions
- Legacy format support:
  - Fixed header structure
  - Account list ordering
  - Instruction encoding
- Version 0 support:
  - Address lookup tables
  - Compact account refs
  - Extended header
- Binary encoding:
  - Efficient packing
  - Size validation
  - Byte order handling
- Utilities:
  - Size estimation
  - Base64 encoding
  - Debug formatting

---

### SDK-48: Add send transaction helper

**Priority**: Medium | **Story Points**: 2 | **Labels**: `feature`, `transactions`  
**Dependencies**: SDK-47

**Description**:
Create a convenience method for sending transactions via RPC with proper encoding and options.

**Acceptance Criteria**:

- Implement `sendTransaction`:
  - Accept transaction and RPC
  - Handle serialization
  - Configure send options
  - Return signature
- Send options:
  - Skip preflight
  - Preflight commitment
  - Min context slot
  - Encoding preference
- Error handling:
  - Preflight errors
  - Network errors
  - Timeout handling
- Confirmation helper:
  - Wait for confirmation
  - Configurable commitment
  - Timeout support

---

### SDK-49: Write transaction tests

**Priority**: High | **Story Points**: 3 | **Labels**: `test`, `transactions`  
**Dependencies**: SDK-48

**Description**:
Comprehensive testing of transaction building, signing, and serialization.

**Test Coverage**:

- Transaction building:
  - Complete flow test
  - Multi-instruction
  - Complex accounts
- Signing:
  - Single signer
  - Multiple signers
  - Partial signing
  - Signature verification
- Serialization:
  - Legacy format
  - Version 0 format
  - Size limits
  - Known vectors
- Integration:
  - Build-sign-send flow
  - Error propagation
  - Edge cases

---

## Epic 7: High-Level Features

**Goal**: Implement user-friendly APIs for common operations

### SDK-51: Create account fetching

**Priority**: High | **Story Points**: 3 | **Labels**: `feature`, `accounts`  
**Dependencies**: SDK-30

**Description**:
Build high-level account fetching with automatic parsing and type safety.

**Acceptance Criteria**:

- Implement `getAccount`:
  - Generic over data type
  - Accept codec parameter
  - Handle non-existent accounts
  - Return typed result
- AccountInfo structure:
  - Owner program
  - Lamports balance
  - Data (decoded)
  - Executable flag
  - Rent epoch
- Decoding options:
  - Raw bytes
  - With codec
  - JSON parsed (RPC)
- Batch fetching:
  - Multiple accounts
  - Efficient RPC use
  - Type preservation

**API Example**:

```typescript
const account = await getAccount(address, tokenAccountCodec, rpc);
// account.data is fully typed
```

---

### SDK-52: Add account data decoding

**Priority**: High | **Story Points**: 3 | **Labels**: `feature`, `accounts`  
**Dependencies**: SDK-51

**Description**:
Implement flexible account data decoding with codec support and fallback options.

**Acceptance Criteria**:

- Decode strategies:
  - Codec-based decoding
  - JSON parsed from RPC
  - Raw buffer access
- Common account types:
  - System accounts
  - Token accounts
  - Token mint accounts
  - Program accounts
- Error handling:
  - Invalid data format
  - Codec mismatch
  - Partial decoding
- Performance:
  - Lazy decoding option
  - Efficient memory use
  - Cache decoded data

---

### SDK-53: Write account tests

**Priority**: Medium | **Story Points**: 2 | **Labels**: `test`, `accounts`  
**Dependencies**: SDK-52

**Description**:
Test account fetching and decoding functionality.

**Test Scenarios**:

- Fetching:
  - Existing accounts
  - Non-existent accounts
  - System accounts
  - Program accounts
- Decoding:
  - Known structures
  - Custom codecs
  - Invalid data
  - Edge cases
- Integration:
  - With RPC mocking
  - Type inference
  - Error handling

---

### SDK-54: Define sysvar constants

**Priority**: Medium | **Story Points**: 2 | **Labels**: `feature`, `sysvars`  
**Dependencies**: SDK-22

**Description**:
Create constants for all Solana system variables with proper typing.

**Acceptance Criteria**:

- Define addresses:
  - Clock sysvar
  - Rent sysvar
  - Epoch schedule
  - Recent blockhashes
  - Stake history
  - All others
- Type safety:
  - Branded Address types
  - No raw strings
  - Import friendly
- Documentation:
  - Purpose of each
  - Usage examples
  - Update frequency

---

### SDK-55: Implement sysvar fetchers

**Priority**: Medium | **Story Points**: 5 | **Labels**: `feature`, `sysvars`  
**Dependencies**: SDK-54

**Description**:
Create typed functions to fetch and decode system variables.

**Acceptance Criteria**:

- Implement fetchers:
  - `getClockSysvar()`
  - `getRentSysvar()`
  - `getEpochSchedule()`
  - Others as needed
- Data structures:
  - Typed returns
  - Proper decoding
  - BigInt for large numbers
- Caching strategy:
  - Some rarely change
  - Optional caching
  - TTL support
- Error handling:
  - Network errors
  - Decode errors
  - Type validation

---

### SDK-56: Write sysvar tests

**Priority**: Low | **Story Points**: 2 | **Labels**: `test`, `sysvars`  
**Dependencies**: SDK-55

**Description**:
Test sysvar constants and fetching functions.

**Test Coverage**:

- Constant values:
  - Correct addresses
  - Type safety
- Fetching:
  - Mock responses
  - Decoding accuracy
  - Error scenarios
- Data structures:
  - Field presence
  - Type correctness
  - Value ranges

---

## Epic 8: Integration & Documentation

**Goal**: Ensure production readiness with comprehensive testing and documentation

### SDK-58: Create integration tests

**Priority**: Highest | **Story Points**: 5 | **Labels**: `test`, `integration`  
**Dependencies**: SDK-49

**Description**:
Build end-to-end integration tests covering real-world usage patterns.

**Test Scenarios**:

- Complete workflows:
  - Generate keys → Send SOL
  - Create token → Transfer
  - Deploy program → Interact
- Cross-module integration:
  - All modules work together
  - No circular dependencies
  - Proper error propagation
- Performance tests:
  - Transaction throughput
  - Concurrent operations
  - Memory usage
- Compatibility tests:
  - Against devnet/testnet
  - Various RPC providers
  - Different browsers

---

### SDK-59: Write API documentation

**Priority**: High | **Story Points**: 8 | **Labels**: `doc`  
**Dependencies**: SDK-58

**Description**:
Create comprehensive documentation for all public APIs with examples.

**Documentation Sections**:

- Getting Started:
  - Installation
  - Quick start
  - Core concepts
- API Reference:
  - All modules
  - All exports
  - Full examples
- Guides:
  - Common patterns
  - Best practices
  - Performance tips
- Migration:
  - From web3.js
  - Breaking changes
  - Feature mapping

---

### SDK-60: Create example applications

**Priority**: Medium | **Story Points**: 5 | **Labels**: `doc`, `examples`  
**Dependencies**: SDK-58

**Description**:
Build sample applications demonstrating SDK capabilities.

**Examples to Create**:

- Basic examples:
  - Send SOL
  - Check balance
  - Monitor account
- Intermediate:
  - Token transfers
  - NFT minting
  - Program interaction
- Advanced:
  - Multi-sig wallet
  - DEX interaction
  - Custom program

---

### SDK-61: Performance benchmarking

**Priority**: Medium | **Story Points**: 3 | **Labels**: `test`, `performance`  
**Dependencies**: SDK-58

**Description**:
Measure and document performance characteristics.

**Benchmarks**:

- Bundle size:
  - Individual modules
  - Tree-shaking effect
  - vs web3.js
- Runtime performance:
  - Key generation
  - Signing speed
  - RPC throughput
- Memory usage:
  - Baseline memory
  - Under load
  - Leak detection

---

### SDK-62: Security audit preparation

**Priority**: High | **Story Points**: 3 | **Labels**: `security`  
**Dependencies**: SDK-58

**Description**:
Prepare the codebase for security review.

**Audit Preparation**:

- Security documentation:
  - Threat model
  - Key handling
  - Known issues
- Code review:
  - Crypto usage
  - Input validation
  - Error handling
- Automated scanning:
  - Dependency audit
  - SAST tools
  - License check

---

### SDK-63: Publish to npm

**Priority**: Medium | **Story Points**: 2 | **Labels**: `release`  
**Dependencies**: SDK-62

**Description**:
Release the SDK packages to npm with proper versioning.

**Release Tasks**:

- Package preparation:
  - Clean builds
  - License files
  - README updates
- Publishing:
  - npm registry
  - Tag releases
  - GitHub releases
- Post-release:
  - Announcement
  - Update docs
  - Monitor issues

---

## Summary

This comprehensive task breakdown provides a clear path to building a production-ready, zero-dependency Solana SDK. The tasks are organized to:

1. Build foundation first (setup, core modules)
2. Layer functionality (crypto → RPC → transactions)
3. Add convenience features (high-level APIs)
4. Ensure quality (testing, documentation)

Each task includes detailed acceptance criteria and technical notes to guide implementation. The dependency chain ensures work proceeds in logical order while allowing some parallel development where possible.
