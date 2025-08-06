# Photon SDK

> ⚡ A lightweight, zero-dependency TypeScript SDK for Solana using Web Standards

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/GuiBibeau/photon/blob/main/LICENSE)
[![CI](https://github.com/GuiBibeau/photon/workflows/CI/badge.svg)](https://github.com/GuiBibeau/photon/actions)
![Status: Early Development](https://img.shields.io/badge/Status-Early%20Development-orange)

## Overview

Photon is a modern, lightweight alternative to `@solana/web3.js` built from the ground up with zero dependencies. It leverages native Web Standards like WebCrypto API, fetch, and WebSocket to provide a minimal, tree-shakable SDK that works in browsers, Node.js 20+, and edge environments.

### Why Photon?

- **🪶 Lightweight**: ~15-25KB typical usage with tree-shaking (vs ~300KB for @solana/web3.js)
- **🌲 Tree-shakable**: Multiple entry points per package for granular imports
- **🔒 Secure**: Uses native WebCrypto for all cryptographic operations
- **🚀 Fast**: No polyfills, no legacy code, pure modern JavaScript
- **📦 Zero Dependencies**: No external runtime dependencies, just Web Standards
- **🔧 Modular**: 11 focused packages, compose exactly what you need
- **💪 Type-Safe**: Written in TypeScript with branded types and strict typing

## Installation

> ⚠️ **Note**: Photon SDK is currently in early development. Packages are not yet published to npm.

```bash
# Clone and build locally
git clone https://github.com/GuiBibeau/photon.git
cd photon
pnpm install
pnpm build
```

Future npm installation (coming soon):
```bash
npm install @photon/rpc @photon/crypto @photon/addresses
```

## Quick Start

### Current API Examples

```typescript
// RPC Client
import { createSolanaRpc } from "@photon/rpc/client";
import { address } from "@photon/addresses";

const rpc = createSolanaRpc("https://api.devnet.solana.com");
const balance = await rpc.getBalance(address("So11..."));

// Cryptographic Operations
import { generateKeyPair, sign } from "@photon/crypto";

const keyPair = await generateKeyPair();
const signature = await sign(message, keyPair.privateKey);

// Address Operations
import { address, findProgramAddressSync } from "@photon/addresses/pda";

const programAddress = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const [pda, bump] = findProgramAddressSync(
  [Buffer.from("metadata"), programId.toBuffer(), mint.toBuffer()],
  programAddress
);
```

### Tree-Shaking with Granular Imports

```typescript
// Import only what you need - reduces bundle size by 50-60%
import { createSolanaRpc } from "@photon/rpc/client";
import { u8, u32, struct } from "@photon/codecs/primitives/numeric";
import { base58 } from "@photon/codecs/primitives/base58";
import { sha256 } from "@photon/crypto/hash";
```

## Core Concepts

### Addresses

Photon uses a branded `Address` type for type safety:

```typescript
import { address, getAddressFromPublicKey } from "@photon/addresses";

// Parse and validate an address
const addr = address("So11111111111111111111111111111111111111112");

// Convert a public key to address
const publicKeyAddress = getAddressFromPublicKey(cryptoKey);
```

### Transactions

Build transactions using an immutable, type-safe API:

```typescript
import {
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
} from "@photon/transaction-messages";

// Build step by step with type refinement
const message = createTransactionMessage({ version: 0 });
const messageWithFeePayer = setTransactionMessageFeePayer(
  payerAddress,
  message
);
const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
  { blockhash, lastValidBlockHeight },
  messageWithFeePayer
);
const finalMessage = appendTransactionMessageInstruction(
  instruction,
  messageWithLifetime
);
```

### Codecs

Efficient serialization with composable codecs:

```typescript
import { struct, u64, publicKey } from "@photon/codecs";

const tokenAccountCodec = struct({
  mint: publicKey,
  owner: publicKey,
  amount: u64,
  // ... other fields
});

// Decode account data
const accountInfo = await rpc.getAccountInfo(address);
const tokenAccount = tokenAccountCodec.decode(accountInfo.data);
```

## Modules

Photon is organized into focused, tree-shakable modules:

| Module                      | Description                        | Status      | Size (min) |
| --------------------------- | ---------------------------------- | ----------- | ---------- |
| `@photon/addresses`         | Address parsing, validation, PDAs  | ✅ Complete | ~8KB       |
| `@photon/crypto`            | Ed25519 operations via WebCrypto  | ✅ Complete | ~22KB      |
| `@photon/codecs`            | Binary serialization/deserialization| ✅ Complete | ~43KB      |
| `@photon/rpc`               | Type-safe JSON-RPC client         | ✅ Complete | ~53KB      |
| `@photon/errors`            | Error handling utilities          | ✅ Complete | ~38KB      |
| `@photon/transactions`      | Transaction building and signing  | 🚧 Planned  | -          |
| `@photon/rpc-subscriptions` | WebSocket subscriptions           | 🚧 Planned  | -          |

*Note: Sizes shown are for full modules. With tree-shaking and importing only what you need, typical usage is 15-25KB total.*

## Migrating from @solana/web3.js

### Connection → RPC Client

```typescript
// Old (web3.js)
import { Connection } from "@solana/web3.js";
const connection = new Connection("https://api.devnet.solana.com");
const balance = await connection.getBalance(publicKey);

// New (Photon)
import { createSolanaRpc } from "@photon/rpc";
const rpc = createSolanaRpc("https://api.devnet.solana.com");
const balance = await rpc.getBalance(address);
```

### Keypair → CryptoKey

```typescript
// Old (web3.js)
import { Keypair } from "@solana/web3.js";
const keypair = Keypair.generate();

// New (Photon)
import { generateKeyPair } from "@photon/crypto";
const keypair = await generateKeyPair();
```

### Transaction Building

```typescript
// Old (web3.js)
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: from,
    toPubkey: to,
    lamports: amount,
  })
);

// New (Photon) - Functional approach
const transaction = createTransaction({
  version: "legacy",
  feePayer: from,
  instructions: [systemProgram.transfer({ from, to, lamports: amount })],
});
```

## Advanced Usage

### Custom RPC Transport

```typescript
import { createSolanaRpcFromTransport } from "@photon/rpc";

const customTransport = (request) => {
  // Add custom headers, retry logic, etc.
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
};

const rpc = createSolanaRpcFromTransport(customTransport);
```

### Partial Transaction Signing

```typescript
import { signTransaction, addSignature } from "@photon/transactions";

// Sign with available signers
const partiallySignedTx = await signTransaction(message, [signer1, signer2]);

// Add external signature (e.g., from wallet)
const fullySignedTx = addSignature(
  partiallySignedTx,
  walletAddress,
  walletSignature
);
```

### Decode Custom Account Data

```typescript
import { struct, u8, u64, array } from "@photon/codecs";

const customAccountCodec = struct({
  version: u8,
  owner: publicKey,
  data: array(u64, 10), // Fixed array of 10 u64s
});

const decoded = customAccountCodec.decode(accountData);
```

## Performance

Photon is designed for optimal performance:

- **Bundle Size**: 5-10x smaller than @solana/web3.js
- **Tree Shaking**: Import only what you use
- **No Polyfills**: Native Web APIs only
- **Fast Crypto**: Hardware-accelerated via WebCrypto
- **Efficient Serialization**: Zero-copy where possible

### Bundle Size Comparison

| Use Case                | @solana/web3.js | Photon (with tree-shaking) |
| ----------------------- | --------------- | --------------------------- |
| RPC Client Only         | ~300KB          | ~10-15KB                    |
| Crypto Operations       | ~300KB          | ~5-8KB                      |
| Address Operations      | ~300KB          | ~3-5KB                      |
| Full SDK                | ~300KB          | ~165KB (all modules)        |
| Typical Application     | ~300KB          | ~15-25KB                    |

## Browser Support

- Chrome/Edge 92+
- Firefox 91+
- Safari 15+
- Node.js 20+
- Deno 1.25+
- Cloudflare Workers ✓

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

```bash
# Clone the repo
git clone https://github.com/GuiBibeau/photon.git

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build all packages
pnpm build
```

## Roadmap

### Completed ✅
- [x] Core infrastructure (errors, codecs)
- [x] Cryptographic operations (Ed25519 via WebCrypto)
- [x] Address handling and PDA derivation
- [x] RPC client with type-safe methods
- [x] Tree-shaking optimization (multiple entry points)

### In Progress 🚧
- [ ] Transaction building and signing
- [ ] WebSocket subscriptions

### Planned 📋
- [ ] Token program helpers
- [ ] Metaplex program support
- [ ] Wallet adapter integration
- [ ] React hooks package
- [ ] CLI tools

## Security

Photon uses native WebCrypto for all cryptographic operations. Keys can be non-extractable for enhanced security. Please review our [Security Policy](SECURITY.md) for details.

## License

MIT © Photon SDK Contributors

---

<p align="center">
  Built with ❤️ for the Solana ecosystem
</p>
