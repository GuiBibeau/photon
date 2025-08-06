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

### Basic RPC Client

```typescript
import { createSolanaRpc } from '@photon/rpc';

// Create RPC client with HTTP transport
const rpc = createSolanaRpc('https://api.devnet.solana.com', {
  commitment: 'confirmed',
  timeout: 30000,
});

// Make type-safe RPC calls
const balance = await rpc.getBalance(address);
const block = await rpc.getBlock(slot);
```

### Custom Transport

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

## Custom Transport Support

### Transport Interface

Create your own transport by implementing the `Transport` interface:

```typescript
import type { Transport, JsonRpcRequest, JsonRpcResponse } from '@photon/rpc';

const customTransport: Transport = async (request) => {
  // Your custom transport logic
  const response = await fetch('/custom-endpoint', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return response.json();
};

const rpc = createSolanaRpcFromTransport(customTransport);
```

### Built-in Transport Wrappers

#### Retry Transport

Add automatic retry logic with exponential backoff:

```typescript
import { createHttpTransport, createRetryTransport } from '@photon/rpc';

const baseTransport = createHttpTransport('https://api.mainnet-beta.solana.com');
const retryTransport = createRetryTransport(baseTransport, {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  jitter: 0.1,
  shouldRetry: (error, attempt) => {
    // Custom retry logic
    return attempt < 3 && error instanceof Error && error.message.includes('timeout');
  },
});

const rpc = createSolanaRpcFromTransport(retryTransport);
```

#### Logging Transport

Add request/response logging:

```typescript
import { createLoggingTransport } from '@photon/rpc';

const baseTransport = createHttpTransport('https://api.mainnet-beta.solana.com');
const loggingTransport = createLoggingTransport(baseTransport, {
  logger: (level, message, data) => {
    console.log(`[${level.toUpperCase()}] ${message}`, data);
  },
  logParams: true,
  logResults: false,
  logTiming: true,
});

const rpc = createSolanaRpcFromTransport(loggingTransport);
```

#### Cache Transport

Cache responses for read-only methods:

```typescript
import { createCacheTransport } from '@photon/rpc';

const baseTransport = createHttpTransport('https://api.mainnet-beta.solana.com');
const cacheTransport = createCacheTransport(baseTransport, {
  ttl: 5000, // 5 seconds
  maxSize: 100,
  cacheMethods: ['getAccountInfo', 'getBalance', 'getBlockHeight'],
  getCacheKey: (request) => `${request.method}:${JSON.stringify(request.params)}`,
});

// Clear cache when needed
cacheTransport.clearCache();

const rpc = createSolanaRpcFromTransport(cacheTransport);
```

#### Load Balancer Transport

Distribute requests across multiple endpoints:

```typescript
import { createLoadBalancerTransport } from '@photon/rpc';

const loadBalancer = createLoadBalancerTransport([
  'https://rpc1.example.com',
  'https://rpc2.example.com',
  'https://rpc3.example.com',
], {
  strategy: 'round-robin', // 'random', 'least-failures'
  healthCheckInterval: 30000,
  maxFailures: 3,
  healthCheckTimeout: 5000,
});

// Check endpoint health
const healthStatus = loadBalancer.getHealthStatus();
console.log('Endpoint health:', healthStatus);

const rpc = createSolanaRpcFromTransport(loadBalancer);
```

#### Authenticated Transport

Add authentication headers:

```typescript
import { createAuthenticatedTransport } from '@photon/rpc';

const baseTransport = createHttpTransport('https://api.example.com');

// Static token
const authTransport = createAuthenticatedTransport(baseTransport, {
  token: 'your-api-key',
  headerName: 'X-API-Key', // Default: 'Authorization'
  additionalHeaders: {
    'X-Client-Version': '1.0.0',
  },
});

// Dynamic token
const dynamicAuthTransport = createAuthenticatedTransport(baseTransport, {
  getToken: async () => {
    // Fetch token from your auth service
    const response = await fetch('/auth/token');
    const { token } = await response.json();
    return token;
  },
});

const rpc = createSolanaRpcFromTransport(authTransport);
```

### Composing Transports

Combine multiple transport wrappers:

```typescript
import {
  createHttpTransport,
  createRetryTransport,
  createLoggingTransport,
  createCacheTransport,
  createAuthenticatedTransport,
} from '@photon/rpc';

// Start with HTTP transport
let transport = createHttpTransport('https://api.mainnet-beta.solana.com');

// Add authentication
transport = createAuthenticatedTransport(transport, {
  token: 'your-api-key',
});

// Add caching
transport = createCacheTransport(transport, {
  ttl: 5000,
  maxSize: 50,
});

// Add retry logic
transport = createRetryTransport(transport, {
  maxAttempts: 3,
  initialDelay: 1000,
});

// Add logging (outermost wrapper)
transport = createLoggingTransport(transport, {
  logTiming: true,
});

const rpc = createSolanaRpcFromTransport(transport);
```

### Advanced Transport Examples

#### Circuit Breaker Transport

```typescript
const createCircuitBreakerTransport = (
  transport: Transport,
  options: {
    failureThreshold: number;
    resetTimeout: number;
  }
): Transport => {
  let failures = 0;
  let isOpen = false;
  let nextAttempt = 0;

  return async (request) => {
    // Circuit breaker logic
    if (isOpen && Date.now() < nextAttempt) {
      throw new Error('Circuit breaker is open');
    }

    try {
      const response = await transport(request);
      failures = 0;
      isOpen = false;
      return response;
    } catch (error) {
      failures++;
      if (failures >= options.failureThreshold) {
        isOpen = true;
        nextAttempt = Date.now() + options.resetTimeout;
      }
      throw error;
    }
  };
};
```

#### Rate Limiting Transport

```typescript
const createRateLimitTransport = (
  transport: Transport,
  requestsPerSecond: number
): Transport => {
  const queue: Array<() => void> = [];
  let lastRequest = 0;

  const processQueue = () => {
    if (queue.length === 0) return;
    
    const now = Date.now();
    const minInterval = 1000 / requestsPerSecond;
    
    if (now - lastRequest >= minInterval) {
      const next = queue.shift();
      lastRequest = now;
      next?.();
      setTimeout(processQueue, minInterval);
    } else {
      setTimeout(processQueue, minInterval - (now - lastRequest));
    }
  };

  return async (request) => {
    return new Promise((resolve, reject) => {
      queue.push(async () => {
        try {
          resolve(await transport(request));
        } catch (error) {
          reject(error);
        }
      });
      processQueue();
    });
  };
};
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