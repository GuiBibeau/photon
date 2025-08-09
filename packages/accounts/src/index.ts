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
