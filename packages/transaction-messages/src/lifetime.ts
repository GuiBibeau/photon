/**
 * Transaction lifetime utilities.
 */

import type {
  BlockhashInfo,
  TransactionMessageWithFeePayer,
  TransactionMessageWithLifetime,
} from './types.js';

/**
 * Set the lifetime of a transaction message using a blockhash and last valid block height.
 *
 * @param blockhashInfo - The blockhash and last valid block height
 * @param message - The transaction message with fee payer
 * @returns A new frozen transaction message with lifetime set
 */
export function setTransactionMessageLifetimeUsingBlockhash(
  blockhashInfo: BlockhashInfo,
  message: TransactionMessageWithFeePayer,
): TransactionMessageWithLifetime {
  return Object.freeze({
    ...message,
    blockhash: blockhashInfo.blockhash,
    lastValidBlockHeight: blockhashInfo.lastValidBlockHeight,
  });
}
