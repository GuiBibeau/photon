/**
 * Common Solana account type definitions and decoders.
 *
 * Provides codecs and type definitions for frequently used
 * account types in the Solana ecosystem.
 */

import type { Address } from '@photon/addresses';
import type { Codec } from '@photon/codecs';
import { struct, u8, u64, publicKey, nullable, fixedBytes } from '@photon/codecs';

/**
 * System account data structure.
 * System accounts typically have empty data.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SystemAccount {
  // System accounts have no data
}

/**
 * Token account data structure (SPL Token).
 * Based on the SPL Token program's Account struct.
 */
export interface TokenAccount {
  /**
   * The mint associated with this account.
   */
  mint: Address;

  /**
   * The owner of this account.
   */
  owner: Address;

  /**
   * The amount of tokens this account holds.
   */
  amount: bigint;

  /**
   * If set, an authority that can transfer tokens from this account.
   */
  delegate: Address | null;

  /**
   * The account's state.
   */
  state: number;

  /**
   * If set, this account is a native token account (wrapped SOL).
   */
  isNative: bigint | null;

  /**
   * The amount delegated.
   */
  delegatedAmount: bigint;

  /**
   * Optional authority to close the account.
   */
  closeAuthority: Address | null;
}

/**
 * Token mint data structure (SPL Token).
 * Based on the SPL Token program's Mint struct.
 */
export interface TokenMint {
  /**
   * Optional authority used to mint new tokens.
   */
  mintAuthority: Address | null;

  /**
   * Total supply of tokens.
   */
  supply: bigint;

  /**
   * Number of base 10 digits to the right of the decimal place.
   */
  decimals: number;

  /**
   * Is this mint initialized.
   */
  isInitialized: number;

  /**
   * Optional authority to freeze token accounts.
   */
  freezeAuthority: Address | null;
}

/**
 * Multisig account data structure (SPL Token).
 */
export interface MultisigAccount {
  /**
   * Number of signers required.
   */
  m: number;

  /**
   * Total number of signers.
   */
  n: number;

  /**
   * Is this multisig initialized.
   */
  isInitialized: number;

  /**
   * Signer public keys (raw bytes for 11 signers).
   */
  signers: Uint8Array;
}

/**
 * Codec for decoding system accounts.
 * System accounts have no data, so this just returns an empty object.
 */
export const systemAccountCodec: Codec<SystemAccount> = {
  encode: () => new Uint8Array(0),
  decode: (_data: Uint8Array, offset = 0) => [{}, offset],
  size: 0,
};

/**
 * Codec for decoding SPL Token accounts.
 * Size: 165 bytes
 */
export const tokenAccountCodec: Codec<TokenAccount> = struct({
  mint: publicKey,
  owner: publicKey,
  amount: u64,
  delegate: nullable(publicKey),
  state: u8,
  isNative: nullable(u64),
  delegatedAmount: u64,
  closeAuthority: nullable(publicKey),
}) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Codec for decoding SPL Token mint accounts.
 * Size: 82 bytes
 */
export const tokenMintCodec: Codec<TokenMint> = struct({
  mintAuthority: nullable(publicKey),
  supply: u64,
  decimals: u8,
  isInitialized: u8,
  freezeAuthority: nullable(publicKey),
}) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Codec for decoding SPL Token multisig accounts.
 * Size: 355 bytes (3 + 1 + 1 + 32 * 11)
 */
export const multisigAccountCodec: Codec<MultisigAccount> = struct({
  m: u8,
  n: u8,
  isInitialized: u8,
  signers: fixedBytes(32 * 11), // Max 11 signers, stored as raw bytes
}) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Account type discriminator for identifying account types.
 */
export enum AccountType {
  System = 'system',
  TokenAccount = 'token-account',
  TokenMint = 'token-mint',
  Multisig = 'multisig',
  Unknown = 'unknown',
}

/**
 * Detect the type of account based on its owner and data size.
 *
 * @param owner - The owner program of the account
 * @param dataSize - The size of the account data in bytes
 * @returns The detected account type
 */
export function detectAccountType(owner: Address, dataSize: number): AccountType {
  // System Program accounts
  if (owner === '11111111111111111111111111111111') {
    return AccountType.System;
  }

  // SPL Token Program accounts
  if (owner === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
    if (dataSize === 165) {
      return AccountType.TokenAccount;
    }
    if (dataSize === 82) {
      return AccountType.TokenMint;
    }
    if (dataSize === 355) {
      return AccountType.Multisig;
    }
  }

  return AccountType.Unknown;
}

/**
 * Get the appropriate codec for an account type.
 *
 * @param accountType - The type of account
 * @returns The codec for that account type, or undefined if unknown
 */
export function getCodecForAccountType(accountType: AccountType): Codec<unknown> | undefined {
  switch (accountType) {
    case AccountType.System:
      return systemAccountCodec as Codec<unknown>;
    case AccountType.TokenAccount:
      return tokenAccountCodec as Codec<unknown>;
    case AccountType.TokenMint:
      return tokenMintCodec as Codec<unknown>;
    case AccountType.Multisig:
      return multisigAccountCodec as Codec<unknown>;
    default:
      return undefined;
  }
}

/**
 * Try to automatically decode account data based on its type.
 *
 * @param owner - The owner program of the account
 * @param data - The account data to decode
 * @returns The decoded data and account type, or undefined if unknown
 */
export function autoDecodeAccount(
  owner: Address,
  data: Uint8Array,
): { type: AccountType; decoded: unknown } | undefined {
  const accountType = detectAccountType(owner, data.length);
  const codec = getCodecForAccountType(accountType);

  if (!codec) {
    return undefined;
  }

  try {
    const [decoded] = codec.decode(data, 0);
    return { type: accountType, decoded };
  } catch {
    return undefined;
  }
}

/**
 * Validate that account data can be decoded as a specific type.
 *
 * @param data - The account data to validate
 * @param accountType - The expected account type
 * @returns True if the data can be decoded as the specified type
 */
export function isValidAccountData(data: Uint8Array, accountType: AccountType): boolean {
  // First check size constraints for known fixed-size account types
  switch (accountType) {
    case AccountType.TokenAccount:
      if (data.length !== 165) {
        return false;
      }
      break;
    case AccountType.TokenMint:
      if (data.length !== 82) {
        return false;
      }
      break;
    case AccountType.Multisig:
      if (data.length !== 355) {
        return false;
      }
      break;
    case AccountType.System:
      // System accounts can have any size (usually 0)
      break;
    case AccountType.Unknown:
      return false;
  }

  const codec = getCodecForAccountType(accountType);
  if (!codec) {
    return false;
  }

  try {
    codec.decode(data, 0);
    return true;
  } catch {
    return false;
  }
}
