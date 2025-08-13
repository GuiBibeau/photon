import { describe, it, expect } from 'vitest';
import {
  MWAErrorCode,
  type MWASessionConfig,
  type AndroidIntent,
  type MWAAuthorizationRequest,
  type MWAAuthorizationResponse,
  type DeepLinkWalletConfig,
  type DeepLinkRequest,
  type IOSLimitations,
  type AndroidCapabilities,
  type PlatformDetection,
} from '../src/wallet/mobile-types';

describe('Mobile Wallet Types', () => {
  describe('MWA Session Configuration', () => {
    it('should define localhost-only session config', () => {
      const config: MWASessionConfig = {
        host: '127.0.0.1',
        port: 49152,
        timeout: 30000,
        encryption: {
          algorithm: 'ECDH',
          curve: 'P-256',
          sessionCipher: 'AES-128-GCM',
        },
      };

      expect(config.host).toMatch(/^(127\.0\.0\.1|localhost)$/);
      expect(config.port).toBeGreaterThanOrEqual(49152);
      expect(config.port).toBeLessThanOrEqual(65535);
      expect(config.encryption?.algorithm).toBe('ECDH');
    });

    it('should only allow localhost for security', () => {
      const validHosts: MWASessionConfig['host'][] = ['127.0.0.1', 'localhost'];

      validHosts.forEach((host) => {
        const config: MWASessionConfig = { host, port: 50000 };
        expect(['127.0.0.1', 'localhost']).toContain(config.host);
      });
    });
  });

  describe('Android Intent', () => {
    it('should define Android intent structure', () => {
      const intent: AndroidIntent = {
        action: 'android.intent.action.VIEW',
        uri: 'solana-wallet://connect',
        category: 'android.intent.category.BROWSABLE',
        flags: 0x10000000, // FLAG_ACTIVITY_NEW_TASK
      };

      expect(intent.action).toBe('android.intent.action.VIEW');
      expect(intent.uri).toMatch(/^solana-wallet:\/\//);
      expect(intent.category).toBe('android.intent.category.BROWSABLE');
    });
  });

  describe('MWA Authorization', () => {
    it('should define authorization request', () => {
      const request: MWAAuthorizationRequest = {
        type: 'authorize',
        appIdentity: {
          identityName: 'Test App',
          iconUri: 'https://example.com/icon.png',
          identityUri: 'https://example.com',
          cluster: 'mainnet-beta',
        },
        features: ['solana:signTransaction', 'solana:signMessage'],
      };

      expect(request.type).toBe('authorize');
      expect(request.appIdentity.cluster).toBe('mainnet-beta');
      expect(request.features).toContain('solana:signTransaction');
    });

    it('should define authorization response', () => {
      const response: MWAAuthorizationResponse = {
        type: 'authorize_response',
        authToken: 'token123',
        accounts: [
          {
            address: '11111111111111111111111111111111',
            displayAddress: '1111...1111',
            displayAddressFormat: 'base58',
            accountLabel: 'Main Wallet',
          },
        ],
        walletUriBase: 'https://wallet.example.com',
        cluster: 'mainnet-beta',
      };

      expect(response.authToken).toBe('token123');
      expect(response.accounts).toHaveLength(1);
      expect(response.accounts[0].displayAddressFormat).toBe('base58');
    });
  });

  describe('MWA Error Codes', () => {
    it('should define all error codes', () => {
      expect(MWAErrorCode.AUTHORIZATION_NOT_VALID).toBe(-1);
      expect(MWAErrorCode.NOT_AUTHORIZED).toBe(-2);
      expect(MWAErrorCode.TOO_MANY_PAYLOADS).toBe(-3);
      expect(MWAErrorCode.REQUEST_TOO_LARGE).toBe(-4);
      expect(MWAErrorCode.SESSION_CLOSED).toBe(-5);
      expect(MWAErrorCode.SESSION_TIMEOUT).toBe(-6);
      expect(MWAErrorCode.USER_DECLINED).toBe(-7);
      expect(MWAErrorCode.INTERNAL_ERROR).toBe(-100);
    });
  });

  describe('Deep Link Configuration', () => {
    it('should define wallet deep link config', () => {
      const config: DeepLinkWalletConfig = {
        walletName: 'Phantom',
        scheme: 'phantom://',
        universalLink: 'https://phantom.app/ul/v1',
        supportedActions: ['connect', 'signTransaction', 'signMessage'],
        platforms: ['ios', 'android'],
      };

      expect(config.scheme).toBe('phantom://');
      expect(config.supportedActions).toContain('connect');
      expect(config.platforms).toContain('ios');
      expect(config.platforms).toContain('android');
    });

    it('should define deep link request', () => {
      const request: DeepLinkRequest = {
        action: 'signTransaction',
        params: {
          dapp_name: 'Test DApp',
          dapp_url: 'https://example.com',
          cluster: 'mainnet-beta',
          transaction: 'base64EncodedTransaction',
          redirect_link: 'https://example.com/callback',
        },
      };

      expect(request.action).toBe('signTransaction');
      expect(request.params.dapp_name).toBe('Test DApp');
      expect(request.params.transaction).toBeDefined();
    });
  });

  describe('Platform Capabilities', () => {
    it('should define iOS limitations', () => {
      const limitations: IOSLimitations = {
        noLocalWebSocket: true,
        noMWA: true,
        backgroundDrops: true,
        requiresUniversalLinks: true,
      };

      expect(limitations.noLocalWebSocket).toBe(true);
      expect(limitations.noMWA).toBe(true);
      expect(limitations.backgroundDrops).toBe(true);
    });

    it('should define Android capabilities', () => {
      const capabilities: AndroidCapabilities = {
        mwaSupport: true,
        localWebSocket: true,
        intents: true,
        customSchemes: true,
      };

      expect(capabilities.mwaSupport).toBe(true);
      expect(capabilities.localWebSocket).toBe(true);
      expect(capabilities.intents).toBe(true);
    });

    it('should define platform detection', () => {
      const detection: PlatformDetection = {
        platform: 'android',
        version: '13',
        inWalletBrowser: false,
        capabilities: {
          mwaSupport: true,
          localWebSocket: true,
          intents: true,
          customSchemes: true,
        },
      };

      expect(detection.platform).toBe('android');
      expect(detection.version).toBe('13');
      expect(detection.capabilities).toBeDefined();
    });
  });

  describe('Mobile Connection Methods', () => {
    it('should define all connection methods', () => {
      const methods = ['mwa', 'deep-link-custom', 'deep-link-universal', 'in-app-browser'] as const;

      methods.forEach((method) => {
        const detection = {
          method,
          available: true,
        };

        expect(['mwa', 'deep-link-custom', 'deep-link-universal', 'in-app-browser']).toContain(
          detection.method,
        );
      });
    });
  });
});
