/**
 * Fee payer utilities for transaction messages.
 */

import type { Address } from '@photon/addresses';
import type {
  TransactionMessage,
  TransactionMessageWithFeePayer,
  TransactionMessageWithLifetime,
} from './types.js';

/**
 * Set or update the fee payer on a transaction message.
 *
 * @param feePayer - The address that will pay the transaction fee
 * @param message - The transaction message to update
 * @returns A new frozen transaction message with the fee payer set
 */
export function setTransactionMessageFeePayer<T extends TransactionMessage>(
  feePayer: Address,
  message: T,
): T extends TransactionMessageWithLifetime
  ? TransactionMessageWithLifetime
  : T extends TransactionMessageWithFeePayer
    ? TransactionMessageWithFeePayer
    : TransactionMessageWithFeePayer {
  // Create a new message with the fee payer set
  const newMessage = Object.freeze({
    ...message,
    feePayer,
  });

  // TypeScript will infer the correct return type based on the input type
  return newMessage as T extends TransactionMessageWithLifetime
    ? TransactionMessageWithLifetime
    : T extends TransactionMessageWithFeePayer
      ? TransactionMessageWithFeePayer
      : TransactionMessageWithFeePayer;
}
