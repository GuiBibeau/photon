# CRUSH.md

## Build/Lint/Test Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Run tests for a specific package
cd packages/[package-name] && pnpm test

# Run a specific test file
pnpm test packages/errors/tests/example.test.ts

# Run tests matching a pattern
pnpm test -- --grep "pattern"

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Linting
pnpm lint
pnpm lint:fix

# Formatting
pnpm format
pnpm format:fix

# Type checking
pnpm typecheck

# Development mode (watch all packages)
pnpm dev
```

## Code Style Guidelines

### Imports
- Use type-only imports when possible: `import type { Type } from './module';`
- Use absolute imports for packages: `import { something } from '@photon/errors';`
- Group imports in order: node built-ins, external packages, internal packages, relative imports
- Sort imports alphabetically within each group

### Formatting
- Line width: 100 characters
- Indentation: 2 spaces (no tabs)
- Single quotes for strings
- Trailing commas in object/array literals
- Semicolons required
- Arrow function parentheses always: `(param) => value`

### Types
- Use branded types for type safety: `type PublicKeyBytes = Uint8Array & { readonly __brand: unique symbol };`
- Prefer const assertions for constants: `const SIZES = { PUBLIC_KEY: 32 } as const;`
- Use discriminated unions for errors:
  ```typescript
  type PhotonError = 
    | { type: 'InvalidPublicKey'; details: string }
    | { type: 'TransactionTooLarge'; size: number; maxSize: number };
  ```

### Naming Conventions
- Use camelCase for variables and functions
- Use PascalCase for types and classes
- Use UPPER_CASE for constants
- Use descriptive names that explain purpose

### Error Handling
- Use custom error types with discriminated unions
- Validate inputs early and throw descriptive errors
- Never swallow errors silently
- Preserve error context for debugging

### General Rules
- Async functions return `Promise<T>` or `AsyncGenerator<T, void, unknown>`
- Sync functions preferred where possible
- Use builder patterns for complex objects
- Zero dependencies - only use Web Standards APIs
- All code must be tree-shakeable
- Immutable data structures by default
- Validate all external inputs