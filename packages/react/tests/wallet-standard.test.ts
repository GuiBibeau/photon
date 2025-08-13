import { describe, it, expect } from 'vitest';
import {
  isWalletStandard,
  type StandardWallet,
  type WalletAccount,
  type StandardWalletFeatures,
  type RegisterWalletEvent,
} from '../src/wallet/standard-types';

describe('Wallet Standard types', () => {
  describe('isWalletStandard', () => {
    it('should identify valid StandardWallet', () => {
      const validWallet: StandardWallet = {
        name: 'Test Wallet',
        icon: 'data:image/svg+xml;base64,PHN2Zy8+',
        version: '1.0.0',
        chains: ['solana:mainnet', 'solana:devnet'],
        features: {
          'standard:connect': {
            version: '1.0.0',
            connect: async () => ({ accounts: [] }),
          },
        },
        accounts: [],
        on: () => () => {},
      };

      expect(isWalletStandard(validWallet)).toBe(true);
    });

    it('should reject invalid objects', () => {
      expect(isWalletStandard(null)).toBe(false);
      expect(isWalletStandard(undefined)).toBe(false);
      expect(isWalletStandard({})).toBe(false);
      expect(isWalletStandard({ name: 'Test' })).toBe(false);
    });

    it('should reject objects with wrong property types', () => {
      const invalidWallet = {
        name: 123, // Should be string
        version: '1.0.0',
        chains: ['solana:mainnet'],
        features: {},
        accounts: [],
        on: () => () => {},
      };

      expect(isWalletStandard(invalidWallet)).toBe(false);
    });
  });

  describe('WalletAccount interface', () => {
    it('should define account properties', () => {
      const account: WalletAccount = {
        address: '11111111111111111111111111111111',
        publicKey: new Uint8Array(32),
        chains: ['solana:mainnet'],
        features: ['solana:signTransaction', 'solana:signMessage'],
        label: 'Main Account',
        icon: 'https://example.com/icon.png',
      };

      expect(account.address).toBe('11111111111111111111111111111111');
      expect(account.publicKey).toBeInstanceOf(Uint8Array);
      expect(account.chains).toContain('solana:mainnet');
      expect(account.features).toContain('solana:signTransaction');
    });
  });

  describe('StandardWalletFeatures', () => {
    it('should support standard features', () => {
      const features: StandardWalletFeatures = {
        'standard:connect': {
          version: '1.0.0',
          connect: async (options) => {
            expect(options?.silent).toBeDefined();
            return { accounts: [] };
          },
        },
        'standard:disconnect': {
          version: '1.0.0',
          disconnect: async () => {},
        },
        'solana:signTransaction': {
          version: '1.0.0',
          chains: ['solana:mainnet'],
          signTransaction: async ({ transaction, account }) => {
            expect(transaction).toBeDefined();
            expect(account).toBeDefined();
            return { signedTransaction: transaction };
          },
        },
      };

      expect(features['standard:connect']).toBeDefined();
      expect(features['solana:signTransaction']).toBeDefined();
      expect(features['standard:connect']?.version).toBe('1.0.0');
    });
  });

  describe('RegisterWalletEvent', () => {
    it('should define wallet registration event', () => {
      const mockWallet: StandardWallet = {
        name: 'Mock Wallet',
        icon: 'data:image/svg+xml;base64,',
        version: '1.0.0',
        chains: [],
        features: {},
        accounts: [],
        on: () => () => {},
      };

      const event = {
        type: 'wallet-standard:register-wallet',
        detail: { wallet: mockWallet },
        registerWallet: (wallet: StandardWallet) => {
          expect(wallet).toBe(mockWallet);
        },
      } as RegisterWalletEvent;

      expect(event.type).toBe('wallet-standard:register-wallet');
      expect(event.detail.wallet).toBe(mockWallet);
    });
  });

  describe('Wallet icon validation', () => {
    it('should accept valid icon formats', () => {
      const dataUriIcon = 'data:image/svg+xml;base64,PHN2Zy8+';
      const httpsIcon = 'https://example.com/icon.png';

      const wallet1: Pick<StandardWallet, 'icon'> = { icon: dataUriIcon };
      const wallet2: Pick<StandardWallet, 'icon'> = { icon: httpsIcon };

      expect(wallet1.icon).toMatch(/^data:image\//);
      expect(wallet2.icon).toMatch(/^https:\/\//);
    });
  });
});
