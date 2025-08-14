import type { Address } from '@photon/addresses';
import type { Signature } from '@photon/crypto';
import type {
  SecurityManager,
  ProviderSecurityAssessment,
  SecurityRiskLevel,
  SecurityIssue,
  RateLimitConfig,
  AuthenticationMessage,
  SecurityMonitor,
} from './security-types';
import {
  validateProviderEnhanced,
  createHijackDetector,
  createSecurityMonitor,
  createAuditLogger,
  createSessionValidator,
  type SessionValidator,
  type AuditLogger,
} from './verification';

/**
 * Rate limit tracker
 */
interface RateLimitTracker {
  attempts: number;
  firstAttemptTime: number;
  lastAttemptTime: number;
  backoffMultiplier: number;
}

/**
 * Extended security manager with enhanced verification
 */
export interface EnhancedSecurityManager extends SecurityManager {
  monitor: SecurityMonitor;
  auditLogger: AuditLogger;
  sessionValidator: SessionValidator;
  hijackDetector: ReturnType<typeof createHijackDetector>;
}

/**
 * Create a security manager instance
 */
export function createSecurityManager(rateLimitConfig: RateLimitConfig): EnhancedSecurityManager {
  const rateLimitTrackers = new Map<string, RateLimitTracker>();
  let globalAttempts = 0;
  let globalFirstAttempt = Date.now();

  // Initialize enhanced components
  const monitor = createSecurityMonitor();
  const auditLogger = createAuditLogger();
  const sessionValidator = createSessionValidator();
  const hijackDetector = createHijackDetector();

  /**
   * Reset rate limit tracker if time window has passed
   */
  function resetTrackerIfNeeded(tracker: RateLimitTracker, now: number): boolean {
    if (now - tracker.firstAttemptTime > rateLimitConfig.timeWindow) {
      tracker.attempts = 0;
      tracker.firstAttemptTime = now;
      tracker.backoffMultiplier = 1;
      return true;
    }
    return false;
  }

  /**
   * Reset global rate limit if needed
   */
  function resetGlobalIfNeeded(now: number): void {
    if (now - globalFirstAttempt > rateLimitConfig.timeWindow) {
      globalAttempts = 0;
      globalFirstAttempt = now;
    }
  }

  return {
    /**
     * Verify if the current origin is allowed
     */
    verifyOrigin(allowedOrigins: string[]): boolean {
      if (typeof window === 'undefined') {
        // Not in browser environment
        return true;
      }

      const currentOrigin = window.location.origin;

      // Check exact match
      if (allowedOrigins.includes(currentOrigin)) {
        return true;
      }

      // Check wildcard patterns
      for (const allowed of allowedOrigins) {
        if (allowed.includes('*')) {
          const pattern = allowed.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          if (regex.test(currentOrigin)) {
            return true;
          }
        }
      }

      // Log invalid origin attempt
      monitor.logEvent({
        type: 'invalid-origin',
        timestamp: Date.now(),
        details: { origin: currentOrigin, allowed: allowedOrigins },
        severity: 'high',
      });

      return false;
    },

    /**
     * Check if a connection attempt is allowed based on rate limiting
     */
    canAttemptConnection(identifier: string): boolean {
      const now = Date.now();

      // Check global rate limit
      if (rateLimitConfig.globalMaxAttempts) {
        resetGlobalIfNeeded(now);
        if (globalAttempts >= rateLimitConfig.globalMaxAttempts) {
          monitor.logEvent({
            type: 'rate-limit-exceeded',
            timestamp: now,
            details: { identifier, type: 'global' },
            severity: 'medium',
          });
          return false;
        }
      }

      // Check per-identifier rate limit
      if (rateLimitConfig.perWallet) {
        const tracker = rateLimitTrackers.get(identifier);

        if (!tracker) {
          // First attempt for this identifier
          return true;
        }

        resetTrackerIfNeeded(tracker, now);

        if (tracker.attempts >= rateLimitConfig.maxAttempts) {
          // Check if enough time has passed for backoff
          if (rateLimitConfig.backoff) {
            const backoffDelay = Math.min(
              rateLimitConfig.backoff.initialDelay * tracker.backoffMultiplier,
              rateLimitConfig.backoff.maxDelay,
            );

            if (now - tracker.lastAttemptTime < backoffDelay) {
              monitor.logEvent({
                type: 'rate-limit-exceeded',
                timestamp: now,
                details: { identifier, type: 'per-wallet', backoffDelay },
                severity: 'medium',
              });
              return false;
            }
          } else {
            monitor.logEvent({
              type: 'rate-limit-exceeded',
              timestamp: now,
              details: { identifier, type: 'per-wallet' },
              severity: 'medium',
            });
            return false;
          }
        }
      }

      return true;
    },

    /**
     * Record a connection attempt
     */
    recordConnectionAttempt(identifier: string): void {
      const now = Date.now();

      // Update global counter
      resetGlobalIfNeeded(now);
      globalAttempts++;

      // Update per-identifier tracker
      if (rateLimitConfig.perWallet) {
        let tracker = rateLimitTrackers.get(identifier);

        if (!tracker) {
          tracker = {
            attempts: 0,
            firstAttemptTime: now,
            lastAttemptTime: now,
            backoffMultiplier: 1,
          };
          rateLimitTrackers.set(identifier, tracker);
        } else {
          resetTrackerIfNeeded(tracker, now);
        }

        tracker.attempts++;
        tracker.lastAttemptTime = now;

        // Increase backoff multiplier on consecutive failures
        if (rateLimitConfig.backoff && tracker.attempts > 1) {
          tracker.backoffMultiplier = Math.min(
            tracker.backoffMultiplier * rateLimitConfig.backoff.multiplier,
            rateLimitConfig.backoff.maxDelay / rateLimitConfig.backoff.initialDelay,
          );
        }
      }

      // Log connection attempt
      auditLogger.logConnectionAttempt(identifier, true);
    },

    /**
     * Reset rate limiting for an identifier or all identifiers
     */
    resetRateLimit(identifier?: string): void {
      if (identifier) {
        rateLimitTrackers.delete(identifier);
      } else {
        rateLimitTrackers.clear();
        globalAttempts = 0;
        globalFirstAttempt = Date.now();
      }
    },

    /**
     * Validate a provider for security issues
     */
    validateProvider(
      provider: unknown,
      previousPublicKey?: Address | null,
    ): ProviderSecurityAssessment {
      const validation = validateProviderEnhanced(provider, previousPublicKey);

      // Log validation attempt
      auditLogger.logSecurityEvent('connection-attempt', {
        provider: provider ? 'present' : 'missing',
        timestamp: Date.now(),
      });

      const issues: SecurityIssue[] = [];
      let riskLevel: SecurityRiskLevel = validation.securityRisk;

      // Convert validation issues to security issues
      for (const issue of validation.issues) {
        let severity: SecurityRiskLevel = 'low';
        let type: SecurityIssue['type'] = 'suspicious-behavior';

        if (issue.includes('Missing required method')) {
          type = 'missing-required-method';
          severity = 'high';
        } else if (issue.includes('Multiple wallet identifiers')) {
          type = 'multiple-identifiers';
          severity = 'critical';
        } else if (issue.includes('No wallet identifier')) {
          type = 'no-identifier';
          severity = 'medium';
        } else if (issue.includes('Public key changed')) {
          type = 'suspicious-behavior';
          severity = 'high';
        }

        issues.push({
          type,
          severity,
          description: issue,
        });
      }

      // Add suspicious patterns as security issues
      for (const pattern of validation.suspiciousPatterns) {
        issues.push({
          type: 'suspicious-behavior',
          severity: 'medium',
          description: pattern,
        });

        // Log suspicious pattern
        monitor.logEvent({
          type: 'suspicious-provider',
          timestamp: Date.now(),
          details: { pattern },
          severity: 'medium',
        });
      }

      // Check for hijacking indicators
      const hijackAssessment = hijackDetector.checkProvider(provider);
      if (hijackAssessment.suspicious) {
        riskLevel = 'critical';
        for (const indicator of hijackAssessment.indicators) {
          issues.push({
            type: 'suspicious-behavior',
            severity: 'critical',
            description: `Hijacking indicator: ${indicator}`,
          });
        }

        // Log hijacking attempt
        monitor.logEvent({
          type: 'session-hijack-attempt',
          timestamp: Date.now(),
          details: { indicators: hijackAssessment.indicators },
          severity: 'critical',
        });

        auditLogger.logSecurityEvent('session-hijack-attempt', {
          indicators: hijackAssessment.indicators,
          confidence: hijackAssessment.confidence,
        });
      }

      // Generate recommendations
      const recommendations: string[] = [];

      if (validation.detectedIdentifiers.length > 1) {
        recommendations.push(
          'Multiple wallet identifiers detected. This wallet may be compromised or malicious.',
        );
        recommendations.push('Avoid connecting to this wallet.');
      } else if (validation.detectedIdentifiers.length === 0) {
        recommendations.push('No wallet identifier found. Verify the wallet is legitimate.');
        recommendations.push('Proceed with caution.');
      }

      if (!validation.isValid) {
        recommendations.push('This provider does not meet security requirements.');
      }

      if (hijackAssessment.suspicious) {
        recommendations.push('Wallet shows signs of potential hijacking.');
        recommendations.push('DO NOT connect to this wallet.');
      }

      // Log validation result
      if (!validation.isValid) {
        auditLogger.logValidationFailure(
          validation.detectedIdentifiers[0] || 'unknown',
          validation.issues,
        );
      }

      return {
        isValid: validation.isValid,
        riskLevel,
        issues,
        recommendations,
      };
    },

    /**
     * Generate an authentication message for wallet verification
     */
    generateAuthMessage(publicKey: Address): AuthenticationMessage {
      const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const uri = typeof window !== 'undefined' ? window.location.href : 'http://localhost';
      const issuedAt = new Date().toISOString();
      const nonce = generateNonce();

      const message: AuthenticationMessage = {
        domain,
        address: publicKey,
        statement: 'Sign this message to authenticate your wallet',
        uri,
        version: '1',
        chainId: 'solana:mainnet',
        nonce,
        issuedAt,
        expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        serialize(): Uint8Array {
          const parts = [
            `${this.domain} wants you to sign in with your Solana account:`,
            this.address,
            '',
            this.statement,
            '',
            `URI: ${this.uri}`,
            `Version: ${this.version}`,
            `Chain ID: ${this.chainId}`,
            `Nonce: ${this.nonce}`,
            `Issued At: ${this.issuedAt}`,
          ];

          if (this.expirationTime) {
            parts.push(`Expiration Time: ${this.expirationTime}`);
          }

          const messageStr = parts.join('\n');
          return new TextEncoder().encode(messageStr);
        },
      };

      return message;
    },

    /**
     * Verify a signature against a message and public key
     */
    async verifySignature(
      message: Uint8Array,
      signature: Signature,
      publicKey: Address,
    ): Promise<boolean> {
      try {
        // Import the public key for verification
        const publicKeyBytes = base58ToBytes(publicKey);
        const publicKeyBuffer = publicKeyBytes.buffer.slice(
          publicKeyBytes.byteOffset,
          publicKeyBytes.byteOffset + publicKeyBytes.byteLength,
        ) as ArrayBuffer;

        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          publicKeyBuffer,
          {
            name: 'Ed25519',
            namedCurve: 'Ed25519',
          },
          false,
          ['verify'],
        );

        // Verify the signature
        const sigArray = signature as Uint8Array;
        const sigBuffer = sigArray.buffer.slice(
          sigArray.byteOffset,
          sigArray.byteOffset + sigArray.byteLength,
        ) as ArrayBuffer;

        const msgBuffer = message.buffer.slice(
          message.byteOffset,
          message.byteOffset + message.byteLength,
        ) as ArrayBuffer;

        const isValid = await crypto.subtle.verify('Ed25519', cryptoKey, sigBuffer, msgBuffer);

        // Log signature verification result
        if (!isValid) {
          monitor.logEvent({
            type: 'signature-verification-failed',
            timestamp: Date.now(),
            details: { publicKey },
            severity: 'high',
          });
        }

        return isValid;
      } catch (error) {
        console.error('Signature verification failed:', error);

        // Log verification failure
        monitor.logEvent({
          type: 'signature-verification-failed',
          timestamp: Date.now(),
          details: { publicKey, error: String(error) },
          severity: 'high',
        });

        return false;
      }
    },

    // Expose enhanced components
    monitor,
    auditLogger,
    sessionValidator,
    hijackDetector,
  };
}

/**
 * Generate a random nonce for authentication
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert base58 string to bytes
 * This is a simplified version - should use the actual SDK implementation
 */
function base58ToBytes(base58: string): Uint8Array {
  // This should use the actual base58 decoder from the SDK
  // For now, returning a placeholder
  const bytes = new Uint8Array(32);
  for (let i = 0; i < Math.min(base58.length, 32); i++) {
    bytes[i] = base58.charCodeAt(i);
  }
  return bytes;
}
