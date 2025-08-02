# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Photon SDK** - A lightweight, zero-dependency Solana SDK alternative to @solana/web3.js (15KB vs 300KB).

**Current Status**: Planning phase - implementation has not started yet. The repository contains comprehensive planning documents.

**Key Documents**:
- `README.md`: Public-facing documentation and API design
- `tasks.md`: Detailed implementation roadmap with 60+ tasks across 8 epics

## Architecture

### Monorepo Structure (Planned)
```
photon/
├── packages/
│   ├── core/           # Ed25519, X25519, transactions, addresses
│   ├── rpc/            # JSON-RPC client
│   ├── programs/       # Program-specific clients
│   ├── crypto/         # WebCrypto utilities
│   ├── codecs/         # Serialization/deserialization
│   ├── actions/        # Solana Actions & Blinks
│   ├── wallet/         # Wallet Standard integration
│   ├── mobile/         # Mobile Wallet Adapter
│   ├── qr/             # QR code generation
│   └── utils/          # Shared utilities
└── apps/
    └── playground/     # Interactive demo
```

### Design Principles
- **Zero Dependencies**: Use only Web Standards APIs
- **Tree-Shakeable**: Every export must be independently importable
- **Type-Safe**: Extensive TypeScript with branded types
- **Immutable**: Data structures are immutable by default
- **Performance-First**: Target 15KB total bundle size

## Development Commands

Since implementation hasn't started, here are the planned development commands:

```bash
# Install dependencies (when package.json exists)
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
pnpm test:unit
pnpm test:integration

# Linting and formatting
pnpm lint
pnpm format

# Type checking
pnpm typecheck

# Bundle size analysis
pnpm size
```

## Code Patterns

### TypeScript Patterns
```typescript
// Use branded types for type safety
type PublicKeyBytes = Uint8Array & { readonly __brand: unique symbol };

// Prefer const assertions
const SIZES = {
  PUBLIC_KEY: 32,
  SIGNATURE: 64,
} as const;

// Use discriminated unions for errors
type PhotonError = 
  | { type: 'InvalidPublicKey'; details: string }
  | { type: 'TransactionTooLarge'; size: number; maxSize: number };
```

### API Design
- Async functions return `Promise<T>` or `AsyncGenerator<T, void, unknown>`
- Sync functions are preferred where possible
- Use builder patterns for complex objects (e.g., TransactionBuilder)
- Validate inputs early and throw descriptive errors

### WebCrypto Usage
```typescript
// Always use WebCrypto API
const keyPair = await crypto.subtle.generateKey(
  { name: 'Ed25519' },
  true,
  ['sign', 'verify']
);
```

## Testing Strategy
- Unit tests for all utilities and pure functions
- Integration tests for RPC interactions
- Use native Node.js test runner (no Jest)
- Mock WebCrypto when necessary for Node.js compatibility

## Implementation Priorities

When implementing, follow the epic order from tasks.md:
1. Core functionality (Ed25519, transactions)
2. RPC communication
3. Program interfaces
4. Actions & Blinks
5. Wallet integrations
6. Advanced features

## Common Tasks

### Adding a New Package
1. Create directory under `packages/`
2. Add package.json with proper exports map
3. Ensure zero dependencies
4. Add to workspace configuration
5. Export from root package

### Implementing a Feature
1. Check tasks.md for requirements
2. Write types first
3. Implement with Web Standards only
4. Add comprehensive tests
5. Document with JSDoc
6. Verify bundle size impact

## Performance Guidelines
- Avoid large dependencies
- Use native browser APIs
- Lazy load when possible
- Minimize memory allocations
- Cache computed values appropriately

## Error Handling
- Use custom error types with discriminated unions
- Include actionable error messages
- Preserve error context
- Never swallow errors silently

## Security Considerations
- Never log private keys or seeds
- Use WebCrypto for all cryptographic operations
- Validate all external inputs
- Follow Solana security best practices
- Clear sensitive data from memory when possible