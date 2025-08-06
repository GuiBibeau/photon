# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Photon SDK** - A lightweight, zero-dependency Solana SDK alternative to @solana/web3.js. Currently ~165KB total (all packages), targeting ~15KB for typical usage with tree-shaking.

**Current Status**: Core packages implemented (addresses, crypto, codecs, errors, RPC). Following implementation roadmap in `tasks.md` (8 epics, 60+ tasks).

**Key Documents**:
- `README.md`: Public API design and usage examples
- `tasks.md`: Implementation roadmap - Epic 1-3 complete, Epic 4-5 in progress
- `TESTING.md`: Testing configuration and guidelines

### Project Goals
- **🪶 Lightweight**: ~15KB minified typical usage (vs ~300KB for @solana/web3.js)
- **🌲 Tree-shakable**: Multiple entry points per package for granular imports
- **🔒 Secure**: Native WebCrypto API for all cryptographic operations
- **🚀 Fast**: No polyfills, pure Web Standards
- **📦 Zero Dependencies**: No external runtime dependencies
- **🔧 Modular**: 11 focused packages, compose what you need
- **💪 Type-Safe**: TypeScript with branded types and discriminated unions

### Target Environments
- Browsers: Chrome/Edge 92+, Firefox 91+, Safari 15+
- Node.js 20+ (uses native WebCrypto)
- Edge runtimes: Deno, Cloudflare Workers, Vercel Edge

## Architecture

### Current Monorepo Structure
```
photon/
├── packages/
│   ├── accounts/              # Account fetching and parsing
│   ├── addresses/             # Base58 encoding, address validation
│   ├── codecs/                # Binary serialization/deserialization
│   ├── crypto/                # WebCrypto Ed25519 operations
│   ├── errors/                # Error handling utilities
│   ├── rpc/                   # JSON-RPC client
│   ├── rpc-subscriptions/     # WebSocket subscriptions
│   ├── signers/               # Transaction signing abstraction
│   ├── sysvars/               # System variable utilities
│   ├── transaction-messages/  # Transaction message building
│   └── transactions/          # Transaction creation and signing
├── vitest.shared.ts           # Shared Vitest configuration
├── vitest.workspace.ts        # Vitest workspace setup
└── tsconfig.base.json         # Base TypeScript configuration
```

### Design Principles
- **Zero Dependencies**: Use only Web Standards APIs
- **Tree-Shakeable**: Every export must be independently importable
- **Type-Safe**: Extensive TypeScript with branded types
- **Immutable**: Data structures are immutable by default
- **Performance-First**: Target 15KB total bundle size

## Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Testing
pnpm test              # Run all tests using Vitest workspace
pnpm test:watch        # Run tests in watch mode
pnpm test:coverage     # Run tests with coverage report
pnpm test:ui           # Open Vitest UI
pnpm test:packages     # Run tests in each package individually

# Run tests for specific files/patterns
pnpm test packages/rpc/tests/client.test.ts  # Single file
pnpm test -- --grep "should parse"           # Pattern matching
cd packages/[package-name] && pnpm test      # Single package

# Linting and formatting
pnpm lint              # Run ESLint on all packages
pnpm lint:fix          # Auto-fix ESLint issues
pnpm format            # Check code formatting with Prettier
pnpm format:fix        # Auto-format code with Prettier

# Type checking
pnpm typecheck         # Check TypeScript types in all packages

# Development
pnpm dev               # Run all packages in watch mode

# Clean build artifacts
pnpm clean             # Remove all dist folders

# Bundle size analysis (manual)
ls -lh packages/*/dist/*.mjs | grep -v map   # Check individual sizes
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

### Framework
- **Test Runner**: Vitest v3.2.4 with workspace configuration
- **Test Environment**: jsdom for browser API compatibility
- **Coverage**: V8 provider with 80% default threshold, 100% for crypto/transactions

### Test Organization
- Place tests in `packages/[package-name]/tests/*.test.ts`
- Each package has its own `vitest.config.ts` extending shared configuration
- Use `import { describe, it, expect } from 'vitest'` for test structure

### Coverage Requirements
- Default packages: 80% coverage for lines, functions, branches, statements
- Critical packages (crypto, transactions): 100% coverage required
- Coverage reports available in text, lcov, and html formats

## Implementation Status

### Completed Packages
- **@photon/errors**: Error handling with discriminated unions ✅
- **@photon/codecs**: Binary serialization (primitives & composites) ✅
- **@photon/crypto**: Ed25519 operations via WebCrypto ✅
- **@photon/addresses**: Base58 encoding, address validation, PDAs ✅
- **@photon/rpc**: JSON-RPC client with type-safe methods ✅

### In Progress
- **@photon/rpc-subscriptions**: WebSocket subscriptions (placeholder)
- **@photon/transactions**: Transaction building (placeholder)

### Implementation Priorities (from tasks.md)
Follow epic order when implementing new features:
1. ✅ Project Setup (Epic 1)
2. ✅ Core Infrastructure (Epic 2)
3. ✅ Cryptographic Foundation (Epic 3)
4. 🚧 RPC Communication (Epic 4) - In progress
5. 🚧 WebSocket Subscriptions (Epic 5) - Started
6. ⏳ Transaction Building (Epic 6)
7. ⏳ High-Level Features (Epic 7)
8. ⏳ Integration & Documentation (Epic 8)

## Common Tasks

### Adding a New Package
1. Create directory under `packages/`
2. Add package.json with:
   - Name: `@photon/[package-name]`
   - Multiple entry points in exports map for tree-shaking
   - Scripts: build, test, lint, format, typecheck, clean
   - Main points to .js, module to .mjs
3. Create `tsconfig.json` extending `../../tsconfig.base.json`
4. Create `tsup.config.ts` with multiple entry points:
   ```typescript
   entry: {
     index: 'src/index.ts',
     // Add specific exports for tree-shaking
   }
   ```
5. Create `vitest.config.ts` extending shared config
6. Add `src/index.ts` and modular exports
7. Create `tests/` directory with `.test.ts` files
8. Set `sideEffects: false` for tree-shaking

### Implementing a Feature
1. Check `tasks.md` for epic/task requirements
2. Define types with branded types for safety
3. Implement using only Web Standards APIs
4. Write tests achieving 80%+ coverage (100% for crypto)
5. Add JSDoc comments for public APIs
6. Verify bundle size with `pnpm build`

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

## Package Dependencies

### Internal Dependencies
Packages can depend on each other using workspace protocol:
```json
"dependencies": {
  "@photon/errors": "workspace:*"
}
```

### Package Hierarchy (dependency order)
1. `errors` - Base error handling (no deps)
2. `codecs` - Serialization primitives (depends on errors)
3. `crypto` - Cryptographic operations (depends on errors)
4. `addresses` - Address handling (depends on errors, crypto)
5. `signers` - Signing abstraction (depends on errors, addresses)
6. `rpc` - RPC client (depends on errors, addresses)
7. `transaction-messages` - Message building (depends on all above)
8. `transactions` - Full transactions (depends on all above)

## Build System

- **Bundler**: tsup (ESBuild-based)
- **Output formats**: ESM (.mjs) and CJS (.js)
- **TypeScript**: Strict mode with composite projects
- **Entry points**: Multiple per package for optimal tree-shaking
- **Tree-shaking**: ~50-60% size reduction with granular imports

### Tree-Shaking Architecture
Packages expose multiple entry points for granular imports:
```typescript
// Instead of importing everything
import { createSolanaRpc, base58 } from '@photon/rpc';

// Import only what you need
import { createSolanaRpc } from '@photon/rpc/client';
import { base58 } from '@photon/codecs/primitives/base58';
```

Key packages with multiple entry points:
- **@photon/rpc**: 18 entry points (client, transport, methods/*, parsers/*)
- **@photon/codecs**: 16 entry points (primitives/*, composites/*)
- **@photon/crypto**: 7 entry points (signing, hash, keypair, etc.)
- **@photon/addresses**: 3 entry points (main, pda, derive)

## Code Quality Tools

### ESLint Configuration
- TypeScript ESLint with strict rules
- Configured for monorepo with flat config (eslint.config.mjs)
- Rules enforced:
  - No explicit any
  - Consistent type imports
  - No non-null assertions
  - Prefer const, template strings, arrow functions
  - Import ordering and deduplication

### Prettier Configuration
- 100 character line width
- Single quotes for strings
- Trailing commas
- 2-space indentation
- Configured in `.prettierrc.json`

### Git Hooks
- Husky manages git hooks
- Pre-commit: Runs lint-staged for automatic formatting and linting
- Configured in `.husky/pre-commit` and `.lintstagedrc.json`

## Testing Best Practices

### Running a Single Test
```bash
# Run a specific test file
pnpm test packages/errors/tests/example.test.ts

# Run tests matching a pattern
pnpm test -- --grep "should encode"

# Run tests for a specific package in watch mode
cd packages/errors && pnpm test:watch
```

### Test Coverage
- View coverage report: `pnpm test:coverage`
- HTML report generated in `coverage/index.html`
- Critical packages (crypto, transactions) require 100% coverage
- Coverage configured per-package in `vitest.config.ts`

## Common Pitfalls

1. **Import Paths**: Always use workspace protocol for internal dependencies
2. **Test Environment**: Tests run in jsdom by default - use node environment for Node-specific tests
3. **Bundle Size**: Check impact with build before adding any utility functions
4. **Type Exports**: Ensure all types are properly exported from package index files

## Development Workflow

### Starting Development
1. Install dependencies: `pnpm install`
2. Build all packages: `pnpm build`
3. Run tests to verify setup: `pnpm test`
4. Start development in watch mode: `pnpm dev`

### Before Committing
- Code is automatically formatted and linted on commit via git hooks
- Run `pnpm lint` and `pnpm format` to check manually
- Ensure tests pass: `pnpm test`
- Check types: `pnpm typecheck`

### Package Publishing (Future)
Packages will be published to npm under the `@photon` scope. Currently all packages are private.