# @photon/addresses

Type-safe Solana address handling with validation, well-known addresses, and PDA support.

## Installation

```bash
npm install @photon/addresses
```

## First create an address

```typescript
import { address } from '@photon/addresses';

// Create a validated address
const addr = address('11111111111111111111111111111112');

// Type-safe - can't accidentally use strings
function transfer(to: Address) { /* ... */ }

transfer(addr);           // ✅ OK
transfer('raw-string');   // ❌ Type error
```

## Core Concepts

### Branded Type

Addresses use a branded type to prevent string confusion:

```typescript
type Address = string & { readonly __brand: unique symbol };

// Must validate strings to get Address type
const validAddress = address('11111111111111111111111111111112');

// Can't bypass validation
const fakeAddress = '11111111111111111111111111111112' as Address; // ❌ Don't do this
```

### Validation

All addresses are validated for:
- Valid base58 characters
- Exactly 32 bytes when decoded

## Creating Addresses

### From String

```typescript
import { address } from '@photon/addresses';

// Validate and create address
const addr = address('11111111111111111111111111111112');

// Throws if invalid
try {
  const bad = address('invalid-address');
} catch (error) {
  console.log('Invalid address format');
}
```

### From Bytes

```typescript
import { addressFromBytes } from '@photon/addresses';

// Create from 32-byte array
const bytes = new Uint8Array(32);
const addr = addressFromBytes(bytes);

// Throws if not 32 bytes
const wrongSize = new Uint8Array(31);
addressFromBytes(wrongSize); // Throws error
```

### From Public Key

```typescript
import { getAddressFromPublicKey, getAddressFromPublicKeyBytes } from '@photon/addresses';

// From CryptoKey
const keyPair = await crypto.subtle.generateKey(
  { name: 'Ed25519' },
  true,
  ['sign', 'verify']
);
const addr = await getAddressFromPublicKey(keyPair.publicKey);

// From raw bytes
const publicKeyBytes = new Uint8Array(32);
const address = getAddressFromPublicKeyBytes(publicKeyBytes);

// Async version
const addressAsync = await getAddressFromPublicKeyAsync(keyPair.publicKey);
```

## Address Operations

### Validation

```typescript
import { isAddress, assertAddress } from '@photon/addresses';

// Type guard
if (isAddress(value)) {
  // value is Address type here
  console.log('Valid address:', value);
}

// Assert with custom message
assertAddress(value, 'Invalid recipient address');
// Throws if invalid, value is Address type after
```

### Get Bytes

```typescript
import { getAddressBytes } from '@photon/addresses';

const addr = address('11111111111111111111111111111112');
const bytes = getAddressBytes(addr); // Uint8Array(32)
```

### Comparison

```typescript
import { addressesEqual, compareAddresses } from '@photon/addresses';

const addr1 = address('11111111111111111111111111111112');
const addr2 = address('22222222222222222222222222222223');

// Equality check
if (addressesEqual(addr1, addr2)) {
  console.log('Addresses match');
}

// Sorting
const addresses = [addr2, addr1];
addresses.sort(compareAddresses);
// Now: [addr1, addr2]
```

## Well-Known Addresses

Pre-validated system and program addresses:

```typescript
import {
  SYSTEM_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS,
  NATIVE_MINT_ADDRESS,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS
} from '@photon/addresses';

// Use directly - already validated
const systemProgram = SYSTEM_PROGRAM_ADDRESS;
// '11111111111111111111111111111112'

// Common programs
console.log(TOKEN_PROGRAM_ADDRESS);
// 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'

console.log(NATIVE_MINT_ADDRESS);
// 'So11111111111111111111111111111111111111112'
```

## Program Derived Addresses (PDAs)

### Create PDA

```typescript
import { createProgramAddress } from '@photon/addresses';

const programId = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const seeds = [
  new TextEncoder().encode('metadata'),
  getAddressBytes(programId),
  getAddressBytes(mintAddress)
];

const pda = await createProgramAddress(seeds, programId);
```

### Find PDA with Bump

```typescript
import { findProgramAddressSync } from '@photon/addresses';

// Find PDA and bump seed
const [pda, bump] = await findProgramAddressSync(
  [
    new TextEncoder().encode('metadata'),
    getAddressBytes(programId),
    getAddressBytes(mintAddress)
  ],
  programId
);

console.log('PDA:', pda);
console.log('Bump:', bump);
```

### Check if Address is PDA

```typescript
import { isProgramAddress, isProgramAddressSync } from '@photon/addresses';

// Async check (uses WebCrypto)
const isOnCurve = await isProgramAddress(someAddress);
console.log('Is PDA:', !isOnCurve);

// Sync check (uses synchronous crypto if available)
const isPda = !isProgramAddressSync(someAddress);
```

### PDA Seeds

```typescript
import { createPdaSeed, createPdaSeedFromNumber } from '@photon/addresses';

// String seed (UTF-8 encoded)
const seed1 = createPdaSeed('metadata');

// Number seed (4-byte LE)
const seed2 = createPdaSeedFromNumber(42);

// Address seed
const seed3 = getAddressBytes(someAddress);

// Combine for PDA
const [pda] = await findProgramAddressSync(
  [seed1, seed2, seed3],
  programId
);
```

## Common Patterns

### Associated Token Address

```typescript
async function getAssociatedTokenAddress(
  mint: Address,
  owner: Address,
  tokenProgram = TOKEN_PROGRAM_ADDRESS
): Promise<Address> {
  const [ata] = await findProgramAddressSync(
    [
      getAddressBytes(owner),
      getAddressBytes(tokenProgram),
      getAddressBytes(mint)
    ],
    ASSOCIATED_TOKEN_PROGRAM_ADDRESS
  );
  return ata;
}
```

### Metadata Address

```typescript
async function getMetadataAddress(mint: Address): Promise<Address> {
  const METADATA_PROGRAM = address('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
  
  const [metadata] = await findProgramAddressSync(
    [
      createPdaSeed('metadata'),
      getAddressBytes(METADATA_PROGRAM),
      getAddressBytes(mint)
    ],
    METADATA_PROGRAM
  );
  
  return metadata;
}
```

### Validate User Input

```typescript
function validateUserAddress(input: string): Address | null {
  try {
    return address(input);
  } catch (error) {
    console.error('Invalid address:', error.message);
    return null;
  }
}

// With type guard
function processAddress(input: unknown) {
  if (!isAddress(input)) {
    throw new Error('Invalid address provided');
  }
  
  // input is Address type here
  return getAddressBytes(input);
}
```

### Address Lists

```typescript
// Sort addresses
const addresses = [
  address('CiDwVBFgWV9E5MvXWoLgnEgn2hK7rJikbvfWavzAQz3'),
  address('11111111111111111111111111111112'),
  address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
];

addresses.sort(compareAddresses);

// Unique addresses
const unique = [...new Set(addresses)];

// Find address
const hasSystemProgram = addresses.some(addr => 
  addressesEqual(addr, SYSTEM_PROGRAM_ADDRESS)
);
```

## Error Handling

Addresses throw structured errors from `@photon/errors`:

```typescript
import { SolanaError } from '@photon/errors';

try {
  const addr = address('bad-input');
} catch (error) {
  if (error instanceof SolanaError) {
    switch (error.code) {
      case 'INVALID_ADDRESS_FORMAT':
        // Invalid base58 characters
        break;
      case 'INVALID_ADDRESS_LENGTH':
        // Not 32 bytes
        break;
    }
  }
}
```

## TypeScript

Full type safety with branded types:

```typescript
import type { Address } from '@photon/addresses';

// Function requires Address type
function sendTo(recipient: Address, amount: number) {
  // Can only be called with validated addresses
}

// Type-safe collections
const allowlist: Set<Address> = new Set([
  SYSTEM_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS
]);

// Discriminated unions
type Destination = 
  | { type: 'address'; value: Address }
  | { type: 'pda'; seeds: Uint8Array[]; programId: Address };
```

## Constants

```typescript
import { ADDRESS_BYTE_LENGTH } from '@photon/addresses';

console.log(ADDRESS_BYTE_LENGTH); // 32
```

## Performance

- Address validation is cached internally
- Base58 encoding/decoding optimized
- PDA finding uses efficient bump search
- Minimal allocations

## Size

- ~6KB minified
- ~2KB gzipped
- Tree-shakeable exports

## License

Apache-2.0