# @photon/transaction-messages

Immutable transaction message builder for Solana. Type-safe construction of legacy and versioned transactions.

## Installation

```bash
npm install @photon/transaction-messages
```

## First create a message

```typescript
import { 
  createTransactionMessage,
  setTransactionMessageFeePayer,
  appendTransactionMessageInstruction,
  setTransactionMessageLifetimeUsingBlockhash
} from '@photon/transaction-messages';

// Build a transaction message
let message = createTransactionMessage('legacy');

// Set fee payer
message = setTransactionMessageFeePayer(feePayerAddress, message);

// Add instruction
message = appendTransactionMessageInstruction(instruction, message);

// Set lifetime
message = setTransactionMessageLifetimeUsingBlockhash(
  { blockhash, lastValidBlockHeight },
  message
);

// Message is now ready for compilation
```

## Core Concepts

### Immutable Builder Pattern

All operations return a new message object:

```typescript
const message1 = createTransactionMessage('legacy');
const message2 = setTransactionMessageFeePayer(payer, message1);

console.log(message1 === message2); // false - immutable
```

### Type Progression

Messages progress through types as required fields are added:

```typescript
// 1. Base message
const base: TransactionMessage = createTransactionMessage('legacy');

// 2. With fee payer
const withPayer: TransactionMessageWithFeePayer = 
  setTransactionMessageFeePayer(payer, base);

// 3. With lifetime (compileable)
const compileable: CompileableTransactionMessage = 
  setTransactionMessageLifetimeUsingBlockhash(blockhash, withPayer);
```

## Creating Messages

### Version Selection

```typescript
import { createTransactionMessage } from '@photon/transaction-messages';

// Legacy transaction (most compatible)
const legacy = createTransactionMessage('legacy');

// Versioned transaction (v0 - supports lookup tables)
const versioned = createTransactionMessage(0);
```

## Setting Fee Payer

```typescript
import { setTransactionMessageFeePayer } from '@photon/transaction-messages';

const message = createTransactionMessage('legacy');

// Set fee payer (required for all transactions)
const withPayer = setTransactionMessageFeePayer(
  payerAddress,
  message
);

// Type guard
import { hasFeePayer } from '@photon/transaction-messages';

if (hasFeePayer(message)) {
  console.log('Fee payer:', message.feePayer);
}
```

## Managing Instructions

### Append Instructions

```typescript
import { 
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructions 
} from '@photon/transaction-messages';

// Add single instruction
let message = appendTransactionMessageInstruction(
  transferInstruction,
  messageWithPayer
);

// Add multiple instructions
message = appendTransactionMessageInstructions(
  [instruction1, instruction2, instruction3],
  message
);
```

### Prepend Instructions

```typescript
import { prependTransactionMessageInstruction } from '@photon/transaction-messages';

// Add instruction at beginning
const message = prependTransactionMessageInstruction(
  setupInstruction,
  existingMessage
);
```

### Insert Instructions

```typescript
import { insertTransactionMessageInstruction } from '@photon/transaction-messages';

// Insert at specific index
const message = insertTransactionMessageInstruction(
  instruction,
  2, // Insert at index 2
  existingMessage
);
```

### Create Instructions

```typescript
import { createInstruction, createInstructionData } from '@photon/transaction-messages';

// Create instruction data
const data = createInstructionData([
  0x01, // Instruction discriminator
  ...amountBytes // Additional data
]);

// Create full instruction
const instruction = createInstruction({
  programId: tokenProgramAddress,
  accounts: [
    { pubkey: sourceAccount, isSigner: true, isWritable: true },
    { pubkey: destAccount, isSigner: false, isWritable: true }
  ],
  data
});
```

## Setting Transaction Lifetime

### Using Blockhash

```typescript
import { setTransactionMessageLifetimeUsingBlockhash } from '@photon/transaction-messages';

// From RPC response
const { blockhash, lastValidBlockHeight } = await rpc.getLatestBlockhash();

const message = setTransactionMessageLifetimeUsingBlockhash(
  { 
    blockhash: blockhash('HDUDPtxJJZvbJax5WM1RXFVS3qJZGwPYA4qV7qUMCZRL'),
    lastValidBlockHeight: 12345678n
  },
  messageWithPayer
);
```

### Using Durable Nonce

```typescript
import { setTransactionMessageLifetimeUsingNonce } from '@photon/transaction-messages';

// For offline/delayed signing
const message = setTransactionMessageLifetimeUsingNonce(
  {
    nonce: blockhash('NonceHash123...'),
    nonceAccount: nonceAccountAddress,
    nonceAuthority: authorityAddress
  },
  messageWithPayer
);
```

### Check Lifetime

```typescript
import { hasLifetime } from '@photon/transaction-messages';

if (hasLifetime(message)) {
  console.log('Blockhash:', message.blockhash);
  console.log('Valid until block:', message.lastValidBlockHeight);
}
```

## Instruction Types

```typescript
import type { Instruction, AccountMeta } from '@photon/transaction-messages';

// Instruction structure
interface Instruction {
  programId: Address;
  accounts: ReadonlyArray<AccountMeta>;
  data: Uint8Array;
}

// Account metadata
interface AccountMeta {
  pubkey: Address;
  isSigner: boolean;
  isWritable: boolean;
}
```

## Address Lookup Tables (v0)

For versioned transactions only:

```typescript
import type { AddressLookupTable } from '@photon/transaction-messages';

const lookupTable: AddressLookupTable = {
  address: tableAddress,
  writableIndexes: [0, 2], // Indexes of writable accounts
  readonlyIndexes: [1, 3]  // Indexes of readonly accounts
};

// Create v0 message with lookup tables
let message = createTransactionMessage(0);
message = {
  ...message,
  addressLookupTables: [lookupTable]
};
```

## Common Patterns

### Transfer SOL

```typescript
function createTransferMessage(
  from: Address,
  to: Address,
  lamports: bigint
): CompileableTransactionMessage {
  // System transfer instruction
  const instruction = createInstruction({
    programId: SYSTEM_PROGRAM_ADDRESS,
    accounts: [
      { pubkey: from, isSigner: true, isWritable: true },
      { pubkey: to, isSigner: false, isWritable: true }
    ],
    data: encodeTransferData(lamports)
  });
  
  let message = createTransactionMessage('legacy');
  message = setTransactionMessageFeePayer(from, message);
  message = appendTransactionMessageInstruction(instruction, message);
  
  // Add blockhash before returning
  const { blockhash, lastValidBlockHeight } = await getLatestBlockhash();
  return setTransactionMessageLifetimeUsingBlockhash(
    { blockhash, lastValidBlockHeight },
    message
  );
}
```

### Token Transfer

```typescript
function createTokenTransferMessage(
  owner: Address,
  source: Address,
  destination: Address,
  amount: bigint,
  decimals: number
): TransactionMessage {
  const instruction = createInstruction({
    programId: TOKEN_PROGRAM_ADDRESS,
    accounts: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false }
    ],
    data: encodeTokenTransferData(amount, decimals)
  });
  
  let message = createTransactionMessage('legacy');
  message = setTransactionMessageFeePayer(owner, message);
  return appendTransactionMessageInstruction(instruction, message);
}
```

### Multi-Instruction Transaction

```typescript
function createComplexTransaction(
  payer: Address,
  instructions: Instruction[]
): TransactionMessage {
  let message = createTransactionMessage('legacy');
  message = setTransactionMessageFeePayer(payer, message);
  
  // Add all instructions
  message = appendTransactionMessageInstructions(instructions, message);
  
  return message;
}
```

### Compute Budget

```typescript
function addComputeBudget(
  message: TransactionMessage,
  units: number,
  microLamports: number
): TransactionMessage {
  const computeBudgetProgram = address('ComputeBudget111111111111111111111111111111');
  
  // Set compute unit limit
  const setLimitIx = createInstruction({
    programId: computeBudgetProgram,
    accounts: [],
    data: new Uint8Array([0x02, ...encodeU32(units)])
  });
  
  // Set compute unit price
  const setPriceIx = createInstruction({
    programId: computeBudgetProgram,
    accounts: [],
    data: new Uint8Array([0x03, ...encodeU64(microLamports)])
  });
  
  // Prepend to message (compute budget must be first)
  message = prependTransactionMessageInstruction(setPriceIx, message);
  message = prependTransactionMessageInstruction(setLimitIx, message);
  
  return message;
}
```

## Size Estimation

```typescript
import { estimateTransactionMessageSize } from '@photon/transaction-messages';

const estimatedSize = estimateTransactionMessageSize(message);
console.log(`Transaction size: ${estimatedSize} bytes`);

if (estimatedSize > 1232) {
  console.warn('Transaction may be too large!');
}
```

## Validation

```typescript
import { validateInstruction, isCompileable } from '@photon/transaction-messages';

// Validate instruction
try {
  validateInstruction(instruction);
} catch (error) {
  console.error('Invalid instruction:', error);
}

// Check if message is ready for compilation
if (isCompileable(message)) {
  // Can now compile and sign
  const transaction = compileTransaction(message);
}
```

## Account Deduplication

```typescript
import { deduplicateAccounts, getOrderedAccounts } from '@photon/transaction-messages';

// Remove duplicate accounts from instructions
const uniqueAccounts = deduplicateAccounts(instructions);

// Get ordered account list for transaction
const orderedAccounts = getOrderedAccounts(instructions, feePayer);
```

## Type Guards

```typescript
import { 
  hasFeePayer, 
  hasLifetime, 
  isCompileable,
  blockhash
} from '@photon/transaction-messages';

// Check message state
if (!hasFeePayer(message)) {
  message = setTransactionMessageFeePayer(payer, message);
}

if (!hasLifetime(message)) {
  const bh = await getLatestBlockhash();
  message = setTransactionMessageLifetimeUsingBlockhash(bh, message);
}

if (isCompileable(message)) {
  // Ready for compilation
}

// Create typed blockhash
const bh = blockhash('HDUDPtxJJZvbJax5WM1RXFVS3qJZGwPYA4qV7qUMCZRL');
```

## TypeScript

Full type safety with type progression:

```typescript
import type {
  TransactionMessage,
  TransactionMessageWithFeePayer,
  CompileableTransactionMessage,
  Instruction,
  AccountMeta
} from '@photon/transaction-messages';

// Type narrows as fields are added
function buildMessage(): CompileableTransactionMessage {
  const base: TransactionMessage = createTransactionMessage('legacy');
  
  const withPayer: TransactionMessageWithFeePayer = 
    setTransactionMessageFeePayer(payer, base);
  
  const compileable: CompileableTransactionMessage =
    setTransactionMessageLifetimeUsingBlockhash(blockhash, withPayer);
    
  return compileable;
}
```

## Best Practices

1. **Always validate addresses** before adding to messages
2. **Set fee payer first** to ensure proper account ordering
3. **Add compute budget instructions first** using prepend
4. **Check message size** before sending to avoid rejection
5. **Use versioned transactions** when needing lookup tables

## Size

- ~12KB minified
- ~4KB gzipped
- Tree-shakeable exports

## License

Apache-2.0