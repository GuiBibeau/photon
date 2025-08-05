# @photon/rpc

Type-safe JSON-RPC client for Solana with pluggable transport and middleware support.

## Overview

This package provides a complete RPC client factory with comprehensive TypeScript types for all Solana JSON-RPC methods, ensuring type safety and excellent developer experience.

## Features

- 🔒 **Type-Safe**: Complete TypeScript definitions for all RPC methods
- 🔌 **Pluggable Transport**: Support for custom transports (HTTP, WebSocket, etc.)
- 🔗 **Middleware Pipeline**: Composable middleware for request/response processing
- 📝 **Documented**: JSDoc comments for all types and methods
- 🎯 **Zero Dependencies**: Pure TypeScript implementation
- 🔧 **Helpers**: Utility types and convenience functions
- ✅ **Tested**: Comprehensive type and unit tests

## Installation

```bash
npm install @photon/rpc
```

## Usage

### Create RPC Client

```typescript
import { createSolanaRpcFromTransport, createMockTransport } from '@photon/rpc';

// Create a mock transport for testing
const transport = createMockTransport(
  new Map([
    ['getBalance', 1000000000n],
    ['getBlockHeight', 123456],
  ])
);

// Create RPC client
const rpc = createSolanaRpcFromTransport(transport, {
  commitment: 'confirmed',
  timeout: 30000,
});

// Make type-safe RPC calls
const balance = await rpc.getBalance(address);
const block = await rpc.getBlock(slot);
```

Note: HTTP transport will be implemented in SDK-28. Use `createSolanaRpcFromTransport` with a custom transport for now.

### Import Types

```typescript
import type {
  SolanaRpcApi,
  Commitment,
  AccountInfo,
  RpcResponse,
  TransactionError,
} from '@photon/rpc';
```

### Use with RPC Client Implementation

```typescript
import type { SolanaRpcApi } from '@photon/rpc';

// Implement your RPC client
class SolanaRpcClient implements SolanaRpcApi {
  async getAccountInfo(address, config) {
    // Implementation
  }
  
  async getBalance(address, config) {
    // Implementation
  }
  
  // ... implement other methods
}
```

### Type Helpers

```typescript
import {
  type RpcMethodNames,
  type RpcMethodParams,
  type RpcMethodReturn,
  isRpcSuccess,
  isRpcError,
  extractRpcResult,
} from '@photon/rpc';

// Extract method names
type Method = RpcMethodNames; // 'getAccountInfo' | 'getBalance' | ...

// Extract parameters for a method
type Params = RpcMethodParams<'getAccountInfo'>; // [Address, config?]

// Extract return type for a method
type Return = RpcMethodReturn<'getAccountInfo'>; // RpcResponse<AccountInfo | null>

// Check response status
if (isRpcSuccess(response)) {
  console.log(response.result);
} else if (isRpcError(response)) {
  console.error(response.error);
}
```

## Core Types

### Commitment Levels

```typescript
type Commitment = 'processed' | 'confirmed' | 'finalized';
```

### Account Information

```typescript
interface AccountInfo {
  lamports: bigint;
  owner: Address;
  data: string | Uint8Array | ParsedAccountData;
  executable: boolean;
  rentEpoch: bigint;
}
```

### RPC Response

```typescript
interface RpcResponse<T> {
  context: {
    slot: number;
    apiVersion?: string;
  };
  value: T;
}
```

### Transaction Error

```typescript
type TransactionError = 
  | string
  | { InstructionError: [number, InstructionError] }
  | { InsufficientFundsForRent: { account_index: number } };
```

## API Methods

The `SolanaRpcApi` interface includes all standard Solana RPC methods:

- **Account Methods**: `getAccountInfo`, `getBalance`, `getMultipleAccounts`
- **Transaction Methods**: `sendTransaction`, `simulateTransaction`, `getTransaction`
- **Block Methods**: `getBlock`, `getBlockHeight`, `getLatestBlockhash`
- **Token Methods**: `getTokenAccountBalance`, `getTokenSupply`
- **Subscription Support**: `getSignatureStatuses`, `getSlot`
- And many more...

## Configuration Types

Most methods accept optional configuration:

```typescript
interface GetAccountInfoConfig {
  commitment?: Commitment;
  encoding?: Encoding;
  dataSlice?: { offset: number; length: number };
  minContextSlot?: number;
}
```

## Type Safety Examples

```typescript
// Type-safe method calls
const accountInfo = await rpc.getAccountInfo(address, {
  commitment: 'finalized',
  encoding: 'base64',
});

// TypeScript knows accountInfo is RpcResponse<AccountInfo | null>
if (accountInfo.value) {
  console.log(accountInfo.value.lamports); // bigint
  console.log(accountInfo.value.owner); // Address
}

// Type errors are caught at compile time
await rpc.getBalance(123); // Error: Argument of type 'number' is not assignable to parameter of type 'Address'
```

## BigInt Support

All large numbers use `bigint` for precision:

```typescript
interface Supply {
  total: bigint;
  circulating: bigint;
  nonCirculating: bigint;
}
```

## License

MIT