# @photon/accounts

High-level account fetching and decoding for Solana. Type-safe account data with built-in codecs.

## Installation

```bash
npm install @photon/accounts
```

## First fetch an account

```typescript
import { getAccount } from '@photon/accounts';

// Fetch account data
const account = await getAccount(rpc, accountAddress);

if (account) {
  console.log('Owner:', account.info.owner);
  console.log('Balance:', account.info.lamports, 'lamports');
  console.log('Data size:', account.info.size, 'bytes');
}
```

## Core Concepts

### Account Structure

```typescript
interface Account<TData = Uint8Array> {
  address: Address;
  info: AccountInfo<TData>;
}

interface AccountInfo<TData = Uint8Array> {
  owner: Address;
  lamports: bigint;
  data: TData;
  executable: boolean;
  rentEpoch: bigint;
  size: number;
}
```

### Type-Safe Data

Accounts can have typed data through codecs:

```typescript
// Raw bytes (default)
const rawAccount: Account<Uint8Array> = await getAccount(rpc, address);

// Decoded with codec
const tokenAccount: Account<TokenAccount> = await getAccount(
  rpc, 
  address,
  { codec: tokenAccountCodec }
);
```

## Fetching Accounts

### Single Account

```typescript
import { getAccount, getAccountRaw } from '@photon/accounts';

// Fetch with default options
const account = await getAccount(rpc, address);

// With commitment level
const confirmedAccount = await getAccount(rpc, address, {
  commitment: 'confirmed'
});

// Raw response (includes context)
const rawResponse = await getAccountRaw(rpc, address);
console.log('Slot:', rawResponse.context.slot);
```

### Multiple Accounts

```typescript
import { getMultipleAccounts } from '@photon/accounts';

const addresses = [address1, address2, address3];

// Fetch multiple accounts
const accounts = await getMultipleAccounts(rpc, addresses);

// Process results (null if account doesn't exist)
accounts.forEach((account, index) => {
  if (account) {
    console.log(`${addresses[index]}: ${account.info.lamports} lamports`);
  } else {
    console.log(`${addresses[index]}: Account not found`);
  }
});

// With options
const accounts = await getMultipleAccounts(rpc, addresses, {
  commitment: 'finalized',
  batchSize: 50 // Fetch 50 at a time
});
```

## Decoding Account Data

### Basic Decoding

```typescript
import { decodeAccountData } from '@photon/accounts';
import { struct, u64, publicKey } from '@photon/codecs';

// Define codec for your account type
const myAccountCodec = struct({
  balance: u64,
  owner: publicKey,
  timestamp: u64
});

// Decode account data
const decoded = decodeAccountData(
  accountInfo.data,
  myAccountCodec
);

console.log('Balance:', decoded.balance);
console.log('Owner:', decoded.owner);
```

### Safe Decoding

```typescript
import { tryDecodeAccountData } from '@photon/accounts';

// Try to decode, returns null on failure
const decoded = tryDecodeAccountData(
  accountInfo.data,
  myAccountCodec
);

if (decoded) {
  console.log('Successfully decoded:', decoded);
} else {
  console.log('Failed to decode account data');
}
```

### Partial Decoding

```typescript
import { partialDecodeAccountData } from '@photon/accounts';

// Decode only part of the data
const partialData = partialDecodeAccountData(
  accountInfo.data,
  headerCodec,
  0, // offset
  100 // length
);
```

### Lazy Decoding

```typescript
import { transformAccountInfo } from '@photon/accounts';

// Transform account with lazy decoding
const lazyAccount = transformAccountInfo(
  accountInfo,
  {
    strategy: 'lazy',
    codec: myAccountCodec
  }
);

// Data is decoded on first access
const data = lazyAccount.data; // Decodes here
```

## Common Account Types

### System Account

```typescript
import { 
  SystemAccount, 
  systemAccountCodec,
  AccountType 
} from '@photon/accounts';

// Fetch as system account
const account = await getAccount(rpc, address, {
  codec: systemAccountCodec
});

if (account?.info.data.type === AccountType.System) {
  console.log('System account with', account.info.lamports, 'lamports');
}
```

### Token Account

```typescript
import { 
  TokenAccount, 
  tokenAccountCodec 
} from '@photon/accounts';

// Fetch and decode token account
const account = await getAccount(rpc, tokenAddress, {
  codec: tokenAccountCodec
});

if (account) {
  const data = account.info.data;
  console.log('Mint:', data.mint);
  console.log('Owner:', data.owner);
  console.log('Amount:', data.amount);
  console.log('Decimals:', data.delegatedAmount ? 'Has delegate' : 'No delegate');
}
```

### Token Mint

```typescript
import { 
  TokenMint, 
  tokenMintCodec 
} from '@photon/accounts';

// Fetch mint account
const mint = await getAccount(rpc, mintAddress, {
  codec: tokenMintCodec
});

if (mint) {
  const data = mint.info.data;
  console.log('Supply:', data.supply);
  console.log('Decimals:', data.decimals);
  console.log('Mint authority:', data.mintAuthority);
  console.log('Freeze authority:', data.freezeAuthority);
}
```

### Multisig Account

```typescript
import { 
  MultisigAccount, 
  multisigAccountCodec 
} from '@photon/accounts';

// Fetch multisig account
const multisig = await getAccount(rpc, multisigAddress, {
  codec: multisigAccountCodec
});

if (multisig) {
  const data = multisig.info.data;
  console.log('Required signers:', data.m);
  console.log('Total signers:', data.n);
  console.log('Signers:', data.signers);
}
```

## Auto-Detection

### Detect Account Type

```typescript
import { detectAccountType, AccountType } from '@photon/accounts';

const type = detectAccountType(accountInfo);

switch (type) {
  case AccountType.System:
    console.log('System account');
    break;
  case AccountType.Token:
    console.log('Token account');
    break;
  case AccountType.TokenMint:
    console.log('Token mint');
    break;
  case AccountType.Unknown:
    console.log('Unknown account type');
    break;
}
```

### Auto-Decode

```typescript
import { autoDecodeAccount } from '@photon/accounts';

// Automatically detect and decode
const decoded = autoDecodeAccount(accountInfo);

if (decoded.type === AccountType.Token) {
  // TypeScript knows this is a TokenAccount
  console.log('Token balance:', decoded.data.amount);
} else if (decoded.type === AccountType.TokenMint) {
  // TypeScript knows this is a TokenMint
  console.log('Total supply:', decoded.data.supply);
}
```

### Get Codec for Type

```typescript
import { getCodecForAccountType } from '@photon/accounts';

const type = detectAccountType(accountInfo);
const codec = getCodecForAccountType(type);

if (codec) {
  const decoded = decodeAccountData(accountInfo.data, codec);
}
```

## Validation

### Validate Data Size

```typescript
import { 
  validateAccountDataSize,
  validateMinAccountDataSize 
} from '@photon/accounts';

// Exact size validation
validateAccountDataSize(accountInfo, 165); // Token account size

// Minimum size validation
validateMinAccountDataSize(accountInfo, 100);
```

### Check Valid Data

```typescript
import { isValidAccountData } from '@photon/accounts';

if (isValidAccountData(accountInfo, tokenAccountCodec)) {
  // Safe to decode as token account
  const decoded = decodeAccountData(accountInfo.data, tokenAccountCodec);
}
```

## Common Patterns

### Fetch and Decode Pattern

```typescript
async function fetchTokenAccount(
  rpc: SolanaRpc,
  address: Address
): Promise<TokenAccount | null> {
  const account = await getAccount(rpc, address);
  
  if (!account) {
    return null;
  }
  
  // Verify owner
  if (!addressesEqual(account.info.owner, TOKEN_PROGRAM_ADDRESS)) {
    throw new Error('Not a token account');
  }
  
  // Decode data
  return decodeAccountData(account.info.data, tokenAccountCodec);
}
```

### Batch Fetch Pattern

```typescript
async function fetchAllTokenAccounts(
  rpc: SolanaRpc,
  addresses: Address[]
): Promise<Map<Address, TokenAccount>> {
  const accounts = await getMultipleAccounts(rpc, addresses, {
    batchSize: 100
  });
  
  const tokenAccounts = new Map<Address, TokenAccount>();
  
  accounts.forEach((account, index) => {
    if (account && account.info.owner === TOKEN_PROGRAM_ADDRESS) {
      const decoded = tryDecodeAccountData(
        account.info.data,
        tokenAccountCodec
      );
      
      if (decoded) {
        tokenAccounts.set(addresses[index], decoded);
      }
    }
  });
  
  return tokenAccounts;
}
```

### Monitor Account Changes

```typescript
async function monitorAccount(
  rpc: SolanaRpc,
  address: Address,
  callback: (account: Account) => void
): Promise<() => void> {
  let lastSlot = 0;
  let running = true;
  
  const poll = async () => {
    while (running) {
      const account = await getAccount(rpc, address, {
        commitment: 'confirmed',
        minContextSlot: lastSlot
      });
      
      if (account) {
        callback(account);
        // Track slot for changes
        const raw = await getAccountRaw(rpc, address);
        lastSlot = raw.context.slot;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };
  
  poll();
  
  // Return cleanup function
  return () => { running = false; };
}
```

### Associated Token Account

```typescript
async function getTokenBalance(
  rpc: SolanaRpc,
  owner: Address,
  mint: Address
): Promise<bigint> {
  // Derive ATA address
  const ata = await deriveAssociatedTokenAddress(owner, mint);
  
  // Fetch account
  const account = await getAccount(rpc, ata, {
    codec: tokenAccountCodec
  });
  
  if (!account) {
    return 0n; // Account doesn't exist
  }
  
  return account.info.data.amount;
}
```

## Error Handling

```typescript
import { SolanaError } from '@photon/errors';

try {
  const account = await getAccount(rpc, address);
  const decoded = decodeAccountData(account.info.data, codec);
} catch (error) {
  if (error instanceof SolanaError) {
    switch (error.code) {
      case 'ACCOUNT_NOT_FOUND':
        console.log('Account does not exist');
        break;
      case 'INVALID_ACCOUNT_DATA':
        console.log('Failed to decode account data');
        break;
    }
  }
}
```

## TypeScript

Full type inference for account data:

```typescript
import type {
  Account,
  AccountInfo,
  GetAccountOptions,
  GetMultipleAccountsOptions
} from '@photon/accounts';

// Typed account fetching
async function getTypedAccount<T>(
  rpc: SolanaRpc,
  address: Address,
  codec: Codec<T>
): Promise<Account<T> | null> {
  const account = await getAccount(rpc, address);
  if (!account) return null;
  
  const data = decodeAccountData(account.info.data, codec);
  
  return {
    address: account.address,
    info: {
      ...account.info,
      data
    }
  };
}

// Type inference
const tokenAccount = await getTypedAccount(rpc, address, tokenAccountCodec);
// tokenAccount is Account<TokenAccount> | null
```

## Performance

### Caching Strategy

```typescript
class AccountCache {
  private cache = new Map<string, { account: Account; slot: number }>();
  
  async get(
    rpc: SolanaRpc,
    address: Address,
    maxAge = 10000
  ): Promise<Account | null> {
    const key = address.toString();
    const cached = this.cache.get(key);
    
    if (cached) {
      const age = Date.now() - cached.slot;
      if (age < maxAge) {
        return cached.account;
      }
    }
    
    const account = await getAccount(rpc, address);
    if (account) {
      this.cache.set(key, { account, slot: Date.now() });
    }
    
    return account;
  }
}
```

## Size

- ~10KB minified
- ~3KB gzipped
- Tree-shakeable exports

## License

Apache-2.0