import type { Address } from '@photon/addresses';
import type { Signature } from '@photon/crypto';
import type { Signer, SignerMetadata } from '@photon/signers';
import type { WalletProvider } from '../types';

/**
 * Adapter to convert WalletProvider to SDK's Signer interface
 * This ensures wallet providers are compatible with SDK transaction signing
 */
export class WalletSignerAdapter implements Signer {
  readonly publicKey: Address;
  readonly metadata: SignerMetadata;

  constructor(private wallet: WalletProvider) {
    if (!wallet.publicKey) {
      throw new Error('Wallet must be connected to create signer adapter');
    }

    this.publicKey = wallet.publicKey;
    this.metadata = {
      name: wallet.name,
      type: 'wallet',
      extractable: false,
      url: wallet.url,
      icon: wallet.icon,
    };
  }

  /**
   * Sign a message using the wallet provider
   * Adapts wallet's signMessage to SDK's Signer interface
   */
  async sign(message: Uint8Array): Promise<Signature> {
    if (!this.wallet.connected) {
      throw new Error('Wallet is not connected');
    }

    // WalletProvider.signMessage returns Signature directly now
    const signature = await this.wallet.signMessage(message);
    return signature;
  }

  /**
   * Check if wallet is still connected
   */
  isConnected(): boolean {
    return this.wallet.connected && this.wallet.publicKey !== null;
  }

  /**
   * Get the underlying wallet provider
   */
  getWallet(): WalletProvider {
    return this.wallet;
  }
}

/**
 * Create a Signer from a WalletProvider
 */
export function walletToSigner(wallet: WalletProvider): Signer {
  return new WalletSignerAdapter(wallet);
}

/**
 * Check if a Signer is a wallet adapter
 */
export function isWalletSigner(signer: Signer): signer is WalletSignerAdapter {
  return signer instanceof WalletSignerAdapter;
}

/**
 * Extract WalletProvider from a Signer if it's a wallet adapter
 */
export function extractWalletFromSigner(signer: Signer): WalletProvider | null {
  if (isWalletSigner(signer)) {
    return signer.getWallet();
  }
  return null;
}

/**
 * Batch signer for multiple wallet signatures
 * Useful for multi-sig or partial signing scenarios
 */
export class BatchWalletSigner {
  private signers: Map<Address, WalletSignerAdapter> = new Map();

  /**
   * Add a wallet to the batch
   */
  addWallet(wallet: WalletProvider): void {
    if (!wallet.publicKey) {
      throw new Error('Wallet must be connected');
    }

    const adapter = new WalletSignerAdapter(wallet);
    this.signers.set(wallet.publicKey, adapter);
  }

  /**
   * Remove a wallet from the batch
   */
  removeWallet(publicKey: Address): boolean {
    return this.signers.delete(publicKey);
  }

  /**
   * Get all signers
   */
  getSigners(): Signer[] {
    return Array.from(this.signers.values());
  }

  /**
   * Sign a message with all wallets
   */
  async signWithAll(message: Uint8Array): Promise<Map<Address, Signature>> {
    const signatures = new Map<Address, Signature>();

    for (const [publicKey, signer] of this.signers.entries()) {
      try {
        const signature = await signer.sign(message);
        signatures.set(publicKey, signature);
      } catch (error) {
        console.error(`Failed to sign with wallet ${publicKey}:`, error);
        // Continue with other signers
      }
    }

    return signatures;
  }

  /**
   * Sign with specific wallets
   */
  async signWith(message: Uint8Array, publicKeys: Address[]): Promise<Map<Address, Signature>> {
    const signatures = new Map<Address, Signature>();

    for (const publicKey of publicKeys) {
      const signer = this.signers.get(publicKey);
      if (!signer) {
        throw new Error(`No signer found for ${publicKey}`);
      }

      const signature = await signer.sign(message);
      signatures.set(publicKey, signature);
    }

    return signatures;
  }
}
