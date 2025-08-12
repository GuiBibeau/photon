# @photon/spl-token

SPL Token program integration for the Photon SDK, providing functionality for creating and managing Solana tokens.

## Installation

```bash
npm install @photon/spl-token
```

## Complete Token Creation and Minting Flow

This package provides a complete implementation for creating tokens and minting them on Solana. Here's the precise flow as currently implemented:

### Prerequisites

1. **Wallet Setup**: You need a funded wallet with SOL for transaction fees
2. **RPC Connection**: Connection to a Solana RPC endpoint (devnet, testnet, or mainnet)

### Step 1: Create a Token Mint

Creating a token mint is the first step in the token creation process. The mint account stores the token's metadata and controls minting authority.

```typescript
import { address } from '@photon/addresses';
import { createInitializeMintInstruction } from '@photon/spl-token';
import { 
  createTransactionMessage,
  setTransactionMessageFeePayer,
  appendTransactionMessageInstruction,
  setTransactionMessageLifetimeUsingBlockhash,
  blockhash
} from '@photon/transaction-messages';
import { signTransaction, sendAndConfirmTransaction } from '@photon/transactions';
import { createSolanaRpc } from '@photon/rpc';

// Setup
const rpc = createSolanaRpc('https://api.devnet.solana.com');
const owner = address('YourWalletAddressHere');
const mint = address('YourMintAddressHere'); // Generate a new keypair for this

// Create the mint instruction
const initMintInstruction = createInitializeMintInstruction(mint, {
  decimals: 9,                    // Number of decimal places
  mintAuthority: owner,           // Who can mint new tokens
  freezeAuthority: null,          // Optional: who can freeze accounts
});

// Build the transaction
let message = createTransactionMessage('legacy');
message = setTransactionMessageFeePayer(owner, message);
message = appendTransactionMessageInstruction(initMintInstruction, message);

// Add blockhash for transaction lifetime
const blockHashResult = await rpc.getLatestBlockhash();
message = setTransactionMessageLifetimeUsingBlockhash(
  { 
    blockhash: blockhash(blockHashResult.value.blockhash),
    lastValidBlockHeight: BigInt(blockHashResult.value.lastValidBlockHeight)
  },
  message
);

// Sign and send
const signedTx = await signTransaction([walletSigner], message);
const signature = await sendAndConfirmTransaction(signedTx, rpc);
console.log('Token mint created:', signature);
```

### Step 2: Create Associated Token Account (ATA) and Mint Tokens

After creating the mint, you need to create an Associated Token Account (ATA) for the recipient and then mint tokens to it. The current implementation combines these steps for efficiency.

```typescript
import { 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction 
} from '@photon/spl-token';

// Get the ATA address for the wallet/mint combination
const ata = await getAssociatedTokenAddress(mint, owner);

// Create instructions array
const instructions = [
  // 1. Create ATA if it doesn't exist (idempotent - won't fail if exists)
  createAssociatedTokenAccountIdempotentInstruction(
    owner,  // payer
    ata,    // associated token account
    owner,  // owner of the ATA
    mint    // mint address
  ),
  
  // 2. Mint tokens to the ATA
  createMintToInstruction({
    mint: mint,
    destination: ata,
    authority: owner,
    amount: BigInt(1000000000) // 1 token with 9 decimals
  })
];

// Build transaction with both instructions
let message = createTransactionMessage('legacy');
message = setTransactionMessageFeePayer(owner, message);

// Add both instructions to the transaction
for (const instruction of instructions) {
  message = appendTransactionMessageInstruction(instruction, message);
}

// Add blockhash
const blockHashResult = await rpc.getLatestBlockhash();
message = setTransactionMessageLifetimeUsingBlockhash(
  { 
    blockhash: blockhash(blockHashResult.value.blockhash),
    lastValidBlockHeight: BigInt(blockHashResult.value.lastValidBlockHeight)
  },
  message
);

// Sign and send
const signedTx = await signTransaction([walletSigner], message);
const signature = await sendAndConfirmTransaction(signedTx, rpc);
console.log('Tokens minted:', signature);
```

### Important Implementation Details

#### Associated Token Account (ATA) Derivation

The ATA address is deterministically derived from the owner's wallet address and the mint address using Program Derived Addresses (PDAs):

```typescript
// The correct seed order for ATA derivation is critical:
// [owner, token_program, mint]
const seeds = [
  getAddressBytes(owner),
  getAddressBytes(TOKEN_PROGRAM_ADDRESS),
  getAddressBytes(mint)
];

// The ATA program uses these seeds to derive the address
const [ata, bump] = await findProgramAddressSync(
  seeds,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS
);
```

#### Instruction Account Order

The Associated Token Account instructions require accounts in a specific order:

1. **Payer** (signer, writable) - Pays for account creation
2. **Associated Token Account** (writable) - The ATA being created
3. **Owner** - The wallet that owns the ATA
4. **Mint** - The token mint
5. **System Program** - For account creation
6. **Token Program** - SPL Token program

#### Error Handling

Common errors and their meanings:

- **"An account required by the instruction is missing"**: The System Program address is incorrect or missing
- **"Provided seeds do not result in a valid address"**: The ATA derivation seeds are in the wrong order or incorrect
- **"Mint account does not exist"**: Trying to mint before the mint account is created or confirmed

### Step 3: Transfer Tokens

Once tokens are minted, they can be transferred between accounts:

```typescript
import { createTransferInstruction } from '@photon/spl-token';

const transferInstruction = createTransferInstruction({
  amount: BigInt(100000000), // 0.1 token with 9 decimals
  source: sourceAta,
  destination: destinationAta,
  owner: owner,
  signers: [] // Additional signers if using multisig
});
```

## API Reference

### Token Instructions

#### `createInitializeMintInstruction(mint, params)`
Creates an instruction to initialize a new token mint.

#### `createInitializeAccountInstruction(account, mint, owner)`
Creates an instruction to initialize a token account.

#### `createMintToInstruction(params)`
Creates an instruction to mint new tokens.

#### `createTransferInstruction(params)`
Creates an instruction to transfer tokens between accounts.

#### `createBurnInstruction(params)`
Creates an instruction to burn tokens.

### Associated Token Account (ATA)

#### `getAssociatedTokenAddress(mint, owner, tokenProgram?)`
Derives the associated token account address for a wallet/mint combination.

#### `createAssociatedTokenAccountInstruction(payer, ata, owner, mint, tokenProgram?)`
Creates an instruction to create an associated token account.

#### `createAssociatedTokenAccountIdempotentInstruction(payer, ata, owner, mint, tokenProgram?)`
Creates an idempotent instruction to create an associated token account (won't fail if account exists).

## Complete Working Example

Here's a complete example from the demo app that creates a mint and mints tokens:

```typescript
async function handleMintTokens(
  wallet: { address: string, keyPair: CryptoKeyPair },
  createdMint: string,
  mintAmount: string,
  tokenDecimals: string
) {
  const rpc = createSolanaRpc('https://api.devnet.solana.com');
  const owner = address(wallet.address);
  const mint = address(createdMint);
  const amount = BigInt(parseInt(mintAmount) * Math.pow(10, parseInt(tokenDecimals)));
  
  // Get the associated token address
  const ata = await getAssociatedTokenAddress(mint, owner);
  
  console.log('Minting', mintAmount, 'tokens to', ata);
  
  // Check if mint exists (with retries)
  let mintAccountInfo = await rpc.getAccountInfo(mint, { commitment: 'confirmed' });
  let retries = 0;
  while (!mintAccountInfo.value && retries < 5) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    mintAccountInfo = await rpc.getAccountInfo(mint, { commitment: 'confirmed' });
    retries++;
  }
  
  if (!mintAccountInfo.value) {
    throw new Error('Mint account does not exist');
  }
  
  // Create instructions
  const instructions = [
    createAssociatedTokenAccountIdempotentInstruction(owner, ata, owner, mint),
    createMintToInstruction({ mint, destination: ata, authority: owner, amount })
  ];
  
  // Build transaction
  const message = createTransactionMessage('legacy');
  const messageWithFeePayer = setTransactionMessageFeePayer(owner, message);
  
  let messageWithInstructions = messageWithFeePayer;
  instructions.forEach(ix => {
    messageWithInstructions = appendTransactionMessageInstruction(ix, messageWithInstructions);
  });
  
  // Add blockhash
  const blockHashResult = await rpc.getLatestBlockhash();
  const finalMessage = setTransactionMessageLifetimeUsingBlockhash(
    { 
      blockhash: blockhash(blockHashResult.value.blockhash), 
      lastValidBlockHeight: BigInt(blockHashResult.value.lastValidBlockHeight) 
    },
    messageWithInstructions
  );
  
  // Sign and send
  const walletSigner = await importCryptoKeySignerFromKeyPair(wallet.keyPair);
  const signedTx = await signTransaction([walletSigner], finalMessage);
  const signature = await sendAndConfirmTransaction(signedTx, rpc, {
    skipPreflight: false,
    preflightCommitment: 'confirmed'
  }, {
    commitment: 'confirmed',
    timeout: 30000
  });
  
  console.log('Success! Tokens minted. Signature:', signature);
  return signature;
}
```

## Known Issues and Solutions

### Issue: "Provided seeds do not result in a valid address"
**Cause**: The ATA derivation seeds are incorrect or in wrong order.
**Solution**: Ensure seeds are exactly `[owner, token_program, mint]` in that order.

### Issue: "An account required by the instruction is missing"
**Cause**: Missing required account in instruction (often System Program).
**Solution**: Ensure System Program address is included: `11111111111111111111111111111111`

### Issue: Transaction simulation fails
**Cause**: Various reasons including insufficient balance, incorrect account ownership, or program errors.
**Solution**: Check wallet balance, ensure mint authority matches the signer, verify all addresses are correct.

## Testing

Run the test suite:

```bash
pnpm test
```

Run tests with coverage:

```bash
pnpm test:coverage
```

## License

MIT