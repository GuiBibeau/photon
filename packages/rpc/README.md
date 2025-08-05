# @photon/rpc

Type-safe JSON-RPC client types for Solana.

## Overview

This package provides comprehensive TypeScript types for all Solana JSON-RPC methods, ensuring type safety and excellent developer experience when building RPC clients.

## Features

- 🔒 **Type-Safe**: Complete TypeScript definitions for all RPC methods
- 📝 **Documented**: JSDoc comments for all types and methods
- 🎯 **Accurate**: Types match Solana's actual RPC interface
- 🔧 **Helpers**: Utility types for extracting method parameters and returns
- ✅ **Tested**: Comprehensive type tests ensure correctness

## Installation

```bash
npm install @photon/rpc
```

## Usage

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