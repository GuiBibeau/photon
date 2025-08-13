# @photon/react

React hooks and components for the Photon SDK - Zero-dependency wallet connection and Solana interactions.

## Features

- 🪶 **Lightweight** - Minimal bundle size with tree-shakeable exports
- 🔒 **Secure** - Uses WebCrypto API for all cryptographic operations
- 🌲 **Tree-shakeable** - Import only what you need
- 📦 **Zero Dependencies** - No external runtime dependencies (except React)
- 💪 **Type-Safe** - Full TypeScript support with strict types

## Installation

```bash
npm install @photon/react
# or
pnpm add @photon/react
# or
yarn add @photon/react
```

## Quick Start

```tsx
import { WalletProvider, useWallet } from '@photon/react';

function App() {
  return (
    <WalletProvider autoConnect>
      <WalletConnect />
    </WalletProvider>
  );
}

function WalletConnect() {
  const { connected, publicKey, connect, disconnect } = useWallet();
  
  if (connected) {
    return (
      <div>
        <p>Connected: {publicKey}</p>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );
  }
  
  return <button onClick={() => connect()}>Connect Wallet</button>;
}
```

## Available Hooks

### Wallet Hooks
- `useWallet` - Primary wallet connection hook
- `useWalletMultiSig` - Multi-signature wallet support

### Balance & Transaction Hooks
- `useBalance` - SOL balance monitoring
- `useSendSOL` - Send SOL with automatic transaction building
- `useTransaction` - Transaction lifecycle management
- `useSimulateTransaction` - Transaction simulation
- `useTransactionHistory` - Fetch transaction history
- `useAirdrop` - Request airdrops on devnet/testnet

### Token Hooks
- `useTokenBalances` - Fetch all SPL token balances
- `useSendToken` - Send SPL tokens with ATA creation
- `useCreateTokenAccount` - Create token accounts
- `useTokenMetadata` - Fetch token metadata
- `useWrapSOL` - Wrap/unwrap SOL to wSOL
- `useBurnTokens` - Burn SPL tokens

### DeFi Hooks
- `useSwap` - Token swapping via aggregators
- `useTokenPrice` - Real-time token prices
- `useTokenAllowance` - Token delegation management
- `useStablecoins` - Specialized stablecoin operations

## Mobile Support

The SDK includes comprehensive mobile wallet support:

- Deep linking for mobile wallets
- QR code connection for cross-device linking
- Mobile wallet detection
- In-app browser detection

## Tree-Shaking

Import only what you need for optimal bundle size:

```tsx
// Instead of importing everything
import { useWallet, useBalance } from '@photon/react';

// Import from specific modules
import { useWallet } from '@photon/react/hooks/wallet';
import { useBalance } from '@photon/react/hooks/balance';
```

## License

MIT