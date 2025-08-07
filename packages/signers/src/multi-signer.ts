import type { Address } from '@photon/addresses';
import type { Signer, SignerInfo, SigningResult } from './interface.js';

/**
 * Collection of signers for a transaction
 */
export interface SignerCollection {
  /**
   * Array of unique signers
   */
  readonly signers: readonly Signer[];

  /**
   * The fee payer signer (must be present in signers array)
   */
  readonly feePayer: Signer;
}

/**
 * Configuration for multi-signer operations
 */
export interface MultiSignerConfig {
  /**
   * Whether to sign in parallel (default: true)
   */
  readonly parallel?: boolean;

  /**
   * Whether to continue on failure (default: false)
   */
  readonly continueOnFailure?: boolean;

  /**
   * Timeout for each signing operation in milliseconds
   */
  readonly timeout?: number;
}

/**
 * Result of a multi-signer operation
 */
export interface MultiSignerResult {
  /**
   * Successfully obtained signatures
   */
  readonly signatures: readonly SigningResult[];

  /**
   * Failed signing operations
   */
  readonly failures: readonly SigningFailure[];

  /**
   * Whether all required signatures were obtained
   */
  readonly success: boolean;
}

/**
 * Information about a failed signing operation
 */
export interface SigningFailure {
  /**
   * The public key of the signer that failed
   */
  readonly publicKey: Address;

  /**
   * The error that occurred
   */
  readonly error: Error;
}

/**
 * Options for deduplicating signers
 */
export interface DeduplicationOptions {
  /**
   * Strategy for handling duplicate signers
   * - 'keep-first': Keep the first occurrence
   * - 'keep-last': Keep the last occurrence
   * - 'error': Throw an error on duplicates
   */
  readonly strategy?: 'keep-first' | 'keep-last' | 'error';
}

/**
 * Order configuration for signers
 */
export interface SignerOrder {
  /**
   * Fee payer should always be first
   */
  readonly feePayerFirst: boolean;

  /**
   * Sort remaining signers by public key
   */
  readonly sortByPublicKey?: boolean;

  /**
   * Custom comparator for ordering signers
   */
  readonly customComparator?: (a: Signer, b: Signer) => number;
}

/**
 * Deduplicate signers based on their public keys
 */
export function deduplicateSigners(
  signers: readonly Signer[],
  options: DeduplicationOptions = {},
): Signer[] {
  const { strategy = 'keep-first' } = options;
  const seen = new Map<Address, Signer>();
  const result: Signer[] = [];

  for (const signer of signers) {
    const existing = seen.get(signer.publicKey);

    if (existing) {
      if (strategy === 'error') {
        throw new Error(`Duplicate signer found: ${signer.publicKey}`);
      }
      if (strategy === 'keep-last') {
        const index = result.indexOf(existing);
        result[index] = signer;
        seen.set(signer.publicKey, signer);
      }
    } else {
      seen.set(signer.publicKey, signer);
      result.push(signer);
    }
  }

  return result;
}

/**
 * Order signers according to the specified configuration
 */
export function orderSigners(
  signers: readonly Signer[],
  feePayer: Address | undefined,
  options: SignerOrder = { feePayerFirst: true },
): Signer[] {
  const result = [...signers];

  if (options.customComparator) {
    result.sort(options.customComparator);
  } else if (options.sortByPublicKey) {
    result.sort((a, b) => a.publicKey.localeCompare(b.publicKey));
  }

  if (options.feePayerFirst && feePayer) {
    const feePayerIndex = result.findIndex((s) => s.publicKey === feePayer);
    if (feePayerIndex > 0) {
      const [feePayerSigner] = result.splice(feePayerIndex, 1);
      if (feePayerSigner) {
        result.unshift(feePayerSigner);
      }
    }
  }

  return result;
}

/**
 * Create a signer collection from an array of signers
 */
export function createSignerCollection(
  signers: readonly Signer[],
  feePayer: Signer | Address,
): SignerCollection {
  const uniqueSigners = deduplicateSigners(signers);

  const feePayerSigner =
    typeof feePayer === 'string' ? uniqueSigners.find((s) => s.publicKey === feePayer) : feePayer;

  if (!feePayerSigner) {
    throw new Error('Fee payer not found in signers array');
  }

  if (feePayerSigner && !uniqueSigners.includes(feePayerSigner) && typeof feePayer !== 'string') {
    uniqueSigners.unshift(feePayerSigner);
  }

  return {
    signers: uniqueSigners,
    feePayer: feePayerSigner,
  };
}

/**
 * Sign a message with multiple signers
 */
export async function signWithMultiple(
  message: Uint8Array,
  signers: readonly Signer[],
  config: MultiSignerConfig = {},
): Promise<MultiSignerResult> {
  const { parallel = true, continueOnFailure = false, timeout } = config;
  const signatures: SigningResult[] = [];
  const failures: SigningFailure[] = [];

  const signWithTimeout = async (signer: Signer): Promise<SigningResult> => {
    const signPromise = signer.sign(message);

    if (timeout) {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Signing timeout')), timeout),
      );
      const signature = await Promise.race([signPromise, timeoutPromise]);
      return { publicKey: signer.publicKey, signature };
    }

    const signature = await signPromise;
    return { publicKey: signer.publicKey, signature };
  };

  if (parallel) {
    const results = await Promise.allSettled(signers.map(signWithTimeout));

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const signer = signers[i];

      if (!result || !signer) {
        continue;
      }

      if (result.status === 'fulfilled') {
        signatures.push(result.value);
      } else {
        failures.push({
          publicKey: signer.publicKey,
          error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
        });

        if (!continueOnFailure) {
          break;
        }
      }
    }
  } else {
    for (const signer of signers) {
      try {
        const result = await signWithTimeout(signer);
        signatures.push(result);
      } catch (error) {
        failures.push({
          publicKey: signer.publicKey,
          error: error instanceof Error ? error : new Error(String(error)),
        });

        if (!continueOnFailure) {
          break;
        }
      }
    }
  }

  return {
    signatures,
    failures,
    success: failures.length === 0,
  };
}

/**
 * Extract signer info from a collection of signers
 */
export function extractSignerInfo(
  signers: readonly Signer[],
  feePayer: Address,
  writableSigners: readonly Address[] = [],
): SignerInfo[] {
  return signers.map((signer) => ({
    publicKey: signer.publicKey,
    signature: undefined,
    isFeePayer: signer.publicKey === feePayer,
    isWritable: writableSigners.includes(signer.publicKey) || signer.publicKey === feePayer,
  }));
}
