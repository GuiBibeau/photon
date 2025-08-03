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
