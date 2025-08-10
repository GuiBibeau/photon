import { address, type Address } from '@photon/addresses';

/**
 * Branded type for mint addresses to distinguish from regular addresses
 */
export type MintAddress = Address & { readonly __mint: unique symbol };

/**
 * Branded type for token account addresses to distinguish from regular addresses
 */
export type TokenAccountAddress = Address & { readonly __tokenAccount: unique symbol };

/**
 * SPL Token Program ID
 * This is the main token program used for creating and managing SPL tokens
 */
export const TOKEN_PROGRAM_ID = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

/**
 * SPL Token-2022 Program ID
 * This is the new token program with extended functionality
 * Also known as Token Extensions Program
 */
export const TOKEN_2022_PROGRAM_ID = address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

/**
 * Associated Token Account Program ID
 * Used for deriving deterministic token account addresses for wallets
 */
export const ASSOCIATED_TOKEN_PROGRAM_ID = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

/**
 * Token Metadata Program ID
 * Used for adding metadata (name, symbol, image) to tokens
 */
export const TOKEN_METADATA_PROGRAM_ID = address('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

/**
 * Native SOL Mint Address
 * This is the mint address used for wrapped SOL tokens
 */
export const NATIVE_MINT = address('So11111111111111111111111111111111111111112') as MintAddress;

/**
 * Common decimal configurations for tokens
 */
export const TOKEN_DECIMALS = {
  /**
   * Common for tokens that need high precision (like stablecoins)
   */
  USDC: 6,

  /**
   * Standard SOL decimals, also common for many tokens
   */
  SOL: 9,

  /**
   * No decimals, useful for NFTs or indivisible tokens
   */
  NFT: 0,
} as const;

/**
 * Standard sizes for SPL Token accounts
 */
export const ACCOUNT_SIZE = {
  /**
   * Size of a mint account in bytes
   */
  MINT: 82,

  /**
   * Size of a token account in bytes
   */
  TOKEN: 165,

  /**
   * Size of a multisig account in bytes
   */
  MULTISIG: 355,
} as const;

/**
 * Check if an address is the SPL Token Program
 */
export function isTokenProgramId(address: Address): boolean {
  return address === TOKEN_PROGRAM_ID;
}

/**
 * Check if an address is the SPL Token-2022 Program
 */
export function isToken2022ProgramId(address: Address): boolean {
  return address === TOKEN_2022_PROGRAM_ID;
}

/**
 * Check if an address is either token program
 */
export function isTokenProgram(address: Address): boolean {
  return isTokenProgramId(address) || isToken2022ProgramId(address);
}

/**
 * Check if an address is the Associated Token Program
 */
export function isAssociatedTokenProgramId(address: Address): boolean {
  return address === ASSOCIATED_TOKEN_PROGRAM_ID;
}

/**
 * Check if an address is the Token Metadata Program
 */
export function isTokenMetadataProgramId(address: Address): boolean {
  return address === TOKEN_METADATA_PROGRAM_ID;
}

/**
 * Check if an address is the native SOL mint
 */
export function isNativeMint(address: Address): boolean {
  return address === NATIVE_MINT;
}

/**
 * Cast an Address to a MintAddress (should only be used after validation)
 */
export function asMintAddress(address: Address): MintAddress {
  return address as MintAddress;
}

/**
 * Cast an Address to a TokenAccountAddress (should only be used after validation)
 */
export function asTokenAccountAddress(address: Address): TokenAccountAddress {
  return address as TokenAccountAddress;
}
