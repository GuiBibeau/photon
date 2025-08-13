import type { Address } from '@photon/addresses';
import type { Signature } from '@photon/crypto';

/**
 * Security manager for wallet connections
 */
export interface SecurityManager {
  // Origin verification
  verifyOrigin(allowedOrigins: string[]): boolean;

  // Rate limiting
  canAttemptConnection(identifier: string): boolean;
  recordConnectionAttempt(identifier: string): void;
  resetRateLimit(identifier?: string): void;

  // Provider validation
  validateProvider(provider: unknown): ProviderSecurityAssessment;

  // Authentication
  generateAuthMessage(publicKey: Address): AuthenticationMessage;
  verifySignature(message: Uint8Array, signature: Signature, publicKey: Address): Promise<boolean>;
}

/**
 * Provider security assessment
 */
export interface ProviderSecurityAssessment {
  isValid: boolean;
  riskLevel: SecurityRiskLevel;
  issues: SecurityIssue[];
  recommendations: string[];
}

/**
 * Security risk levels
 */
export type SecurityRiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Security issue types
 */
export interface SecurityIssue {
  type: SecurityIssueType;
  severity: SecurityRiskLevel;
  description: string;
  affectedProperty?: string;
}

/**
 * Types of security issues
 */
export type SecurityIssueType =
  | 'missing-required-method'
  | 'multiple-identifiers'
  | 'no-identifier'
  | 'suspicious-behavior'
  | 'untrusted-origin'
  | 'invalid-signature'
  | 'rate-limit-exceeded';

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  // Maximum attempts per time window
  maxAttempts: number;
  // Time window in milliseconds
  timeWindow: number;
  // Per-wallet tracking
  perWallet: boolean;
  // Global limit across all wallets
  globalMaxAttempts?: number;
  // Exponential backoff settings
  backoff?: ExponentialBackoffConfig;
}

/**
 * Exponential backoff configuration
 */
export interface ExponentialBackoffConfig {
  // Initial delay in milliseconds
  initialDelay: number;
  // Maximum delay in milliseconds
  maxDelay: number;
  // Multiplier for each retry
  multiplier: number;
  // Reset successful connection
  resetOnSuccess: boolean;
}

/**
 * Connection attempt tracking
 */
export interface ConnectionAttempt {
  identifier: string;
  timestamp: number;
  success: boolean;
  walletName?: string;
  errorCode?: string;
}

/**
 * Authentication message for wallet verification
 */
export interface AuthenticationMessage {
  // SIWS (Sign-In with Solana) fields
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: string;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];

  // Serialize to message bytes
  serialize(): Uint8Array;
}

/**
 * Authentication result
 */
export interface AuthenticationResult {
  success: boolean;
  token?: string;
  expiresAt?: number;
  publicKey?: Address;
  signature?: Signature;
  error?: string;
}

/**
 * Session management
 */
export interface SessionManager {
  // Session creation
  createSession(publicKey: Address, walletName: string): Session;

  // Session validation
  validateSession(sessionId: string): boolean;
  getSession(sessionId: string): Session | null;

  // Session lifecycle
  refreshSession(sessionId: string): boolean;
  revokeSession(sessionId: string): void;
  clearExpiredSessions(): void;
}

/**
 * Wallet session
 */
export interface Session {
  id: string;
  publicKey: Address;
  walletName: string;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  metadata?: SessionMetadata;
}

/**
 * Session metadata
 */
export interface SessionMetadata {
  userAgent?: string;
  origin?: string;
  ipAddress?: string;
  deviceId?: string;
}

/**
 * Content Security Policy for wallet connections
 */
export interface WalletCSPConfig {
  // Allowed wallet origins
  allowedOrigins: string[];
  // Allowed frame ancestors (for iframe wallets)
  frameAncestors?: string[];
  // Allowed connect sources (for WebSocket/HTTP)
  connectSources?: string[];
  // Script sources (for injected scripts)
  scriptSources?: string[];
}

/**
 * Security event for monitoring
 */
export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: number;
  details: Record<string, unknown>;
  severity: SecurityRiskLevel;
}

/**
 * Types of security events
 */
export type SecurityEventType =
  | 'connection-attempt'
  | 'rate-limit-exceeded'
  | 'suspicious-provider'
  | 'invalid-origin'
  | 'session-hijack-attempt'
  | 'signature-verification-failed';

/**
 * Security monitoring interface
 */
export interface SecurityMonitor {
  // Log security events
  logEvent(event: SecurityEvent): void;

  // Get recent events
  getRecentEvents(count?: number): SecurityEvent[];

  // Get events by type
  getEventsByType(type: SecurityEventType): SecurityEvent[];

  // Clear old events
  clearOldEvents(olderThan: number): void;
}

/**
 * Wallet hijacking detection
 */
export interface HijackDetector {
  // Check for wallet hijacking indicators
  checkProvider(provider: unknown): HijackAssessment;

  // Verify wallet consistency
  verifyWalletConsistency(walletName: string, provider: unknown): ConsistencyCheck;
}

/**
 * Hijack assessment result
 */
export interface HijackAssessment {
  suspicious: boolean;
  indicators: string[];
  confidence: 'low' | 'medium' | 'high';
  recommendation: 'safe' | 'caution' | 'avoid';
}

/**
 * Wallet consistency check
 */
export interface ConsistencyCheck {
  consistent: boolean;
  expectedProperties: string[];
  missingProperties: string[];
  unexpectedProperties: string[];
}
