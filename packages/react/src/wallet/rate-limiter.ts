import type { RateLimitConfig } from './security-types';

/**
 * Enhanced rate limiter with user feedback and persistence
 */
export interface EnhancedRateLimiter {
  // Check if connection attempt is allowed
  canAttempt(identifier: string): boolean;

  // Record an attempt
  recordAttempt(identifier: string, success: boolean): void;

  // Get remaining cooldown time in milliseconds
  getCooldownTime(identifier: string): number;

  // Get attempt statistics
  getAttemptStats(identifier: string): AttemptStats;

  // Manual override to clear rate limit
  clearRateLimit(identifier?: string): void;

  // Force retry (override rate limit once)
  forceRetry(identifier: string): boolean;

  // Get rate limit status for UI
  getRateLimitStatus(identifier: string): RateLimitStatus;

  // Persist to localStorage
  persist(): void;

  // Restore from localStorage
  restore(): void;
}

/**
 * Attempt statistics for a wallet
 */
export interface AttemptStats {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  lastAttemptTime: number | null;
  nextRetryTime: number | null;
  isRateLimited: boolean;
}

/**
 * Rate limit status for UI display
 */
export interface RateLimitStatus {
  isLimited: boolean;
  remainingTime: number; // milliseconds
  attemptsRemaining: number;
  message: string;
  canOverride: boolean;
  severity: 'info' | 'warning' | 'error';
}

/**
 * Internal rate limit tracker
 */
interface RateLimitTracker {
  attempts: number;
  successCount: number;
  failureCount: number;
  firstAttemptTime: number;
  lastAttemptTime: number;
  backoffMultiplier: number;
  overrideUsed: boolean;
  overrideAvailable: boolean;
  consecutiveFailures: number;
}

/**
 * localStorage key for persistence
 */
const STORAGE_KEY = 'photon_wallet_rate_limits';
const STORAGE_VERSION = 1;

/**
 * Create an enhanced rate limiter
 */
export function createEnhancedRateLimiter(config: RateLimitConfig): EnhancedRateLimiter {
  const trackers = new Map<string, RateLimitTracker>();
  let globalAttempts = 0;
  let globalFirstAttempt = Date.now();

  /**
   * Reset tracker if time window has passed OR if coming back from backoff
   */
  function resetTrackerIfNeeded(tracker: RateLimitTracker, now: number): boolean {
    // Check if time window has passed
    if (now - tracker.firstAttemptTime > config.timeWindow) {
      tracker.attempts = 0;
      tracker.firstAttemptTime = now;
      tracker.lastAttemptTime = now;
      tracker.backoffMultiplier = 1;
      tracker.overrideUsed = false;
      tracker.overrideAvailable = false;
      tracker.consecutiveFailures = 0;
      return true;
    }

    // Check if we're coming back from backoff (attempts >= maxAttempts and backoff period has passed)
    if (tracker.attempts >= config.maxAttempts && config.backoff) {
      const backoffDelay = calculateBackoffDelay(tracker);
      if (now - tracker.lastAttemptTime >= backoffDelay) {
        // Reset attempts after backoff but keep tracking consecutive failures
        tracker.attempts = 0;
        tracker.firstAttemptTime = now;
        tracker.overrideUsed = false;
        tracker.overrideAvailable = false;
        // Keep consecutiveFailures and backoffMultiplier for proper escalation
        return true;
      }
    }

    return false;
  }

  /**
   * Reset global counter if needed
   */
  function resetGlobalIfNeeded(now: number): void {
    if (now - globalFirstAttempt > config.timeWindow) {
      globalAttempts = 0;
      globalFirstAttempt = now;
    }
  }

  /**
   * Calculate backoff delay
   */
  function calculateBackoffDelay(tracker: RateLimitTracker): number {
    if (!config.backoff) {
      return 0;
    }

    return Math.min(
      config.backoff.initialDelay * tracker.backoffMultiplier,
      config.backoff.maxDelay,
    );
  }

  /**
   * Format time for display
   */
  function formatTimeRemaining(ms: number): string {
    if (ms <= 0) {
      return 'Ready to retry';
    }

    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }

    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  const limiter: EnhancedRateLimiter = {
    canAttempt(identifier: string): boolean {
      const now = Date.now();

      // Check global rate limit
      if (config.globalMaxAttempts) {
        resetGlobalIfNeeded(now);
        if (globalAttempts >= config.globalMaxAttempts) {
          return false;
        }
      }

      // Check per-wallet rate limit
      if (config.perWallet) {
        let tracker = trackers.get(identifier);

        if (!tracker) {
          return true; // First attempt or cleared
        }

        // Reset if needed and re-get tracker
        resetTrackerIfNeeded(tracker, now);
        tracker = trackers.get(identifier);

        if (!tracker) {
          return true; // Tracker was cleared
        }

        // Check if override is available for this rate limit attempt
        if (tracker.overrideAvailable) {
          // Allow the override attempt
          return true;
        }

        if (tracker.attempts >= config.maxAttempts) {
          // Check backoff period
          if (config.backoff) {
            const backoffDelay = calculateBackoffDelay(tracker);
            if (now - tracker.lastAttemptTime < backoffDelay) {
              return false;
            }
          } else {
            return false;
          }
        }
      }

      return true;
    },

    recordAttempt(identifier: string, success: boolean): void {
      const now = Date.now();

      // Update global counter
      resetGlobalIfNeeded(now);
      globalAttempts++;

      // Update per-wallet tracker
      if (config.perWallet) {
        let tracker = trackers.get(identifier);
        let wasReset = false;

        if (!tracker) {
          tracker = {
            attempts: 0,
            successCount: 0,
            failureCount: 0,
            firstAttemptTime: now,
            lastAttemptTime: now,
            backoffMultiplier: 1,
            overrideUsed: false,
            overrideAvailable: false,
            consecutiveFailures: 0,
          };
          trackers.set(identifier, tracker);
        } else {
          // Check if we need to reset the tracker
          wasReset = resetTrackerIfNeeded(tracker, now);
          // Don't reset override flag here - it should persist until time window resets
        }

        // Check if this was an override attempt
        if (tracker.overrideAvailable) {
          // Consume the override
          tracker.overrideAvailable = false;
          // Don't increment attempts for override
        } else {
          tracker.attempts++;
        }
        tracker.lastAttemptTime = now;

        if (success) {
          tracker.successCount++;
          tracker.consecutiveFailures = 0;

          // Reset backoff on success if configured
          if (config.backoff?.resetOnSuccess) {
            tracker.backoffMultiplier = 1;
          }
        } else {
          tracker.failureCount++;
          tracker.consecutiveFailures++;

          // Handle backoff multiplier
          if (config.backoff) {
            if (tracker.attempts === config.maxAttempts) {
              // Just hit the limit, don't increase multiplier yet
              // Keep current multiplier (1 for first time, higher for consecutive failures)
            } else if (
              wasReset &&
              tracker.attempts === 1 &&
              tracker.consecutiveFailures > config.maxAttempts
            ) {
              // Coming back from backoff with another failure, double the multiplier
              tracker.backoffMultiplier = Math.min(
                tracker.backoffMultiplier * config.backoff.multiplier,
                config.backoff.maxDelay / config.backoff.initialDelay,
              );
              // Force it to be rate limited immediately
              tracker.attempts = config.maxAttempts;
            }
          }
        }
      }

      // Persist to localStorage
      limiter.persist();
    },

    getCooldownTime(identifier: string): number {
      const now = Date.now();
      const tracker = trackers.get(identifier);

      if (!tracker) {
        return 0;
      }

      // Don't reset tracker here - just check cooldown
      // resetTrackerIfNeeded(tracker, now);

      if (tracker.attempts < config.maxAttempts) {
        return 0;
      }

      if (config.backoff) {
        const backoffDelay = calculateBackoffDelay(tracker);
        const elapsed = now - tracker.lastAttemptTime;
        return Math.max(0, backoffDelay - elapsed);
      }

      // No backoff, check time window
      const windowRemaining = config.timeWindow - (now - tracker.firstAttemptTime);
      return Math.max(0, windowRemaining);
    },

    getAttemptStats(identifier: string): AttemptStats {
      const tracker = trackers.get(identifier);
      const now = Date.now();

      if (!tracker) {
        return {
          totalAttempts: 0,
          successfulAttempts: 0,
          failedAttempts: 0,
          lastAttemptTime: null,
          nextRetryTime: null,
          isRateLimited: false,
        };
      }

      const cooldown = limiter.getCooldownTime(identifier);
      const isRateLimited = cooldown > 0;

      return {
        totalAttempts: tracker.attempts,
        successfulAttempts: tracker.successCount,
        failedAttempts: tracker.failureCount,
        lastAttemptTime: tracker.lastAttemptTime,
        nextRetryTime: isRateLimited ? now + cooldown : null,
        isRateLimited,
      };
    },

    clearRateLimit(identifier?: string): void {
      if (identifier) {
        // Get the tracker before deleting
        const tracker = trackers.get(identifier);
        if (tracker && globalAttempts > 0) {
          // Reduce global attempts by the number of attempts this wallet made
          globalAttempts = Math.max(0, globalAttempts - tracker.attempts);
        }
        // Clear the specific tracker
        trackers.delete(identifier);
      } else {
        // Clear all trackers
        trackers.clear();
        globalAttempts = 0;
        globalFirstAttempt = Date.now();
      }

      limiter.persist();
    },

    forceRetry(identifier: string): boolean {
      let tracker = trackers.get(identifier);

      if (!tracker) {
        return true; // No tracker, allow attempt
      }

      // Reset tracker if needed (in case time window passed)
      const now = Date.now();
      resetTrackerIfNeeded(tracker, now);

      // Re-get tracker in case it was reset
      tracker = trackers.get(identifier);
      if (!tracker) {
        return true; // Tracker was cleared, allow attempt
      }

      // Check if we're actually rate limited
      if (tracker.attempts < config.maxAttempts) {
        return true; // Not rate limited, no need for override
      }

      // Check if already used override for this rate limit period
      if (tracker.overrideUsed) {
        return false;
      }

      // Mark override as used and available
      tracker.overrideUsed = true;
      tracker.overrideAvailable = true;
      limiter.persist();

      return true;
    },

    getRateLimitStatus(identifier: string): RateLimitStatus {
      const now = Date.now();
      const tracker = trackers.get(identifier);
      const cooldown = limiter.getCooldownTime(identifier);

      if (!tracker) {
        return {
          isLimited: false,
          remainingTime: 0,
          attemptsRemaining: config.maxAttempts,
          message: `${config.maxAttempts} connection attempts available`,
          canOverride: false,
          severity: 'info',
        };
      }

      resetTrackerIfNeeded(tracker, now);

      const attemptsRemaining = Math.max(0, config.maxAttempts - tracker.attempts);

      if (cooldown > 0) {
        const timeStr = formatTimeRemaining(cooldown);
        const canOverride = !tracker.overrideUsed;

        return {
          isLimited: true,
          remainingTime: cooldown,
          attemptsRemaining: 0,
          message: `Rate limited. Try again in ${timeStr}`,
          canOverride,
          severity: 'error',
        };
      }

      if (attemptsRemaining === 0) {
        // Window reset, attempts available again
        return {
          isLimited: false,
          remainingTime: 0,
          attemptsRemaining: config.maxAttempts,
          message: 'Rate limit reset. You can try again.',
          canOverride: false,
          severity: 'info',
        };
      }

      if (attemptsRemaining <= 2) {
        return {
          isLimited: false,
          remainingTime: 0,
          attemptsRemaining,
          message: `${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining`,
          canOverride: false,
          severity: 'warning',
        };
      }

      return {
        isLimited: false,
        remainingTime: 0,
        attemptsRemaining,
        message: `${attemptsRemaining} attempts remaining`,
        canOverride: false,
        severity: 'info',
      };
    },

    persist(): void {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

      try {
        const data = {
          version: STORAGE_VERSION,
          trackers: Array.from(trackers.entries()).map(([id, tracker]) => ({
            id,
            ...tracker,
          })),
          globalAttempts,
          globalFirstAttempt,
          timestamp: Date.now(),
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        // Ignore storage errors
        console.warn('Failed to persist rate limit data:', error);
      }
    },

    restore(): void {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
          return;
        }

        const data = JSON.parse(stored);

        // Check version compatibility
        if (data.version !== STORAGE_VERSION) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }

        // Check if data is too old (> 1 hour)
        const age = Date.now() - data.timestamp;
        if (age > 60 * 60 * 1000) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }

        // Restore trackers
        trackers.clear();
        for (const tracker of data.trackers) {
          const { id, ...rest } = tracker;
          trackers.set(id, rest);
        }

        // Restore global state
        globalAttempts = data.globalAttempts || 0;
        globalFirstAttempt = data.globalFirstAttempt || Date.now();

        // Clean up expired trackers
        const now = Date.now();
        for (const [id, tracker] of trackers.entries()) {
          if (now - tracker.firstAttemptTime > config.timeWindow * 2) {
            trackers.delete(id);
          }
        }
      } catch (error) {
        // Ignore restore errors
        console.warn('Failed to restore rate limit data:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    },
  };

  // Restore from localStorage on creation
  limiter.restore();

  return limiter;
}

/**
 * React hook for rate limit status
 */
export function useRateLimitStatus(
  limiter: EnhancedRateLimiter,
  walletName: string,
): RateLimitStatus & { refresh: () => void } {
  const [status, setStatus] = React.useState(() => limiter.getRateLimitStatus(walletName));

  const refresh = React.useCallback(() => {
    setStatus(limiter.getRateLimitStatus(walletName));
  }, [limiter, walletName]);

  React.useEffect(() => {
    const interval = setInterval(refresh, 1000); // Update every second
    return () => clearInterval(interval);
  }, [refresh]);

  return { ...status, refresh };
}

// Import React for the hook
import * as React from 'react';
