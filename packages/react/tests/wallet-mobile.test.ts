import { describe, it, expect, beforeEach } from 'vitest';
import { isMobileDevice, isInMobileWalletBrowser, generateDeepLink } from '../src/wallet/mobile';

describe('Mobile wallet utilities', () => {
  let originalUserAgent: string;

  beforeEach(() => {
    originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
      configurable: true,
    });
  });

  describe('isMobileDevice', () => {
    it('should return false for desktop browsers', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        configurable: true,
      });
      expect(isMobileDevice()).toBe(false);
    });

    it('should return true for iPhone', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      });
      expect(isMobileDevice()).toBe(true);
    });

    it('should return true for Android', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G960U)',
        configurable: true,
      });
      expect(isMobileDevice()).toBe(true);
    });
  });

  describe('isInMobileWalletBrowser', () => {
    it('should return false for regular browsers', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      });
      expect(isInMobileWalletBrowser()).toBe(false);
    });

    it('should return true for Phantom mobile browser', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 Phantom/1.0',
        configurable: true,
      });
      expect(isInMobileWalletBrowser()).toBe(true);
    });

    it('should return true for Solflare mobile browser', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 Solflare/1.0',
        configurable: true,
      });
      expect(isInMobileWalletBrowser()).toBe(true);
    });
  });

  describe('generateDeepLink', () => {
    it('should generate deep link for phantom', () => {
      const link = generateDeepLink({
        walletName: 'phantom',
        action: 'connect',
        params: { cluster: 'mainnet-beta' },
      });
      expect(link).toBe('phantom://connect?cluster=mainnet-beta');
    });

    it('should include return URL when provided', () => {
      const link = generateDeepLink({
        walletName: 'phantom',
        action: 'connect',
        params: { cluster: 'mainnet-beta' },
        returnUrl: 'https://example.com/callback',
      });
      expect(link).toContain('return_url=https%3A%2F%2Fexample.com%2Fcallback');
    });

    it('should handle unknown wallet', () => {
      const link = generateDeepLink({
        walletName: 'unknown',
        action: 'connect',
        params: {},
      });
      expect(link).toBe('connect?');
    });
  });
});
