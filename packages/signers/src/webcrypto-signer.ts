import type { Address } from '@photon/addresses';
import { addressFromBytes } from '@photon/addresses';
import type { Signature, IKeyPair } from '@photon/crypto';
import { signBytes, generateKeyPair } from '@photon/crypto';
import { SolanaError } from '@photon/errors';
import type { Signer, SignerMetadata } from './interface.js';

/**
 * Options for creating a CryptoKeySigner
 */
export interface CryptoKeySignerOptions {
  /**
   * Optional metadata for the signer
   */
  metadata?: SignerMetadata;

  /**
   * Whether to cache the public key after first derivation
   * @default true
   */
  cachePublicKey?: boolean;
}

/**
 * WebCrypto-based signer implementation.
 * Wraps a CryptoKeyPair for secure transaction signing.
 */
export class CryptoKeySigner implements Signer {
  private readonly keyPair: CryptoKeyPair;
  private readonly options: Required<CryptoKeySignerOptions>;
  private cachedPublicKey?: Address;
  private cachedPublicKeyBytes?: Uint8Array;

  /**
   * Creates a new CryptoKeySigner
   * @param keyPair - The WebCrypto key pair to wrap
   * @param options - Configuration options
   */
  constructor(keyPair: CryptoKeyPair, options: CryptoKeySignerOptions = {}) {
    if (!keyPair || !keyPair.privateKey || !keyPair.publicKey) {
      throw new SolanaError('INVALID_KEYPAIR', {
        details: 'Invalid CryptoKeyPair provided',
      });
    }

    // Validate key types
    if (keyPair.privateKey.type !== 'private') {
      throw new SolanaError('INVALID_KEY_TYPE', {
        reason: 'Private key must be of type "private"',
      });
    }

    if (keyPair.publicKey.type !== 'public') {
      throw new SolanaError('INVALID_KEY_TYPE', {
        reason: 'Public key must be of type "public"',
      });
    }

    // Validate algorithm
    const privateAlgorithm = keyPair.privateKey.algorithm as KeyAlgorithm;
    const publicAlgorithm = keyPair.publicKey.algorithm as KeyAlgorithm;

    if (privateAlgorithm.name !== 'Ed25519' || publicAlgorithm.name !== 'Ed25519') {
      throw new SolanaError('INVALID_KEY_TYPE', {
        reason: 'Only Ed25519 keys are supported',
      });
    }

    this.keyPair = keyPair;
    this.options = {
      cachePublicKey: true,
      ...options,
      metadata: {
        type: 'webcrypto',
        extractable: keyPair.privateKey.extractable,
        ...options.metadata,
      },
    };
  }

  /**
   * Get the public key address of the signer
   */
  public get publicKey(): Address {
    if (this.cachedPublicKey) {
      return this.cachedPublicKey;
    }

    // Since public key derivation is async, we throw here
    // Users should call getPublicKey() for the async version
    throw new SolanaError('INVALID_KEY_OPTIONS', {
      details: 'Public key not yet cached. Call getPublicKey() first.',
    });
  }

  /**
   * Get the public key address (async version)
   */
  public async getPublicKey(): Promise<Address> {
    if (this.cachedPublicKey && this.options.cachePublicKey) {
      return this.cachedPublicKey;
    }

    const publicKeyBytes = await this.getPublicKeyBytes();
    const address = addressFromBytes(publicKeyBytes);

    if (this.options.cachePublicKey) {
      this.cachedPublicKey = address;
    }

    return address;
  }

  /**
   * Get the raw public key bytes
   */
  public async getPublicKeyBytes(): Promise<Uint8Array> {
    if (this.cachedPublicKeyBytes && this.options.cachePublicKey) {
      return this.cachedPublicKeyBytes;
    }

    const publicKeyData = await crypto.subtle.exportKey('raw', this.keyPair.publicKey);
    const publicKeyBytes = new Uint8Array(publicKeyData);

    if (publicKeyBytes.length !== 32) {
      throw new SolanaError('KEY_GENERATION_FAILED', {
        reason: `Invalid public key length: expected 32 bytes, got ${publicKeyBytes.length}`,
      });
    }

    if (this.options.cachePublicKey) {
      this.cachedPublicKeyBytes = publicKeyBytes;
    }

    return publicKeyBytes;
  }

  /**
   * Sign a message with the private key
   */
  public async sign(message: Uint8Array): Promise<Signature> {
    if (!message || !(message instanceof Uint8Array)) {
      throw new SolanaError('INVALID_KEY_OPTIONS', {
        details: 'Message must be a Uint8Array',
      });
    }

    try {
      return await signBytes(this.keyPair.privateKey, message);
    } catch (error) {
      if (error instanceof SolanaError) {
        throw error;
      }

      throw new SolanaError(
        'INVALID_SIGNATURE',
        {
          reason: error instanceof Error ? error.message : 'Failed to sign message',
        },
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Get the metadata for this signer
   */
  public get metadata(): SignerMetadata {
    return this.options.metadata || {};
  }

  /**
   * Check if the private key is extractable
   */
  public get extractable(): boolean {
    return this.keyPair.privateKey.extractable;
  }

  /**
   * Extract the private key if it's extractable
   * @throws {SolanaError} If the key is not extractable
   */
  public async extractPrivateKey(): Promise<Uint8Array> {
    if (!this.keyPair.privateKey.extractable) {
      throw new SolanaError('KEY_EXTRACTION_FAILED', {
        details: 'Private key is not extractable',
      });
    }

    try {
      const privateKeyData = await crypto.subtle.exportKey('pkcs8', this.keyPair.privateKey);
      return new Uint8Array(privateKeyData);
    } catch (error) {
      throw new SolanaError(
        'KEY_EXTRACTION_FAILED',
        {
          reason: error instanceof Error ? error.message : 'Failed to export private key',
        },
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Get the underlying CryptoKeyPair
   */
  public getCryptoKeyPair(): CryptoKeyPair {
    return this.keyPair;
  }
}

/**
 * Options for generating a new CryptoKeySigner
 */
export interface GenerateCryptoKeySignerOptions extends CryptoKeySignerOptions {
  /**
   * Whether the generated keys should be extractable
   * @default false
   */
  extractable?: boolean;

  /**
   * Optional seed for deterministic key generation
   * Must be exactly 32 bytes
   */
  seed?: Uint8Array;
}

/**
 * Generate a new CryptoKeySigner with a random key pair
 */
export async function generateCryptoKeySigner(
  options: GenerateCryptoKeySignerOptions = {},
): Promise<CryptoKeySigner> {
  const { extractable = false, seed, ...signerOptions } = options;

  try {
    const keyPair = await generateKeyPair(seed ? { extractable, seed } : { extractable });
    const signer = new CryptoKeySigner(keyPair.cryptoKeyPair, signerOptions);

    // Pre-cache the public key
    await signer.getPublicKey();

    return signer;
  } catch (error) {
    if (error instanceof SolanaError) {
      throw error;
    }

    throw new SolanaError(
      'KEY_GENERATION_FAILED',
      {
        reason: error instanceof Error ? error.message : 'Failed to generate key pair',
      },
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Options for importing a CryptoKeySigner from raw key material
 */
export interface ImportCryptoKeySignerOptions extends CryptoKeySignerOptions {
  /**
   * Whether the imported key should be extractable
   * @default false
   */
  extractable?: boolean;
}

/**
 * Import a CryptoKeySigner from raw private and public key bytes
 *
 * Note: WebCrypto API cannot derive Ed25519 public keys from private keys,
 * so both keys must be provided.
 */
export async function importCryptoKeySigner(
  privateKeyBytes: Uint8Array,
  publicKeyBytes: Uint8Array,
  options: ImportCryptoKeySignerOptions = {},
): Promise<CryptoKeySigner> {
  const { extractable = false, ...signerOptions } = options;

  if (!privateKeyBytes || privateKeyBytes.length !== 32) {
    throw new SolanaError('INVALID_KEY_OPTIONS', {
      details: 'Private key must be exactly 32 bytes',
    });
  }

  if (!publicKeyBytes || publicKeyBytes.length !== 32) {
    throw new SolanaError('INVALID_KEY_OPTIONS', {
      details: 'Public key must be exactly 32 bytes',
    });
  }

  try {
    // Import the private key
    const privateKey = await crypto.subtle.importKey(
      'raw',
      privateKeyBytes as BufferSource,
      {
        name: 'Ed25519',
      },
      extractable,
      ['sign'],
    );

    // Import the public key
    const publicKey = await crypto.subtle.importKey(
      'raw',
      publicKeyBytes as BufferSource,
      {
        name: 'Ed25519',
      },
      false, // Public keys are never extractable
      ['verify'],
    );

    // Create the CryptoKeyPair
    const keyPair: CryptoKeyPair = {
      privateKey,
      publicKey,
    };

    const signer = new CryptoKeySigner(keyPair, signerOptions);

    // Pre-cache the public key
    await signer.getPublicKey();

    return signer;
  } catch (error) {
    if (error instanceof SolanaError) {
      throw error;
    }

    throw new SolanaError(
      'KEY_GENERATION_FAILED',
      {
        reason: error instanceof Error ? error.message : 'Failed to import key pair',
      },
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Import a CryptoKeySigner from an IKeyPair wrapper
 */
export async function importCryptoKeySignerFromKeyPair(
  keyPair: IKeyPair,
  options: CryptoKeySignerOptions = {},
): Promise<CryptoKeySigner> {
  try {
    const signer = new CryptoKeySigner(keyPair.cryptoKeyPair, options);

    // Pre-cache the public key
    await signer.getPublicKey();

    return signer;
  } catch (error) {
    if (error instanceof SolanaError) {
      throw error;
    }

    throw new SolanaError(
      'KEY_GENERATION_FAILED',
      {
        reason: error instanceof Error ? error.message : 'Failed to import key pair',
      },
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Create a CryptoKeySigner from an existing CryptoKeyPair
 */
export async function fromCryptoKeyPair(
  keyPair: CryptoKeyPair,
  options: CryptoKeySignerOptions = {},
): Promise<CryptoKeySigner> {
  const signer = new CryptoKeySigner(keyPair, options);

  // Pre-cache the public key
  await signer.getPublicKey();

  return signer;
}

/**
 * Check if a value is a CryptoKeySigner
 */
export function isCryptoKeySigner(value: unknown): value is CryptoKeySigner {
  return value instanceof CryptoKeySigner;
}
