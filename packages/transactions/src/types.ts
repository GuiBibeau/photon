import type { Address } from '@photon/addresses';
import type { Signature } from '@photon/crypto';
import type { CompileableTransactionMessage } from '@photon/transaction-messages';

/**
 * Represents a signed transaction with the message and collected signatures
 */
export interface Transaction {
  /**
   * The transaction message that was signed
   */
  readonly message: CompileableTransactionMessage;

  /**
   * Map of public keys to signatures
   * Missing signatures are represented as null
   */
  readonly signatures: ReadonlyMap<Address, Signature | null>;
}

/**
 * Options for transaction signing
 */
export interface SignTransactionOptions {
  /**
   * Whether to abort signing if any signer fails
   * @default true
   */
  abortOnError?: boolean;

  /**
   * Whether to verify signatures after signing
   * @default false
   */
  verifySignatures?: boolean;
}

/**
 * Result of partial signing operation
 */
export interface PartialSignResult {
  /**
   * The transaction with collected signatures
   */
  transaction: Transaction;

  /**
   * Addresses that failed to sign
   */
  failedSigners: ReadonlyArray<Address>;

  /**
   * Errors that occurred during signing
   */
  errors: ReadonlyMap<Address, Error>;
}
