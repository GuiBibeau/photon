/**
 * SPL Token instruction builders
 */

import { TOKEN_PROGRAM_ADDRESS, getAddressBytes, type Address } from '@photon/addresses';
import { u8, u64 } from '@photon/codecs/primitives';
import {
  createInstruction,
  type AccountMeta,
  type Instruction,
} from '@photon/transaction-messages';
import {
  TokenInstruction,
  type AuthorityType,
  type InitializeMintConfig,
  type TransferConfig,
  type MintToConfig,
  type BurnConfig,
  type ApproveConfig,
} from './types.js';

/**
 * Create an InitializeMint instruction (legacy version with rent sysvar)
 *
 * @param mint - The mint account to initialize
 * @param config - Mint configuration
 * @returns The instruction to initialize a mint
 */
export function createInitializeMintInstruction(
  mint: Address,
  config: InitializeMintConfig,
): Instruction {
  // Use InitializeMint2 which doesn't require rent sysvar
  return createInitializeMint2Instruction(mint, config);
}

/**
 * Create an InitializeMint2 instruction (modern version without rent sysvar)
 *
 * @param mint - The mint account to initialize
 * @param config - Mint configuration
 * @returns The instruction to initialize a mint
 */
export function createInitializeMint2Instruction(
  mint: Address,
  config: InitializeMintConfig,
): Instruction {
  const data = new Uint8Array(1 + 1 + 32 + 1 + 32);
  let offset = 0;

  // Instruction (InitializeMint2 = 20)
  data.set(u8.encode(TokenInstruction.InitializeMint2), offset);
  offset += 1;

  // Decimals
  data.set(u8.encode(config.decimals), offset);
  offset += 1;

  // Mint authority
  data.set(getAddressBytes(config.mintAuthority), offset);
  offset += 32;

  // Freeze authority option
  if (config.freezeAuthority) {
    data.set(u8.encode(1), offset);
    offset += 1;
    data.set(getAddressBytes(config.freezeAuthority), offset);
  } else {
    data.set(u8.encode(0), offset);
    offset += 1;
    // When no freeze authority, fill with zeros
    data.set(new Uint8Array(32), offset);
  }

  // InitializeMint2 only requires the mint account, no rent sysvar
  const accounts: AccountMeta[] = [{ pubkey: mint, isSigner: false, isWritable: true }];

  return createInstruction(TOKEN_PROGRAM_ADDRESS, accounts, data);
}

/**
 * Create an InitializeAccount instruction
 *
 * @param account - The token account to initialize
 * @param mint - The token mint
 * @param owner - The owner of the token account
 * @returns The instruction to initialize a token account
 */
export function createInitializeAccountInstruction(
  account: Address,
  mint: Address,
  owner: Address,
): Instruction {
  const data = u8.encode(TokenInstruction.InitializeAccount);

  const accounts: AccountMeta[] = [
    { pubkey: account, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: '11111111111111111111111111111111' as Address, isSigner: false, isWritable: false }, // Rent sysvar
  ];

  return createInstruction(TOKEN_PROGRAM_ADDRESS, accounts, data);
}

/**
 * Create a Transfer instruction
 *
 * @param config - Transfer configuration
 * @returns The instruction to transfer tokens
 */
export function createTransferInstruction(config: TransferConfig): Instruction {
  const data = new Uint8Array(1 + 8);
  data.set(u8.encode(TokenInstruction.Transfer), 0);
  data.set(u64.encode(config.amount), 1);

  const accounts: AccountMeta[] = [
    { pubkey: config.source, isSigner: false, isWritable: true },
    { pubkey: config.destination, isSigner: false, isWritable: true },
    { pubkey: config.owner, isSigner: true, isWritable: false },
  ];

  // Add additional signers if provided
  if (config.signers) {
    for (const signer of config.signers) {
      accounts.push({ pubkey: signer, isSigner: true, isWritable: false });
    }
  }

  return createInstruction(TOKEN_PROGRAM_ADDRESS, accounts, data);
}

/**
 * Create a MintTo instruction
 *
 * @param config - Mint configuration
 * @returns The instruction to mint tokens
 */
export function createMintToInstruction(config: MintToConfig): Instruction {
  const data = new Uint8Array(1 + 8);
  data.set(u8.encode(TokenInstruction.MintTo), 0);
  data.set(u64.encode(config.amount), 1);

  const accounts: AccountMeta[] = [
    { pubkey: config.mint, isSigner: false, isWritable: true },
    { pubkey: config.destination, isSigner: false, isWritable: true },
    { pubkey: config.authority, isSigner: true, isWritable: false },
  ];

  // Add additional signers if provided
  if (config.signers) {
    for (const signer of config.signers) {
      accounts.push({ pubkey: signer, isSigner: true, isWritable: false });
    }
  }

  return createInstruction(TOKEN_PROGRAM_ADDRESS, accounts, data);
}

/**
 * Create a Burn instruction
 *
 * @param config - Burn configuration
 * @returns The instruction to burn tokens
 */
export function createBurnInstruction(config: BurnConfig): Instruction {
  const data = new Uint8Array(1 + 8);
  data.set(u8.encode(TokenInstruction.Burn), 0);
  data.set(u64.encode(config.amount), 1);

  const accounts: AccountMeta[] = [
    { pubkey: config.account, isSigner: false, isWritable: true },
    { pubkey: config.mint, isSigner: false, isWritable: true },
    { pubkey: config.owner, isSigner: true, isWritable: false },
  ];

  // Add additional signers if provided
  if (config.signers) {
    for (const signer of config.signers) {
      accounts.push({ pubkey: signer, isSigner: true, isWritable: false });
    }
  }

  return createInstruction(TOKEN_PROGRAM_ADDRESS, accounts, data);
}

/**
 * Create an Approve instruction
 *
 * @param config - Approve configuration
 * @returns The instruction to approve a delegate
 */
export function createApproveInstruction(config: ApproveConfig): Instruction {
  const data = new Uint8Array(1 + 8);
  data.set(u8.encode(TokenInstruction.Approve), 0);
  data.set(u64.encode(config.amount), 1);

  const accounts: AccountMeta[] = [
    { pubkey: config.account, isSigner: false, isWritable: true },
    { pubkey: config.delegate, isSigner: false, isWritable: false },
    { pubkey: config.owner, isSigner: true, isWritable: false },
  ];

  // Add additional signers if provided
  if (config.signers) {
    for (const signer of config.signers) {
      accounts.push({ pubkey: signer, isSigner: true, isWritable: false });
    }
  }

  return createInstruction(TOKEN_PROGRAM_ADDRESS, accounts, data);
}

/**
 * Create a Revoke instruction
 *
 * @param account - The token account
 * @param owner - The owner of the token account
 * @param signers - Additional signers if owner is a multisig
 * @returns The instruction to revoke a delegate
 */
export function createRevokeInstruction(
  account: Address,
  owner: Address,
  signers?: Address[],
): Instruction {
  const data = u8.encode(TokenInstruction.Revoke);

  const accounts: AccountMeta[] = [
    { pubkey: account, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: false },
  ];

  // Add additional signers if provided
  if (signers) {
    for (const signer of signers) {
      accounts.push({ pubkey: signer, isSigner: true, isWritable: false });
    }
  }

  return createInstruction(TOKEN_PROGRAM_ADDRESS, accounts, data);
}

/**
 * Create a CloseAccount instruction
 *
 * @param account - The token account to close
 * @param destination - The account to receive the remaining SOL
 * @param owner - The owner of the token account
 * @param signers - Additional signers if owner is a multisig
 * @returns The instruction to close a token account
 */
export function createCloseAccountInstruction(
  account: Address,
  destination: Address,
  owner: Address,
  signers?: Address[],
): Instruction {
  const data = u8.encode(TokenInstruction.CloseAccount);

  const accounts: AccountMeta[] = [
    { pubkey: account, isSigner: false, isWritable: true },
    { pubkey: destination, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: false },
  ];

  // Add additional signers if provided
  if (signers) {
    for (const signer of signers) {
      accounts.push({ pubkey: signer, isSigner: true, isWritable: false });
    }
  }

  return createInstruction(TOKEN_PROGRAM_ADDRESS, accounts, data);
}

/**
 * Create a SetAuthority instruction
 *
 * @param account - The mint or account to change authority for
 * @param authorityType - The type of authority to change
 * @param currentAuthority - The current authority
 * @param newAuthority - The new authority (null to remove)
 * @param signers - Additional signers if current authority is a multisig
 * @returns The instruction to set authority
 */
export function createSetAuthorityInstruction(
  account: Address,
  authorityType: AuthorityType,
  currentAuthority: Address,
  newAuthority: Address | null,
  signers?: Address[],
): Instruction {
  const data = new Uint8Array(1 + 1 + 1 + 32);
  let offset = 0;

  // Instruction
  data.set(u8.encode(TokenInstruction.SetAuthority), offset);
  offset += 1;

  // Authority type
  data.set(u8.encode(authorityType), offset);
  offset += 1;

  // New authority option
  data.set(u8.encode(newAuthority ? 1 : 0), offset);
  offset += 1;

  // New authority (use current as placeholder if removing)
  data.set(getAddressBytes(newAuthority || currentAuthority), offset);

  const accounts: AccountMeta[] = [
    { pubkey: account, isSigner: false, isWritable: true },
    { pubkey: currentAuthority, isSigner: true, isWritable: false },
  ];

  // Add additional signers if provided
  if (signers) {
    for (const signer of signers) {
      accounts.push({ pubkey: signer, isSigner: true, isWritable: false });
    }
  }

  return createInstruction(TOKEN_PROGRAM_ADDRESS, accounts, data);
}

/**
 * Create a FreezeAccount instruction
 *
 * @param account - The token account to freeze
 * @param mint - The token mint
 * @param authority - The freeze authority
 * @param signers - Additional signers if authority is a multisig
 * @returns The instruction to freeze an account
 */
export function createFreezeAccountInstruction(
  account: Address,
  mint: Address,
  authority: Address,
  signers?: Address[],
): Instruction {
  const data = u8.encode(TokenInstruction.FreezeAccount);

  const accounts: AccountMeta[] = [
    { pubkey: account, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: authority, isSigner: true, isWritable: false },
  ];

  // Add additional signers if provided
  if (signers) {
    for (const signer of signers) {
      accounts.push({ pubkey: signer, isSigner: true, isWritable: false });
    }
  }

  return createInstruction(TOKEN_PROGRAM_ADDRESS, accounts, data);
}

/**
 * Create a ThawAccount instruction
 *
 * @param account - The token account to thaw
 * @param mint - The token mint
 * @param authority - The freeze authority
 * @param signers - Additional signers if authority is a multisig
 * @returns The instruction to thaw an account
 */
export function createThawAccountInstruction(
  account: Address,
  mint: Address,
  authority: Address,
  signers?: Address[],
): Instruction {
  const data = u8.encode(TokenInstruction.ThawAccount);

  const accounts: AccountMeta[] = [
    { pubkey: account, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: authority, isSigner: true, isWritable: false },
  ];

  // Add additional signers if provided
  if (signers) {
    for (const signer of signers) {
      accounts.push({ pubkey: signer, isSigner: true, isWritable: false });
    }
  }

  return createInstruction(TOKEN_PROGRAM_ADDRESS, accounts, data);
}
