# @photon/signers

Unified signing abstraction for Solana transactions. Support for WebCrypto keys, hardware wallets, and browser extensions.

## Installation

```bash
npm install @photon/signers
```

## First create a signer

```typescript
import { CryptoKeySigner } from '@photon/signers';
import { generateKeyPair } from '@photon/crypto';

// Create signer from keypair
const keyPair = await generateKeyPair();
const signer = await CryptoKeySigner.fromKeyPair(keyPair);

// Sign a message
const message = new TextEncoder().encode('Sign this');
const signature = await signer.sign(message);

console.log('Signer address:', signer.publicKey);
```

## Core Concepts

### Signer Interface

All signers implement a common interface:

```typescript
interface Signer {
  readonly publicKey: Address;
  sign(message: Uint8Array): Promise<Signature>;
  readonly metadata?: SignerMetadata;
}
```

This abstraction allows uniform handling of:
- SDK-managed keys (WebCrypto)
- Hardware wallets (Ledger, etc.)
- Browser extensions (Phantom, Solflare)
- Remote signers (multisig services)

## WebCrypto Signer

### From KeyPair

```typescript
import { CryptoKeySigner } from '@photon/signers';
import { generateKeyPair } from '@photon/crypto';

// From generated keypair
const keyPair = await generateKeyPair();
const signer = await CryptoKeySigner.fromKeyPair(keyPair);

// Access public key
console.log('Address:', signer.publicKey);

// Sign message
const signature = await signer.sign(message);
```

### From CryptoKeyPair

```typescript
// From raw WebCrypto keys
const cryptoKeyPair = await crypto.subtle.generateKey(
  { name: 'Ed25519' },
  false,
  ['sign', 'verify']
);

const signer = await CryptoKeySigner.fromCryptoKeyPair(cryptoKeyPair);
```

### From Private Key Bytes

```typescript
// Import from 32-byte private key
const privateKeyBytes = new Uint8Array(32); // Your private key
const signer = await CryptoKeySigner.fromPrivateKey(privateKeyBytes);

// Import extractable key (can be exported later)
const extractableSigner = await CryptoKeySigner.fromPrivateKey(
  privateKeyBytes,
  { extractable: true }
);
```

### From Solana Keypair Format

```typescript
// Solana uses 64-byte format: [32-byte private || 32-byte public]
const solanaKeypair = new Uint8Array(64); // From wallet export
const signer = await CryptoKeySigner.fromSolanaKeypair(solanaKeypair);
```

### From PKCS8

```typescript
// Import from PKCS8 format
const pkcs8Bytes = new Uint8Array([...]); // PKCS8 encoded key
const signer = await CryptoKeySigner.fromPkcs8(pkcs8Bytes);
```

### Export Keys

```typescript
// Only works with extractable signers
const signer = await CryptoKeySigner.fromPrivateKey(key, { extractable: true });

// Export as Solana 64-byte format
const keypairBytes = await signer.exportKeypair();

// Export as PKCS8
const pkcs8 = await signer.exportPkcs8();

// Get just public key
const publicKeyBytes = await signer.getPublicKeyBytes();
```

## Multi-Signer

Manage multiple signers for multi-signature transactions:

```typescript
import { MultiSigner } from '@photon/signers';

// Create signers
const signer1 = await CryptoKeySigner.fromKeyPair(keyPair1);
const signer2 = await CryptoKeySigner.fromKeyPair(keyPair2);
const signer3 = await CryptoKeySigner.fromKeyPair(keyPair3);

// Combine into multi-signer
const multiSigner = new MultiSigner([signer1, signer2, signer3]);

// Sign with all signers
const signatures = await multiSigner.signAll(message);
// Returns Map<Address, Signature>

// Sign with specific signers
const partialSigs = await multiSigner.signWith(
  message,
  [signer1.publicKey, signer3.publicKey]
);

// Check if has signer for address
const hasSigner = multiSigner.hasSigner(someAddress);

// Get specific signer
const signer = multiSigner.getSigner(address);

// Add/remove signers
multiSigner.addSigner(newSigner);
multiSigner.removeSigner(address);
```

## Type Guards

Check signer types and capabilities:

```typescript
import { 
  isSigner, 
  isCryptoKeySigner, 
  isMultiSigner,
  hasSignerForAddress 
} from '@photon/signers';

// Check if object is a signer
if (isSigner(obj)) {
  const signature = await obj.sign(message);
}

// Check signer type
if (isCryptoKeySigner(signer)) {
  // Can access CryptoKeySigner-specific methods
  const keypair = await signer.exportKeypair();
}

// Check if multi-signer
if (isMultiSigner(signer)) {
  const allSignatures = await signer.signAll(message);
}

// Check if can sign for address
if (hasSignerForAddress(signer, address)) {
  // Signer can sign for this address
}
```

## Signer Metadata

Attach metadata to signers:

```typescript
interface SignerMetadata {
  name?: string;
  type?: string;
  extractable?: boolean;
  [key: string]: unknown;
}

// Create signer with metadata
const signer = await CryptoKeySigner.fromKeyPair(keyPair, {
  name: 'Main Wallet',
  type: 'webcrypto',
  extractable: false
});

console.log(signer.metadata?.name); // 'Main Wallet'
```

## Common Patterns

### Transaction Signing

```typescript
async function signTransaction(
  message: Uint8Array,
  signers: Signer[]
): Promise<Map<Address, Signature>> {
  const signatures = new Map();
  
  for (const signer of signers) {
    try {
      const signature = await signer.sign(message);
      signatures.set(signer.publicKey, signature);
    } catch (error) {
      console.error(`Failed to sign with ${signer.publicKey}:`, error);
    }
  }
  
  return signatures;
}
```

### Wallet Adapter Pattern

```typescript
class WalletSigner implements Signer {
  constructor(
    private wallet: any, // Phantom, Solflare, etc.
    public readonly publicKey: Address
  ) {}
  
  async sign(message: Uint8Array): Promise<Signature> {
    const { signature } = await this.wallet.signMessage(message);
    return createSignature(signature);
  }
  
  readonly metadata = {
    type: 'wallet',
    name: this.wallet.name
  };
}
```

### Fee Payer Pattern

```typescript
interface TransactionSigners {
  feePayer: Signer;
  signers: Signer[];
}

async function signWithFeePayer(
  message: Uint8Array,
  { feePayer, signers }: TransactionSigners
): Promise<Map<Address, Signature>> {
  const signatures = new Map();
  
  // Fee payer signs first
  signatures.set(
    feePayer.publicKey,
    await feePayer.sign(message)
  );
  
  // Other signers
  for (const signer of signers) {
    if (!addressesEqual(signer.publicKey, feePayer.publicKey)) {
      signatures.set(
        signer.publicKey,
        await signer.sign(message)
      );
    }
  }
  
  return signatures;
}
```

### Key Derivation

```typescript
// Derive signer from seed phrase (using external library)
async function signerFromSeed(
  seedPhrase: string,
  derivationPath = "m/44'/501'/0'/0'"
): Promise<Signer> {
  // Use bip39/bip32 to derive key
  const seed = await bip39.mnemonicToSeed(seedPhrase);
  const derivedKey = deriveBip32(seed, derivationPath);
  
  return CryptoKeySigner.fromPrivateKey(derivedKey.privateKey);
}
```

### Signer Registry

```typescript
class SignerRegistry {
  private signers = new Map<Address, Signer>();
  
  register(signer: Signer): void {
    this.signers.set(signer.publicKey, signer);
  }
  
  get(address: Address): Signer | undefined {
    return this.signers.get(address);
  }
  
  async signFor(address: Address, message: Uint8Array): Promise<Signature> {
    const signer = this.get(address);
    if (!signer) {
      throw new Error(`No signer for ${address}`);
    }
    return signer.sign(message);
  }
  
  getMultiSigner(addresses: Address[]): MultiSigner {
    const signers = addresses
      .map(addr => this.get(addr))
      .filter((s): s is Signer => s !== undefined);
    
    return new MultiSigner(signers);
  }
}
```

## Error Handling

```typescript
import { SolanaError } from '@photon/errors';

try {
  const signature = await signer.sign(message);
} catch (error) {
  if (error instanceof SolanaError) {
    switch (error.code) {
      case 'INVALID_KEYPAIR':
        console.log('Invalid keypair provided');
        break;
      case 'KEY_EXTRACTION_FAILED':
        console.log('Cannot export non-extractable key');
        break;
    }
  }
}
```

## TypeScript

Full type safety with branded types:

```typescript
import type { Signer, SignerInfo, SigningResult } from '@photon/signers';

// Type-safe signer collections
const signers: Signer[] = [signer1, signer2];

// Signing result type
const result: SigningResult = {
  publicKey: signer.publicKey,
  signature: await signer.sign(message)
};

// Multi-sig type safety
const multiSig: Map<Address, Signature> = await multiSigner.signAll(message);
```

## Testing

Mock signers for testing:

```typescript
class MockSigner implements Signer {
  constructor(
    public readonly publicKey: Address,
    private readonly fixedSignature?: Signature
  ) {}
  
  async sign(message: Uint8Array): Promise<Signature> {
    // Return fixed signature or generate mock
    return this.fixedSignature || createSignature(new Uint8Array(64));
  }
  
  readonly metadata = { type: 'mock' };
}

// In tests
const mockSigner = new MockSigner(
  address('11111111111111111111111111111112')
);
```

## Size

- ~8KB minified
- ~3KB gzipped
- Tree-shakeable exports

## License

Apache-2.0