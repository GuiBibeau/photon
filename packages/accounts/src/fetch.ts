/**
 * Account fetching utilities.
 *
 * This module provides high-level functions for fetching and decoding
 * account data from the Solana blockchain.
 */

import type { Address } from '@photon/addresses';
import type { Codec } from '@photon/codecs';
import type { RpcClient } from '@photon/rpc';
import type {
  AccountInfo,
  Account,
  GetAccountOptions,
  GetAccountResult,
  GetMultipleAccountsOptions,
  GetMultipleAccountsResult,
} from './types.js';

/**
 * Fetch and decode a single account.
 *
 * @template TData The type of the decoded account data
 * @param rpc The RPC client to use
 * @param address The address of the account to fetch
 * @param codec The codec to use for decoding the account data
 * @param options Optional fetching options
 * @returns The decoded account or null if it doesn't exist
 *
 * @example
 * ```typescript
 * import { getAccount } from '@photon/accounts';
 * import { createSolanaRpc } from '@photon/rpc';
 * import { struct, u64, publicKey } from '@photon/codecs';
 *
 * const tokenAccountCodec = struct({
 *   mint: publicKey,
 *   owner: publicKey,
 *   amount: u64,
 *   // ...
 * });
 *
 * const rpc = createSolanaRpc('https://api.devnet.solana.com');
 * const account = await getAccount(rpc, address, tokenAccountCodec);
 *
 * if (account) {
 *   console.log('Token balance:', account.info.data.amount);
 * }
 * ```
 */
export async function getAccount<TData>(
  rpc: RpcClient,
  address: Address,
  codec: Codec<TData>,
  options?: GetAccountOptions,
): Promise<GetAccountResult<TData>> {
  // Fetch the account info from RPC
  const config: Record<string, unknown> = { encoding: 'base64' }; // Always fetch as base64 for decoding
  if (options?.commitment) {
    config.commitment = options.commitment;
  }
  if (options?.minContextSlot !== undefined) {
    config.minContextSlot = options.minContextSlot;
  }

  const response = await rpc.getAccountInfo(address, config);

  // Return null if account doesn't exist
  if (!response.value) {
    return null;
  }

  // Decode the account data
  const accountInfo = response.value;

  // Handle base64 encoded data
  let dataBytes: Uint8Array;
  if (typeof accountInfo.data === 'string') {
    // Decode base64 string to Uint8Array
    const binaryString = atob(accountInfo.data);
    dataBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      dataBytes[i] = binaryString.charCodeAt(i);
    }
  } else if (Array.isArray(accountInfo.data)) {
    // Handle array format [data, encoding]
    const [data, encoding] = accountInfo.data;
    if (encoding === 'base64' && typeof data === 'string') {
      const binaryString = atob(data);
      dataBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        dataBytes[i] = binaryString.charCodeAt(i);
      }
    } else {
      throw new Error(`Unsupported account data encoding: ${encoding}`);
    }
  } else {
    throw new Error('Unexpected account data format');
  }

  // Decode using the provided codec
  const [decodedData] = codec.decode(dataBytes, 0);

  // Transform to our AccountInfo structure
  const transformedInfo: AccountInfo<TData> = {
    owner: accountInfo.owner,
    lamports: accountInfo.lamports,
    data: decodedData,
    executable: accountInfo.executable,
    rentEpoch: accountInfo.rentEpoch,
    size: dataBytes.length,
  };

  return {
    address,
    info: transformedInfo,
  };
}

/**
 * Fetch and decode a single account without a codec.
 * Returns the raw bytes of the account data.
 *
 * @param rpc The RPC client to use
 * @param address The address of the account to fetch
 * @param options Optional fetching options
 * @returns The account with raw data or null if it doesn't exist
 *
 * @example
 * ```typescript
 * import { getAccountRaw } from '@photon/accounts';
 * import { createSolanaRpc } from '@photon/rpc';
 *
 * const rpc = createSolanaRpc('https://api.devnet.solana.com');
 * const account = await getAccountRaw(rpc, address);
 *
 * if (account) {
 *   console.log('Account owner:', account.info.owner);
 *   console.log('Account data size:', account.info.data.length);
 * }
 * ```
 */
export async function getAccountRaw(
  rpc: RpcClient,
  address: Address,
  options?: GetAccountOptions,
): Promise<GetAccountResult<Uint8Array>> {
  // Fetch the account info from RPC
  const config: Record<string, unknown> = { encoding: 'base64' };
  if (options?.commitment) {
    config.commitment = options.commitment;
  }
  if (options?.minContextSlot !== undefined) {
    config.minContextSlot = options.minContextSlot;
  }

  const response = await rpc.getAccountInfo(address, config);

  // Return null if account doesn't exist
  if (!response.value) {
    return null;
  }

  const accountInfo = response.value;

  // Handle base64 encoded data
  let dataBytes: Uint8Array;
  if (typeof accountInfo.data === 'string') {
    // Decode base64 string to Uint8Array
    const binaryString = atob(accountInfo.data);
    dataBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      dataBytes[i] = binaryString.charCodeAt(i);
    }
  } else if (Array.isArray(accountInfo.data)) {
    // Handle array format [data, encoding]
    const [data, encoding] = accountInfo.data;
    if (encoding === 'base64' && typeof data === 'string') {
      const binaryString = atob(data);
      dataBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        dataBytes[i] = binaryString.charCodeAt(i);
      }
    } else {
      throw new Error(`Unsupported account data encoding: ${encoding}`);
    }
  } else {
    throw new Error('Unexpected account data format');
  }

  // Transform to our AccountInfo structure
  const transformedInfo: AccountInfo<Uint8Array> = {
    owner: accountInfo.owner,
    lamports: accountInfo.lamports,
    data: dataBytes,
    executable: accountInfo.executable,
    rentEpoch: accountInfo.rentEpoch,
    size: dataBytes.length,
  };

  return {
    address,
    info: transformedInfo,
  };
}

/**
 * Fetch and decode multiple accounts.
 *
 * @template TData The type of the decoded account data
 * @param rpc The RPC client to use
 * @param addresses The addresses of the accounts to fetch
 * @param codec The codec to use for decoding the account data
 * @param options Optional fetching options
 * @returns An array of decoded accounts (null for non-existent accounts)
 *
 * @example
 * ```typescript
 * import { getMultipleAccounts } from '@photon/accounts';
 * import { createSolanaRpc } from '@photon/rpc';
 * import { struct, u64, publicKey } from '@photon/codecs';
 *
 * const tokenAccountCodec = struct({
 *   mint: publicKey,
 *   owner: publicKey,
 *   amount: u64,
 *   // ...
 * });
 *
 * const rpc = createSolanaRpc('https://api.devnet.solana.com');
 * const accounts = await getMultipleAccounts(
 *   rpc,
 *   [address1, address2, address3],
 *   tokenAccountCodec
 * );
 *
 * accounts.forEach((account, index) => {
 *   if (account) {
 *     console.log(`Account ${index} balance:`, account.info.data.amount);
 *   } else {
 *     console.log(`Account ${index} does not exist`);
 *   }
 * });
 * ```
 */
export async function getMultipleAccounts<TData>(
  rpc: RpcClient,
  addresses: Address[],
  codec: Codec<TData>,
  options?: GetMultipleAccountsOptions,
): Promise<GetMultipleAccountsResult<TData>> {
  const batchSize = options?.batchSize ?? 100;
  const results: Array<Account<TData> | null> = [];

  // Process addresses in batches
  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);

    // Fetch batch of accounts
    const config: Record<string, unknown> = { encoding: 'base64' };
    if (options?.commitment) {
      config.commitment = options.commitment;
    }
    if (options?.minContextSlot !== undefined) {
      config.minContextSlot = options.minContextSlot;
    }

    const response = await rpc.getMultipleAccounts(batch, config);

    // Process each account in the batch
    for (let j = 0; j < batch.length; j++) {
      const accountInfo = response.value[j];
      const address = batch[j] as Address; // Safe because we're iterating within batch.length

      if (!accountInfo) {
        results.push(null);
        continue;
      }

      // Handle base64 encoded data
      let dataBytes: Uint8Array;
      if (typeof accountInfo.data === 'string') {
        // Decode base64 string to Uint8Array
        const binaryString = atob(accountInfo.data);
        dataBytes = new Uint8Array(binaryString.length);
        for (let k = 0; k < binaryString.length; k++) {
          dataBytes[k] = binaryString.charCodeAt(k);
        }
      } else if (Array.isArray(accountInfo.data)) {
        // Handle array format [data, encoding]
        const [data, encoding] = accountInfo.data;
        if (encoding === 'base64' && typeof data === 'string') {
          const binaryString = atob(data);
          dataBytes = new Uint8Array(binaryString.length);
          for (let k = 0; k < binaryString.length; k++) {
            dataBytes[k] = binaryString.charCodeAt(k);
          }
        } else {
          throw new Error(`Unsupported account data encoding: ${encoding}`);
        }
      } else {
        throw new Error('Unexpected account data format');
      }

      // Decode using the provided codec
      const [decodedData] = codec.decode(dataBytes, 0);

      // Transform to our AccountInfo structure
      const transformedInfo: AccountInfo<TData> = {
        owner: accountInfo.owner,
        lamports: accountInfo.lamports,
        data: decodedData,
        executable: accountInfo.executable,
        rentEpoch: accountInfo.rentEpoch,
        size: dataBytes.length,
      };

      results.push({
        address,
        info: transformedInfo,
      });
    }
  }

  return results;
}

/**
 * Fetch multiple accounts without a codec.
 * Returns the raw bytes of the account data.
 *
 * @param rpc The RPC client to use
 * @param addresses The addresses of the accounts to fetch
 * @param options Optional fetching options
 * @returns An array of accounts with raw data (null for non-existent accounts)
 *
 * @example
 * ```typescript
 * import { getMultipleAccountsRaw } from '@photon/accounts';
 * import { createSolanaRpc } from '@photon/rpc';
 *
 * const rpc = createSolanaRpc('https://api.devnet.solana.com');
 * const accounts = await getMultipleAccountsRaw(
 *   rpc,
 *   [address1, address2, address3]
 * );
 *
 * accounts.forEach((account, index) => {
 *   if (account) {
 *     console.log(`Account ${index} owner:`, account.info.owner);
 *   } else {
 *     console.log(`Account ${index} does not exist`);
 *   }
 * });
 * ```
 */
export async function getMultipleAccountsRaw(
  rpc: RpcClient,
  addresses: Address[],
  options?: GetMultipleAccountsOptions,
): Promise<GetMultipleAccountsResult<Uint8Array>> {
  const batchSize = options?.batchSize ?? 100;
  const results: Array<Account<Uint8Array> | null> = [];

  // Process addresses in batches
  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);

    // Fetch batch of accounts
    const config: Record<string, unknown> = { encoding: 'base64' };
    if (options?.commitment) {
      config.commitment = options.commitment;
    }
    if (options?.minContextSlot !== undefined) {
      config.minContextSlot = options.minContextSlot;
    }

    const response = await rpc.getMultipleAccounts(batch, config);

    // Process each account in the batch
    for (let j = 0; j < batch.length; j++) {
      const accountInfo = response.value[j];
      const address = batch[j] as Address; // Safe because we're iterating within batch.length

      if (!accountInfo) {
        results.push(null);
        continue;
      }

      // Handle base64 encoded data
      let dataBytes: Uint8Array;
      if (typeof accountInfo.data === 'string') {
        // Decode base64 string to Uint8Array
        const binaryString = atob(accountInfo.data);
        dataBytes = new Uint8Array(binaryString.length);
        for (let k = 0; k < binaryString.length; k++) {
          dataBytes[k] = binaryString.charCodeAt(k);
        }
      } else if (Array.isArray(accountInfo.data)) {
        // Handle array format [data, encoding]
        const [data, encoding] = accountInfo.data;
        if (encoding === 'base64' && typeof data === 'string') {
          const binaryString = atob(data);
          dataBytes = new Uint8Array(binaryString.length);
          for (let k = 0; k < binaryString.length; k++) {
            dataBytes[k] = binaryString.charCodeAt(k);
          }
        } else {
          throw new Error(`Unsupported account data encoding: ${encoding}`);
        }
      } else {
        throw new Error('Unexpected account data format');
      }

      // Transform to our AccountInfo structure
      const transformedInfo: AccountInfo<Uint8Array> = {
        owner: accountInfo.owner,
        lamports: accountInfo.lamports,
        data: dataBytes,
        executable: accountInfo.executable,
        rentEpoch: accountInfo.rentEpoch,
        size: dataBytes.length,
      };

      results.push({
        address,
        info: transformedInfo,
      });
    }
  }

  return results;
}
