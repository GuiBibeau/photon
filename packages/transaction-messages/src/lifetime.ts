/**
 * Transaction lifetime utilities.
 */

import type {
  BlockhashInfo,
  NonceInfo,
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
  const {
    nonceInfo: _nonceInfo,
    slot: _slot,
    ...restMessage
  } = message as TransactionMessageWithFeePayer & {
    nonceInfo?: unknown;
    slot?: unknown;
  };

  return Object.freeze({
    ...restMessage,
    blockhash: blockhashInfo.blockhash,
    lastValidBlockHeight: blockhashInfo.lastValidBlockHeight,
    ...(blockhashInfo.slot !== undefined && { slot: blockhashInfo.slot }),
  });
}

/**
 * Set the lifetime of a transaction message using a durable nonce.
 * Durable nonce transactions don't expire based on block height and can be
 * signed offline or submitted at any future time.
 *
 * Note: When using a durable nonce, the first instruction in the transaction
 * must be a nonceAdvance instruction. This will be automatically added when
 * the transaction is compiled.
 *
 * @param nonceInfo - The nonce information including nonce value, account, and authority
 * @param message - The transaction message with fee payer
 * @returns A new frozen transaction message with durable nonce lifetime
 */
export function setTransactionMessageLifetimeUsingNonce(
  nonceInfo: NonceInfo,
  message: TransactionMessageWithFeePayer,
): TransactionMessageWithLifetime {
  // Remove slot and any previous nonce info
  const { slot: _slot, ...restMessage } = message as TransactionMessageWithFeePayer & {
    slot?: unknown;
  };

  // For durable nonce transactions:
  // - The nonce value is used as the blockhash
  // - lastValidBlockHeight is set to MAX_SAFE_INTEGER to indicate it doesn't expire
  // - The nonceInfo is stored for later use when building instructions
  return Object.freeze({
    ...restMessage,
    blockhash: nonceInfo.nonce,
    lastValidBlockHeight: BigInt('18446744073709551615'), // u64::MAX - indicates durable
    nonceInfo: Object.freeze({ ...nonceInfo }),
  });
}
