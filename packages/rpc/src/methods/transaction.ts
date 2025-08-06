/**
 * Transaction-related RPC method implementations.
 *
 * This module provides implementations for transaction submission,
 * simulation, and status checking with proper response parsing.
 */

import type {
  TransactionSignature,
  SendTransactionConfig,
  SimulateTransactionConfig,
  SimulateTransactionResponse,
  SignatureStatus,
  RpcResponse,
  TransactionWithMeta,
  GetTransactionConfig,
} from '../types.js';
import type { Transport } from '../transport.js';
import {
  parseSignature,
  parseSignatureStatuses,
  parseTransaction,
  parseRpcResponse,
  parseBigInt,
} from '../parsers/index.js';

/**
 * Send a transaction to the network.
 */
export async function sendTransaction(
  transport: Transport,
  transaction: string,
  config?: SendTransactionConfig,
): Promise<TransactionSignature> {
  const response = await transport({
    jsonrpc: '2.0',
    id: 1,
    method: 'sendTransaction',
    params: config ? [transaction, config] : [transaction],
  });

  if ('error' in response) {
    throw new Error(`RPC error: ${response.error.message}`);
  }

  return parseSignature(response.result);
}

/**
 * Simulate a transaction without submitting it.
 */
export async function simulateTransaction(
  transport: Transport,
  transaction: string,
  config?: SimulateTransactionConfig,
): Promise<RpcResponse<SimulateTransactionResponse>> {
  const response = await transport({
    jsonrpc: '2.0',
    id: 1,
    method: 'simulateTransaction',
    params: config ? [transaction, config] : [transaction],
  });

  if ('error' in response) {
    throw new Error(`RPC error: ${response.error.message}`);
  }

  return parseRpcResponse(response.result, (value) => {
    if (typeof value !== 'object' || value === null) {
      throw new Error('Invalid simulate transaction response');
    }

    const sim = value as Record<string, unknown>;

    return {
      err: sim.err ?? null,
      logs: Array.isArray(sim.logs) ? (sim.logs as string[]) : null,
      accounts: sim.accounts ? sim.accounts : null,
      unitsConsumed: sim.unitsConsumed !== undefined ? parseBigInt(sim.unitsConsumed) : undefined,
      returnData: sim.returnData ? sim.returnData : null,
    } as SimulateTransactionResponse;
  });
}

/**
 * Get transaction details.
 */
export async function getTransaction(
  transport: Transport,
  signature: TransactionSignature,
  config?: GetTransactionConfig,
): Promise<TransactionWithMeta | null> {
  const response = await transport({
    jsonrpc: '2.0',
    id: 1,
    method: 'getTransaction',
    params: config ? [signature, config] : [signature],
  });

  if ('error' in response) {
    throw new Error(`RPC error: ${response.error.message}`);
  }

  return parseTransaction(response.result);
}

/**
 * Get signature statuses.
 */
export async function getSignatureStatuses(
  transport: Transport,
  signatures: TransactionSignature[],
  config?: { searchTransactionHistory?: boolean },
): Promise<RpcResponse<Array<SignatureStatus | null>>> {
  const response = await transport({
    jsonrpc: '2.0',
    id: 1,
    method: 'getSignatureStatuses',
    params: config ? [signatures, config] : [signatures],
  });

  if ('error' in response) {
    throw new Error(`RPC error: ${response.error.message}`);
  }

  return parseRpcResponse(response.result, parseSignatureStatuses);
}
