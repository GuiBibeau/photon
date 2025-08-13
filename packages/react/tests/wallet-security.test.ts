import { describe, it, expect } from 'vitest';
import {
  type ProviderSecurityAssessment,
  type RateLimitConfig,
  type AuthenticationMessage,
  type Session,
  type SecurityEvent,
  type HijackAssessment,
} from '../src/wallet/security-types';

describe('Wallet Security Types', () => {
  describe('Security Assessment', () => {
    it('should define provider security assessment', () => {
      const assessment: ProviderSecurityAssessment = {
        isValid: false,
        riskLevel: 'high',
        issues: [
          {
            type: 'multiple-identifiers',
            severity: 'high',
            description: 'Multiple wallet identifiers detected',
            affectedProperty: 'isPhantom, isSolflare',
          },
        ],
        recommendations: ['Avoid connecting to this provider', 'Verify wallet authenticity'],
      };

      expect(assessment.isValid).toBe(false);
      expect(assessment.riskLevel).toBe('high');
      expect(assessment.issues).toHaveLength(1);
      expect(assessment.issues[0].type).toBe('multiple-identifiers');
    });

    it('should categorize risk levels', () => {
      const riskLevels: ProviderSecurityAssessment['riskLevel'][] = [
        'low',
        'medium',
        'high',
        'critical',
      ];

      riskLevels.forEach((level) => {
        const assessment: ProviderSecurityAssessment = {
          isValid: level === 'low',
          riskLevel: level,
          issues: [],
          recommendations: [],
        };

        expect(['low', 'medium', 'high', 'critical']).toContain(assessment.riskLevel);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should define rate limit configuration', () => {
      const config: RateLimitConfig = {
        maxAttempts: 5,
        timeWindow: 60000, // 1 minute
        perWallet: true,
        globalMaxAttempts: 10,
        backoff: {
          initialDelay: 1000,
          maxDelay: 30000,
          multiplier: 2,
          resetOnSuccess: true,
        },
      };

      expect(config.maxAttempts).toBe(5);
      expect(config.timeWindow).toBe(60000);
      expect(config.backoff?.multiplier).toBe(2);
      expect(config.backoff?.resetOnSuccess).toBe(true);
    });

    it('should support exponential backoff', () => {
      const backoff = {
        initialDelay: 1000,
        maxDelay: 30000,
        multiplier: 2,
        resetOnSuccess: true,
      };

      let delay = backoff.initialDelay;
      const delays = [delay];

      for (let i = 0; i < 5; i++) {
        delay = Math.min(delay * backoff.multiplier, backoff.maxDelay);
        delays.push(delay);
      }

      expect(delays).toEqual([1000, 2000, 4000, 8000, 16000, 30000]);
    });
  });

  describe('Authentication Message', () => {
    it('should define SIWS authentication message', () => {
      const message: AuthenticationMessage = {
        domain: 'example.com',
        address: '11111111111111111111111111111111',
        statement: 'Sign this message to authenticate your wallet',
        uri: 'https://example.com',
        version: '1',
        chainId: 'solana:mainnet',
        nonce: 'randomNonce123',
        issuedAt: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 3600000).toISOString(),
        serialize: () => new TextEncoder().encode('serialized'),
      };

      expect(message.domain).toBe('example.com');
      expect(message.chainId).toBe('solana:mainnet');
      const serialized = message.serialize();
      expect(serialized).toBeDefined();
      expect(serialized.constructor.name).toBe('Uint8Array');
    });
  });

  describe('Session Management', () => {
    it('should define wallet session', () => {
      const session: Session = {
        id: 'session123',
        publicKey: '11111111111111111111111111111111' as any,
        walletName: 'Phantom',
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000, // 24 hours
        lastActivity: Date.now(),
        metadata: {
          userAgent: 'Mozilla/5.0...',
          origin: 'https://example.com',
          ipAddress: '192.168.1.1',
          deviceId: 'device123',
        },
      };

      expect(session.id).toBe('session123');
      expect(session.walletName).toBe('Phantom');
      expect(session.expiresAt).toBeGreaterThan(session.createdAt);
      expect(session.metadata?.origin).toBe('https://example.com');
    });

    it('should check session expiration', () => {
      const now = Date.now();
      const expiredSession: Session = {
        id: 'expired',
        publicKey: '' as any,
        walletName: 'Test',
        createdAt: now - 86400000,
        expiresAt: now - 3600000, // Expired 1 hour ago
        lastActivity: now - 3600000,
      };

      const activeSession: Session = {
        id: 'active',
        publicKey: '' as any,
        walletName: 'Test',
        createdAt: now,
        expiresAt: now + 3600000, // Expires in 1 hour
        lastActivity: now,
      };

      expect(expiredSession.expiresAt < now).toBe(true);
      expect(activeSession.expiresAt > now).toBe(true);
    });
  });

  describe('Security Events', () => {
    it('should define security event types', () => {
      const event: SecurityEvent = {
        type: 'rate-limit-exceeded',
        timestamp: Date.now(),
        severity: 'medium',
        details: {
          identifier: 'user123',
          attempts: 6,
          maxAttempts: 5,
        },
      };

      expect(event.type).toBe('rate-limit-exceeded');
      expect(event.severity).toBe('medium');
      expect(event.details.attempts).toBeGreaterThan(event.details.maxAttempts);
    });

    it('should support all event types', () => {
      const eventTypes: SecurityEvent['type'][] = [
        'connection-attempt',
        'rate-limit-exceeded',
        'suspicious-provider',
        'invalid-origin',
        'session-hijack-attempt',
        'signature-verification-failed',
      ];

      eventTypes.forEach((type) => {
        const event: SecurityEvent = {
          type,
          timestamp: Date.now(),
          severity: 'low',
          details: {},
        };

        expect(eventTypes).toContain(event.type);
      });
    });
  });

  describe('Hijack Detection', () => {
    it('should define hijack assessment', () => {
      const assessment: HijackAssessment = {
        suspicious: true,
        indicators: [
          'Multiple wallet identifiers',
          'Unexpected methods present',
          'Modified prototype chain',
        ],
        confidence: 'high',
        recommendation: 'avoid',
      };

      expect(assessment.suspicious).toBe(true);
      expect(assessment.indicators).toHaveLength(3);
      expect(assessment.confidence).toBe('high');
      expect(assessment.recommendation).toBe('avoid');
    });

    it('should provide safety recommendations', () => {
      const recommendations: HijackAssessment['recommendation'][] = ['safe', 'caution', 'avoid'];

      recommendations.forEach((rec) => {
        expect(['safe', 'caution', 'avoid']).toContain(rec);
      });
    });
  });

  describe('CSP Configuration', () => {
    it('should define Content Security Policy for wallets', () => {
      const csp = {
        allowedOrigins: ['https://phantom.app', 'https://solflare.com'],
        frameAncestors: ['self'],
        connectSources: ['wss://localhost:*', 'https://api.phantom.app'],
        scriptSources: ['self', 'unsafe-inline'],
      };

      expect(csp.allowedOrigins).toContain('https://phantom.app');
      expect(csp.frameAncestors).toContain('self');
      expect(csp.connectSources[0]).toMatch(/^wss:\/\/localhost/);
    });
  });
});
