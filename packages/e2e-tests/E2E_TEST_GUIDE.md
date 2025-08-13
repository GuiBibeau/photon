# E2E Test Guide for Photon SDK

## Overview

This guide documents the end-to-end tests for the Photon SDK, which validate two core blockchain flows:
1. **Wallet Flow**: Generate keys → Send SOL
2. **Token Flow**: Create token → Transfer

## Prerequisites

### 1. Environment Setup

Create a `.env` file with your funded Solana wallet:

```bash
VITE_PRIVATE_KEY=your-base58-private-key-here
```

The wallet should have at least 2 SOL on devnet for running all tests.

### 2. Install Dependencies

```bash
pnpm install
npx playwright install  # Install browser drivers
```

## Test Flows

### Flow 1: Generate Keys → Send SOL

This test validates:
- Wallet generation
- Private key import from environment
- SOL balance display
- SOL transfers between wallets
- Message signing and verification

**Test file**: `tests/wallet-flow.spec.ts`

**Key test cases**:
1. Import wallet from environment variable
2. Display wallet balance
3. Generate new wallet
4. Send SOL to new wallet
5. Sign and verify messages

### Flow 2: Create Token → Transfer

This test validates:
- SPL token creation
- Token minting
- Token transfers
- Associated Token Account (ATA) creation
- Balance checking for any wallet/token combination

**Test file**: `tests/token-flow.spec.ts`

**Key test cases**:
1. Create new SPL token with metadata
2. Mint tokens to creator wallet
3. Transfer tokens to another wallet
4. Automatic ATA creation during transfer
5. Check token balances for any wallet

## Running Tests

### Quick Start

```bash
# Run all e2e tests
pnpm test:e2e

# Run specific flow
pnpm test:wallet  # Wallet flow only
pnpm test:token   # Token flow only
```

### Development Mode

```bash
# Run with UI (interactive mode)
pnpm test:ui

# Run with visible browser
pnpm test:headed

# Debug mode
pnpm test:debug
```

### View Test Results

```bash
# Open HTML report after tests
pnpm test:report
```

## Test Architecture

### Page Object Pattern

The tests interact with the UnifiedDashboard component using:
- CSS selectors for specific elements
- Role-based queries for buttons
- Text content matching for validation

### Key Selectors

```typescript
// Wallet elements
'.wallet-info'          // Current wallet display
'.wallet-address'       // Wallet address
'.wallet-balance'       // SOL balance
'.bento-item.saved-wallets'  // Saved wallets section

// Token elements
'.bento-item.create-token'   // Token creation section
'.bento-item.send-tokens'    // Token transfer section
'.bento-item.check-balance'  // Balance checking section

// Status messages
'.status-message'       // Transaction status
'[role="status"]'      // Alternative status selector
```

### Blockchain Interactions

Tests interact with Solana devnet:
- Timeout: 60 seconds per test (for blockchain confirmations)
- Sequential execution to avoid state conflicts
- Automatic retries on CI

## Troubleshooting

### Common Issues

1. **Wallet not loading**: Check `.env` file and VITE_PRIVATE_KEY format
2. **Insufficient balance**: Ensure wallet has at least 2 SOL
3. **Timeout errors**: Increase timeout in `playwright.config.ts`
4. **ATA creation fails**: Check if token mint is valid

### Debug Commands

```bash
# Run single test with debug output
npx playwright test --debug tests/wallet-flow.spec.ts

# Generate trace for debugging
npx playwright test --trace on

# Take screenshots at each step
npx playwright test --screenshot on
```

## CI/CD Integration

### GitHub Actions

A complete GitHub Actions workflow is available at `.github/workflows/e2e-tests.yml`.

To set it up:
1. Add your private key as a GitHub secret named `SOLANA_TEST_PRIVATE_KEY`
2. Ensure the wallet has at least 2 SOL on devnet
3. The workflow will run automatically on pushes and PRs

For detailed setup instructions, see [GITHUB_ACTION_SETUP.md](./GITHUB_ACTION_SETUP.md).

### Environment Variables

Required for CI:
- `VITE_PRIVATE_KEY`: Base58 encoded private key (from GitHub secret)
- `CI`: Automatically set by GitHub Actions

## Best Practices

1. **State Management**: Tests should be independent and not rely on previous test state
2. **Cleanup**: Each test should clean up created resources when possible
3. **Assertions**: Use explicit waits and assertions for blockchain operations
4. **Error Handling**: Check for both success and error states
5. **Documentation**: Comment complex selectors and wait conditions

## Extending Tests

To add new test cases:

1. Create new spec file in `tests/` directory
2. Import Playwright test utilities
3. Use existing patterns for wallet/token operations
4. Add new npm script in `package.json`
5. Update this documentation

## Test Data

### Sample Outputs

**Successful wallet creation**:
```
Address: 7xKXtg2CW87d9...
Balance: 0.000 SOL
```

**Token creation result**:
```
Token Name: Playwright Test Token
Symbol: PTT
Decimals: 6
Mint: Fg6PaFpoGX...
```

**Transfer confirmation**:
```
✅ Sent 100 PTT to 9yK3tg2CW87d9...
Transaction: 5XrP9w7K...
```

## Security Notes

- Never commit `.env` file with real private keys
- Use separate test wallets for e2e tests
- Keep minimal SOL balance in test wallets
- Rotate test keys regularly
- Use devnet for all tests