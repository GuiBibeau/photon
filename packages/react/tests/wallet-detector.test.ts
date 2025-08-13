import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  detectWallets,
  isWalletInstalled,
  getWalletMetadata,
  validateProvider,
  detectMobilePlatform,
  KNOWN_WALLETS,
} from '../src/wallet/detector';
import { WalletReadyState } from '../src/types';

describe('Wallet detector', () => {
  let originalWindow: Window & typeof globalThis;
  let mockWindow: any;

  beforeEach(() => {
    // Save original window
    originalWindow = global.window;

    // Create mock window
    mockWindow = {
      navigator: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
        wallets: undefined,
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      location: {
        origin: 'https://example.com',
      },
    };

    // Replace global window
    global.window = mockWindow as any;
  });

  afterEach(() => {
    // Restore original window
    global.window = originalWindow;
    vi.clearAllMocks();
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
    it('should return metadata for known wallet', () => {
      const metadata = getWalletMetadata('phantom');

      expect(metadata.name).toBe('Phantom');
      expect(metadata.icon).toBeDefined();
      expect(metadata.url).toBe('https://phantom.app');
      expect(metadata.readyState).toBe(WalletReadyState.NotDetected);
      expect(metadata.isInstalled).toBe(false);
    });

    it('should detect installed wallet', () => {
      mockWindow.phantom = { solana: {} };
      const metadata = getWalletMetadata('phantom');

      expect(metadata.readyState).toBe(WalletReadyState.Installed);
      expect(metadata.isInstalled).toBe(true);
    });

    it('should include platform support', () => {
      const phantomMetadata = getWalletMetadata('phantom');
      expect(phantomMetadata.platforms).toContain('browser-extension');
      expect(phantomMetadata.platforms).toContain('ios');
      expect(phantomMetadata.platforms).toContain('android');
    });
  });

  describe('detectWallets', () => {
    it('should detect Phantom wallet when injected', async () => {
      // Mock Phantom wallet
      mockWindow.phantom = {
        solana: {
          isPhantom: true,
          publicKey: null,
          isConnected: false,
          connect: vi.fn(),
          disconnect: vi.fn(),
          signTransaction: vi.fn(),
          signMessage: vi.fn(),
          on: vi.fn(),
          off: vi.fn(),
        },
      };

      const wallets = await detectWallets({ timeout: 100 });

      expect(wallets).toHaveLength(1);
      expect(wallets[0].metadata.name).toBe('Phantom');
      expect(wallets[0].detectionMethod).toBe('window-injection');
    });

    it('should detect multiple wallets', async () => {
      // Mock multiple wallets
      mockWindow.phantom = {
        solana: {
          isPhantom: true,
          publicKey: null,
          isConnected: false,
          connect: vi.fn(),
          disconnect: vi.fn(),
          signTransaction: vi.fn(),
          signMessage: vi.fn(),
          on: vi.fn(),
          off: vi.fn(),
        },
      };

      mockWindow.solflare = {
        isSolflare: true,
        publicKey: null,
        isConnected: false,
        connect: vi.fn(),
        disconnect: vi.fn(),
        signTransaction: vi.fn(),
        signMessage: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      };

      const wallets = await detectWallets({ timeout: 100 });

      expect(wallets).toHaveLength(2);
      const walletNames = wallets.map((w) => w.metadata.name);
      expect(walletNames).toContain('Phantom');
      expect(walletNames).toContain('Solflare');
    });
  });

  describe('validateProvider', () => {
    it('should validate correct provider', () => {
      const provider = {
        isPhantom: true,
        publicKey: null,
        isConnected: false,
        connect: vi.fn(),
        disconnect: vi.fn(),
        signTransaction: vi.fn(),
        signMessage: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      };

      const result = validateProvider(provider);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.securityRisk).toBe('low');
      expect(result.detectedIdentifiers).toContain('isPhantom');
    });

    it('should detect multiple identifiers as security risk', () => {
      const provider = {
        isPhantom: true,
        isSolflare: true, // Suspicious!
        publicKey: null,
        isConnected: false,
        connect: vi.fn(),
        disconnect: vi.fn(),
        signTransaction: vi.fn(),
        signMessage: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      };

      const result = validateProvider(provider);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Multiple wallet identifiers detected');
      expect(result.securityRisk).toBe('high');
      expect(result.detectedIdentifiers).toHaveLength(2);
    });
  });

  describe('detectMobilePlatform', () => {
    it('should detect iOS platform', () => {
      mockWindow.navigator.userAgent =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15';

      const platform = detectMobilePlatform();

      expect(platform.platform).toBe('ios');
      expect(platform.version).toBe('14.0');
      expect(platform.capabilities).toBeDefined();
      expect((platform.capabilities as any).noMWA).toBe(true);
    });

    it('should detect Android platform', () => {
      mockWindow.navigator.userAgent =
        'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36';

      const platform = detectMobilePlatform();

      expect(platform.platform).toBe('android');
      expect(platform.version).toBe('11');
      expect(platform.capabilities).toBeDefined();
      expect((platform.capabilities as any).mwaSupport).toBe(true);
    });
  });

  describe('KNOWN_WALLETS', () => {
    it('should have all expected wallets', () => {
      expect(KNOWN_WALLETS).toHaveProperty('phantom');
      expect(KNOWN_WALLETS).toHaveProperty('solflare');
      expect(KNOWN_WALLETS).toHaveProperty('backpack');
      expect(KNOWN_WALLETS).toHaveProperty('glow');
      expect(KNOWN_WALLETS).toHaveProperty('brave');
      expect(KNOWN_WALLETS).toHaveProperty('coinbase');
      expect(KNOWN_WALLETS).toHaveProperty('exodus');
      expect(KNOWN_WALLETS).toHaveProperty('trust');
    });
  });
});
