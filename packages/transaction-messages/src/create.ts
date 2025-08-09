/**
 * Transaction message creation utilities.
 */

import type { TransactionMessage, TransactionVersion } from './types.js';

/**
 * Create a new empty transaction message with the specified version.
 *
 * @param version - The transaction version ('legacy' or 0)
 * @returns A new frozen transaction message
 */
export function createTransactionMessage(version: TransactionVersion): TransactionMessage {
  const message: TransactionMessage = Object.freeze({
    version,
    instructions: Object.freeze([]) as ReadonlyArray<never>,
  });

  return message;
}
