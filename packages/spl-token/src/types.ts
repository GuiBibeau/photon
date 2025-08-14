/**
 * SPL Token types and constants
 */

import type { Address } from '@photon/addresses';

/**
 * SPL Token instruction discriminators
 */
export enum TokenInstruction {
  InitializeMint = 0,
  InitializeAccount = 1,
  InitializeMultisig = 2,
  Transfer = 3,
  Approve = 4,
  Revoke = 5,
  SetAuthority = 6,
  MintTo = 7,
  Burn = 8,
  CloseAccount = 9,
  FreezeAccount = 10,
  ThawAccount = 11,
  TransferChecked = 12,
  ApproveChecked = 13,
  MintToChecked = 14,
  BurnChecked = 15,
  InitializeAccount2 = 16,
  SyncNative = 17,
  InitializeAccount3 = 18,
  InitializeMultisig2 = 19,
  InitializeMint2 = 20,
}

/**
 * Authority types for SetAuthority instruction
 */
export enum AuthorityType {
  MintTokens = 0,
  FreezeAccount = 1,
  AccountOwner = 2,
  CloseAccount = 3,
}

/**
 * Token amount represented as a bigint
 */
export type TokenAmount = bigint;

/**
 * Configuration for initializing a mint
 */
export interface InitializeMintConfig {
  /** Number of decimals for the token */
  decimals: number;
  /** Authority that can mint new tokens */
  mintAuthority: Address;
  /** Optional authority that can freeze token accounts */
  freezeAuthority?: Address | null;
}

/**
 * Configuration for a token transfer
 */
export interface TransferConfig {
  /** Amount to transfer */
  amount: TokenAmount;
  /** Source token account */
  source: Address;
  /** Destination token account */
  destination: Address;
  /** Owner of the source account (or delegate) */
  owner: Address;
  /** Additional signers if owner is a multisig */
  signers?: Address[];
}

/**
 * Configuration for minting tokens
 */
export interface MintToConfig {
  /** Amount to mint */
  amount: TokenAmount;
  /** Token mint address */
  mint: Address;
  /** Destination token account */
  destination: Address;
  /** Mint authority */
  authority: Address;
  /** Additional signers if authority is a multisig */
  signers?: Address[];
}

/**
 * Configuration for burning tokens
 */
export interface BurnConfig {
  /** Amount to burn */
  amount: TokenAmount;
  /** Token account to burn from */
  account: Address;
  /** Token mint address */
  mint: Address;
  /** Owner of the token account */
  owner: Address;
  /** Additional signers if owner is a multisig */
  signers?: Address[];
}

/**
 * Configuration for approving a delegate
 */
export interface ApproveConfig {
  /** Amount to approve */
  amount: TokenAmount;
  /** Token account */
  account: Address;
  /** Delegate to approve */
  delegate: Address;
  /** Owner of the token account */
  owner: Address;
  /** Additional signers if owner is a multisig */
  signers?: Address[];
}

/**
 * Configuration for initializing a multisig account
 */
export interface MultisigConfig {
  /** Number of required signatures (M) */
  m: number;
  /** Array of signer public keys (2-11 signers) */
  signers: Address[];
}
