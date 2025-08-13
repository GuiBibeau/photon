import { describe, it, expect, beforeEach } from 'vitest';
import { isWalletInstalled, getWalletMetadata } from '../src/wallet/detector';
import { WalletReadyState } from '../src/types';

describe('Wallet detector', () => {
  beforeEach(() => {
    // Clear any wallet properties on window
    const win = window as any;
    delete win.phantom;
    delete win.solflare;
    delete win.backpack;
    delete win.glow;
    delete win.braveSolana;
  });

  describe('isWalletInstalled', () => {
    it('should return false when wallet is not installed', () => {
      expect(isWalletInstalled('phantom')).toBe(false);
      expect(isWalletInstalled('solflare')).toBe(false);
      expect(isWalletInstalled('backpack')).toBe(false);
    });

    it('should return true when Phantom is installed', () => {
      const win = window as any;
      win.phantom = { solana: {} };
      expect(isWalletInstalled('phantom')).toBe(true);
    });

    it('should return true when Solflare is installed', () => {
      const win = window as any;
      win.solflare = {};
      expect(isWalletInstalled('solflare')).toBe(true);
    });

    it('should handle case-insensitive wallet names', () => {
      const win = window as any;
      win.phantom = { solana: {} };
      expect(isWalletInstalled('PHANTOM')).toBe(true);
      expect(isWalletInstalled('Phantom')).toBe(true);
    });

    it('should return false for unknown wallet', () => {
      expect(isWalletInstalled('unknown-wallet')).toBe(false);
    });
  });

  describe('getWalletMetadata', () => {
    it('should return metadata for wallet', () => {
      const metadata = getWalletMetadata('phantom');
      expect(metadata).toEqual({
        name: 'phantom',
        readyState: WalletReadyState.NotDetected,
        isInstalled: false,
        isMobile: false,
      });
    });
  });
});
