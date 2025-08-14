import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Address } from '@photon/addresses';
import type { InjectedProvider } from '../src/wallet/detector';
import {
  validateProviderEnhanced,
  createMethodSignatureValidator,
  createHijackDetector,
  createSecurityMonitor,
  createAuditLogger,
  createSessionValidator,
  verifyCustomScheme,
} from '../src/wallet/verification';
import { createSecurityManager } from '../src/wallet/security';

describe('Wallet Verification', () => {
  describe('Enhanced Provider Validation', () => {
    it('should validate a legitimate provider', () => {
      const provider = {
        isPhantom: true,
        publicKey: { toString: () => '11111111111111111111111111111111' },
        isConnected: false,
        connect: async () => ({ publicKey: '11111111111111111111111111111111' }),
        disconnect: async () => {},
        signTransaction: async (tx: unknown) => tx,
        signMessage: async (_msg: Uint8Array) => ({ signature: new Uint8Array(64) }),
        on: () => {},
        off: () => {},
      };

      const result = validateProviderEnhanced(provider);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.detectedIdentifiers).toContain('isPhantom');
      expect(result.securityRisk).toBe('low');
    });

    it('should detect multiple wallet identifiers', () => {
      const provider = {
        isPhantom: true,
        isSolflare: true, // Multiple identifiers - suspicious!
        publicKey: null,
        isConnected: false,
        connect: async () => ({ publicKey: '11111111111111111111111111111111' }),
        disconnect: async () => {},
        signTransaction: async (tx: unknown) => tx,
        signMessage: async (_msg: Uint8Array) => ({ signature: new Uint8Array(64) }),
        on: () => {},
      };

      const result = validateProviderEnhanced(provider);

      expect(result.isValid).toBe(false);
      expect(result.securityRisk).toBe('high');
      expect(result.detectedIdentifiers).toHaveLength(2);
      expect(result.issues).toContain('Multiple wallet identifiers detected - potential hijacking');
    });

    it('should detect missing required methods', () => {
      const provider = {
        isPhantom: true,
        publicKey: null,
        isConnected: false,
        connect: async () => ({ publicKey: '11111111111111111111111111111111' }),
        // Missing disconnect, signTransaction, signMessage
        on: () => {},
      };

      const result = validateProviderEnhanced(provider);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing required method: disconnect');
      expect(result.issues).toContain('Missing required method: signTransaction');
      expect(result.issues).toContain('Missing required method: signMessage');
    });

    it('should detect public key changes', () => {
      const provider = {
        isPhantom: true,
        publicKey: { toString: () => '22222222222222222222222222222222' },
        isConnected: true,
        connect: async () => ({ publicKey: '22222222222222222222222222222222' }),
        disconnect: async () => {},
        signTransaction: async (tx: unknown) => tx,
        signMessage: async (_msg: Uint8Array) => ({ signature: new Uint8Array(64) }),
        on: () => {},
      };

      const previousKey = '11111111111111111111111111111111' as Address;
      const result = validateProviderEnhanced(provider, previousKey);

      expect(result.isValid).toBe(false);
      expect(result.publicKeyConsistency).toBe(false);
      expect(result.issues).toContain('Public key changed unexpectedly');
      expect(result.securityRisk).toBe('high');
    });

    it('should validate method signatures', () => {
      const validator = createMethodSignatureValidator();

      // Valid connect function
      const validConnect = async function connect(_options?: { onlyIfTrusted?: boolean }) {
        return { publicKey: '123' };
      };
      expect(validator.validateConnect(validConnect)).toBe(true);

      // Invalid connect function (wrong signature)
      const invalidConnect = function doSomething() {};
      expect(validator.validateConnect(invalidConnect)).toBe(false);

      // Not a function
      expect(validator.validateConnect('not a function')).toBe(false);
    });
  });

  describe('Hijack Detection', () => {
    let detector: ReturnType<typeof createHijackDetector>;

    beforeEach(() => {
      detector = createHijackDetector();
    });

    it('should detect multiple identifiers as hijacking', () => {
      const provider = {
        isPhantom: true,
        isSolflare: true,
        isBackpack: true,
      };

      const assessment = detector.checkProvider(provider);

      expect(assessment.suspicious).toBe(true);
      expect(assessment.confidence).toBe('high');
      expect(assessment.recommendation).toBe('avoid');
      expect(assessment.indicators).toContain('Multiple wallet identifiers detected');
    });

    it('should detect eval usage in methods', () => {
      const provider = {
        isPhantom: true,
        connect: new Function('return eval("this.connect()")'),
        signTransaction: async (tx: unknown) => tx,
      };

      const assessment = detector.checkProvider(provider);

      expect(assessment.suspicious).toBe(true);
      expect(assessment.indicators.some((i: string) => i.includes('eval'))).toBe(true);
      expect(assessment.recommendation).toBe('avoid');
    });

    it('should verify wallet consistency', () => {
      const validPhantom = {
        isPhantom: true,
        connect: async () => {},
        disconnect: async () => {},
        signTransaction: async () => {},
        signMessage: async () => {},
        publicKey: null,
      };

      const check = detector.verifyWalletConsistency('phantom', validPhantom);

      expect(check.consistent).toBe(true);
      expect(check.missingProperties).toHaveLength(0);
      expect(check.unexpectedProperties).toHaveLength(0);
    });

    it('should detect inconsistent wallet properties', () => {
      const invalidPhantom = {
        isPhantom: true,
        isSolflare: true, // Unexpected!
        connect: async () => {},
        // Missing disconnect
        signTransaction: async () => {},
        signMessage: async () => {},
        publicKey: null,
      };

      const check = detector.verifyWalletConsistency('phantom', invalidPhantom);

      expect(check.consistent).toBe(false);
      expect(check.missingProperties).toContain('disconnect');
      expect(check.unexpectedProperties).toContain('isSolflare');
    });
  });

  describe('Security Monitoring', () => {
    let monitor: ReturnType<typeof createSecurityMonitor>;

    beforeEach(() => {
      monitor = createSecurityMonitor();
    });

    it('should log security events', () => {
      const event = {
        type: 'suspicious-provider' as const,
        timestamp: Date.now(),
        details: { pattern: 'Multiple identifiers' },
        severity: 'high' as const,
      };

      monitor.logEvent(event);

      const recent = monitor.getRecentEvents(1);
      expect(recent).toHaveLength(1);
      expect(recent[0] ?? {}).toMatchObject(event);
    });

    it('should filter events by type', () => {
      monitor.logEvent({
        type: 'rate-limit-exceeded',
        timestamp: Date.now(),
        details: {},
        severity: 'medium',
      });

      monitor.logEvent({
        type: 'suspicious-provider',
        timestamp: Date.now(),
        details: {},
        severity: 'high',
      });

      monitor.logEvent({
        type: 'rate-limit-exceeded',
        timestamp: Date.now() + 1000,
        details: {},
        severity: 'medium',
      });

      const rateLimitEvents = monitor.getEventsByType('rate-limit-exceeded');
      expect(rateLimitEvents).toHaveLength(2);
    });

    it('should clear old events', () => {
      const now = Date.now();

      // Add old event
      monitor.logEvent({
        type: 'suspicious-provider',
        timestamp: now - 10000,
        details: {},
        severity: 'medium',
      });

      // Add recent event
      monitor.logEvent({
        type: 'suspicious-provider',
        timestamp: now,
        details: {},
        severity: 'medium',
      });

      // Clear events older than 5 seconds
      monitor.clearOldEvents(5000);

      const events = monitor.getRecentEvents(10);
      expect(events).toHaveLength(1);
      expect(events[0]?.timestamp).toBe(now);
    });
  });

  describe('Audit Logging', () => {
    let auditLogger: ReturnType<typeof createAuditLogger>;

    beforeEach(() => {
      auditLogger = createAuditLogger();
    });

    it('should log connection attempts', () => {
      auditLogger.logConnectionAttempt('phantom', true);
      auditLogger.logConnectionAttempt('solflare', false, 'User rejected');

      const log = auditLogger.getAuditLog();
      expect(log).toHaveLength(2);
      expect(log[0]?.walletName).toBe('phantom');
      expect(log[0]?.success).toBe(true);
      expect(log[1]?.walletName).toBe('solflare');
      expect(log[1]?.success).toBe(false);
    });

    it('should log validation failures', () => {
      const issues = ['Missing method: connect', 'Multiple identifiers'];
      auditLogger.logValidationFailure('unknown', issues);

      const log = auditLogger.getAuditLog();
      expect(log).toHaveLength(1);
      expect(log[0]?.type).toBe('validation');
      expect(log[0]?.success).toBe(false);
      expect((log[0]?.details as { issues: string[] }).issues).toEqual(issues);
    });

    it('should export audit log as JSON', () => {
      auditLogger.logConnectionAttempt('phantom', true);
      auditLogger.logSecurityEvent('session-hijack-attempt', { indicators: ['test'] });

      const exported = auditLogger.exportAuditLog();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });
  });

  describe('Session Validation', () => {
    let sessionValidator: ReturnType<typeof createSessionValidator>;

    beforeEach(() => {
      sessionValidator = createSessionValidator();
    });

    it('should validate matching public keys', () => {
      const key1 = '11111111111111111111111111111111' as Address;
      const key2 = '11111111111111111111111111111111' as Address;

      expect(sessionValidator.validatePublicKey(key1, key2)).toBe(true);
    });

    it('should reject mismatched public keys', () => {
      const key1 = '11111111111111111111111111111111' as Address;
      const key2 = '22222222222222222222222222222222' as Address;

      expect(sessionValidator.validatePublicKey(key1, key2)).toBe(false);
    });

    it('should track public key changes', () => {
      const key1 = '11111111111111111111111111111111' as Address;
      const key2 = '22222222222222222222222222222222' as Address;

      sessionValidator.trackPublicKeyChange(null, key1);
      sessionValidator.trackPublicKeyChange(key1, key2);

      const history = sessionValidator.getPublicKeyHistory();
      expect(history).toHaveLength(2);
      expect(history[0]?.from).toBe(null);
      expect(history[0]?.to).toBe(key1);
      expect(history[1]?.from).toBe(key1);
      expect(history[1]?.to).toBe(key2);
    });
  });

  describe('Custom Scheme Verification', () => {
    it('should verify known custom schemes', async () => {
      const provider: InjectedProvider = {
        isPhantom: true,
        publicKey: { toString: () => '11111111111111111111111111111111' },
        isConnected: true,
        connect: async () => ({
          publicKey: { toString: () => '11111111111111111111111111111111' },
        }),
        disconnect: async () => {},
        signTransaction: async (tx) => tx,
        signMessage: async () => ({ signature: new Uint8Array(64) }),
        on: () => {},
      };

      const securityManager = createSecurityManager({
        maxAttempts: 5,
        timeWindow: 60000,
        perWallet: true,
      });

      // Mock signature verification
      vi.spyOn(securityManager, 'verifySignature').mockResolvedValue(true);

      const consoleSpy = vi.spyOn(console, 'warn');

      const result = await verifyCustomScheme('phantom://', provider, securityManager);

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Custom scheme phantom:// detected'),
      );
    });

    it('should reject unknown custom schemes', async () => {
      const provider: InjectedProvider = {
        isPhantom: true,
        publicKey: null,
        isConnected: false,
        connect: async () => ({
          publicKey: { toString: () => '11111111111111111111111111111111' },
        }),
        disconnect: async () => {},
        signTransaction: async (tx) => tx,
        signMessage: async () => ({ signature: new Uint8Array(64) }),
        on: () => {},
      };

      const securityManager = createSecurityManager({
        maxAttempts: 5,
        timeWindow: 60000,
        perWallet: true,
      });

      const result = await verifyCustomScheme('unknown://', provider, securityManager);

      expect(result).toBe(false);
    });

    it('should verify signature for connected wallets', async () => {
      const provider: InjectedProvider = {
        isPhantom: true,
        publicKey: { toString: () => '11111111111111111111111111111111' },
        isConnected: true,
        connect: async () => ({
          publicKey: { toString: () => '11111111111111111111111111111111' },
        }),
        disconnect: async () => {},
        signTransaction: async (tx) => tx,
        signMessage: async () => ({ signature: new Uint8Array(64) }),
        on: () => {},
      };

      const securityManager = createSecurityManager({
        maxAttempts: 5,
        timeWindow: 60000,
        perWallet: true,
      });

      const verifySpy = vi.spyOn(securityManager, 'verifySignature').mockResolvedValue(true);

      const result = await verifyCustomScheme('phantom://', provider, securityManager);

      expect(result).toBe(true);
      expect(verifySpy).toHaveBeenCalled();
    });
  });

  describe('Enhanced Security Manager Integration', () => {
    let securityManager: ReturnType<typeof createSecurityManager>;

    beforeEach(() => {
      securityManager = createSecurityManager({
        maxAttempts: 3,
        timeWindow: 60000,
        perWallet: true,
        globalMaxAttempts: 10,
        backoff: {
          initialDelay: 1000,
          maxDelay: 30000,
          multiplier: 2,
          resetOnSuccess: true,
        },
      });
    });

    it('should validate provider with enhanced checks', () => {
      const provider = {
        isPhantom: true,
        isSolflare: true, // Multiple identifiers!
        publicKey: null,
        isConnected: false,
        connect: async () => ({ publicKey: '11111111111111111111111111111111' }),
        disconnect: async () => {},
        signTransaction: async (tx: unknown) => tx,
        signMessage: async (_msg: Uint8Array) => ({ signature: new Uint8Array(64) }),
        on: () => {},
      };

      const assessment = securityManager.validateProvider(provider);

      expect(assessment.isValid).toBe(false);
      expect(assessment.riskLevel).toBe('critical');
      expect(assessment.recommendations).toContain('DO NOT connect to this wallet.');
    });

    it('should track security events through monitor', () => {
      const provider = {
        isPhantom: true,
        publicKey: null,
        isConnected: false,
        connect: new Function('return eval("this")'), // Suspicious!
        disconnect: async () => {},
        signTransaction: async (tx: unknown) => tx,
        signMessage: async (_msg: Uint8Array) => ({ signature: new Uint8Array(64) }),
        on: () => {},
      };

      securityManager.validateProvider(provider);

      const events = securityManager.monitor.getRecentEvents(10);
      expect(events.length).toBeGreaterThan(0);
      expect(events.some((e) => e.type === 'suspicious-provider')).toBe(true);
    });

    it('should log validation failures to audit log', () => {
      const provider = {
        // No identifier
        publicKey: null,
        isConnected: false,
        connect: async () => ({ publicKey: '11111111111111111111111111111111' }),
        disconnect: async () => {},
        signTransaction: async (tx: unknown) => tx,
        signMessage: async (_msg: Uint8Array) => ({ signature: new Uint8Array(64) }),
        on: () => {},
      };

      securityManager.validateProvider(provider);

      const auditLog = securityManager.auditLogger.getAuditLog();
      expect(auditLog.some((entry) => entry.type === 'validation')).toBe(true);
    });

    it('should integrate rate limiting with monitoring', () => {
      // Exceed rate limit
      for (let i = 0; i < 4; i++) {
        securityManager.recordConnectionAttempt('test-wallet');
      }

      const canAttempt = securityManager.canAttemptConnection('test-wallet');
      expect(canAttempt).toBe(false);

      // Check that rate limit was logged
      const events = securityManager.monitor.getRecentEvents(10);
      expect(events.some((e) => e.type === 'rate-limit-exceeded')).toBe(true);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
