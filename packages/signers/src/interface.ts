import type { Address } from '@photon/addresses';
import type { Signature } from '@photon/crypto';

/**
 * Core interface for transaction signers.
 * Provides a unified abstraction for signing operations,
 * supporting both SDK-managed keys and external wallets.
 */
export interface Signer {
  /**
   * The public key address of the signer
   */
  readonly publicKey: Address;

  /**
   * Signs a message with the signer's private key
   * @param message - The message to sign
   * @returns A promise that resolves to the signature
   */
  sign(message: Uint8Array): Promise<Signature>;

  /**
   * Optional metadata about the signer
   */
  readonly metadata?: SignerMetadata;
}

/**
 * Optional metadata for a signer
 */
export interface SignerMetadata {
  /**
   * Human-readable name for the signer
   */
  readonly name?: string;

  /**
   * Type of signer (e.g., "webcrypto", "hardware", "wallet")
   */
  readonly type?: string;

  /**
   * Whether this signer is extractable/exportable
   */
  readonly extractable?: boolean;

  /**
   * Additional properties specific to signer implementations
   */
  readonly [key: string]: unknown;
}

/**
 * Information about a signer in a transaction
 */
export interface SignerInfo {
  /**
   * Reference to the signer's public key
   */
  readonly publicKey: Address;

  /**
   * The signature for this signer (undefined until signed)
   */
  signature?: Signature | undefined;

  /**
   * Whether this signer is the fee payer
   */
  readonly isFeePayer: boolean;

  /**
   * Whether this signer is writable (can have its lamports modified)
   */
  readonly isWritable: boolean;
}

/**
 * Result of a signing operation
 */
export interface SigningResult {
  /**
   * The public key of the signer
   */
  readonly publicKey: Address;

  /**
   * The signature produced
   */
  readonly signature: Signature;
}
