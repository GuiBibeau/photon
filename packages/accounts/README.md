# @photon/accounts

Account fetching and decoding utilities for the Photon SDK.

## Installation

```bash
npm install @photon/accounts
```

## Features

- 🔄 **Type-safe account fetching** - Fetch and decode accounts with full TypeScript support
- 📦 **Generic codec support** - Use any codec to decode account data
- 🚀 **Batch operations** - Efficiently fetch multiple accounts in batches
- 🌳 **Tree-shakeable** - Import only what you need

## Usage

### Fetching a Single Account

```typescript
import { getAccount } from '@photon/accounts';
import { createSolanaRpc } from '@photon/rpc';
import { struct, u64, publicKey } from '@photon/codecs';
import { address } from '@photon/addresses';

// Define your account data structure
const tokenAccountCodec = struct({
  mint: publicKey,
  owner: publicKey,
  amount: u64,
  // ... other fields
});

// Create RPC client
const rpc = createSolanaRpc('https://api.devnet.solana.com');

// Fetch and decode account
const account = await getAccount(
  rpc,
  address('YourAccountAddress...'),
  tokenAccountCodec
);

if (account) {
  console.log('Token balance:', account.info.data.amount);
  console.log('Owner:', account.info.owner);
  console.log('Lamports:', account.info.lamports);
}
```

### Fetching Raw Account Data

```typescript
import { getAccountRaw } from '@photon/accounts';

// Fetch account without decoding
const account = await getAccountRaw(rpc, address);

if (account) {
  console.log('Raw data size:', account.info.data.length);
  console.log('Data bytes:', account.info.data);
}
```

### Fetching Multiple Accounts

```typescript
import { getMultipleAccounts } from '@photon/accounts';

const addresses = [
  address('Address1...'),
  address('Address2...'),
  address('Address3...'),
];

// Fetch multiple accounts with the same codec
const accounts = await getMultipleAccounts(
  rpc,
  addresses,
  tokenAccountCodec,
  {
    commitment: 'confirmed',
    batchSize: 100, // Accounts per RPC call
  }
);

accounts.forEach((account, index) => {
  if (account) {
    console.log(`Account ${index}:`, account.info.data);
  } else {
    console.log(`Account ${index} does not exist`);
  }
});
```

## API Reference

### Types

#### `AccountInfo<TData>`

Account information with decoded data.

```typescript
interface AccountInfo<TData = Uint8Array> {
  owner: Address;        // Owner program
  lamports: bigint;      // Balance in lamports
  data: TData;          // Decoded account data
  executable: boolean;   // Is executable (program)
  rentEpoch: bigint;    // Rent epoch
  size: number;         // Data size in bytes
}
```

#### `Account<TData>`

Account with its address.

```typescript
interface Account<TData = Uint8Array> {
  address: Address;
  info: AccountInfo<TData>;
}
```

### Functions

#### `getAccount()`

Fetch and decode a single account.

```typescript
function getAccount<TData>(
  rpc: RpcClient,
  address: Address,
  codec: Codec<TData>,
  options?: GetAccountOptions,
): Promise<Account<TData> | null>
```

#### `getAccountRaw()`

Fetch account with raw bytes.

```typescript
function getAccountRaw(
  rpc: RpcClient,
  address: Address,
  options?: GetAccountOptions,
): Promise<Account<Uint8Array> | null>
```

#### `getMultipleAccounts()`

Fetch and decode multiple accounts.

```typescript
function getMultipleAccounts<TData>(
  rpc: RpcClient,
  addresses: Address[],
  codec: Codec<TData>,
  options?: GetMultipleAccountsOptions,
): Promise<Array<Account<TData> | null>>
```

#### `getMultipleAccountsRaw()`

Fetch multiple accounts with raw bytes.

```typescript
function getMultipleAccountsRaw(
  rpc: RpcClient,
  addresses: Address[],
  options?: GetMultipleAccountsOptions,
): Promise<Array<Account<Uint8Array> | null>>
```

### Options

#### `GetAccountOptions`

```typescript
interface GetAccountOptions {
  commitment?: 'processed' | 'confirmed' | 'finalized';
  minContextSlot?: number;
}
```

#### `GetMultipleAccountsOptions`

```typescript
interface GetMultipleAccountsOptions extends GetAccountOptions {
  batchSize?: number; // Max accounts per RPC call (default: 100)
}
```

## Tree-Shaking

For optimal bundle size, import specific functions:

```typescript
// ✅ Import only what you need
import { getAccount } from '@photon/accounts/fetch';
import type { AccountInfo } from '@photon/accounts/types';

// ❌ Avoid importing everything
import * as accounts from '@photon/accounts';
```

## License

MIT