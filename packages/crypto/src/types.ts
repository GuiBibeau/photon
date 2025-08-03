/**
 * Options for key pair generation.
 */
export interface KeyGenerationOptions {
  /**
   * Whether generated keys should be extractable.
   * If true, raw key material can be extracted from the key.
   * If false (default), keys are non-extractable for security.
   *
   * @default false
   */
  extractable?: boolean;
}

/**
 * Represents a cryptographic signature.
 * Branded type to prevent confusion with regular Uint8Array.
 */
export type Signature = Uint8Array & { readonly __brand: unique symbol };

/**
 * Represents a public key address.
 * This will be properly defined when the addresses package is implemented.
 * For now, we use a placeholder type.
 */
export type Address = string & { readonly __brand: unique symbol };

/**
 * Ed25519 key pair wrapper interface.
 * Provides higher-level operations on top of WebCrypto CryptoKeyPair.
 */
export interface IKeyPair {
  /**
   * The underlying WebCrypto key pair.
   */
  readonly cryptoKeyPair: CryptoKeyPair;

  /**
   * Get the public key as raw bytes.
   * @returns Promise resolving to 32-byte public key
   */
  getPublicKeyBytes(): Promise<Uint8Array>;

  /**
   * Get the public key address.
   * @returns Promise resolving to the address derived from the public key
   */
  getAddress(): Promise<Address>;

  /**
   * Sign a message with the private key.
   * @param message - The message to sign
   * @returns Promise resolving to the signature
   */
  sign(message: Uint8Array): Promise<Signature>;

  /**
   * Verify if this key pair can be used for the specified operation.
   * @param operation - The operation to check ('sign' | 'verify')
   * @returns Whether the operation is supported
   */
  canPerformOperation(operation: 'sign' | 'verify'): boolean;
}

/**
 * Browser compatibility information for WebCrypto features.
 */
export interface CryptoCompatibility {
  /**
   * Whether WebCrypto API is available.
   */
  hasWebCrypto: boolean;

  /**
   * Whether Ed25519 algorithm is supported.
   */
  hasEd25519: boolean;

  /**
   * Whether the browser supports the required operations.
   */
  isFullySupported: boolean;

  /**
   * Human-readable compatibility message.
   */
  message: string;
}

/**
 * Options for signing operations.
 */
export interface SigningOptions {
  /**
   * Whether to validate inputs before signing.
   * @default true
   */
  validateInputs?: boolean;
}

/**
 * Options for batch signing operations.
 */
export interface BatchSigningOptions extends SigningOptions {
  /**
   * Whether to fail fast on the first error or collect all results.
   * @default false
   */
  failFast?: boolean;

  /**
   * Maximum number of concurrent signing operations.
   * @default 10
   */
  maxConcurrency?: number;
}

/**
 * Result of a batch signing operation.
 */
export interface BatchSigningResult {
  /**
   * Successfully generated signatures, indexed by the input array position.
   */
  signatures: (Signature | null)[];

  /**
   * Errors that occurred during signing, indexed by the input array position.
   */
  errors: (Error | null)[];

  /**
   * Number of successful signatures.
   */
  successCount: number;

  /**
   * Number of failed signatures.
   */
  errorCount: number;
}

/**
 * Options for signature verification operations.
 */
export interface VerificationOptions {
  /**
   * Whether to validate inputs before verification.
   * @default true
   */
  validateInputs?: boolean;
}

/**
 * Options for batch verification operations.
 */
export interface BatchVerificationOptions extends VerificationOptions {
  /**
   * Whether to fail fast on the first error or collect all results.
   * @default false
   */
  failFast?: boolean;

  /**
   * Maximum number of concurrent verification operations.
   * @default 10
   */
  maxConcurrency?: number;
}

/**
 * Result of a batch verification operation.
 */
export interface BatchVerificationResult {
  /**
   * Verification results, indexed by the input array position.
   */
  results: (boolean | null)[];

  /**
   * Errors that occurred during verification, indexed by the input array position.
   */
  errors: (Error | null)[];

  /**
   * Number of successful verifications (true results).
   */
  validCount: number;

  /**
   * Number of failed verifications (false results).
   */
  invalidCount: number;

  /**
   * Number of verification errors.
   */
  errorCount: number;
}

/**
 * Supported public key formats for verification.
 */
export type PublicKeyInput = CryptoKey | Uint8Array | Address;

/**
 * A verification item for batch operations.
 */
export interface VerificationItem {
  /**
   * The public key to verify against.
   */
  publicKey: PublicKeyInput;

  /**
   * The message that was signed.
   */
  message: Uint8Array;

  /**
   * The signature to verify.
   */
  signature: Signature;
}
