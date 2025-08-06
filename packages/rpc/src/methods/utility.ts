/**
 * Utility RPC method implementations.
 *
 * This module provides implementations for utility RPC methods
 * with proper response parsing and type transformations.
 */

import type { Commitment, Version } from '../types.js';
import type { Transport } from '../transport.js';
import { parseBigInt, parseNumeric, parseVersion } from '../parsers/index.js';

/**
 * Get minimum balance for rent exemption.
 */
export async function getMinimumBalanceForRentExemption(
  transport: Transport,
  dataLength: number | bigint,
  config?: { commitment?: Commitment },
): Promise<bigint> {
  const response = await transport({
    jsonrpc: '2.0',
    id: 1,
    method: 'getMinimumBalanceForRentExemption',
    params: config ? [Number(dataLength), config] : [Number(dataLength)],
  });

  if ('error' in response) {
    throw new Error(`RPC error: ${response.error.message}`);
  }

  return parseBigInt(response.result);
}

/**
 * Get the current slot.
 */
export async function getSlot(
  transport: Transport,
  config?: {
    commitment?: Commitment;
    minContextSlot?: number;
  },
): Promise<number> {
  const response = await transport({
    jsonrpc: '2.0',
    id: 1,
    method: 'getSlot',
    params: config ? [config] : [],
  });

  if ('error' in response) {
    throw new Error(`RPC error: ${response.error.message}`);
  }

  const slot = parseNumeric(response.result);
  return typeof slot === 'number' ? slot : Number(slot);
}

/**
 * Get version information.
 */
export async function getVersion(transport: Transport): Promise<Version> {
  const response = await transport({
    jsonrpc: '2.0',
    id: 1,
    method: 'getVersion',
    params: [],
  });

  if ('error' in response) {
    throw new Error(`RPC error: ${response.error.message}`);
  }

  return parseVersion(response.result);
}
