# @photon/sandbox

A development sandbox for testing and experimenting with Photon SDK packages.

## Quick Start

```bash
# Install dependencies
pnpm install

# Terminal 1: Start test validator
pnpm validator

# Terminal 2: Run examples
pnpm dev:example all     # Run all examples
pnpm dev:example rpc     # Run specific example

# Or use watch mode for development
pnpm dev
```

## Available Scripts

### Development
- `pnpm dev` - Run in watch mode (auto-reload on changes)
- `pnpm dev:example [name]` - Run specific example or all

### Test Validator
- `pnpm validator` - Start Solana test validator
- `pnpm validator:reset` - Start validator with clean state
- `pnpm validator:logs` - Watch validator logs
- `pnpm airdrop [address]` - Airdrop 10 SOL to address

### Configuration
Set custom RPC endpoint:
```bash
RPC_ENDPOINT=http://localhost:8899 pnpm dev:example rpc
```

## Examples

- `addresses` - Address generation and validation
- `crypto` - Cryptographic operations
- `codecs` - Binary encoding/decoding
- `rpc` - RPC client interactions
- `transactions` - Transaction building (coming soon)

## Writing New Examples

Create a new file in `src/examples/` and export an async function:

```typescript
export async function testMyFeature() {
  // Your test code here
}
```

Then import and add it to `src/runner.ts`.