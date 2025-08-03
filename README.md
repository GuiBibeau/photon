# Photon SDK

> ⚡ A lightweight, zero-dependency TypeScript SDK for Solana using Web Standards

[![npm version](https://img.shields.io/npm/v/@photon/core.svg)](https://www.npmjs.com/package/@photon/core)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@photon/core)](https://bundlephobia.com/package/@photon/core)
[![License](https://img.shields.io/npm/l/@photon/core.svg)](https://github.com/GuiBibeau/photon/blob/main/LICENSE)
[![CI](https://github.com/GuiBibeau/photon/workflows/CI/badge.svg)](https://github.com/GuiBibeau/photon/actions)

## Overview

Photon is a modern, lightweight alternative to `@solana/web3.js` built from the ground up with zero dependencies. It leverages native Web Standards like WebCrypto API, fetch, and WebSocket to provide a minimal, tree-shakable SDK that works in browsers, Node.js 20+, and edge environments.

### Why Photon?

- **🪶 Lightweight**: ~15KB minified (vs ~300KB for @solana/web3.js)
- **🌲 Tree-shakable**: Import only what you need
- **🔒 Secure**: Uses native WebCrypto for all cryptographic operations
- **🚀 Fast**: No polyfills, no legacy code, pure modern JavaScript
- **📦 Zero Dependencies**: No external packages, just Web Standards
- **🔧 Modular**: Compose exactly the functionality you need
- **💪 Type-Safe**: Written in TypeScript with strict types

## Installation

```bash
npm install @photon/core
```

Or install specific modules:

```bash
npm install @photon/transactions @photon/rpc @photon/crypto
```

## Quick Start

### Send SOL

```typescript
import {
  createSolanaRpc,
  generateKeyPair,
  createTransaction,
  systemProgram,
  sendAndConfirmTransaction,
} from "@photon/core";

// Connect to cluster
const rpc = createSolanaRpc("https://api.devnet.solana.com");

// Generate a keypair
const keypair = await generateKeyPair();

// Create a transaction
const transaction = createTransaction({
  version: "legacy",
  feePayer: keypair.address,
  instructions: [
    systemProgram.transfer({
      from: keypair.address,
      to: 'Bk5..."', // recipient address
      lamports: 1_000_000n, // 0.001 SOL
    }),
  ],
});

// Send and confirm
const signature = await sendAndConfirmTransaction(transaction, {
  rpc,
  signers: [keypair],
});
```

### Monitor Account Changes

```typescript
import { createSolanaRpcSubscriptions, address } from "@photon/core";

const ws = createSolanaRpcSubscriptions("wss://api.devnet.solana.com");
const accountAddress = address("Bk5...");

// Subscribe to account changes
for await (const update of ws.accountSubscribe(accountAddress)) {
  console.log("Account updated:", update);
}
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

Photon is organized into focused modules:

| Module                 | Description                      | Size |
| ---------------------- | -------------------------------- | ---- |
| `@photon/addresses`    | Address parsing and validation   | ~2KB |
| `@photon/crypto`       | Ed25519 operations via WebCrypto | ~3KB |
| `@photon/codecs`       | Binary serialization             | ~4KB |
| `@photon/rpc`          | JSON-RPC client                  | ~5KB |
| `@photon/transactions` | Transaction building and signing | ~6KB |
| `@photon/errors`       | Error handling                   | ~1KB |

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

| Feature        | @solana/web3.js | Photon |
| -------------- | --------------- | ------ |
| Basic Transfer | ~300KB          | ~15KB  |
| Key Generation | ~180KB          | ~3KB   |
| RPC Client     | ~150KB          | ~5KB   |

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

- [x] Core modules (addresses, crypto, codecs, RPC)
- [x] Transaction building and signing
- [x] WebSocket subscriptions
- [ ] Token program helpers
- [ ] Metaplex program support
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
