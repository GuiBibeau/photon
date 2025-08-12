# @photon/transactions

Complete transaction lifecycle management for Solana. Compile, sign, serialize, and send transactions.

## Installation

```bash
npm install @photon/transactions
```

## First create and send a transaction

```typescript
import { 
  compileTransaction,
  signTransaction,
  sendTransaction 
} from '@photon/transactions';

// Compile message into transaction
const transaction = compileTransaction(message);

// Sign with signers
const signedTx = await signTransaction(transaction, signers);

// Send to network
const signature = await sendTransaction(signedTx, rpc);
console.log('Transaction sent:', signature);
```

## Core Concepts

### Transaction Structure

```typescript
interface Transaction {
  readonly message: CompileableTransactionMessage;
  readonly signatures: ReadonlyMap<Address, Signature | null>;
}
```

Transactions contain:
- **Message**: The compiled transaction message with instructions
- **Signatures**: Map of public keys to their signatures (null if not signed)

## Compiling Transactions

### Basic Compilation

```typescript
import { compileTransaction } from '@photon/transactions';

// Message must be compileable (has fee payer and lifetime)
const transaction = compileTransaction(message);

console.log('Fee payer:', transaction.message.feePayer);
console.log('Instructions:', transaction.message.instructions.length);
```

### Compiled Transaction Structure

```typescript
import type { CompiledTransaction } from '@photon/transactions';

interface CompiledTransaction {
  readonly message: CompileableTransactionMessage;
  readonly addressTableLookups?: AddressTableLookup[];
  readonly messageBytes: Uint8Array;
}
```

## Signing Transactions

### Sign with Multiple Signers

```typescript
import { signTransaction } from '@photon/transactions';

const signers = [feePayer, accountOwner, authority];

// Sign transaction
const signedTx = await signTransaction(transaction, signers);

// Check signatures
for (const [address, signature] of signedTx.signatures) {
  console.log(`${address}: ${signature ? 'signed' : 'not signed'}`);
}
```

### Partial Signing

```typescript
import { partiallySignTransaction } from '@photon/transactions';

// Sign with available signers (doesn't fail if some are missing)
const result = await partiallySignTransaction(transaction, signers);

console.log('Transaction:', result.transaction);
console.log('Failed signers:', result.failedSigners);
console.log('Errors:', result.errors);

// Check if fully signed
import { isFullySigned } from '@photon/transactions';

if (isFullySigned(result.transaction)) {
  // Ready to send
} else {
  // Need more signatures
}
```

### Add Signatures Manually

```typescript
import { addSignaturesToTransaction } from '@photon/transactions';

// Add signatures from external source (e.g., hardware wallet)
const signatures = new Map<Address, Signature>([
  [address1, signature1],
  [address2, signature2]
]);

const signedTx = addSignaturesToTransaction(transaction, signatures);
```

### Check Missing Signers

```typescript
import { getMissingSigners } from '@photon/transactions';

const missing = getMissingSigners(transaction);
console.log('Still need signatures from:', missing);
```

## Serialization

### Serialize Transaction

```typescript
import { 
  serializeTransaction,
  serializeMessage 
} from '@photon/transactions';

// Serialize full transaction (with signatures)
const txBytes = serializeTransaction(signedTx);

// Serialize just the message (for signing)
const messageBytes = serializeMessage(transaction.message);
```

### Encoding Formats

```typescript
import { 
  encodeTransactionBase64,
  encodeTransactionBase58 
} from '@photon/transactions';

// Base64 encoding (for RPC)
const base64 = encodeTransactionBase64(signedTx);

// Base58 encoding (for display)
const base58 = encodeTransactionBase58(signedTx);
```

### Size Validation

```typescript
import { 
  estimateTransactionSize,
  isTransactionSizeValid,
  MAX_TRANSACTION_SIZE 
} from '@photon/transactions';

// Estimate size before sending
const size = estimateTransactionSize(transaction);
console.log(`Transaction size: ${size}/${MAX_TRANSACTION_SIZE} bytes`);

// Check if within limits
if (!isTransactionSizeValid(transaction)) {
  throw new Error('Transaction too large!');
}
```

## Sending Transactions

### Basic Send

```typescript
import { sendTransaction } from '@photon/transactions';

const signature = await sendTransaction(signedTx, rpc, {
  skipPreflight: false,
  preflightCommitment: 'confirmed',
  maxRetries: 3
});

console.log('Transaction signature:', signature);
```

### Send and Confirm

```typescript
import { sendAndConfirmTransaction } from '@photon/transactions';

// Send and wait for confirmation
const result = await sendAndConfirmTransaction(signedTx, rpc, {
  commitment: 'confirmed',
  timeout: 30000 // 30 seconds
});

console.log('Confirmed signature:', result.signature);
console.log('Slot:', result.slot);
```

### Confirm Transaction

```typescript
import { confirmTransaction } from '@photon/transactions';

// Send first
const signature = await sendTransaction(signedTx, rpc);

// Confirm separately
const confirmed = await confirmTransaction(signature, rpc, {
  commitment: 'finalized',
  timeout: 60000
});

if (confirmed) {
  console.log('Transaction finalized');
}
```

## Common Patterns

### Complete Transaction Flow

```typescript
async function executeTransaction(
  message: CompileableTransactionMessage,
  signers: Signer[],
  rpc: SolanaRpc
): Promise<string> {
  // 1. Compile
  const transaction = compileTransaction(message);
  
  // 2. Sign
  const signedTx = await signTransaction(transaction, signers);
  
  // 3. Verify fully signed
  if (!isFullySigned(signedTx)) {
    const missing = getMissingSigners(signedTx);
    throw new Error(`Missing signatures from: ${missing.join(', ')}`);
  }
  
  // 4. Check size
  if (!isTransactionSizeValid(signedTx)) {
    throw new Error('Transaction exceeds size limit');
  }
  
  // 5. Send and confirm
  const { signature } = await sendAndConfirmTransaction(signedTx, rpc);
  
  return signature;
}
```

### Multi-Signature Transaction

```typescript
async function multiSigTransaction(
  message: CompileableTransactionMessage,
  signers: Signer[],
  additionalSigners: Map<Address, Signature>
): Promise<Transaction> {
  // Compile
  const transaction = compileTransaction(message);
  
  // Sign with available signers
  const partialResult = await partiallySignTransaction(transaction, signers);
  
  // Add external signatures
  const withExternal = addSignaturesToTransaction(
    partialResult.transaction,
    additionalSigners
  );
  
  // Check completeness
  const missing = getMissingSigners(withExternal);
  if (missing.length > 0) {
    console.log('Still need:', missing);
  }
  
  return withExternal;
}
```

### Retry Logic

```typescript
async function sendWithRetry(
  transaction: Transaction,
  rpc: SolanaRpc,
  maxAttempts = 3
): Promise<string> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const signature = await sendTransaction(transaction, rpc, {
        skipPreflight: i > 0, // Skip preflight on retries
        maxRetries: 1
      });
      
      // Wait for confirmation
      const confirmed = await confirmTransaction(signature, rpc, {
        commitment: 'confirmed',
        timeout: 20000
      });
      
      if (confirmed) {
        return signature;
      }
    } catch (error) {
      lastError = error as Error;
      console.log(`Attempt ${i + 1} failed:`, error.message);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  throw lastError || new Error('Failed to send transaction');
}
```

### Priority Fees

```typescript
function addPriorityFee(
  transaction: Transaction,
  microLamports: number
): Transaction {
  const computeBudget = address('ComputeBudget111111111111111111111111111111');
  
  // Create priority fee instruction
  const priorityFeeIx = {
    programId: computeBudget,
    accounts: [],
    data: new Uint8Array([
      0x03, // SetComputeUnitPrice
      ...encodeU64(microLamports)
    ])
  };
  
  // Prepend to message
  const updatedMessage = prependTransactionMessageInstruction(
    priorityFeeIx,
    transaction.message
  );
  
  // Return new transaction with updated message
  return {
    ...transaction,
    message: updatedMessage
  };
}
```

### Simulation Before Sending

```typescript
async function simulateAndSend(
  transaction: Transaction,
  rpc: SolanaRpc
): Promise<string> {
  // Simulate first
  const simulation = await rpc.simulateTransaction(
    encodeTransactionBase64(transaction)
  );
  
  if (simulation.value.err) {
    throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
  }
  
  console.log('Units consumed:', simulation.value.unitsConsumed);
  console.log('Logs:', simulation.value.logs);
  
  // Send if simulation succeeds
  return sendTransaction(transaction, rpc);
}
```

## Error Handling

```typescript
import { SolanaError } from '@photon/errors';

try {
  const signature = await sendTransaction(transaction, rpc);
} catch (error) {
  if (error instanceof SolanaError) {
    switch (error.code) {
      case 'TRANSACTION_TOO_LARGE':
        console.log('Transaction exceeds size limit');
        break;
      case 'INSUFFICIENT_SIGNATURES':
        console.log('Missing required signatures');
        break;
      case 'SIMULATION_FAILED':
        console.log('Transaction would fail on-chain');
        break;
    }
  }
}
```

## TypeScript

Full type safety throughout the transaction lifecycle:

```typescript
import type {
  Transaction,
  SignTransactionOptions,
  PartialSignResult,
  SendOptions,
  ConfirmTransactionOptions
} from '@photon/transactions';

// Options types
const signOptions: SignTransactionOptions = {
  abortOnError: false,
  verifySignatures: true
};

const sendOptions: SendOptions = {
  skipPreflight: false,
  preflightCommitment: 'confirmed',
  maxRetries: 5
};

// Result types
const partialResult: PartialSignResult = {
  transaction,
  failedSigners: [],
  errors: new Map()
};
```

## Best Practices

1. **Always verify signatures** before sending
2. **Check transaction size** to avoid rejection
3. **Use appropriate commitment levels** for your use case
4. **Implement retry logic** for network issues
5. **Simulate transactions** when testing new code
6. **Add priority fees** during network congestion

## Size

- ~14KB minified
- ~5KB gzipped
- Tree-shakeable exports

## License

Apache-2.0