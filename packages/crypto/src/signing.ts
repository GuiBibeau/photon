import { SolanaError } from '@photon/errors';
import type {
  Signature,
  SigningOptions,
  BatchSigningOptions,
  BatchSigningResult,
  VerificationOptions,
  BatchVerificationOptions,
  BatchVerificationResult,
  PublicKeyInput,
  VerificationItem,
} from './types.js';

/**
 * Signs a message using Ed25519 with the provided private key.
 *
 * @param privateKey - The Ed25519 private key to sign with
 * @param message - The message bytes to sign
 * @param options - Optional signing configuration
 * @returns Promise resolving to a 64-byte Ed25519 signature
 *
 * @example
 * ```typescript
 * const signature = await signBytes(privateKey, messageBytes);
 * console.log(signature.length); // 64
 * ```
 */
export async function signBytes(
  privateKey: CryptoKey,
  message: Uint8Array,
  options: SigningOptions = {},
): Promise<Signature> {
  const { validateInputs = true } = options;

  if (validateInputs) {
    validateSigningInputs(privateKey, message);
  }

  try {
    const signatureBuffer = await crypto.subtle.sign(
      'Ed25519',
      privateKey,
      message as BufferSource,
    );
    const signature = new Uint8Array(signatureBuffer);

    // Validate signature length (Ed25519 signatures are always 64 bytes)
    if (signature.length !== 64) {
      throw new SolanaError('KEY_GENERATION_FAILED', {
        reason: `Invalid signature length: expected 64 bytes, got ${signature.length}`,
      });
    }

    return signature as Signature;
  } catch (error) {
    if (error instanceof SolanaError) {
      throw error;
    }

    // Handle WebCrypto-specific errors
    if (error instanceof Error) {
      if (error.name === 'InvalidAccessError') {
        throw new SolanaError(
          'INVALID_KEY_TYPE',
          {
            reason: 'Private key cannot be used for signing (wrong usage or key type)',
          },
          error,
        );
      }

      if (error.name === 'OperationError') {
        throw new SolanaError(
          'KEY_GENERATION_FAILED',
          {
            reason: 'Signing operation failed (key may be corrupted or invalid)',
          },
          error,
        );
      }
    }

    throw new SolanaError(
      'KEY_GENERATION_FAILED',
      {
        reason: error instanceof Error ? error.message : 'Failed to sign message',
      },
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Signs multiple messages efficiently using batch processing.
 * Useful for multi-signature transactions or signing multiple messages with the same key.
 *
 * @param privateKey - The Ed25519 private key to sign with
 * @param messages - Array of message bytes to sign
 * @param options - Batch signing configuration
 * @returns Promise resolving to batch signing results
 *
 * @example
 * ```typescript
 * const result = await signBatch(privateKey, [msg1, msg2, msg3]);
 * console.log(`${result.successCount} signatures created`);
 * result.signatures.forEach((sig, i) => {
 *   if (sig) console.log(`Message ${i} signed successfully`);
 * });
 * ```
 */
export async function signBatch(
  privateKey: CryptoKey,
  messages: Uint8Array[],
  options: BatchSigningOptions = {},
): Promise<BatchSigningResult> {
  const { validateInputs = true, failFast = false, maxConcurrency = 10 } = options;

  if (validateInputs) {
    if (!Array.isArray(messages)) {
      throw new SolanaError('INVALID_KEY_OPTIONS', { details: 'Messages must be an array' });
    }

    if (messages.length === 0) {
      throw new SolanaError('INVALID_KEY_OPTIONS', { details: 'Messages array cannot be empty' });
    }

    // Validate the private key once for the batch
    validateSigningKey(privateKey);
  }

  const signatures: (Signature | null)[] = new Array(messages.length).fill(null);
  const errors: (Error | null)[] = new Array(messages.length).fill(null);
  let successCount = 0;
  let errorCount = 0;

  // Process messages in controlled batches to avoid overwhelming the system
  const batchSize = Math.min(maxConcurrency, messages.length);

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const batchPromises = batch.map(async (message, batchIndex) => {
      const messageIndex = i + batchIndex;

      try {
        // We need to validate individual messages even if we skip key validation
        const signature = await signBytes(privateKey, message, { validateInputs: true });
        signatures[messageIndex] = signature;
        successCount++;
      } catch (error) {
        const signingError = error instanceof Error ? error : new Error('Unknown signing error');
        errors[messageIndex] = signingError;
        errorCount++;

        if (failFast) {
          throw signingError;
        }
      }
    });

    if (failFast) {
      await Promise.all(batchPromises);
    } else {
      await Promise.allSettled(batchPromises);
    }
  }

  return {
    signatures,
    errors,
    successCount,
    errorCount,
  };
}

/**
 * Creates a signature validation function that can verify signatures.
 * This is a helper for creating reusable signature validators.
 *
 * @param publicKey - The public key to verify signatures against
 * @returns Function that validates signatures
 *
 * @example
 * ```typescript
 * const validator = createSignatureValidator(publicKey);
 * const isValid = await validator(message, signature);
 * ```
 */
export function createSignatureValidator(publicKey: CryptoKey) {
  return async (message: Uint8Array, signature: Signature): Promise<boolean> => {
    try {
      return await crypto.subtle.verify(
        'Ed25519',
        publicKey,
        signature as BufferSource,
        message as BufferSource,
      );
    } catch {
      return false;
    }
  };
}

/**
 * Validates inputs for signing operations.
 * @internal
 */
function validateSigningInputs(privateKey: CryptoKey, message: Uint8Array): void {
  validateSigningKey(privateKey);
  validateMessage(message);
}

/**
 * Validates a private key for signing operations.
 * @internal
 */
function validateSigningKey(privateKey: CryptoKey): void {
  if (!privateKey) {
    throw new SolanaError('INVALID_KEY_TYPE', {
      expected: 'CryptoKey',
      actual: 'null or undefined',
    });
  }

  if (!(privateKey instanceof CryptoKey)) {
    throw new SolanaError('INVALID_KEY_TYPE', {
      expected: 'CryptoKey',
      actual: typeof privateKey,
    });
  }

  if (privateKey.type !== 'private') {
    throw new SolanaError('INVALID_KEY_TYPE', {
      expected: 'private key',
      actual: `${privateKey.type} key`,
    });
  }

  if (privateKey.algorithm.name !== 'Ed25519') {
    throw new SolanaError('INVALID_KEY_TYPE', {
      expected: 'Ed25519',
      actual: privateKey.algorithm.name,
    });
  }

  if (!privateKey.usages.includes('sign')) {
    throw new SolanaError('INVALID_KEY_TYPE', {
      reason: 'Private key does not have "sign" usage',
      usages: privateKey.usages,
    });
  }
}

/**
 * Type guard to check if value is Uint8Array-like (handles cross-realm issues)
 */
function isUint8ArrayLike(value: unknown): value is Uint8Array {
  return (
    value instanceof Uint8Array ||
    (value !== null &&
      value !== undefined &&
      typeof value === 'object' &&
      'constructor' in value &&
      value.constructor !== null &&
      value.constructor !== undefined &&
      value.constructor.name === 'Uint8Array' &&
      'length' in value &&
      typeof value.length === 'number' &&
      'byteLength' in value &&
      typeof value.byteLength === 'number')
  );
}

/**
 * Validates a message for signing operations.
 * @internal
 */
function validateMessage(message: unknown): void {
  if (!message) {
    throw new SolanaError('INVALID_KEY_OPTIONS', {
      details: 'Message cannot be null or undefined',
    });
  }

  if (!isUint8ArrayLike(message)) {
    throw new SolanaError('INVALID_KEY_OPTIONS', {
      details: `Message must be Uint8Array, got ${typeof message}`,
    });
  }

  // Allow empty messages - Ed25519 can sign empty messages

  // Solana doesn't have a strict message size limit for signing, but we can add a reasonable limit
  // to prevent memory issues with extremely large messages
  const MAX_MESSAGE_SIZE = 1_048_576; // 1MB
  if (message.length > MAX_MESSAGE_SIZE) {
    throw new SolanaError('INVALID_KEY_OPTIONS', {
      details: `Message too large: ${message.length} bytes (max: ${MAX_MESSAGE_SIZE})`,
    });
  }
}

/**
 * Utility function to create a Signature from raw bytes with validation.
 * This is useful when you have signature bytes from external sources.
 *
 * @param bytes - The signature bytes (must be exactly 64 bytes)
 * @returns Validated Signature
 *
 * @example
 * ```typescript
 * const signatureBytes = new Uint8Array(64); // from somewhere
 * const signature = createSignature(signatureBytes);
 * ```
 */
export function createSignature(bytes: Uint8Array): Signature {
  if (!(bytes instanceof Uint8Array)) {
    throw new SolanaError('INVALID_SIGNATURE', {
      reason: `Expected Uint8Array, got ${typeof bytes}`,
    });
  }

  if (bytes.length !== 64) {
    throw new SolanaError('INVALID_SIGNATURE_LENGTH', {
      expected: 64,
      actual: bytes.length,
    });
  }

  return bytes as Signature;
}

/**
 * Utility function to validate that a Uint8Array is a valid signature.
 *
 * @param signature - The bytes to validate
 * @returns Whether the bytes represent a valid signature format
 *
 * @example
 * ```typescript
 * if (isValidSignature(someBytes)) {
 *   const signature = someBytes as Signature;
 *   // Use signature safely
 * }
 * ```
 */
export function isValidSignature(signature: unknown): signature is Signature {
  return signature instanceof Uint8Array && signature.length === 64;
}

// ============================================================================
// SIGNATURE VERIFICATION FUNCTIONS
// ============================================================================

/**
 * Verifies an Ed25519 signature against a message using the provided public key.
 * Supports multiple public key formats for flexibility.
 *
 * @param publicKey - The public key to verify against (CryptoKey, Uint8Array, or Address)
 * @param message - The message that was signed
 * @param signature - The signature to verify
 * @param options - Optional verification configuration
 * @returns Promise resolving to whether the signature is valid
 *
 * @example
 * ```typescript
 * const isValid = await verifySignature(publicKey, message, signature);
 * if (isValid) {
 *   console.log('Signature is valid!');
 * }
 * ```
 */
export async function verifySignature(
  publicKey: PublicKeyInput,
  message: Uint8Array,
  signature: Signature,
  options: VerificationOptions = {},
): Promise<boolean> {
  const { validateInputs = true } = options;

  if (validateInputs) {
    validateVerificationInputs(publicKey, message, signature);
  }

  try {
    const cryptoKey = await convertToCryptoKey(publicKey);
    return await crypto.subtle.verify(
      'Ed25519',
      cryptoKey,
      signature as BufferSource,
      message as BufferSource,
    );
  } catch {
    // Verification errors should return false, not throw
    // This matches the behavior expected for signature verification
    return false;
  }
}

/**
 * Verifies multiple signatures efficiently using batch processing.
 *
 * @param items - Array of verification items (publicKey, message, signature)
 * @param options - Batch verification configuration
 * @returns Promise resolving to batch verification results
 *
 * @example
 * ```typescript
 * const items = [
 *   { publicKey: key1, message: msg1, signature: sig1 },
 *   { publicKey: key2, message: msg2, signature: sig2 },
 * ];
 * const result = await verifyBatch(items);
 * console.log(`${result.validCount} valid signatures`);
 * ```
 */
export async function verifyBatch(
  items: VerificationItem[],
  options: BatchVerificationOptions = {},
): Promise<BatchVerificationResult> {
  const { validateInputs = true, failFast = false, maxConcurrency = 10 } = options;

  if (validateInputs) {
    if (!Array.isArray(items)) {
      throw new SolanaError('INVALID_KEY_OPTIONS', { details: 'Items must be an array' });
    }

    if (items.length === 0) {
      throw new SolanaError('INVALID_KEY_OPTIONS', { details: 'Items array cannot be empty' });
    }
  }

  const results: (boolean | null)[] = new Array(items.length).fill(null);
  const errors: (Error | null)[] = new Array(items.length).fill(null);
  let validCount = 0;
  let invalidCount = 0;
  let errorCount = 0;

  // Process items in controlled batches
  const batchSize = Math.min(maxConcurrency, items.length);

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map(async (item, batchIndex) => {
      const itemIndex = i + batchIndex;

      try {
        // Skip input validation for individual items since we validate the array once
        const isValid = await verifySignature(item.publicKey, item.message, item.signature, {
          validateInputs: false,
        });

        results[itemIndex] = isValid;
        if (isValid) {
          validCount++;
        } else {
          invalidCount++;
        }
      } catch (error) {
        const verificationError =
          error instanceof Error ? error : new Error('Unknown verification error');
        errors[itemIndex] = verificationError;
        errorCount++;

        if (failFast) {
          throw verificationError;
        }
      }
    });

    if (failFast) {
      await Promise.all(batchPromises);
    } else {
      await Promise.allSettled(batchPromises);
    }
  }

  return {
    results,
    errors,
    validCount,
    invalidCount,
    errorCount,
  };
}

/**
 * Creates a reusable signature verifier for a specific public key.
 * This is more efficient when verifying multiple signatures against the same key.
 *
 * @param publicKey - The public key to create a verifier for
 * @returns Function that verifies signatures against the bound public key
 *
 * @example
 * ```typescript
 * const verifier = await createVerifier(publicKey);
 * const isValid1 = await verifier(message1, signature1);
 * const isValid2 = await verifier(message2, signature2);
 * ```
 */
export async function createVerifier(
  publicKey: PublicKeyInput,
): Promise<(message: Uint8Array, signature: Signature) => Promise<boolean>> {
  const cryptoKey = await convertToCryptoKey(publicKey);

  return async (message: Uint8Array, signature: Signature): Promise<boolean> => {
    try {
      return await crypto.subtle.verify(
        'Ed25519',
        cryptoKey,
        signature as BufferSource,
        message as BufferSource,
      );
    } catch {
      return false;
    }
  };
}

/**
 * Converts various public key formats to CryptoKey for use with WebCrypto.
 * @internal
 */
async function convertToCryptoKey(publicKey: PublicKeyInput): Promise<CryptoKey> {
  if (publicKey instanceof CryptoKey) {
    if (publicKey.type !== 'public') {
      throw new SolanaError('INVALID_KEY_TYPE', {
        expected: 'public key',
        actual: `${publicKey.type} key`,
      });
    }

    if (publicKey.algorithm.name !== 'Ed25519') {
      throw new SolanaError('INVALID_KEY_TYPE', {
        expected: 'Ed25519',
        actual: publicKey.algorithm.name,
      });
    }

    return publicKey;
  }

  if (publicKey instanceof Uint8Array) {
    if (publicKey.length !== 32) {
      throw new SolanaError('INVALID_KEY_TYPE', {
        reason: `Public key must be 32 bytes, got ${publicKey.length}`,
      });
    }

    try {
      return await crypto.subtle.importKey(
        'raw',
        publicKey as BufferSource,
        { name: 'Ed25519' },
        false,
        ['verify'],
      );
    } catch (error) {
      throw new SolanaError(
        'KEY_EXTRACTION_FAILED',
        {
          reason: 'Failed to import raw public key bytes',
        },
        error instanceof Error ? error : undefined,
      );
    }
  }

  // Handle Address type (base58 string)
  if (typeof publicKey === 'string') {
    // TODO: Implement base58 decoding when addresses package is ready
    // For now, we'll throw an error indicating this feature is not yet implemented
    throw new SolanaError('INVALID_KEY_TYPE', {
      reason: 'Address-based public keys not yet supported (addresses package not implemented)',
    });
  }

  throw new SolanaError('INVALID_KEY_TYPE', {
    reason: `Unsupported public key type: ${typeof publicKey}`,
  });
}

/**
 * Validates inputs for verification operations.
 * @internal
 */
function validateVerificationInputs(
  publicKey: PublicKeyInput,
  message: Uint8Array,
  signature: Signature,
): void {
  validateVerificationKey(publicKey);
  validateMessage(message);
  validateSignatureInput(signature);
}

/**
 * Validates a public key for verification operations.
 * @internal
 */
function validateVerificationKey(publicKey: PublicKeyInput): void {
  if (!publicKey) {
    throw new SolanaError('INVALID_KEY_TYPE', {
      expected: 'CryptoKey, Uint8Array, or Address',
      actual: 'null or undefined',
    });
  }

  if (publicKey instanceof CryptoKey) {
    if (publicKey.type !== 'public') {
      throw new SolanaError('INVALID_KEY_TYPE', {
        expected: 'public key',
        actual: `${publicKey.type} key`,
      });
    }

    if (publicKey.algorithm.name !== 'Ed25519') {
      throw new SolanaError('INVALID_KEY_TYPE', {
        expected: 'Ed25519',
        actual: publicKey.algorithm.name,
      });
    }

    if (!publicKey.usages.includes('verify')) {
      throw new SolanaError('INVALID_KEY_TYPE', {
        reason: 'Public key does not have "verify" usage',
        usages: publicKey.usages,
      });
    }
    return;
  }

  // Check if it's a Uint8Array or has Uint8Array-like properties
  if (isUint8ArrayLike(publicKey)) {
    if (publicKey.length !== 32) {
      throw new SolanaError('INVALID_KEY_TYPE', {
        reason: `Public key bytes must be 32 bytes, got ${publicKey.length}`,
      });
    }
    return;
  }

  if (typeof publicKey === 'string') {
    // Basic validation for Address type - full validation would require base58 decoding
    if (publicKey.length === 0) {
      throw new SolanaError('INVALID_KEY_TYPE', {
        reason: 'Address cannot be empty',
      });
    }
    return;
  }

  throw new SolanaError('INVALID_KEY_TYPE', {
    reason: `Unsupported public key type: ${typeof publicKey}`,
  });
}

/**
 * Validates a signature for verification operations.
 * @internal
 */
function validateSignatureInput(signature: Signature): void {
  if (!signature) {
    throw new SolanaError('INVALID_SIGNATURE', {
      reason: 'Signature cannot be null or undefined',
    });
  }

  if (!isUint8ArrayLike(signature)) {
    throw new SolanaError('INVALID_SIGNATURE', {
      reason: `Signature must be Uint8Array, got ${typeof signature}`,
    });
  }

  if (signature.length !== 64) {
    throw new SolanaError('INVALID_SIGNATURE_LENGTH', {
      expected: 64,
      actual: signature.length,
    });
  }
}
