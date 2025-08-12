# @photon/crypto

WebCrypto-based Ed25519 cryptography for Solana. Pure browser-native implementation with zero dependencies.

## Installation

```bash
npm install @photon/crypto
```

## First sign a message

```typescript
import { generateKeyPair } from '@photon/crypto';

// Generate a new keypair
const keyPair = await generateKeyPair();

// Sign a message
const message = new TextEncoder().encode('Hello Solana!');
const signature = await keyPair.sign(message);

// Get the public address
const address = await keyPair.getAddress();
console.log('Signed by:', address);
```

## Core Features

- ✅ Pure WebCrypto API (no polyfills)
- ✅ Ed25519 signing and verification
- ✅ Type-safe with branded types
- ✅ Batch operations for performance
- ✅ Browser and Node.js 20+ support

## Key Generation

### Generate Random Keypair

```typescript
import { generateKeyPair } from '@photon/crypto';

// Non-extractable keys (default, more secure)
const keyPair = await generateKeyPair();

// Extractable keys (for export/backup)
const extractableKeyPair = await generateKeyPair({ 
  extractable: true 
});

// Check if operations are supported
console.log(keyPair.canPerformOperation('sign'));   // true
console.log(keyPair.canPerformOperation('verify')); // true
```

### KeyPair Class

The `KeyPair` wrapper provides high-level operations:

```typescript
const keyPair = await generateKeyPair();

// Get public key as bytes (32 bytes)
const publicKeyBytes = await keyPair.getPublicKeyBytes();

// Get public key as Solana address
const address = await keyPair.getAddress();

// Sign a message
const signature = await keyPair.sign(message);

// Access raw WebCrypto keys
const { privateKey, publicKey } = keyPair.cryptoKeyPair;
```

## Signing

### Sign Bytes

```typescript
import { signBytes } from '@photon/crypto';

const keyPair = await generateKeyPair();
const message = new TextEncoder().encode('Sign this');

// Sign with private key
const signature = await signBytes(
  keyPair.cryptoKeyPair.privateKey,
  message
);

console.log(signature.length); // Always 64 bytes
```

### Batch Signing

Sign multiple messages efficiently:

```typescript
import { signBatch } from '@photon/crypto';

const messages = [
  new TextEncoder().encode('Message 1'),
  new TextEncoder().encode('Message 2'),
  new TextEncoder().encode('Message 3')
];

const result = await signBatch(privateKey, messages);

console.log(`Signed ${result.successCount} messages`);
result.signatures.forEach((sig, i) => {
  if (sig) {
    console.log(`Message ${i}: ${encodeBase58(sig)}`);
  }
});

// With options
const batchResult = await signBatch(privateKey, messages, {
  failFast: true,        // Stop on first error
  maxConcurrency: 5,     // Limit parallel operations
  validateInputs: true   // Validate before signing
});
```

### Create Signature from Bytes

```typescript
import { createSignature, isValidSignature } from '@photon/crypto';

// Convert raw bytes to typed Signature
const signatureBytes = new Uint8Array(64);
const signature = createSignature(signatureBytes);

// Validate signature format
if (isValidSignature(someBytes)) {
  const sig = someBytes as Signature;
}
```

## Verification

### Verify Signature

```typescript
import { verifySignature } from '@photon/crypto';

const isValid = await verifySignature(
  publicKey,    // CryptoKey, Uint8Array, or Address
  message,      // Message that was signed
  signature     // 64-byte signature
);

console.log('Signature valid:', isValid);
```

### Batch Verification

```typescript
import { verifyBatch } from '@photon/crypto';

const items = [
  { publicKey: key1, message: msg1, signature: sig1 },
  { publicKey: key2, message: msg2, signature: sig2 },
  { publicKey: key3, message: msg3, signature: sig3 }
];

const result = await verifyBatch(items);

console.log(`${result.validCount} valid signatures`);
console.log(`${result.invalidCount} invalid signatures`);

// Check individual results
result.results.forEach((isValid, i) => {
  if (isValid) {
    console.log(`Item ${i}: Valid`);
  } else {
    console.log(`Item ${i}: Invalid`);
  }
});
```

### Create Verifier

Create a reusable verifier for a specific public key:

```typescript
import { createVerifier } from '@photon/crypto';

// Create verifier bound to a public key
const verifier = await createVerifier(publicKey);

// Verify multiple messages with same key
const isValid1 = await verifier(message1, signature1);
const isValid2 = await verifier(message2, signature2);
```

## Hashing

SHA-256 hashing utilities:

```typescript
import { sha256, sha256Concat } from '@photon/crypto';

// Hash single data
const hash = await sha256(data);

// Hash multiple buffers concatenated
const combined = await sha256Concat([buffer1, buffer2, buffer3]);
```

## Browser Compatibility

### Check Support

```typescript
import { checkCryptoCompatibility, assertCryptoSupport } from '@photon/crypto';

// Get compatibility info
const compat = checkCryptoCompatibility();
console.log('WebCrypto available:', compat.hasWebCrypto);
console.log('Ed25519 supported:', compat.hasEd25519);
console.log('Fully supported:', compat.isFullySupported);
console.log('Message:', compat.message);

// Throw if not supported
assertCryptoSupport(); // Throws SolanaError if unsupported
```

### Test Ed25519 Support

```typescript
import { testEd25519Support } from '@photon/crypto';

const isSupported = await testEd25519Support();
if (!isSupported) {
  console.log('Ed25519 not supported in this browser');
}
```

## Types

### Branded Types

Signatures and addresses use branded types for safety:

```typescript
import type { Signature, Address } from '@photon/crypto';

// Signature is a branded Uint8Array
type Signature = Uint8Array & { readonly __brand: unique symbol };

// Can't accidentally use wrong type
function processSignature(sig: Signature) {
  // Type-safe signature handling
}

const bytes = new Uint8Array(64);
// processSignature(bytes); // ❌ Type error

const signature = createSignature(bytes);
processSignature(signature); // ✅ OK
```

### Options

```typescript
interface KeyGenerationOptions {
  extractable?: boolean;  // Allow key export
  seed?: Uint8Array;      // Deterministic generation (future)
}

interface SigningOptions {
  validateInputs?: boolean;  // Validate before signing
}

interface BatchSigningOptions {
  failFast?: boolean;       // Stop on first error
  maxConcurrency?: number;  // Parallel operation limit
  validateInputs?: boolean;
}
```

## Common Patterns

### Wallet-like Operations

```typescript
// Generate wallet
const wallet = await generateKeyPair();
const address = await wallet.getAddress();

// Sign transaction
const txMessage = new Uint8Array([...]); // Transaction bytes
const signature = await wallet.sign(txMessage);

// Export public key for sharing
const publicKeyBytes = await wallet.getPublicKeyBytes();
const publicKeyBase58 = encodeBase58(publicKeyBytes);
```

### Message Signing with Verification

```typescript
async function signAndVerify() {
  const keyPair = await generateKeyPair();
  
  // Sign
  const message = new TextEncoder().encode('Authenticate me');
  const signature = await keyPair.sign(message);
  
  // Verify with public key
  const publicKey = await keyPair.getPublicKeyBytes();
  const isValid = await verifySignature(publicKey, message, signature);
  
  return { signature, isValid };
}
```

### Error Handling

```typescript
import { SolanaError } from '@photon/errors';

try {
  const keyPair = await generateKeyPair();
} catch (error) {
  if (error instanceof SolanaError) {
    switch (error.code) {
      case 'CRYPTO_NOT_SUPPORTED':
        console.log('Browser does not support Ed25519');
        break;
      case 'KEY_GENERATION_FAILED':
        console.log('Failed to generate keys');
        break;
    }
  }
}
```

## Performance Tips

### Reuse Key Objects

```typescript
// Good - reuse keypair
const keyPair = await generateKeyPair();
for (const message of messages) {
  await keyPair.sign(message);
}

// Less efficient - recreating keys
for (const message of messages) {
  const keyPair = await generateKeyPair();
  await keyPair.sign(message);
}
```

### Use Batch Operations

```typescript
// Good - batch signing
const result = await signBatch(privateKey, messages);

// Less efficient - sequential signing
const signatures = [];
for (const message of messages) {
  signatures.push(await signBytes(privateKey, message));
}
```

### Create Reusable Verifiers

```typescript
// Good - create verifier once
const verifier = await createVerifier(publicKey);
for (const [msg, sig] of items) {
  await verifier(msg, sig);
}

// Less efficient - recreating verifier
for (const [msg, sig] of items) {
  await verifySignature(publicKey, msg, sig);
}
```

## Browser Support

- Chrome/Edge 92+
- Firefox 91+
- Safari 15+
- Node.js 20+ (native WebCrypto)

## Size

- ~10KB minified
- ~4KB gzipped
- Zero runtime dependencies

## Security Notes

- Keys are non-extractable by default
- No private key material in memory beyond WebCrypto
- Constant-time operations via WebCrypto
- No string representations of private keys

## License

Apache-2.0