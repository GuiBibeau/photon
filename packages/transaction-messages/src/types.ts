/**
 * Types for transaction messages.
 */

import type { Address } from '@photon/addresses';

/**
 * Transaction version type.
 */
export type TransactionVersion = 'legacy' | 0;

/**
 * Blockhash type - a string representing a recent blockhash.
 */
export type Blockhash = string & { readonly __brand: unique symbol };

/**
 * Helper function to create a Blockhash type.
 */
export function blockhash(value: string): Blockhash {
  return value as Blockhash;
}

/**
 * Account metadata for instructions.
 */
export interface AccountMeta {
  pubkey: Address;
  isSigner: boolean;
  isWritable: boolean;
}

/**
 * Instruction structure for Solana transactions.
 */
export interface Instruction {
  programId: Address;
  accounts: ReadonlyArray<AccountMeta>;
  data: Uint8Array;
}

/**
 * Address lookup table for versioned transactions.
 */
export interface AddressLookupTable {
  address: Address;
  writableIndexes: ReadonlyArray<number>;
  readonlyIndexes: ReadonlyArray<number>;
}

/**
 * Base transaction message structure.
 */
export interface BaseTransactionMessage {
  readonly version: TransactionVersion;
  readonly feePayer?: Address;
  readonly blockhash?: Blockhash;
  readonly lastValidBlockHeight?: bigint;
  readonly instructions: ReadonlyArray<Instruction>;
  readonly addressLookupTables?: ReadonlyArray<AddressLookupTable>;
}

/**
 * Transaction message without required fields.
 */
export type TransactionMessage = BaseTransactionMessage;

/**
 * Transaction message with fee payer set.
 */
export type TransactionMessageWithFeePayer = BaseTransactionMessage & {
  readonly feePayer: Address;
};

/**
 * Transaction message with fee payer and lifetime set.
 */
export type TransactionMessageWithLifetime = TransactionMessageWithFeePayer & {
  readonly blockhash: Blockhash;
  readonly lastValidBlockHeight: bigint;
};

/**
 * Transaction message ready for compilation and signing.
 */
export type CompileableTransactionMessage = TransactionMessageWithLifetime;

/**
 * Blockhash info returned from RPC.
 */
export interface BlockhashInfo {
  blockhash: Blockhash;
  lastValidBlockHeight: bigint;
}

/**
 * Type guard to check if a message has a fee payer.
 */
export function hasFeePayer(
  message: TransactionMessage,
): message is TransactionMessageWithFeePayer {
  return message.feePayer !== undefined;
}

/**
 * Type guard to check if a message has lifetime information.
 */
export function hasLifetime(
  message: TransactionMessage,
): message is TransactionMessageWithLifetime {
  return (
    hasFeePayer(message) &&
    message.blockhash !== undefined &&
    message.lastValidBlockHeight !== undefined
  );
}

/**
 * Type guard to check if a message is compileable.
 */
export function isCompileable(
  message: TransactionMessage,
): message is CompileableTransactionMessage {
  return hasLifetime(message);
}
