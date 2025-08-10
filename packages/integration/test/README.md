# Sandbox Integration Tests

This directory contains integration tests for the Photon SDK using a local Solana test validator.

## Structure

```
test/
├── fixtures/       # Test data and pre-defined accounts
├── utils/          # Test utilities and helpers
│   ├── validator.ts    # Validator lifecycle management
│   ├── helpers.ts      # Common test helpers
│   └── setup.ts        # Global test setup (optional)
└── integration/    # Integration test suites
    └── transfer.test.ts # SOL transfer tests
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage

# Run a specific test file
pnpm test transfer.test.ts
```

## Test Architecture

### Validator Management

Tests use a local Solana test validator that is started/stopped for each test suite. The validator runs on port 8899 by default.

### Test Accounts

Tests generate dynamic accounts for each test to ensure isolation. Accounts are funded via airdrop as needed.

### Test Helpers

- `createTestRpc()` - Create an RPC client for tests
- `createTestSigner()` - Generate a test signer
- `waitForConfirmation()` - Wait for transaction confirmation
- `fundAccount()` - Fund an account via airdrop
- `getBalance()` - Get account balance with retries

## Writing Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startValidator, stopValidator } from '../utils/validator.js';
import { createTestRpc, createTestSigner } from '../utils/helpers.js';

describe('My Integration Test', () => {
  let rpc;
  let signer;

  beforeAll(async () => {
    await startValidator({ resetLedger: true });
    rpc = createTestRpc();
    signer = await createTestSigner('test');
  });

  afterAll(async () => {
    await stopValidator();
  });

  it('should do something', async () => {
    // Test implementation
  });
});
```

## Global Setup (Optional)

To run the validator once for all tests instead of per-suite, uncomment the `globalSetup` option in `vitest.config.ts`:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globalSetup: './test/utils/setup.ts',
    // ...
  }
});
```

This can speed up tests but reduces isolation between test suites.

## Pre-requisites

- Solana CLI tools installed (`solana-test-validator`)
- Node.js 20+
- pnpm

## Troubleshooting

### Validator fails to start

- Check if port 8899 is already in use
- Ensure `solana-test-validator` is installed
- Check validator logs (disable quiet mode in tests)

### Tests timeout

- Increase timeout in `vitest.config.ts`
- Check if validator is responding
- Ensure network connectivity

### Balance issues

- Airdrops may take time to confirm
- Use `waitForConfirmation()` helper
- Check commitment levels (processed vs confirmed)