/**
 * Account data decoding utilities.
 *
 * Provides flexible strategies for decoding account data including:
 * - Codec-based decoding with type safety
 * - JSON parsed data from RPC
 * - Raw buffer access
 * - Lazy decoding with caching
 */

import type { Codec } from '@photon/codecs';
import type { AccountInfo } from './types.js';

/**
 * Decoding strategy for account data.
 */
export type DecodingStrategy<TData> =
  | { type: 'codec'; codec: Codec<TData> }
  | { type: 'json-parsed' }
  | { type: 'raw' }
  | { type: 'lazy'; codec: Codec<TData> };

/**
 * Options for decoding account data.
 */
export interface DecodeAccountDataOptions<TData> {
  /**
   * The decoding strategy to use.
   */
  strategy: DecodingStrategy<TData>;

  /**
   * Whether to cache decoded results for lazy decoding.
   * @default true
   */
  cache?: boolean;
}

/**
 * Result of lazy decoding with cached data.
 */
export interface LazyDecodedAccount<TData> {
  /**
   * The raw bytes of the account data.
   */
  raw: Uint8Array;

  /**
   * Get the decoded data. Decodes on first access and caches the result.
   */
  get(): TData;

  /**
   * Force re-decoding of the data, updating the cache.
   */
  refresh(): TData;
}

/**
 * Decode account data using the specified strategy.
 *
 * @param data - The raw account data bytes
 * @param options - Decoding options including strategy
 * @returns The decoded data according to the strategy
 *
 * @example
 * ```typescript
 * // Codec-based decoding
 * const decoded = decodeAccountData(data, {
 *   strategy: { type: 'codec', codec: tokenAccountCodec }
 * });
 *
 * // Raw bytes access
 * const raw = decodeAccountData(data, {
 *   strategy: { type: 'raw' }
 * });
 * ```
 */
export function decodeAccountData<TData>(
  data: Uint8Array,
  options: DecodeAccountDataOptions<TData>,
): TData | Uint8Array | LazyDecodedAccount<TData> {
  const { strategy, cache = true } = options;

  switch (strategy.type) {
    case 'codec': {
      // Direct codec decoding
      const [decoded] = strategy.codec.decode(data, 0);
      return decoded;
    }

    case 'raw': {
      // Return raw bytes as-is
      return data as TData & Uint8Array;
    }

    case 'lazy': {
      // Lazy decoding with caching
      return createLazyDecoder(data, strategy.codec, cache) as TData & LazyDecodedAccount<TData>;
    }

    case 'json-parsed': {
      // This would typically come from RPC with jsonParsed encoding
      // For now, throw an error as this needs RPC integration
      throw new Error('JSON parsed decoding requires RPC jsonParsed encoding');
    }

    default:
      throw new Error(`Unknown decoding strategy: ${(strategy as { type: string }).type}`);
  }
}

/**
 * Create a lazy decoder for account data.
 */
function createLazyDecoder<TData>(
  data: Uint8Array,
  codec: Codec<TData>,
  enableCache: boolean,
): LazyDecodedAccount<TData> {
  let cached: TData | undefined;

  return {
    raw: data,

    get(): TData {
      if (enableCache && cached !== undefined) {
        return cached;
      }

      const [decoded] = codec.decode(data, 0);
      if (enableCache) {
        cached = decoded;
      }
      return decoded;
    },

    refresh(): TData {
      const [decoded] = codec.decode(data, 0);
      if (enableCache) {
        cached = decoded;
      }
      return decoded;
    },
  };
}

/**
 * Decode account data with error handling.
 *
 * @param data - The raw account data
 * @param codec - The codec to use for decoding
 * @returns The decoded data or an error
 */
export function tryDecodeAccountData<TData>(
  data: Uint8Array,
  codec: Codec<TData>,
): { success: true; data: TData } | { success: false; error: Error } {
  try {
    const [decoded] = codec.decode(data, 0);
    return { success: true, data: decoded };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Decode account data with partial decoding support.
 *
 * This is useful when you only need to decode part of the account data
 * or when the account data might be truncated.
 *
 * @param data - The raw account data
 * @param codec - The codec to use for decoding
 * @param offset - The offset to start decoding from
 * @returns The decoded data and the number of bytes consumed
 */
export function partialDecodeAccountData<TData>(
  data: Uint8Array,
  codec: Codec<TData>,
  offset = 0,
): [TData, number] {
  return codec.decode(data, offset) as [TData, number];
}

/**
 * Transform account info with a new data type using a decoder function.
 *
 * @param accountInfo - The account info with raw data
 * @param decoder - Function to decode the data
 * @returns Account info with decoded data
 */
export function transformAccountInfo<TInput, TOutput>(
  accountInfo: AccountInfo<TInput>,
  decoder: (data: TInput) => TOutput,
): AccountInfo<TOutput> {
  return {
    ...accountInfo,
    data: decoder(accountInfo.data),
  };
}

/**
 * Check if account data matches an expected size.
 * Useful for validating account data before decoding.
 *
 * @param data - The account data to check
 * @param expectedSize - The expected size in bytes
 * @returns True if the data matches the expected size
 */
export function validateAccountDataSize(data: Uint8Array, expectedSize: number): boolean {
  return data.length === expectedSize;
}

/**
 * Check if account data size is at least the minimum required.
 *
 * @param data - The account data to check
 * @param minSize - The minimum required size in bytes
 * @returns True if the data is at least the minimum size
 */
export function validateMinAccountDataSize(data: Uint8Array, minSize: number): boolean {
  return data.length >= minSize;
}
