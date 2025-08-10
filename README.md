# Photon SDK

> A lightweight, zero-dependency TypeScript SDK for Solana using Web Standards

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/GuiBibeau/photon/blob/main/LICENSE)
[![CI](https://github.com/GuiBibeau/photon/workflows/CI/badge.svg)](https://github.com/GuiBibeau/photon/actions)
![Status: Early Development](https://img.shields.io/badge/Status-Early%20Development-orange)

## Overview

Photon is a complete rewrite of Solana's JavaScript SDK, built from first principles using only Web Standards. No dependencies, no polyfills, no legacy baggage - just modern, fast, type-safe code.

### Why Photon?

- **Lightweight**: 15-25KB typical usage vs 300KB for @solana/web3.js
- **Zero Dependencies**: Built entirely on Web Standards (WebCrypto, fetch, WebSocket)
- **Tree-Shakable**: Import only what you need, dead code automatically eliminated
- **Type-Safe**: Branded types and discriminated unions prevent common errors
- **Modern**: No polyfills, no legacy code, ES2022+ throughout
- **Modular**: 11 focused packages - compose exactly what you need

## Installation

```bash
# Coming soon to npm
npm install @photon/rpc @photon/crypto @photon/addresses

# For now, build from source:
git clone https://github.com/GuiBibeau/photon.git && cd photon
pnpm install && pnpm build
```

## Quick Start

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


## Core Concepts

### Type Safety

```typescript
// Branded types prevent common errors
const addr: Address = address("So11111111111111111111111111111111111111112");
// Type error: can't pass string where Address expected
// await rpc.getBalance("So11..."); // Error!
await rpc.getBalance(addr); // Correct
```

### Immutable APIs

```typescript
// Each operation returns a new object
const message = createTransactionMessage({ version: 0 });
const messageWithPayer = setTransactionMessageFeePayer(payer, message);
const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
  { blockhash, lastValidBlockHeight },
  messageWithPayer
);
```

### Composable Codecs

```typescript
const accountCodec = struct({
  owner: publicKey,
  lamports: u64,
  data: bytes(32),
});

const decoded = accountCodec.decode(accountData);
const encoded = accountCodec.encode(accountValue);
```

## Architecture

Photon is built as 11 focused, composable packages:

| Package | Purpose |
|---------|----------|
| `@photon/errors` | Discriminated union error handling |
| `@photon/codecs` | Binary serialization with composable codecs |
| `@photon/crypto` | Ed25519 operations via WebCrypto |
| `@photon/addresses` | Address parsing, validation, and PDA derivation |
| `@photon/rpc` | Type-safe JSON-RPC client |
| `@photon/accounts` | Account fetching and decoding |
| `@photon/signers` | Transaction signing abstraction |
| `@photon/sysvars` | System variable constants and fetchers |
| `@photon/transaction-messages` | Immutable transaction message building |
| `@photon/transactions` | Transaction compilation and serialization |
| `@photon/rpc-subscriptions` | WebSocket subscription client |


## Migration from @solana/web3.js

```typescript
// Connection → RPC Client
const connection = new Connection(url);        // web3.js
const rpc = createSolanaRpc(url);             // Photon

// Keypair → CryptoKey  
const keypair = Keypair.generate();           // web3.js
const keypair = await generateKeyPair();      // Photon

// PublicKey → Address
const pubkey = new PublicKey("...");          // web3.js
const addr = address("...");                  // Photon

// Mutable → Immutable
transaction.add(instruction);                 // web3.js (mutates)
const newTx = appendInstruction(tx, instruction); // Photon (immutable)
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


## Philosophy

Photon follows these core principles:

1. **Web Standards Only**: No polyfills, no Node.js dependencies - just native browser and runtime APIs
2. **Zero Dependencies**: Every line of code is intentional, no supply chain risks
3. **Type Safety First**: Branded types and discriminated unions make invalid states unrepresentable
4. **Immutable by Design**: All data structures are immutable, enabling predictable code
5. **Pay for What You Use**: Granular imports ensure you only bundle what you actually need
6. **Modern JavaScript**: Written for ES2022+, no legacy browser support

## Performance

| Metric | @solana/web3.js | Photon |
|--------|-----------------|--------|
| Typical App Bundle | ~300KB | 15-25KB |
| Minimal RPC Client | ~300KB | 8-12KB |
| Dependencies | 50+ packages | 0 packages |
| Tree-Shaking | Limited | Automatic |
| Crypto Performance | Polyfilled | Native (hardware-accelerated) |

## Requirements

- Modern browsers (Chrome 92+, Firefox 91+, Safari 15+)
- Node.js 20+ (uses native WebCrypto)
- Works in edge runtimes (Cloudflare Workers, Deno, etc.)

## Contributing

See [Contributing Guide](CONTRIBUTING.md) for details.

```bash
git clone https://github.com/GuiBibeau/photon.git
pnpm install
pnpm test
pnpm build
```

## Roadmap

### Current Status

All core packages are complete and functional. The SDK is usable for most Solana development needs.

### Coming Soon

- Token program helpers
- Metaplex program support  
- Wallet adapter integration
- React hooks package
- CLI tools

## Security

All cryptographic operations use native WebCrypto API. See [Security Policy](SECURITY.md) for details.

## License

MIT © Photon SDK Contributors

---

<p align="center">
  Built for the Solana ecosystem
</p>
