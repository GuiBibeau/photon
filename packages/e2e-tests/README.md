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

2. (Optional) Set up environment variables for auto-loading a wallet:

```bash
cp .env.example .env
# Edit .env and add your private key:
# VITE_PRIVATE_KEY=your_base58_encoded_private_key_here
```

3. Start the development server:

```bash
pnpm dev
```

4. Open http://localhost:5173 in your browser

## Environment Variables

The demo app supports automatically loading a wallet from a private key environment variable:

### `VITE_PRIVATE_KEY`

Private key in various formats (must be 64 bytes - standard Solana keypair format with 32-byte seed + 32-byte public key):

**Supported Formats:**

- **Base58**: `"5J3mVnYq4vDRwZEgR..."` - Standard Solana/Phantom export format
- **Hex with prefix**: `"0x1234567890abcdef..."` - Hexadecimal with 0x prefix
- **Hex without prefix**: `"1234567890abcdef..."` - Plain hexadecimal
- **JSON array**: `"[255,101,67,24,15,...]"` - Array of byte values (0-255)
- **Comma-separated**: `"255,101,67,24,15,..."` - Comma-separated byte values

**Examples:**

```bash
# Base58 (most common - from Phantom/Solflare export)
VITE_PRIVATE_KEY=5J3mVnYq4vDRwZEgR...

# Hex format
VITE_PRIVATE_KEY=0x1234567890abcdef...

# Byte array (useful for programmatic generation)
VITE_PRIVATE_KEY=[255,101,67,24,15,...]
```

The wallet will be automatically loaded when the app starts, and you'll see "Imported Wallet" in the context with your address and balance.

**⚠️ Security Warning**: Never commit your actual private key to version control! The `.env` file is gitignored for security.

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
