/**
 * Block-related RPC method implementations.
 *
 * This module provides implementations for block fetching and querying
 * with proper response parsing and type transformations.
 */

import type {
  BlockhashInfo,
  BlockInfo,
  Commitment,
  RpcResponse,
  GetBlockConfig,
} from '../types.js';
import type { Transport } from '../transport.js';
import {
  parseBlockhashInfo,
  parseBlockInfo,
  parseRpcResponse,
  parseNumeric,
} from '../parsers/index.js';

/**
 * Get the latest blockhash.
 */
export async function getLatestBlockhash(
  transport: Transport,
  config?: {
    commitment?: Commitment;
    minContextSlot?: number;
  },
): Promise<RpcResponse<BlockhashInfo>> {
  const response = await transport({
    jsonrpc: '2.0',
    id: 1,
    method: 'getLatestBlockhash',
    params: config ? [config] : [],
  });

  if ('error' in response) {
    throw new Error(`RPC error: ${response.error.message}`);
  }

  return parseRpcResponse(response.result, parseBlockhashInfo);
}

/**
 * Get block information.
 */
export async function getBlock(
  transport: Transport,
  slot: number | bigint,
  config?: GetBlockConfig,
): Promise<BlockInfo | null> {
  const response = await transport({
    jsonrpc: '2.0',
    id: 1,
    method: 'getBlock',
    params: config ? [Number(slot), config] : [Number(slot)],
  });

  if ('error' in response) {
    throw new Error(`RPC error: ${response.error.message}`);
  }

  return parseBlockInfo(response.result);
}

/**
 * Get the current block height.
 */
export async function getBlockHeight(
  transport: Transport,
  config?: {
    commitment?: Commitment;
    minContextSlot?: number;
  },
): Promise<number> {
  const response = await transport({
    jsonrpc: '2.0',
    id: 1,
    method: 'getBlockHeight',
    params: config ? [config] : [],
  });

  if ('error' in response) {
    throw new Error(`RPC error: ${response.error.message}`);
  }

  const height = parseNumeric(response.result);
  return typeof height === 'number' ? height : Number(height);
}
