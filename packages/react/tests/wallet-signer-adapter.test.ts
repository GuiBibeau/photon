import { describe, it, expect, vi } from 'vitest';
import {
  WalletSignerAdapter,
  walletToSigner,
  isWalletSigner,
  extractWalletFromSigner,
  BatchWalletSigner,
} from '../src/wallet/signer-adapter';
import type { WalletProvider } from '../src/types';
import type { Address } from '@photon/addresses';
import type { Signature } from '@photon/crypto';

describe('Wallet Signer Adapter', () => {
  const mockAddress = '11111111111111111111111111111111' as Address;
  const mockSignature = new Uint8Array(64) as Signature;

  const createMockWallet = (connected = true): WalletProvider => ({
    name: 'Mock Wallet',
    icon: 'icon.png',
    url: 'https://example.com',
    publicKey: connected ? mockAddress : null,
    connected,
    connecting: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    signTransaction: vi.fn(),
    signAllTransactions: vi.fn(),
    signMessage: vi.fn().mockResolvedValue(mockSignature),
    on: vi.fn(),
    off: vi.fn(),
  });

  describe('WalletSignerAdapter', () => {
    it('should create signer from connected wallet', () => {
      const wallet = createMockWallet(true);
      const signer = new WalletSignerAdapter(wallet);

      expect(signer.publicKey).toBe(mockAddress);
      expect(signer.metadata.name).toBe('Mock Wallet');
      expect(signer.metadata.type).toBe('wallet');
      expect(signer.metadata.extractable).toBe(false);
    });

    it('should throw if wallet is not connected', () => {
      const wallet = createMockWallet(false);

      expect(() => new WalletSignerAdapter(wallet)).toThrow(
        'Wallet must be connected to create signer adapter',
      );
    });

    it('should sign message using wallet', async () => {
      const wallet = createMockWallet(true);
      const signer = new WalletSignerAdapter(wallet);

      const message = new Uint8Array([1, 2, 3]);
      const signature = await signer.sign(message);

      expect(wallet.signMessage).toHaveBeenCalledWith(message);
      expect(signature).toBe(mockSignature);
    });

    it('should throw when signing with disconnected wallet', async () => {
      const wallet = createMockWallet(true);
      const signer = new WalletSignerAdapter(wallet);

      // Disconnect wallet
      wallet.connected = false;

      const message = new Uint8Array([1, 2, 3]);
      await expect(signer.sign(message)).rejects.toThrow('Wallet is not connected');
    });

    it('should check connection status', () => {
      const wallet = createMockWallet(true);
      const signer = new WalletSignerAdapter(wallet);

      expect(signer.isConnected()).toBe(true);

      wallet.connected = false;
      expect(signer.isConnected()).toBe(false);

      wallet.connected = true;
      wallet.publicKey = null;
      expect(signer.isConnected()).toBe(false);
    });

    it('should get underlying wallet', () => {
      const wallet = createMockWallet(true);
      const signer = new WalletSignerAdapter(wallet);

      expect(signer.getWallet()).toBe(wallet);
    });
  });

  describe('Helper functions', () => {
    it('walletToSigner should create adapter', () => {
      const wallet = createMockWallet(true);
      const signer = walletToSigner(wallet);

      expect(signer).toBeInstanceOf(WalletSignerAdapter);
      expect(signer.publicKey).toBe(mockAddress);
    });

    it('isWalletSigner should identify adapter', () => {
      const wallet = createMockWallet(true);
      const signer = walletToSigner(wallet);
      const notWalletSigner = {
        publicKey: mockAddress,
        sign: vi.fn(),
      };

      expect(isWalletSigner(signer)).toBe(true);
      expect(isWalletSigner(notWalletSigner)).toBe(false);
    });

    it('extractWalletFromSigner should extract wallet', () => {
      const wallet = createMockWallet(true);
      const signer = walletToSigner(wallet);
      const notWalletSigner = {
        publicKey: mockAddress,
        sign: vi.fn(),
      };

      expect(extractWalletFromSigner(signer)).toBe(wallet);
      expect(extractWalletFromSigner(notWalletSigner as any)).toBe(null);
    });
  });

  describe('BatchWalletSigner', () => {
    it('should add and remove wallets', () => {
      const batch = new BatchWalletSigner();
      const wallet1 = createMockWallet(true);
      const wallet2 = createMockWallet(true);
      wallet2.publicKey = '22222222222222222222222222222222' as Address;

      batch.addWallet(wallet1);
      batch.addWallet(wallet2);

      const signers = batch.getSigners();
      expect(signers).toHaveLength(2);

      const publicKey = wallet1.publicKey;
      if (!publicKey) {
        throw new Error('Expected wallet to have publicKey');
      }
      const removed = batch.removeWallet(publicKey);
      expect(removed).toBe(true);
      expect(batch.getSigners()).toHaveLength(1);
    });

    it('should throw when adding disconnected wallet', () => {
      const batch = new BatchWalletSigner();
      const wallet = createMockWallet(false);

      expect(() => batch.addWallet(wallet)).toThrow('Wallet must be connected');
    });

    it('should sign with all wallets', async () => {
      const batch = new BatchWalletSigner();
      const wallet1 = createMockWallet(true);
      const wallet2 = createMockWallet(true);
      wallet2.publicKey = '22222222222222222222222222222222' as Address;

      batch.addWallet(wallet1);
      batch.addWallet(wallet2);

      const message = new Uint8Array([1, 2, 3]);
      const signatures = await batch.signWithAll(message);

      expect(signatures.size).toBe(2);
      const pk1 = wallet1.publicKey;
      const pk2 = wallet2.publicKey;
      if (!pk1 || !pk2) {
        throw new Error('Expected wallets to have publicKeys');
      }
      expect(signatures.get(pk1)).toBe(mockSignature);
      expect(signatures.get(pk2)).toBe(mockSignature);
    });

    it('should continue signing if one wallet fails', async () => {
      const batch = new BatchWalletSigner();
      const wallet1 = createMockWallet(true);
      const wallet2 = createMockWallet(true);
      wallet2.publicKey = '22222222222222222222222222222222' as Address;
      wallet2.signMessage = vi.fn().mockRejectedValue(new Error('User rejected'));

      batch.addWallet(wallet1);
      batch.addWallet(wallet2);

      const message = new Uint8Array([1, 2, 3]);
      const signatures = await batch.signWithAll(message);

      expect(signatures.size).toBe(1);
      const pk1 = wallet1.publicKey;
      const pk2 = wallet2.publicKey;
      if (!pk1 || !pk2) {
        throw new Error('Expected wallets to have publicKeys');
      }
      expect(signatures.has(pk1)).toBe(true);
      expect(signatures.has(pk2)).toBe(false);
    });

    it('should sign with specific wallets', async () => {
      const batch = new BatchWalletSigner();
      const wallet1 = createMockWallet(true);
      const wallet2 = createMockWallet(true);
      const wallet3 = createMockWallet(true);
      wallet2.publicKey = '22222222222222222222222222222222' as Address;
      wallet3.publicKey = '33333333333333333333333333333333' as Address;

      batch.addWallet(wallet1);
      batch.addWallet(wallet2);
      batch.addWallet(wallet3);

      const message = new Uint8Array([1, 2, 3]);
      const pk1 = wallet1.publicKey;
      const pk3 = wallet3.publicKey;
      if (!pk1 || !pk3) {
        throw new Error('Expected wallets to have publicKeys');
      }
      const signatures = await batch.signWith(message, [pk1, pk3]);

      expect(signatures.size).toBe(2);
      const pk2 = wallet2.publicKey;
      if (!pk1 || !pk2 || !pk3) {
        throw new Error('Expected wallets to have publicKeys');
      }
      expect(signatures.has(pk1)).toBe(true);
      expect(signatures.has(pk3)).toBe(true);
      expect(signatures.has(pk2)).toBe(false);
    });

    it('should throw if signer not found', async () => {
      const batch = new BatchWalletSigner();
      const unknownKey = '99999999999999999999999999999999' as Address;

      const message = new Uint8Array([1, 2, 3]);
      await expect(batch.signWith(message, [unknownKey])).rejects.toThrow(
        `No signer found for ${unknownKey}`,
      );
    });
  });
});
