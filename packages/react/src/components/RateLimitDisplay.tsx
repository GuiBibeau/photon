import * as React from 'react';
import type { RateLimitStatus } from '../wallet/rate-limiter';

/**
 * Props for RateLimitDisplay component
 */
export interface RateLimitDisplayProps {
  status: RateLimitStatus;
  onOverride?: () => void;
  onClearLimit?: () => void;
  className?: string;
}

/**
 * Display rate limit status with cooldown timer
 */
export function RateLimitDisplay({
  status,
  onOverride,
  onClearLimit,
  className = '',
}: RateLimitDisplayProps): React.ReactElement | null {
  const [timeRemaining, setTimeRemaining] = React.useState(status.remainingTime);

  React.useEffect(() => {
    if (!status.isLimited) {
      setTimeRemaining(0);
      return;
    }

    setTimeRemaining(status.remainingTime);

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = Math.max(0, prev - 1000);
        if (next === 0) {
          clearInterval(interval);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status.isLimited, status.remainingTime]);

  if (!status.isLimited && status.attemptsRemaining > 2) {
    return null; // Don't show when plenty of attempts remain
  }

  const formatTime = (ms: number): string => {
    if (ms <= 0) {
      return 'Ready';
    }

    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getSeverityColor = (): string => {
    switch (status.severity) {
      case 'error':
        return 'red';
      case 'warning':
        return 'orange';
      default:
        return 'blue';
    }
  };

  const getSeverityEmoji = (): string => {
    switch (status.severity) {
      case 'error':
        return '🚫';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div
      className={className}
      style={{
        padding: '12px 16px',
        borderRadius: '8px',
        backgroundColor: `${getSeverityColor()}10`,
        border: `1px solid ${getSeverityColor()}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '18px' }}>{getSeverityEmoji()}</span>
        <div>
          <div style={{ color: getSeverityColor(), fontWeight: 500 }}>{status.message}</div>
          {status.isLimited && timeRemaining > 0 && (
            <div
              style={{
                marginTop: '4px',
                fontSize: '20px',
                fontWeight: 'bold',
                fontVariantNumeric: 'tabular-nums',
                color: getSeverityColor(),
              }}
            >
              {formatTime(timeRemaining)}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        {status.canOverride && onOverride && (
          <button
            onClick={onOverride}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: `1px solid ${getSeverityColor()}60`,
              backgroundColor: 'white',
              color: getSeverityColor(),
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${getSeverityColor()}10`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            Override Once
          </button>
        )}

        {onClearLimit && (
          <button
            onClick={onClearLimit}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              backgroundColor: 'white',
              color: '#666',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            Clear Limit
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Minimal rate limit indicator
 */
export function RateLimitIndicator({
  status,
  className = '',
}: {
  status: RateLimitStatus;
  className?: string;
}): React.ReactElement | null {
  if (!status.isLimited) {
    return null;
  }

  const [dots, setDots] = React.useState('');

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : `${prev}.`));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className={className}
      style={{
        color: 'red',
        fontSize: '12px',
        fontFamily: 'monospace',
      }}
    >
      Rate limited{dots}
    </span>
  );
}
