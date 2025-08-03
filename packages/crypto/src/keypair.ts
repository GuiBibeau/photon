import { SolanaError } from '@photon/errors';
import type { IKeyPair, Signature, Address } from './types.js';

/**
 * Ed25519 key pair wrapper that provides higher-level operations
 * on top of WebCrypto CryptoKeyPair.
 */
export class KeyPair implements IKeyPair {
  private _publicKeyBytes: Uint8Array | null = null;
  private _address: Address | null = null;

  /**
   * Create a new KeyPair wrapper.
   * @param cryptoKeyPair - The underlying WebCrypto key pair
   */
  constructor(public readonly cryptoKeyPair: CryptoKeyPair) {
    // Validate the input
    if (!cryptoKeyPair) {
      throw new SolanaError('INVALID_KEY_TYPE', {
        expected: 'CryptoKeyPair',
        actual: 'null or undefined',
      });
    }

    if (!cryptoKeyPair.privateKey || !cryptoKeyPair.publicKey) {
      throw new SolanaError('INVALID_KEY_TYPE', {
        expected: 'Complete CryptoKeyPair',
        actual: 'incomplete key pair',
      });
    }

    // Validate algorithm
    if (
      cryptoKeyPair.privateKey.algorithm.name !== 'Ed25519' ||
      cryptoKeyPair.publicKey.algorithm.name !== 'Ed25519'
    ) {
      throw new SolanaError('INVALID_KEY_TYPE', {
        expected: 'Ed25519',
        actual: `${cryptoKeyPair.privateKey.algorithm.name}/${cryptoKeyPair.publicKey.algorithm.name}`,
      });
    }
  }

  /**
   * Get the public key as raw bytes.
   * Uses lazy loading and caches the result.
   * @returns Promise resolving to 32-byte public key
   */
  async getPublicKeyBytes(): Promise<Uint8Array> {
    if (this._publicKeyBytes) {
      return this._publicKeyBytes;
    }

    try {
      const publicKeyBuffer = await crypto.subtle.exportKey('raw', this.cryptoKeyPair.publicKey);
      this._publicKeyBytes = new Uint8Array(publicKeyBuffer);

      // Validate the exported key length (Ed25519 public keys are 32 bytes)
      if (this._publicKeyBytes.length !== 32) {
        throw new SolanaError('KEY_EXTRACTION_FAILED', {
          reason: `Invalid public key length: expected 32 bytes, got ${this._publicKeyBytes.length}`,
        });
      }

      return this._publicKeyBytes;
    } catch (error) {
      if (error instanceof SolanaError) {
        throw error;
      }

      throw new SolanaError(
        'KEY_EXTRACTION_FAILED',
        {
          reason: error instanceof Error ? error.message : 'Failed to export public key',
        },
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Get the public key address.
   * For now, this returns a placeholder since the addresses package is not implemented yet.
   * @returns Promise resolving to the address derived from the public key
   */
  async getAddress(): Promise<Address> {
    if (this._address) {
      return this._address;
    }

    // TODO: Implement proper address derivation when addresses package is ready
    // For now, we'll create a simple base58-like representation
    const publicKeyBytes = await this.getPublicKeyBytes();

    // Simple hex representation as placeholder
    const hexString = Array.from(publicKeyBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    this._address = hexString as Address;
    return this._address;
  }

  /**
   * Sign a message with the private key.
   * @param message - The message to sign
   * @returns Promise resolving to the signature
   */
  async sign(message: Uint8Array): Promise<Signature> {
    if (!message || message.length === 0) {
      throw new SolanaError('INVALID_KEY_OPTIONS', { details: 'Message cannot be empty' });
    }

    try {
      const signatureBuffer = await crypto.subtle.sign(
        'Ed25519',
        this.cryptoKeyPair.privateKey,
        message as BufferSource,
      );

      const signature = new Uint8Array(signatureBuffer);

      // Validate signature length (Ed25519 signatures are 64 bytes)
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
   * Verify if this key pair can be used for the specified operation.
   * @param operation - The operation to check ('sign' | 'verify')
   * @returns Whether the operation is supported
   */
  canPerformOperation(operation: 'sign' | 'verify'): boolean {
    switch (operation) {
      case 'sign':
        return this.cryptoKeyPair.privateKey.usages.includes('sign');
      case 'verify':
        return this.cryptoKeyPair.publicKey.usages.includes('verify');
      default:
        return false;
    }
  }

  /**
   * Get information about this key pair.
   * @returns Key pair metadata
   */
  getInfo(): {
    algorithm: string;
    extractable: boolean;
    usages: {
      privateKey: readonly KeyUsage[];
      publicKey: readonly KeyUsage[];
    };
  } {
    return {
      algorithm: this.cryptoKeyPair.privateKey.algorithm.name,
      extractable: this.cryptoKeyPair.privateKey.extractable,
      usages: {
        privateKey: this.cryptoKeyPair.privateKey.usages,
        publicKey: this.cryptoKeyPair.publicKey.usages,
      },
    };
  }
}
