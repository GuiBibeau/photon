import type { Address } from '@photon/addresses';
import type { Signature } from '@photon/crypto';
import type { InjectedProvider, ProviderValidationResult } from './detector';
import type {
  SecurityManager,
  HijackDetector,
  HijackAssessment,
  ConsistencyCheck,
  SecurityMonitor,
  SecurityEvent,
  SecurityEventType,
} from './security-types';

/**
 * Enhanced provider validation with method signature verification
 */
export interface EnhancedProviderValidation extends ProviderValidationResult {
  methodSignatures: Map<string, boolean>;
  suspiciousPatterns: string[];
  publicKeyConsistency?: boolean;
}

/**
 * Method signature validator
 */
export interface MethodSignatureValidator {
  validateConnect(fn: unknown): boolean;
  validateDisconnect(fn: unknown): boolean;
  validateSignTransaction(fn: unknown): boolean;
  validateSignMessage(fn: unknown): boolean;
}

/**
 * Create a method signature validator
 */
export function createMethodSignatureValidator(): MethodSignatureValidator {
  return {
    validateConnect(fn: unknown): boolean {
      if (typeof fn !== 'function') {
        return false;
      }

      // Check function signature (arity and name patterns)
      const fnStr = fn.toString();

      // Common patterns for connect methods (including arrow functions)
      const validPatterns = [
        /function\s*connect\s*\(/,
        /async\s+function\s*connect\s*\(/,
        /connect\s*:\s*async\s*\(/,
        /connect\s*\(\s*\)/,
        /connect\s*\(\s*options\s*\)/,
        /async\s*\(\s*\)\s*=>/, // Arrow function
        /async\s*\w*\s*=>/, // Arrow function with params
      ];

      return validPatterns.some((pattern) => pattern.test(fnStr));
    },

    validateDisconnect(fn: unknown): boolean {
      if (typeof fn !== 'function') {
        return false;
      }

      const fnStr = fn.toString();
      const validPatterns = [
        /function\s*disconnect\s*\(/,
        /async\s+function\s*disconnect\s*\(/,
        /disconnect\s*:\s*async\s*\(/,
        /disconnect\s*\(\s*\)/,
        /async\s*\(\s*\)\s*=>/, // Arrow function
        /async\s*\w*\s*=>/, // Arrow function with params
      ];

      return validPatterns.some((pattern) => pattern.test(fnStr));
    },

    validateSignTransaction(fn: unknown): boolean {
      if (typeof fn !== 'function') {
        return false;
      }

      const fnStr = fn.toString();
      const validPatterns = [
        /function\s*signTransaction\s*\(/,
        /async\s+function\s*signTransaction\s*\(/,
        /signTransaction\s*:\s*async\s*\(/,
        /signTransaction\s*\(\s*transaction\s*\)/,
        /async\s*\(\s*\w+\s*\)\s*=>/, // Arrow function with param
        /async\s*\w+\s*=>/, // Arrow function shorthand
      ];

      return validPatterns.some((pattern) => pattern.test(fnStr));
    },

    validateSignMessage(fn: unknown): boolean {
      if (typeof fn !== 'function') {
        return false;
      }

      const fnStr = fn.toString();
      const validPatterns = [
        /function\s*signMessage\s*\(/,
        /async\s+function\s*signMessage\s*\(/,
        /signMessage\s*:\s*async\s*\(/,
        /signMessage\s*\(\s*message\s*\)/,
        /async\s*\(\s*\w+\s*\)\s*=>/, // Arrow function with param
        /async\s*\w+\s*=>/, // Arrow function shorthand
      ];

      return validPatterns.some((pattern) => pattern.test(fnStr));
    },
  };
}

/**
 * Enhanced provider validator with deep security checks
 */
export function validateProviderEnhanced(
  provider: unknown,
  previousPublicKey?: Address | null,
): EnhancedProviderValidation {
  const result: EnhancedProviderValidation = {
    isValid: false,
    issues: [],
    securityRisk: 'low',
    detectedIdentifiers: [],
    methodSignatures: new Map(),
    suspiciousPatterns: [],
  };

  if (!provider || typeof provider !== 'object') {
    result.issues.push('Provider is not an object');
    return result;
  }

  const p = provider as InjectedProvider;
  const validator = createMethodSignatureValidator();

  // Validate required methods with signature checking
  const methodValidations = [
    { name: 'connect', validator: validator.validateConnect },
    { name: 'disconnect', validator: validator.validateDisconnect },
    { name: 'signTransaction', validator: validator.validateSignTransaction },
    { name: 'signMessage', validator: validator.validateSignMessage },
  ];

  for (const { name, validator: validate } of methodValidations) {
    const method = p[name as keyof InjectedProvider];
    const hasMethod = typeof method === 'function';
    const hasValidSignature = hasMethod && validate(method);

    result.methodSignatures.set(name, hasValidSignature);

    if (!hasMethod) {
      result.issues.push(`Missing required method: ${name}`);
    } else if (!hasValidSignature) {
      result.suspiciousPatterns.push(`Method ${name} has suspicious signature`);
      result.securityRisk = 'medium';
    }
  }

  // Check for multiple wallet identifiers (potential hijacking)
  const identifiers = [
    'isPhantom',
    'isSolflare',
    'isBackpack',
    'isGlow',
    'isBrave',
    'isCoinbaseWallet',
    'isExodus',
    'isTrust',
  ];

  for (const id of identifiers) {
    if (p[id as keyof InjectedProvider]) {
      result.detectedIdentifiers.push(id);
    }
  }

  // Security risk assessment
  if (result.detectedIdentifiers.length > 1) {
    result.issues.push('Multiple wallet identifiers detected - potential hijacking');
    result.securityRisk = 'high';
    result.suspiciousPatterns.push('Multiple wallet identifiers present');
  } else if (result.detectedIdentifiers.length === 0) {
    result.issues.push('No wallet identifier found - unknown provider');
    result.securityRisk = 'medium';
  }

  // Check for suspicious property patterns
  const suspiciousProps = checkSuspiciousProperties(p);
  if (suspiciousProps.length > 0) {
    result.suspiciousPatterns.push(...suspiciousProps);
    result.securityRisk = result.securityRisk === 'high' ? 'high' : 'medium';
  }

  // Public key consistency check if previous key provided
  if (previousPublicKey && p.publicKey) {
    const currentKey = p.publicKey.toString();
    if (currentKey !== previousPublicKey) {
      result.publicKeyConsistency = false;
      result.issues.push('Public key changed unexpectedly');
      result.suspiciousPatterns.push('Public key inconsistency detected');
      result.securityRisk = 'high';
    } else {
      result.publicKeyConsistency = true;
    }
  }

  result.isValid = result.issues.length === 0 && result.suspiciousPatterns.length === 0;

  return result;
}

/**
 * Check for suspicious properties in provider
 */
function checkSuspiciousProperties(provider: InjectedProvider): string[] {
  const suspicious: string[] = [];

  // Check for property tampering
  const propertyDescriptors = Object.getOwnPropertyDescriptors(provider);

  for (const [key, descriptor] of Object.entries(propertyDescriptors)) {
    // Check if critical methods are non-configurable (could indicate tampering)
    if (['connect', 'disconnect', 'signTransaction', 'signMessage'].includes(key)) {
      if (!descriptor.configurable && descriptor.get) {
        suspicious.push(`Property ${key} has suspicious getter`);
      }
    }
  }

  // Check for proxy traps
  try {
    if (typeof provider.connect === 'function') {
      const protoName = Object.getPrototypeOf(provider.connect).constructor.name;
      if (protoName === 'Proxy') {
        suspicious.push('Connect method is proxied');
      }
    }
  } catch {
    // Ignore errors from proxy detection
  }

  return suspicious;
}

/**
 * Create hijack detector for wallet security
 */
export function createHijackDetector(): HijackDetector {
  return {
    checkProvider(provider: unknown): HijackAssessment {
      const assessment: HijackAssessment = {
        suspicious: false,
        indicators: [],
        confidence: 'low',
        recommendation: 'safe',
      };

      if (!provider || typeof provider !== 'object') {
        return assessment;
      }

      const p = provider as InjectedProvider;

      // Check for multiple identifiers
      const identifierCount = [
        'isPhantom',
        'isSolflare',
        'isBackpack',
        'isGlow',
        'isBrave',
        'isCoinbaseWallet',
        'isExodus',
        'isTrust',
      ].filter((id) => p[id as keyof InjectedProvider]).length;

      if (identifierCount > 1) {
        assessment.suspicious = true;
        assessment.indicators.push('Multiple wallet identifiers detected');
        assessment.confidence = 'high';
        assessment.recommendation = 'avoid';
        return assessment;
      }

      // Check for iframe injection
      if (typeof window !== 'undefined' && window.self !== window.top) {
        assessment.indicators.push('Running in iframe context');
        assessment.confidence = 'medium';
      }

      // Check for method overrides
      const criticalMethods = ['connect', 'signTransaction', 'signMessage'];
      for (const method of criticalMethods) {
        const fn = p[method as keyof InjectedProvider];
        if (typeof fn === 'function') {
          const fnStr = fn.toString();

          // Check for eval or Function constructor usage
          if (fnStr.includes('eval(') || fnStr.includes('new Function(')) {
            assessment.suspicious = true;
            assessment.indicators.push(`Method ${method} uses eval or Function constructor`);
            assessment.confidence = 'high';
            assessment.recommendation = 'avoid';
          }

          // Check for obfuscated code patterns
          if (fnStr.length < 50 && fnStr.includes('[') && fnStr.includes(']')) {
            assessment.indicators.push(`Method ${method} appears obfuscated`);
            assessment.confidence = 'medium';
          }
        }
      }

      // Final assessment
      if (assessment.suspicious) {
        assessment.recommendation = 'avoid';
      } else if (assessment.indicators.length > 2) {
        assessment.recommendation = 'caution';
        assessment.confidence = 'medium';
      }

      return assessment;
    },

    verifyWalletConsistency(walletName: string, provider: unknown): ConsistencyCheck {
      const check: ConsistencyCheck = {
        consistent: true,
        expectedProperties: [],
        missingProperties: [],
        unexpectedProperties: [],
      };

      if (!provider || typeof provider !== 'object') {
        check.consistent = false;
        return check;
      }

      const p = provider as InjectedProvider;

      // Define expected properties for each wallet
      const walletExpectations: Record<string, string[]> = {
        phantom: [
          'isPhantom',
          'connect',
          'disconnect',
          'signTransaction',
          'signMessage',
          'publicKey',
        ],
        solflare: [
          'isSolflare',
          'connect',
          'disconnect',
          'signTransaction',
          'signMessage',
          'publicKey',
        ],
        backpack: [
          'isBackpack',
          'connect',
          'disconnect',
          'signTransaction',
          'signMessage',
          'publicKey',
        ],
        glow: ['isGlow', 'connect', 'disconnect', 'signTransaction', 'signMessage', 'publicKey'],
        brave: ['isBrave', 'connect', 'disconnect', 'signTransaction', 'signMessage', 'publicKey'],
      };

      const expected = walletExpectations[walletName.toLowerCase()] || [];
      check.expectedProperties = expected;

      // Check for missing properties
      for (const prop of expected) {
        if (!(prop in p)) {
          check.missingProperties.push(prop);
          check.consistent = false;
        }
      }

      // Check for unexpected identifier properties
      const allIdentifiers = [
        'isPhantom',
        'isSolflare',
        'isBackpack',
        'isGlow',
        'isBrave',
        'isCoinbaseWallet',
        'isExodus',
        'isTrust',
      ];
      const expectedIdentifier = expected.find((e) => allIdentifiers.includes(e));

      for (const id of allIdentifiers) {
        if (id !== expectedIdentifier && p[id as keyof InjectedProvider]) {
          check.unexpectedProperties.push(id);
          check.consistent = false;
        }
      }

      return check;
    },
  };
}

/**
 * Create security monitor for tracking events
 */
export function createSecurityMonitor(): SecurityMonitor {
  const events: SecurityEvent[] = [];
  const maxEvents = 1000; // Keep last 1000 events

  return {
    logEvent(event: SecurityEvent): void {
      events.push(event);

      // Trim old events if exceeding max
      if (events.length > maxEvents) {
        events.splice(0, events.length - maxEvents);
      }

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Wallet Security]', event.type, event.details);
      }
    },

    getRecentEvents(count = 10): SecurityEvent[] {
      return events.slice(-count);
    },

    getEventsByType(type: SecurityEventType): SecurityEvent[] {
      return events.filter((e) => e.type === type);
    },

    clearOldEvents(olderThan: number): void {
      const cutoff = Date.now() - olderThan;
      let i = 0;
      while (i < events.length) {
        const event = events[i];
        if (event && event.timestamp < cutoff) {
          events.splice(i, 1);
        } else {
          i++;
        }
      }
    },
  };
}

/**
 * Verify custom scheme security for deep linking
 */
export async function verifyCustomScheme(
  scheme: string,
  provider: InjectedProvider,
  securityManager: SecurityManager,
): Promise<boolean> {
  // Acknowledge the hijacking risk of custom schemes
  console.warn(
    `Custom scheme ${scheme} detected. ` +
      'Custom URL schemes can be hijacked by malicious apps. ' +
      'Implementing additional verification...',
  );

  // Verify provider has expected properties for the scheme
  const schemeToWallet: Record<string, string> = {
    'phantom://': 'phantom',
    'solflare://': 'solflare',
    'backpack://': 'backpack',
    'glow://': 'glow',
  };

  const expectedWallet = schemeToWallet[scheme];
  if (!expectedWallet) {
    return false; // Unknown scheme
  }

  // Use hijack detector to verify consistency
  const detector = createHijackDetector();
  const consistency = detector.verifyWalletConsistency(expectedWallet, provider);

  if (!consistency.consistent) {
    console.error('Wallet consistency check failed:', consistency);
    return false;
  }

  // If connected, verify public key by requesting signature
  if (provider.isConnected && provider.publicKey) {
    try {
      const publicKey = provider.publicKey.toString() as Address;
      const authMessage = securityManager.generateAuthMessage(publicKey);
      const messageBytes = authMessage.serialize();

      // Request signature for verification
      const signResult = await provider.signMessage(messageBytes);
      const signature = signResult.signature as Signature;

      // Verify the signature
      const isValid = await securityManager.verifySignature(messageBytes, signature, publicKey);

      if (!isValid) {
        console.error('Signature verification failed for custom scheme');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to verify custom scheme:', error);
      return false;
    }
  }

  return true; // Allow connection attempt if not yet connected
}

/**
 * Session validation for public key consistency
 */
export interface SessionValidator {
  validatePublicKey(currentKey: Address, sessionKey: Address): boolean;
  trackPublicKeyChange(from: Address | null, to: Address): void;
  getPublicKeyHistory(): PublicKeyChange[];
}

interface PublicKeyChange {
  timestamp: number;
  from: Address | null;
  to: Address;
  verified: boolean;
}

/**
 * Create session validator for public key tracking
 */
export function createSessionValidator(): SessionValidator {
  const history: PublicKeyChange[] = [];
  const maxHistory = 50;

  return {
    validatePublicKey(currentKey: Address, sessionKey: Address): boolean {
      return currentKey === sessionKey;
    },

    trackPublicKeyChange(from: Address | null, to: Address): void {
      history.push({
        timestamp: Date.now(),
        from,
        to,
        verified: false,
      });

      // Trim old history
      if (history.length > maxHistory) {
        history.splice(0, history.length - maxHistory);
      }
    },

    getPublicKeyHistory(): PublicKeyChange[] {
      return [...history];
    },
  };
}

/**
 * Audit logger for security events
 */
export interface AuditLogger {
  logConnectionAttempt(walletName: string, success: boolean, reason?: string): void;
  logValidationFailure(walletName: string, issues: string[]): void;
  logSecurityEvent(event: SecurityEventType, details: Record<string, unknown>): void;
  getAuditLog(): AuditEntry[];
  exportAuditLog(): string;
}

interface AuditEntry {
  timestamp: number;
  type: 'connection' | 'validation' | 'security';
  walletName?: string;
  success?: boolean;
  details: Record<string, unknown>;
}

/**
 * Create audit logger for tracking security events
 */
export function createAuditLogger(): AuditLogger {
  const log: AuditEntry[] = [];
  const maxEntries = 500;

  function addEntry(entry: AuditEntry): void {
    log.push(entry);

    // Trim old entries
    if (log.length > maxEntries) {
      log.splice(0, log.length - maxEntries);
    }

    // Store in localStorage if available
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = JSON.parse(localStorage.getItem('wallet_audit_log') || '[]') as AuditEntry[];
        stored.push(entry);

        // Keep only recent entries in storage
        const recentStored = stored.slice(-100);
        localStorage.setItem('wallet_audit_log', JSON.stringify(recentStored));
      } catch {
        // Ignore storage errors
      }
    }
  }

  return {
    logConnectionAttempt(walletName: string, success: boolean, reason?: string): void {
      addEntry({
        timestamp: Date.now(),
        type: 'connection',
        walletName,
        success,
        details: { reason: reason || (success ? 'Success' : 'Failed') },
      });
    },

    logValidationFailure(walletName: string, issues: string[]): void {
      addEntry({
        timestamp: Date.now(),
        type: 'validation',
        walletName,
        success: false,
        details: { issues },
      });
    },

    logSecurityEvent(event: SecurityEventType, details: Record<string, unknown>): void {
      addEntry({
        timestamp: Date.now(),
        type: 'security',
        details: { event, ...details },
      });
    },

    getAuditLog(): AuditEntry[] {
      return [...log];
    },

    exportAuditLog(): string {
      return JSON.stringify(log, null, 2);
    },
  };
}
