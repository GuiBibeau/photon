# Photon SDK Demo App

A minimal React + TypeScript application to test and demonstrate the Photon SDK capabilities.

## Features

### 🔑 Wallet Demo
- Generate Ed25519 keypairs using WebCrypto API
- Sign and verify messages
- Display public keys in Base58 format

### 🪙 SPL Token Demo
- Build SPL Token transactions
- Initialize mints with custom decimals
- Create Associated Token Accounts (ATAs)
- Transfer tokens between accounts
- Preview transaction structure

### 🌐 RPC Client Demo
- Connect to different Solana networks (Devnet, Testnet, Mainnet)
- Fetch account balances and info
- Get network information (block height, version)
- Demonstrate RPC client capabilities

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Start the development server:
```bash
pnpm dev
```

3. Open http://localhost:5173 in your browser

## Project Structure

```
demo-app/
├── src/
│   ├── components/
│   │   ├── WalletDemo.tsx    # Keypair generation and signing
│   │   ├── TokenDemo.tsx      # SPL Token operations
│   │   └── RpcDemo.tsx        # RPC client interactions
│   ├── App.tsx                # Main app with tab navigation
│   └── App.css                # Styling
├── package.json
└── vite.config.ts             # Vite configuration with aliases
```

## Key Technologies

- **Vite** - Fast build tool and dev server
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Photon SDK** - Lightweight Solana SDK
  - Zero dependencies
  - WebCrypto API for cryptography
  - Tree-shakeable modules
  - ~15KB typical bundle size

## Testing the SDK

This demo app is designed to test the Photon SDK in a real browser environment:

1. **WebCrypto API**: Test native browser crypto operations
2. **Bundle Size**: Verify tree-shaking and minimal bundle impact
3. **Type Safety**: Ensure TypeScript types work correctly
4. **Module Resolution**: Test workspace package imports

## Note

This is a demo application for testing purposes. In production:
- Use a proper wallet adapter (Phantom, Solflare, etc.)
- Implement proper error handling
- Add transaction confirmation logic
- Use environment variables for RPC endpoints
- Add proper loading states and user feedback