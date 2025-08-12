# @photon/errors

Type-safe error handling for Solana applications with structured error codes and recovery suggestions.

## Installation

```bash
npm install @photon/errors
```

## First create an error

```typescript
import { SolanaError } from '@photon/errors';

// Basic error
throw new SolanaError('INVALID_ADDRESS', { 
  address: 'bad-address' 
});

// With cause
throw new SolanaError(
  'RPC_ERROR',
  { method: 'getBalance', details: 'Connection timeout' },
  originalError
);
```

## Core Concepts

### Error Codes

All errors use discriminated union types for compile-time safety:

```typescript
type SolanaErrorCode = 
  | 'INVALID_ADDRESS'
  | 'INVALID_KEYPAIR' 
  | 'RPC_ERROR'
  | 'TRANSACTION_FAILED'
  | 'INSUFFICIENT_BALANCE'
  // ... and more
```

### Structured Context

Errors include typed context for debugging:

```typescript
const error = new SolanaError('INSUFFICIENT_BALANCE', {
  address: '11111111111111111111111111111112',
  requiredAmount: 1000000,
  currentAmount: 500000
});

console.log(error.code);    // 'INSUFFICIENT_BALANCE'
console.log(error.context);  // { address: '...', requiredAmount: ..., currentAmount: ... }
console.log(error.message);  // Human-readable message with context
```

## API Reference

### Creating Errors

#### `SolanaError`

Main error class with structured information.

```typescript
new SolanaError(code, context?, cause?)
```

#### Factory Methods

Pre-configured error creators for common scenarios:

```typescript
import { SolanaErrorFactory } from '@photon/errors';

// Create typed errors
const error = SolanaErrorFactory.invalidAddress('bad-address');
const error = SolanaErrorFactory.rpcError('getBalance', 'Connection failed');
const error = SolanaErrorFactory.transactionFailed('signature123');
```

### Validation Errors

Helper functions for address and signature validation:

```typescript
import { 
  createAddressFormatError,
  createAddressLengthError,
  createSignatureFormatError,
  validateBase58Format,
  validateAddressFormat
} from '@photon/errors';

// Validation with error creation
if (!isValidBase58(input)) {
  throw createAddressFormatError(input, 'Invalid base58 characters');
}

// Validation helpers
validateBase58Format(address);  // Throws if invalid
validateAddressFormat(address); // Throws if not 32 bytes
```

### RPC Error Mapping

Convert RPC errors to structured SolanaErrors:

```typescript
import { parseRpcError, mapRpcErrorCode } from '@photon/errors';

try {
  const result = await rpc.call('getBalance', [address]);
} catch (error) {
  // Parse JSON-RPC errors
  const solanaError = parseRpcError(error);
  
  // Map error codes
  const errorCode = mapRpcErrorCode(error.code);
}
```

### Error Enhancement

Add context to errors for better debugging:

```typescript
import { 
  enhanceErrorWithContext,
  enhanceErrorWithLogs,
  enhanceErrorWithTransaction 
} from '@photon/errors';

// Add context
const enhanced = enhanceErrorWithContext(error, {
  slot: 12345,
  timestamp: Date.now()
});

// Add transaction details
const withTx = enhanceErrorWithTransaction(error, {
  signature: 'abc123...',
  accounts: ['11111...', '22222...']
});

// Add simulation logs
const withLogs = enhanceErrorWithLogs(error, [
  'Program log: Instruction: Transfer',
  'Program log: Error: Insufficient funds'
]);
```

### Error Recovery

Get recovery suggestions for errors:

```typescript
import { getErrorRecovery, getErrorSuggestions } from '@photon/errors';

const recovery = getErrorRecovery('INSUFFICIENT_BALANCE');
// {
//   retryable: false,
//   suggestions: ['Check account balance', 'Request airdrop on devnet'],
//   documentation: 'https://docs.solana.com/...'
// }

const suggestions = getErrorSuggestions(error);
// ['Ensure account has sufficient SOL', 'Check network status']
```

## Common Patterns

### Wrapping External Errors

```typescript
import { wrapError } from '@photon/errors';

try {
  await someExternalLibrary();
} catch (error) {
  throw wrapError(error, 'EXTERNAL_LIBRARY_ERROR', {
    library: 'some-lib',
    operation: 'connect'
  });
}
```

### Merging Multiple Errors

```typescript
import { mergeErrors } from '@photon/errors';

const errors = await Promise.allSettled(operations);
const merged = mergeErrors(errors.filter(r => r.status === 'rejected'));
```

### Type Guards

```typescript
import { SolanaError } from '@photon/errors';

function handleError(error: unknown) {
  if (error instanceof SolanaError) {
    switch (error.code) {
      case 'INVALID_ADDRESS':
        // Handle invalid address
        break;
      case 'RPC_ERROR':
        // Handle RPC error
        break;
    }
  }
}
```

## Error Code Reference

### Validation Errors
- `INVALID_ADDRESS` - Invalid Solana address format
- `INVALID_ADDRESS_LENGTH` - Address not 32 bytes
- `INVALID_SIGNATURE` - Invalid signature format
- `INVALID_KEYPAIR` - Invalid keypair provided

### RPC Errors
- `RPC_ERROR` - General RPC error
- `RPC_PARSE_ERROR` - Invalid JSON received
- `RPC_METHOD_NOT_FOUND` - Method doesn't exist
- `RPC_INVALID_PARAMS` - Invalid parameters
- `RPC_INTERNAL_ERROR` - Internal RPC error

### Transaction Errors
- `TRANSACTION_FAILED` - Transaction execution failed
- `TRANSACTION_TOO_LARGE` - Exceeds size limit
- `INSUFFICIENT_SIGNATURES` - Missing required signatures
- `SIMULATION_FAILED` - Transaction simulation failed

### Network Errors
- `NETWORK_ERROR` - Network request failed
- `TIMEOUT_ERROR` - Request timed out
- `CONNECTION_ERROR` - Connection failed

### Cryptographic Errors
- `CRYPTO_NOT_SUPPORTED` - WebCrypto not available
- `KEY_GENERATION_FAILED` - Failed to generate keys
- `INVALID_KEY_TYPE` - Wrong key type provided

## TypeScript

Full TypeScript support with discriminated unions:

```typescript
import type { SolanaError, SolanaErrorCode } from '@photon/errors';

function processError(error: SolanaError) {
  // TypeScript knows all possible error codes
  switch (error.code) {
    case 'INVALID_ADDRESS':
      // error.context is typed for this error code
      console.log(error.context?.address);
      break;
  }
}
```

## Size

- ~8KB minified
- Tree-shakeable exports
- Zero dependencies

## License

Apache-2.0