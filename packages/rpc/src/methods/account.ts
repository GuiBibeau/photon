/**
 * Account-related RPC method implementations.
 *
 * This module provides implementations for account fetching and querying
 * with proper response parsing and type transformations.
 */

import type { Address } from '@photon/addresses';
import type {
  AccountInfo,
  Commitment,
  Encoding,
  RpcResponse,
  GetProgramAccountsConfig,
  ProgramAccount,
} from '../types.js';
import type { Transport } from '../transport.js';
import {
  parseBigInt,
  parseAccountInfo,
  parseMultipleAccounts,
  parseRpcResponse,
  parseAddress,
} from '../parsers/index.js';

/**
 * Get account information.
 */
export async function getAccountInfo(
  transport: Transport,
  address: Address,
  config?: {
    commitment?: Commitment;
    encoding?: Encoding;
    minContextSlot?: number;
  },
): Promise<RpcResponse<AccountInfo | null>> {
  const response = await transport({
    jsonrpc: '2.0',
    id: 1,
    method: 'getAccountInfo',
    params: config ? [address, config] : [address],
  });

  if ('error' in response) {
    throw new Error(`RPC error: ${response.error.message}`);
  }

  return parseRpcResponse(response.result, (value) => parseAccountInfo(value, config?.encoding));
}

/**
 * Get multiple accounts information.
 */
export async function getMultipleAccounts(
  transport: Transport,
  addresses: Address[],
  config?: {
    commitment?: Commitment;
    encoding?: Encoding;
    minContextSlot?: number;
  },
): Promise<RpcResponse<Array<AccountInfo | null>>> {
  const response = await transport({
    jsonrpc: '2.0',
    id: 1,
    method: 'getMultipleAccounts',
    params: config ? [addresses, config] : [addresses],
  });

  if ('error' in response) {
    throw new Error(`RPC error: ${response.error.message}`);
  }

  return parseRpcResponse(response.result, (value) =>
    parseMultipleAccounts(value, config?.encoding),
  );
}

/**
 * Get account balance.
 */
export async function getBalance(
  transport: Transport,
  address: Address,
  config?: {
    commitment?: Commitment;
    minContextSlot?: number;
  },
): Promise<RpcResponse<bigint>> {
  const response = await transport({
    jsonrpc: '2.0',
    id: 1,
    method: 'getBalance',
    params: config ? [address, config] : [address],
  });

  if ('error' in response) {
    throw new Error(`RPC error: ${response.error.message}`);
  }

  return parseRpcResponse(response.result, parseBigInt);
}

/**
 * Get program accounts.
 */
export async function getProgramAccounts(
  transport: Transport,
  programId: Address,
  config?: GetProgramAccountsConfig,
): Promise<ProgramAccount[]> {
  const response = await transport({
    jsonrpc: '2.0',
    id: 1,
    method: 'getProgramAccounts',
    params: config ? [programId, config] : [programId],
  });

  if ('error' in response) {
    throw new Error(`RPC error: ${response.error.message}`);
  }

  // Parse the response array
  const results = response.result as unknown[];
  if (!Array.isArray(results)) {
    throw new Error('Invalid getProgramAccounts response format');
  }

  return results.map((item: unknown) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error('Invalid program account item format');
    }

    const accountItem = item as Record<string, unknown>;

    return {
      pubkey: parseAddress(accountItem.pubkey),
      account: parseAccountInfo(accountItem.account, config?.encoding) as AccountInfo,
    };
  });
}
