import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEnhancedRateLimiter } from '../src/wallet/rate-limiter';
import type { RateLimitConfig } from '../src/wallet/security-types';

describe('Enhanced Rate Limiter', () => {
  let limiter: ReturnType<typeof createEnhancedRateLimiter>;
  const defaultConfig: RateLimitConfig = {
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

  beforeEach(() => {
    // Clear localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear();
    }

    // Reset timers
    vi.useFakeTimers();

    // Create fresh limiter
    limiter = createEnhancedRateLimiter(defaultConfig);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow initial attempts', () => {
      expect(limiter.canAttempt('wallet1')).toBe(true);
      expect(limiter.canAttempt('wallet2')).toBe(true);
    });

    it('should track attempts per wallet', () => {
      const wallet = 'phantom';

      // Record attempts
      for (let i = 0; i < 4; i++) {
        expect(limiter.canAttempt(wallet)).toBe(true);
        limiter.recordAttempt(wallet, false);
      }

      // 5th attempt should be allowed
      expect(limiter.canAttempt(wallet)).toBe(true);
      limiter.recordAttempt(wallet, false);

      // 6th attempt should be blocked
      expect(limiter.canAttempt(wallet)).toBe(false);
    });

    it('should respect global rate limit', () => {
      // Use up global limit across different wallets
      for (let i = 0; i < 10; i++) {
        const wallet = `wallet${i}`;
        expect(limiter.canAttempt(wallet)).toBe(true);
        limiter.recordAttempt(wallet, false);
      }

      // 11th attempt should be blocked globally
      expect(limiter.canAttempt('new-wallet')).toBe(false);
    });

    it('should reset after time window', () => {
      const wallet = 'phantom';

      // Max out attempts
      for (let i = 0; i < 5; i++) {
        limiter.recordAttempt(wallet, false);
      }

      expect(limiter.canAttempt(wallet)).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(61000);

      // Should be able to attempt again
      expect(limiter.canAttempt(wallet)).toBe(true);
    });
  });

  describe('Exponential Backoff', () => {
    it('should apply exponential backoff on failures', () => {
      const wallet = 'phantom';

      // Max out attempts with failures
      for (let i = 0; i < 5; i++) {
        limiter.recordAttempt(wallet, false);
      }

      expect(limiter.canAttempt(wallet)).toBe(false);

      // Check initial backoff (1 second)
      vi.advanceTimersByTime(999);
      expect(limiter.canAttempt(wallet)).toBe(false);

      vi.advanceTimersByTime(2);
      expect(limiter.canAttempt(wallet)).toBe(true);
    });

    it('should increase backoff on consecutive failures', () => {
      const wallet = 'phantom';

      // First round of failures
      for (let i = 0; i < 5; i++) {
        limiter.recordAttempt(wallet, false);
      }

      // Wait for backoff and try again
      vi.advanceTimersByTime(1100);
      limiter.recordAttempt(wallet, false);

      // Backoff should be doubled (2 seconds)
      const cooldown = limiter.getCooldownTime(wallet);
      expect(cooldown).toBeGreaterThan(1900);
      expect(cooldown).toBeLessThanOrEqual(2000);
    });

    it('should reset backoff on success', () => {
      const wallet = 'phantom';

      // Some failures
      for (let i = 0; i < 3; i++) {
        limiter.recordAttempt(wallet, false);
      }

      // Success should reset backoff
      limiter.recordAttempt(wallet, true);

      // Continue with failures
      limiter.recordAttempt(wallet, false);

      // Check that we're at 5 attempts total
      expect(limiter.canAttempt(wallet)).toBe(false);

      // Backoff should be reset to initial (1 second)
      const cooldown = limiter.getCooldownTime(wallet);
      expect(cooldown).toBeLessThanOrEqual(1000);
    });

    it('should respect maximum backoff delay', () => {
      const wallet = 'phantom';

      // Many consecutive failures to max out backoff
      for (let round = 0; round < 10; round++) {
        for (let i = 0; i < 5; i++) {
          limiter.recordAttempt(wallet, false);
        }
        vi.advanceTimersByTime(31000); // Past max backoff
      }

      // Backoff should not exceed max (30 seconds)
      for (let i = 0; i < 5; i++) {
        limiter.recordAttempt(wallet, false);
      }

      const cooldown = limiter.getCooldownTime(wallet);
      expect(cooldown).toBeLessThanOrEqual(30000);
    });
  });

  describe('Cooldown Time Calculation', () => {
    it('should return 0 when not rate limited', () => {
      const wallet = 'phantom';
      expect(limiter.getCooldownTime(wallet)).toBe(0);

      limiter.recordAttempt(wallet, true);
      expect(limiter.getCooldownTime(wallet)).toBe(0);
    });

    it('should calculate remaining cooldown time', () => {
      const wallet = 'phantom';

      // Max out attempts
      for (let i = 0; i < 5; i++) {
        limiter.recordAttempt(wallet, false);
      }

      // Should have 1 second cooldown
      expect(limiter.getCooldownTime(wallet)).toBe(1000);

      // After 500ms, should have 500ms remaining
      vi.advanceTimersByTime(500);
      expect(limiter.getCooldownTime(wallet)).toBe(500);

      // After full second, should be 0
      vi.advanceTimersByTime(500);
      expect(limiter.getCooldownTime(wallet)).toBe(0);
    });
  });

  describe('Attempt Statistics', () => {
    it('should track attempt statistics', () => {
      const wallet = 'phantom';

      // Initial stats
      let stats = limiter.getAttemptStats(wallet);
      expect(stats.totalAttempts).toBe(0);
      expect(stats.successfulAttempts).toBe(0);
      expect(stats.failedAttempts).toBe(0);
      expect(stats.isRateLimited).toBe(false);

      // Record some attempts
      limiter.recordAttempt(wallet, true);
      limiter.recordAttempt(wallet, false);
      limiter.recordAttempt(wallet, true);

      stats = limiter.getAttemptStats(wallet);
      expect(stats.totalAttempts).toBe(3);
      expect(stats.successfulAttempts).toBe(2);
      expect(stats.failedAttempts).toBe(1);
      expect(stats.isRateLimited).toBe(false);
    });

    it('should indicate when rate limited', () => {
      const wallet = 'phantom';

      // Max out attempts
      for (let i = 0; i < 5; i++) {
        limiter.recordAttempt(wallet, false);
      }

      const stats = limiter.getAttemptStats(wallet);
      expect(stats.isRateLimited).toBe(true);
      expect(stats.nextRetryTime).toBeGreaterThan(Date.now());
    });
  });

  describe('Manual Override', () => {
    it('should allow force retry once', () => {
      const wallet = 'phantom';

      // Max out attempts
      for (let i = 0; i < 5; i++) {
        limiter.recordAttempt(wallet, false);
      }

      expect(limiter.canAttempt(wallet)).toBe(false);

      // Force retry should work once
      expect(limiter.forceRetry(wallet)).toBe(true);
      expect(limiter.canAttempt(wallet)).toBe(true);

      // Record the forced attempt
      limiter.recordAttempt(wallet, false);

      // Should be blocked again
      expect(limiter.canAttempt(wallet)).toBe(false);

      // Second force retry should fail
      expect(limiter.forceRetry(wallet)).toBe(false);
      expect(limiter.canAttempt(wallet)).toBe(false);
    });

    it('should reset override after time window', () => {
      const wallet = 'phantom';

      // Max out and use override
      for (let i = 0; i < 5; i++) {
        limiter.recordAttempt(wallet, false);
      }

      limiter.forceRetry(wallet);
      expect(limiter.canAttempt(wallet)).toBe(true);
      limiter.recordAttempt(wallet, false);

      // Advance past time window
      vi.advanceTimersByTime(61000);

      // Override should be available again
      expect(limiter.forceRetry(wallet)).toBe(true);
    });
  });

  describe('Clear Rate Limit', () => {
    it('should clear rate limit for specific wallet', () => {
      const wallet1 = 'phantom';
      const wallet2 = 'solflare';

      // Max out both wallets
      for (let i = 0; i < 5; i++) {
        limiter.recordAttempt(wallet1, false);
        limiter.recordAttempt(wallet2, false);
      }

      expect(limiter.canAttempt(wallet1)).toBe(false);
      expect(limiter.canAttempt(wallet2)).toBe(false);

      // Clear only wallet1
      limiter.clearRateLimit(wallet1);

      expect(limiter.canAttempt(wallet1)).toBe(true);
      expect(limiter.canAttempt(wallet2)).toBe(false);
    });

    it('should clear all rate limits', () => {
      const wallet1 = 'phantom';
      const wallet2 = 'solflare';

      // Max out both wallets
      for (let i = 0; i < 5; i++) {
        limiter.recordAttempt(wallet1, false);
        limiter.recordAttempt(wallet2, false);
      }

      expect(limiter.canAttempt(wallet1)).toBe(false);
      expect(limiter.canAttempt(wallet2)).toBe(false);

      // Clear all
      limiter.clearRateLimit();

      expect(limiter.canAttempt(wallet1)).toBe(true);
      expect(limiter.canAttempt(wallet2)).toBe(true);
    });
  });

  describe('Rate Limit Status', () => {
    it('should provide detailed status for UI', () => {
      const wallet = 'phantom';

      // Initial status
      let status = limiter.getRateLimitStatus(wallet);
      expect(status.isLimited).toBe(false);
      expect(status.attemptsRemaining).toBe(5);
      expect(status.severity).toBe('info');

      // After some attempts
      limiter.recordAttempt(wallet, false);
      limiter.recordAttempt(wallet, false);
      limiter.recordAttempt(wallet, false);

      status = limiter.getRateLimitStatus(wallet);
      expect(status.isLimited).toBe(false);
      expect(status.attemptsRemaining).toBe(2);
      expect(status.severity).toBe('warning');

      // After maxing out
      limiter.recordAttempt(wallet, false);
      limiter.recordAttempt(wallet, false);

      status = limiter.getRateLimitStatus(wallet);
      expect(status.isLimited).toBe(true);
      expect(status.attemptsRemaining).toBe(0);
      expect(status.severity).toBe('error');
      expect(status.canOverride).toBe(true);
    });

    it('should format messages appropriately', () => {
      const wallet = 'phantom';

      let status = limiter.getRateLimitStatus(wallet);
      expect(status.message).toContain('5 connection attempts available');

      // Near limit
      for (let i = 0; i < 4; i++) {
        limiter.recordAttempt(wallet, false);
      }

      status = limiter.getRateLimitStatus(wallet);
      expect(status.message).toContain('1 attempt remaining');

      // Rate limited
      limiter.recordAttempt(wallet, false);

      status = limiter.getRateLimitStatus(wallet);
      expect(status.message).toContain('Rate limited');
      expect(status.message).toContain('Try again in');
    });
  });

  describe('Persistence', () => {
    it('should persist to localStorage', () => {
      const wallet = 'phantom';

      // Record some attempts
      limiter.recordAttempt(wallet, true);
      limiter.recordAttempt(wallet, false);

      // Check localStorage
      const stored = localStorage.getItem('photon_wallet_rate_limits');
      expect(stored).toBeTruthy();

      const data = JSON.parse(stored || '{}');
      expect(data.version).toBe(1);
      expect(data.trackers).toHaveLength(1);
      expect(data.trackers[0].id).toBe(wallet);
      expect(data.trackers[0].attempts).toBe(2);
    });

    it('should restore from localStorage', () => {
      const wallet = 'phantom';

      // Record attempts with first limiter
      limiter.recordAttempt(wallet, true);
      limiter.recordAttempt(wallet, false);
      limiter.recordAttempt(wallet, false);

      // Create new limiter (should restore)
      const newLimiter = createEnhancedRateLimiter(defaultConfig);

      const stats = newLimiter.getAttemptStats(wallet);
      expect(stats.totalAttempts).toBe(3);
      expect(stats.successfulAttempts).toBe(1);
      expect(stats.failedAttempts).toBe(2);
    });

    it('should ignore old persisted data', () => {
      const oldData = {
        version: 1,
        trackers: [
          {
            id: 'phantom',
            attempts: 5,
            successCount: 2,
            failureCount: 3,
            firstAttemptTime: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
            lastAttemptTime: Date.now() - 2 * 60 * 60 * 1000,
            backoffMultiplier: 1,
            overrideUsed: false,
            consecutiveFailures: 0,
          },
        ],
        globalAttempts: 5,
        globalFirstAttempt: Date.now() - 2 * 60 * 60 * 1000,
        timestamp: Date.now() - 2 * 60 * 60 * 1000,
      };

      localStorage.setItem('photon_wallet_rate_limits', JSON.stringify(oldData));

      // Create new limiter
      const newLimiter = createEnhancedRateLimiter(defaultConfig);

      // Old data should be ignored
      const stats = newLimiter.getAttemptStats('phantom');
      expect(stats.totalAttempts).toBe(0);
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('Storage full');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      // Should not throw
      expect(() => {
        limiter.recordAttempt('phantom', false);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to persist rate limit data:',
        expect.any(Error),
      );

      // Restore
      Storage.prototype.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid attempts correctly', () => {
      const wallet = 'phantom';

      // Rapid fire attempts
      for (let i = 0; i < 10; i++) {
        if (limiter.canAttempt(wallet)) {
          limiter.recordAttempt(wallet, false);
        }
      }

      const stats = limiter.getAttemptStats(wallet);
      expect(stats.totalAttempts).toBe(5); // Should stop at limit
      expect(stats.isRateLimited).toBe(true);
    });

    it('should handle time window boundary correctly', () => {
      const wallet = 'phantom';

      // Record 4 attempts
      for (let i = 0; i < 4; i++) {
        limiter.recordAttempt(wallet, false);
      }

      // Advance to just before window expires
      vi.advanceTimersByTime(59999);

      // Should still be limited to 1 more attempt
      expect(limiter.canAttempt(wallet)).toBe(true);
      limiter.recordAttempt(wallet, false);
      expect(limiter.canAttempt(wallet)).toBe(false);

      // Advance past window
      vi.advanceTimersByTime(2);

      // Should reset
      expect(limiter.canAttempt(wallet)).toBe(true);
      const stats = limiter.getAttemptStats(wallet);
      expect(stats.totalAttempts).toBe(0);
    });

    it('should handle mixed success and failure patterns', () => {
      const wallet = 'phantom';

      // Pattern: success, fail, fail, success, fail
      limiter.recordAttempt(wallet, true);
      limiter.recordAttempt(wallet, false);
      limiter.recordAttempt(wallet, false);
      limiter.recordAttempt(wallet, true);
      limiter.recordAttempt(wallet, false);

      // Should be rate limited after 5 attempts
      expect(limiter.canAttempt(wallet)).toBe(false);

      const stats = limiter.getAttemptStats(wallet);
      expect(stats.successfulAttempts).toBe(2);
      expect(stats.failedAttempts).toBe(3);
    });
  });
});
