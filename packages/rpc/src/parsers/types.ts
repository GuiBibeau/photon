/**
 * Type transformation utilities for RPC responses.
 *
 * Converts raw RPC response data into strongly-typed SDK formats.
 */

import type { Address } from '@photon/addresses';
import type {
  AccountInfo,
  BlockhashInfo,
  Commitment,
  RpcResponse,
  TransactionSignature,
  SignatureStatus,
  BlockInfo,
  TransactionWithMeta,
  Version,
  Encoding,
  ParsedAccountData,
  TransactionError,
} from '../types.js';
import { parseBigInt, parseBigIntOrNull, parseNumeric } from './bigint.js';
import { parseAccountData } from './base64.js';

/**
 * Parse an address string to SDK Address type.
 * Note: Actual validation would be done by the addresses package.
 */
export function parseAddress(value: unknown): Address {
  if (typeof value !== 'string') {
    throw new Error(`Expected string address, got ${typeof value}`);
  }
  // Cast to Address type - actual validation would be in addresses package
  return value as Address;
}

/**
 * Parse an optional address.
 */
export function parseAddressOrNull(value: unknown): Address | null {
  if (value === null || value === undefined) {
    return null;
  }
  return parseAddress(value);
}

/**
 * Parse an array of addresses.
 */
export function parseAddressArray(value: unknown): Address[] {
  if (!Array.isArray(value)) {
    throw new Error('Expected array of addresses');
  }
  return value.map(parseAddress);
}

/**
 * Parse a transaction signature.
 */
export function parseSignature(value: unknown): TransactionSignature {
  if (typeof value !== 'string') {
    throw new Error(`Expected string signature, got ${typeof value}`);
  }
  return value as TransactionSignature;
}

/**
 * Parse an array of signatures.
 */
export function parseSignatureArray(value: unknown): TransactionSignature[] {
  if (!Array.isArray(value)) {
    throw new Error('Expected array of signatures');
  }
  return value.map(parseSignature);
}

/**
 * Parse RPC response wrapper.
 */
export function parseRpcResponse<T>(value: unknown, parseValue: (v: unknown) => T): RpcResponse<T> {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid RPC response format');
  }

  const response = value as Record<string, unknown>;
  const context = response.context as Record<string, unknown>;

  const result: RpcResponse<T> = {
    context: {
      slot: parseNumeric(context.slot) as number,
    },
    value: parseValue(response.value),
  };

  if (context.apiVersion !== undefined) {
    result.context.apiVersion = context.apiVersion as string;
  }

  return result;
}

/**
 * Parse account info from RPC response.
 */
export function parseAccountInfo(value: unknown, encoding?: Encoding): AccountInfo | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'object') {
    throw new Error('Invalid account info format');
  }

  const info = value as Record<string, unknown>;

  const account: AccountInfo = {
    executable: info.executable as boolean,
    owner: parseAddress(info.owner),
    lamports: parseBigInt(info.lamports),
    data: parseAccountData(info.data, encoding) as string | Uint8Array | ParsedAccountData,
    rentEpoch: parseBigInt(info.rentEpoch ?? 0n),
  };

  return account;
}

/**
 * Parse multiple account infos.
 */
export function parseMultipleAccounts(
  value: unknown,
  encoding?: Encoding,
): Array<AccountInfo | null> {
  if (!Array.isArray(value)) {
    throw new Error('Expected array of accounts');
  }
  return value.map((v) => parseAccountInfo(v, encoding));
}

/**
 * Parse blockhash info from RPC response.
 */
export function parseBlockhashInfo(value: unknown): BlockhashInfo {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid blockhash info format');
  }

  const info = value as Record<string, unknown>;

  return {
    blockhash: info.blockhash as string,
    lastValidBlockHeight: parseBigInt(info.lastValidBlockHeight),
  };
}

/**
 * Parse signature status from RPC response.
 */
export function parseSignatureStatus(value: unknown): SignatureStatus | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'object') {
    throw new Error('Invalid signature status format');
  }

  const status = value as Record<string, unknown>;

  const result: SignatureStatus = {
    slot: parseNumeric(status.slot) as number,
    confirmations: status.confirmations !== null ? (status.confirmations as number) : null,
    err: (status.err as TransactionError) ?? null,
  };

  if (status.confirmationStatus !== undefined) {
    result.confirmationStatus = status.confirmationStatus as Commitment;
  }

  return result;
}

/**
 * Parse multiple signature statuses.
 */
export function parseSignatureStatuses(value: unknown): Array<SignatureStatus | null> {
  if (!Array.isArray(value)) {
    throw new Error('Expected array of signature statuses');
  }
  return value.map(parseSignatureStatus);
}

/**
 * Parse block info from RPC response.
 */
export function parseBlockInfo(value: unknown): BlockInfo | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'object') {
    throw new Error('Invalid block info format');
  }

  const block = value as Record<string, unknown>;

  const result: BlockInfo = {
    blockhash: block.blockhash as string,
    previousBlockhash: block.previousBlockhash as string,
    parentSlot: parseNumeric(block.parentSlot) as number,
    blockHeight:
      block.blockHeight !== undefined ? Number(parseBigIntOrNull(block.blockHeight) ?? 0) : null,
    blockTime: block.blockTime !== undefined ? (block.blockTime as number | null) : null,
    transactions: Array.isArray(block.transactions) ? block.transactions : [],
  };

  if (Array.isArray(block.rewards)) {
    result.rewards = block.rewards;
  }

  return result;
}

/**
 * Parse transaction from RPC response.
 */
export function parseTransaction(value: unknown): TransactionWithMeta | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'object') {
    throw new Error('Invalid transaction format');
  }

  // This is a simplified version - full implementation would parse all fields
  return value as TransactionWithMeta;
}

/**
 * Parse version info from RPC response.
 */
export function parseVersion(value: unknown): Version {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid version format');
  }

  const version = value as Record<string, unknown>;

  const result: Version = {
    'solana-core': version['solana-core'] as string,
  };

  if (version['feature-set'] !== undefined) {
    result['feature-set'] = version['feature-set'] as number;
  }

  return result;
}

/**
 * Parse commitment level from string.
 */
export function parseCommitment(value: unknown): Commitment | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error('Invalid commitment format');
  }

  const validCommitments: Commitment[] = ['processed', 'confirmed', 'finalized'];
  if (!validCommitments.includes(value as Commitment)) {
    throw new Error(`Invalid commitment level: ${value}`);
  }

  return value as Commitment;
}

/**
 * Check if a value is an RPC error response.
 */
export function isRpcError(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as Record<string, unknown>).error === 'object'
  );
}

/**
 * Extract error message from RPC error.
 */
export function extractRpcError(value: unknown): string {
  if (!isRpcError(value)) {
    return 'Unknown error';
  }

  const error = (value as Record<string, unknown>).error as Record<string, unknown>;
  return (error.message as string) || 'Unknown error';
}
