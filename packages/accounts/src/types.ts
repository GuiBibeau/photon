/**
 * Account-related type definitions.
 *
 * This module provides type definitions for account structures
 * and related utilities.
 */

import type { Address } from '@photon/addresses';

/**
 * Account information structure with typed data.
 *
 * @template TData The type of the decoded account data
 */
export interface AccountInfo<TData = Uint8Array> {
  /**
   * The owner program of this account.
   */
  owner: Address;

  /**
   * The balance of this account in lamports.
   */
  lamports: bigint;

  /**
   * The decoded data of this account.
   */
  data: TData;

  /**
   * Whether this account is executable (a program).
   */
  executable: boolean;

  /**
   * The epoch at which this account will next owe rent.
   */
  rentEpoch: bigint;

  /**
   * The size of the account data in bytes.
   */
  size: number;
}

/**
 * A decoded account with its address.
 *
 * @template TData The type of the decoded account data
 */
export interface Account<TData = Uint8Array> {
  /**
   * The address of this account.
   */
  address: Address;

  /**
   * The account information.
   */
  info: AccountInfo<TData>;
}

/**
 * Options for fetching accounts.
 */
export interface GetAccountOptions {
  /**
   * The commitment level to use.
   */
  commitment?: 'processed' | 'confirmed' | 'finalized';

  /**
   * The minimum slot that the request can be evaluated at.
   */
  minContextSlot?: number;
}

/**
 * Options for fetching multiple accounts.
 */
export interface GetMultipleAccountsOptions extends GetAccountOptions {
  /**
   * Maximum number of accounts to fetch in a single RPC call.
   * Defaults to 100.
   */
  batchSize?: number;
}

/**
 * Result of fetching an account.
 *
 * @template TData The type of the decoded account data
 */
export type GetAccountResult<TData = Uint8Array> = Account<TData> | null;

/**
 * Result of fetching multiple accounts.
 *
 * @template TData The type of the decoded account data
 */
export type GetMultipleAccountsResult<TData = Uint8Array> = Array<Account<TData> | null>;
