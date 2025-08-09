/**
 * Account utilities for Photon SDK.
 *
 * This package provides high-level utilities for fetching and decoding
 * account data from the Solana blockchain.
 *
 * @module @photon/accounts
 */

// Export types
export type {
  AccountInfo,
  Account,
  GetAccountOptions,
  GetMultipleAccountsOptions,
  GetAccountResult,
  GetMultipleAccountsResult,
} from './types.js';

// Export fetching functions
export { getAccount, getAccountRaw, getMultipleAccounts, getMultipleAccountsRaw } from './fetch.js';

// Export decoding utilities
export {
  decodeAccountData,
  tryDecodeAccountData,
  partialDecodeAccountData,
  transformAccountInfo,
  validateAccountDataSize,
  validateMinAccountDataSize,
  type DecodingStrategy,
  type DecodeAccountDataOptions,
  type LazyDecodedAccount,
} from './decode.js';

// Export common account types and decoders
export {
  // Types
  type SystemAccount,
  type TokenAccount,
  type TokenMint,
  type MultisigAccount,
  AccountType,

  // Codecs
  systemAccountCodec,
  tokenAccountCodec,
  tokenMintCodec,
  multisigAccountCodec,

  // Utilities
  detectAccountType,
  getCodecForAccountType,
  autoDecodeAccount,
  isValidAccountData,
} from './common-accounts.js';
