import type { Transaction } from './types.js';
import { serializeTransaction } from './serialize.js';

// RPC types - we'll define minimal interfaces to avoid circular dependencies
export type TransactionSignature = string;

export interface SendTransactionConfig {
  skipPreflight?: boolean;
  preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
  encoding?: 'base58' | 'base64';
  maxRetries?: number;
  minContextSlot?: number;
}

export interface RpcClient {
  sendTransaction(
    transaction: string,
    config?: SendTransactionConfig,
  ): Promise<TransactionSignature>;
  getSignatureStatuses(signatures: string[]): Promise<{
    value: (SignatureStatus | null)[];
  }>;
}

export interface SignatureStatus {
  slot: number;
  confirmations: number | null;
  err: unknown | null;
  confirmationStatus?: 'processed' | 'confirmed' | 'finalized';
}

/**
 * Options for sending a transaction
 */
export interface SendOptions extends SendTransactionConfig {
  /**
   * Whether to encode the transaction as base64
   * @default true
   */
  encodeBase64?: boolean;
}

/**
 * Send a signed transaction to the network
 *
 * @param transaction - The signed transaction to send
 * @param rpc - The RPC client to use for sending
 * @param options - Optional send configuration
 * @returns The transaction signature
 *
 * @example
 * ```typescript
 * const signature = await sendTransaction(signedTx, rpc);
 * console.log('Transaction sent:', signature);
 * ```
 *
 * @example
 * ```typescript
 * // With options
 * const signature = await sendTransaction(signedTx, rpc, {
 *   skipPreflight: true,
 *   preflightCommitment: 'confirmed'
 * });
 * ```
 */
export async function sendTransaction(
  transaction: Transaction,
  rpc: RpcClient,
  options?: SendOptions,
): Promise<TransactionSignature> {
  // Serialize the transaction
  const serialized = serializeTransaction(transaction);

  // Encode as base64 (required format for RPC)
  const encoded = encodeBase64(serialized);

  // Extract RPC-specific options
  const rpcOptions: SendTransactionConfig = {};
  if (options?.skipPreflight !== undefined) {
    rpcOptions.skipPreflight = options.skipPreflight;
  }
  if (options?.preflightCommitment !== undefined) {
    rpcOptions.preflightCommitment = options.preflightCommitment;
  }
  if (options?.encoding !== undefined) {
    rpcOptions.encoding = options.encoding;
  }
  if (options?.maxRetries !== undefined) {
    rpcOptions.maxRetries = options.maxRetries;
  }
  if (options?.minContextSlot !== undefined) {
    rpcOptions.minContextSlot = options.minContextSlot;
  }

  // Send the transaction
  return rpc.sendTransaction(encoded, rpcOptions);
}

/**
 * Options for confirming a transaction
 */
export interface ConfirmTransactionOptions {
  /**
   * The commitment level to wait for
   * @default 'confirmed'
   */
  commitment?: 'processed' | 'confirmed' | 'finalized';

  /**
   * Maximum time to wait in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Polling interval in milliseconds
   * @default 1000 (1 second)
   */
  pollInterval?: number;
}

/**
 * Send and confirm a transaction
 *
 * @param transaction - The signed transaction to send
 * @param rpc - The RPC client to use
 * @param sendOptions - Options for sending the transaction
 * @param confirmOptions - Options for confirming the transaction
 * @returns The transaction signature
 *
 * @example
 * ```typescript
 * const signature = await sendAndConfirmTransaction(
 *   signedTx,
 *   rpc,
 *   { skipPreflight: false },
 *   { commitment: 'finalized' }
 * );
 * console.log('Transaction confirmed:', signature);
 * ```
 */
export async function sendAndConfirmTransaction(
  transaction: Transaction,
  rpc: RpcClient,
  sendOptions?: SendOptions,
  confirmOptions?: ConfirmTransactionOptions,
): Promise<TransactionSignature> {
  // Send the transaction
  const signature = await sendTransaction(transaction, rpc, sendOptions);

  // Wait for confirmation
  await confirmTransaction(signature, rpc, confirmOptions);

  return signature;
}

/**
 * Wait for a transaction to be confirmed
 *
 * @param signature - The transaction signature to confirm
 * @param rpc - The RPC client to use
 * @param options - Confirmation options
 * @throws Error if the transaction is not confirmed within the timeout
 *
 * @example
 * ```typescript
 * await confirmTransaction(signature, rpc, {
 *   commitment: 'finalized',
 *   timeout: 60000
 * });
 * ```
 */
export async function confirmTransaction(
  signature: TransactionSignature,
  rpc: RpcClient,
  options?: ConfirmTransactionOptions,
): Promise<void> {
  const commitment = options?.commitment ?? 'confirmed';
  const timeout = options?.timeout ?? 30000;
  const pollInterval = options?.pollInterval ?? 1000;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      // Get signature status
      const response = await rpc.getSignatureStatuses([signature]);
      const status = response.value?.[0];

      if (status === null) {
        // Transaction not found yet, continue polling
        await sleep(pollInterval);
        continue;
      }

      // Check if transaction has an error
      if (status && status.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      }

      // Check confirmation status based on commitment level
      const isConfirmed =
        (commitment === 'processed' && status?.confirmationStatus !== undefined) ||
        (commitment === 'confirmed' &&
          (status?.confirmationStatus === 'confirmed' ||
            status?.confirmationStatus === 'finalized')) ||
        (commitment === 'finalized' && status?.confirmationStatus === 'finalized');

      if (isConfirmed) {
        return;
      }

      await sleep(pollInterval);
    } catch (error) {
      // If it's a network error, continue polling
      // Otherwise, rethrow the error
      if (error instanceof Error && error.message.includes('fetch')) {
        await sleep(pollInterval);
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `Transaction confirmation timeout: Transaction ${signature} was not confirmed within ${timeout}ms`,
  );
}

/**
 * Helper function to sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper function to encode bytes as base64
 */
function encodeBase64(bytes: Uint8Array): string {
  // Browser environment
  if (typeof btoa !== 'undefined') {
    return btoa(String.fromCharCode(...bytes));
  }

  // Node.js environment
  if (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as Record<string, unknown>).Buffer !== 'undefined'
  ) {
    const BufferClass = (globalThis as Record<string, unknown>).Buffer as {
      from(data: Uint8Array): { toString(encoding: string): string };
    };
    return BufferClass.from(bytes).toString('base64');
  }

  // Fallback: manual base64 encoding
  const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;

  while (i < bytes.length) {
    const a = bytes[i++] ?? 0;
    const b = i < bytes.length ? (bytes[i++] ?? 0) : 0;
    const c = i < bytes.length ? (bytes[i++] ?? 0) : 0;

    const bitmap = (a << 16) | (b << 8) | c;

    result += base64chars.charAt((bitmap >> 18) & 63);
    result += base64chars.charAt((bitmap >> 12) & 63);
    result += i - 2 < bytes.length ? base64chars.charAt((bitmap >> 6) & 63) : '=';
    result += i - 1 < bytes.length ? base64chars.charAt(bitmap & 63) : '=';
  }

  return result;
}
