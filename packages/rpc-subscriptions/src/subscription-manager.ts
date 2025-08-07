/**
 * Enhanced subscription management with resource limits and rate control.
 */

import type { WebSocketSubscriptionClient } from './client.js';
import type { ErrorHandler, SubscriptionHandler } from './types.js';

/**
 * Rate limiter for subscription operations.
 */
export class RateLimiter {
  private timestamps: number[] = [];
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if operation is allowed under rate limit.
   */
  isAllowed(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    return this.timestamps.length < this.maxRequests;
  }

  /**
   * Record an operation.
   */
  record(): void {
    this.timestamps.push(Date.now());
  }

  /**
   * Get current usage percentage.
   */
  getUsagePercent(): number {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    return (this.timestamps.length / this.maxRequests) * 100;
  }

  /**
   * Reset the rate limiter.
   */
  reset(): void {
    this.timestamps = [];
  }
}

/**
 * Configuration for enhanced subscription management.
 */
export interface SubscriptionManagerConfig {
  /** Maximum concurrent subscriptions (default: 100) */
  maxConcurrentSubscriptions?: number;
  /** Rate limit: max requests per window (default: 30) */
  maxRequestsPerWindow?: number;
  /** Rate limit window in ms (default: 60000) */
  rateLimitWindowMs?: number;
  /** Enable gap detection on reconnect (default: true) */
  enableGapDetection?: boolean;
  /** Queue overflow strategy (default: 'drop-oldest') */
  queueOverflowStrategy?: 'drop-oldest' | 'drop-newest' | 'reject';
  /** Max items per subscription queue (default: 1000) */
  maxQueueSizePerSubscription?: number;
}

/**
 * Subscription metadata for tracking.
 */
interface SubscriptionMetadata<T = unknown> {
  id: number;
  method: string;
  params?: unknown;
  createdAt: number;
  lastEventAt?: number;
  eventCount: number;
  queueSize: number;
  handler: SubscriptionHandler<T>;
  errorHandler?: ErrorHandler;
}

/**
 * Gap information for reconnection scenarios.
 */
export interface SubscriptionGap {
  subscriptionId: number;
  method: string;
  disconnectedAt: number;
  reconnectedAt: number;
  possibleMissedEvents: boolean;
}

/**
 * Enhanced subscription manager with resource management.
 */
export class SubscriptionManager {
  private readonly client: WebSocketSubscriptionClient;
  private readonly config: Required<SubscriptionManagerConfig>;
  private readonly rateLimiter: RateLimiter;
  private readonly subscriptions = new Map<number, SubscriptionMetadata<unknown>>();
  private readonly subscriptionQueues = new Map<number, unknown[]>();
  private disconnectedAt: number | null = null;
  private totalEventsProcessed = 0;

  constructor(client: WebSocketSubscriptionClient, config?: SubscriptionManagerConfig) {
    this.client = client;
    this.config = {
      maxConcurrentSubscriptions: config?.maxConcurrentSubscriptions ?? 100,
      maxRequestsPerWindow: config?.maxRequestsPerWindow ?? 30,
      rateLimitWindowMs: config?.rateLimitWindowMs ?? 60000,
      enableGapDetection: config?.enableGapDetection ?? true,
      queueOverflowStrategy: config?.queueOverflowStrategy ?? 'drop-oldest',
      maxQueueSizePerSubscription: config?.maxQueueSizePerSubscription ?? 1000,
    };

    this.rateLimiter = new RateLimiter(
      this.config.maxRequestsPerWindow,
      this.config.rateLimitWindowMs,
    );
  }

  /**
   * Create a managed subscription with resource limits.
   */
  async subscribe<T>(
    method: string,
    params: unknown[] | undefined,
    handler: SubscriptionHandler<T>,
    errorHandler?: ErrorHandler,
  ): Promise<number> {
    // Check concurrent subscription limit
    if (this.subscriptions.size >= this.config.maxConcurrentSubscriptions) {
      throw new Error(
        `Maximum concurrent subscriptions (${this.config.maxConcurrentSubscriptions}) reached`,
      );
    }

    // Check rate limit
    if (!this.rateLimiter.isAllowed()) {
      throw new Error(
        `Rate limit exceeded: ${this.config.maxRequestsPerWindow} requests per ${this.config.rateLimitWindowMs}ms`,
      );
    }

    // Record the operation for rate limiting
    this.rateLimiter.record();

    // Create queue for this subscription
    const subscriptionQueue: T[] = [];

    // Wrap handler with queue management
    const wrappedHandler: SubscriptionHandler<T> = (data: T) => {
      const subscriptionId = Array.from(this.subscriptions.entries()).find(
        ([, meta]) => meta.handler === wrappedHandler,
      )?.[0];

      if (subscriptionId !== undefined) {
        const metadata = this.subscriptions.get(subscriptionId);
        if (metadata) {
          metadata.lastEventAt = Date.now();
          metadata.eventCount++;
          this.totalEventsProcessed++;

          // Queue management
          const queue = this.subscriptionQueues.get(subscriptionId) ?? [];
          if (queue.length >= this.config.maxQueueSizePerSubscription) {
            switch (this.config.queueOverflowStrategy) {
              case 'drop-oldest':
                queue.shift();
                break;
              case 'drop-newest':
                return; // Don't add new item
              case 'reject':
                if (errorHandler) {
                  errorHandler(new Error('Subscription queue overflow'));
                }
                return;
            }
          }
          queue.push(data);
          this.subscriptionQueues.set(subscriptionId, queue);
          metadata.queueSize = queue.length;

          // Process through original handler
          try {
            handler(data);
          } finally {
            // Remove from queue after processing
            const updatedQueue = this.subscriptionQueues.get(subscriptionId) ?? [];
            const index = updatedQueue.indexOf(data);
            if (index > -1) {
              updatedQueue.splice(index, 1);
              if (metadata) {
                metadata.queueSize = updatedQueue.length;
              }
            }
          }
        }
      }
    };

    const subscriptionId = await this.client.subscribe(
      method,
      params,
      wrappedHandler,
      errorHandler,
    );

    // Store metadata
    const metadata: SubscriptionMetadata<T> = {
      id: subscriptionId,
      method,
      params,
      createdAt: Date.now(),
      eventCount: 0,
      queueSize: 0,
      handler: wrappedHandler,
      ...(errorHandler ? { errorHandler } : {}),
    };
    this.subscriptions.set(subscriptionId, metadata as SubscriptionMetadata<unknown>);
    this.subscriptionQueues.set(subscriptionId, subscriptionQueue);

    return subscriptionId;
  }

  /**
   * Unsubscribe with cleanup.
   */
  async unsubscribe(subscriptionId: number, unsubscribeMethod: string): Promise<boolean> {
    const metadata = this.subscriptions.get(subscriptionId);
    if (!metadata) {
      return false;
    }

    try {
      const result = await this.client.unsubscribe(subscriptionId, unsubscribeMethod);

      // Clean up metadata and queue
      this.subscriptions.delete(subscriptionId);
      this.subscriptionQueues.delete(subscriptionId);

      return result;
    } catch (error) {
      // Still clean up local state even if unsubscribe fails
      this.subscriptions.delete(subscriptionId);
      this.subscriptionQueues.delete(subscriptionId);
      throw error;
    }
  }

  /**
   * Handle disconnection event.
   */
  onDisconnect(): void {
    if (this.config.enableGapDetection) {
      this.disconnectedAt = Date.now();
    }
  }

  /**
   * Handle reconnection with gap detection.
   */
  async onReconnect(): Promise<SubscriptionGap[]> {
    const gaps: SubscriptionGap[] = [];

    if (this.config.enableGapDetection && this.disconnectedAt !== null) {
      const reconnectedAt = Date.now();

      // Check each subscription for potential gaps
      for (const [id, metadata] of this.subscriptions) {
        gaps.push({
          subscriptionId: id,
          method: metadata.method,
          disconnectedAt: this.disconnectedAt,
          reconnectedAt,
          possibleMissedEvents: true,
        });
      }

      this.disconnectedAt = null;
    }

    // Resubscribe all with gap awareness
    await this.resubscribeAll();

    return gaps;
  }

  /**
   * Resubscribe all active subscriptions.
   */
  private async resubscribeAll(): Promise<void> {
    const subscriptionEntries = Array.from(this.subscriptions.entries());

    for (const [, metadata] of subscriptionEntries) {
      try {
        // Note: This would need coordination with the client to map old to new IDs
        await this.client.subscribe(
          metadata.method,
          metadata.params as unknown[],
          metadata.handler,
          metadata.errorHandler,
        );
      } catch (error) {
        if (metadata.errorHandler) {
          metadata.errorHandler(
            error instanceof Error ? error : new Error('Resubscription failed'),
          );
        }
      }
    }
  }

  /**
   * Get subscription statistics.
   */
  getStats(): {
    activeSubscriptions: number;
    totalEventsProcessed: number;
    rateLimitUsage: number;
    subscriptionDetails: Array<{
      id: number;
      method: string;
      eventCount: number;
      queueSize: number;
      age: number;
    }>;
  } {
    const now = Date.now();

    return {
      activeSubscriptions: this.subscriptions.size,
      totalEventsProcessed: this.totalEventsProcessed,
      rateLimitUsage: this.rateLimiter.getUsagePercent(),
      subscriptionDetails: Array.from(this.subscriptions.entries()).map(([id, meta]) => ({
        id,
        method: meta.method,
        eventCount: meta.eventCount,
        queueSize: meta.queueSize,
        age: now - meta.createdAt,
      })),
    };
  }

  /**
   * Clear all subscriptions.
   */
  async clearAll(): Promise<void> {
    const unsubscribePromises: Promise<boolean>[] = [];

    for (const [id, metadata] of this.subscriptions) {
      const unsubMethod = metadata.method.replace('Subscribe', 'Unsubscribe');
      unsubscribePromises.push(this.unsubscribe(id, unsubMethod));
    }

    await Promise.allSettled(unsubscribePromises);

    // Clear all remaining state
    this.subscriptions.clear();
    this.subscriptionQueues.clear();
    this.rateLimiter.reset();
    this.totalEventsProcessed = 0;
  }

  /**
   * Get resource usage information.
   */
  getResourceUsage(): {
    subscriptionCount: number;
    maxSubscriptions: number;
    usagePercent: number;
    totalQueuedItems: number;
    largestQueue: { id: number; size: number } | null;
    memoryEstimate: number;
  } {
    let totalQueued = 0;
    let largestQueue: { id: number; size: number } | null = null;

    for (const [id, queue] of this.subscriptionQueues) {
      totalQueued += queue.length;
      if (!largestQueue || queue.length > largestQueue.size) {
        largestQueue = { id, size: queue.length };
      }
    }

    // Rough memory estimate (bytes)
    const memoryEstimate =
      this.subscriptions.size * 200 + // Metadata overhead
      totalQueued * 100; // Average item size estimate

    return {
      subscriptionCount: this.subscriptions.size,
      maxSubscriptions: this.config.maxConcurrentSubscriptions,
      usagePercent: (this.subscriptions.size / this.config.maxConcurrentSubscriptions) * 100,
      totalQueuedItems: totalQueued,
      largestQueue,
      memoryEstimate,
    };
  }
}
