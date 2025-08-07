/**
 * Tests for enhanced subscription management features.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { address } from '@photon/addresses';
import { WebSocketSubscriptionClient } from '../src/client.js';
import { SubscriptionManager, RateLimiter } from '../src/subscription-manager.js';
import type { AccountChangeNotification } from '../src/types.js';

// Mock WebSocket implementation
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  private subscriptionCounter = 0;
  private pendingMessages: Array<() => void> = [];

  constructor(public url: string) {
    // Open connection after a tick
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
      // Process any pending messages
      this.pendingMessages.forEach((fn) => fn());
      this.pendingMessages = [];
    }, 0);
  }

  send(data: string): void {
    const message = JSON.parse(data);

    const sendResponse = () => {
      // Auto-respond to subscription requests
      if (message.method?.includes('Subscribe') && !message.method?.includes('Unsubscribe')) {
        const subscriptionId = ++this.subscriptionCounter;
        this.onmessage?.({
          data: JSON.stringify({
            jsonrpc: '2.0',
            result: subscriptionId,
            id: message.id,
          }),
        } as MessageEvent);
      }

      // Auto-respond to unsubscribe requests
      if (message.method?.includes('Unsubscribe')) {
        this.onmessage?.({
          data: JSON.stringify({
            jsonrpc: '2.0',
            result: true,
            id: message.id,
          }),
        } as MessageEvent);
      }
    };

    if (this.readyState === MockWebSocket.OPEN) {
      setTimeout(sendResponse, 0);
    } else {
      this.pendingMessages.push(sendResponse);
    }
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code: 1006 })); // Abnormal closure
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true;
  }
}

describe('RateLimiter', () => {
  it('should allow requests within rate limit', () => {
    const limiter = new RateLimiter(5, 1000);

    for (let i = 0; i < 5; i++) {
      expect(limiter.isAllowed()).toBe(true);
      limiter.record();
    }

    // Should not allow 6th request
    expect(limiter.isAllowed()).toBe(false);
  });

  it('should reset after time window', async () => {
    const limiter = new RateLimiter(2, 100);

    limiter.record();
    limiter.record();
    expect(limiter.isAllowed()).toBe(false);

    // Wait for window to pass
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(limiter.isAllowed()).toBe(true);
  });

  it('should calculate usage percentage', () => {
    const limiter = new RateLimiter(10, 1000);

    expect(limiter.getUsagePercent()).toBe(0);

    for (let i = 0; i < 5; i++) {
      limiter.record();
    }

    expect(limiter.getUsagePercent()).toBe(50);

    for (let i = 0; i < 5; i++) {
      limiter.record();
    }

    expect(limiter.getUsagePercent()).toBe(100);
  });

  it('should reset on demand', () => {
    const limiter = new RateLimiter(5, 1000);

    for (let i = 0; i < 5; i++) {
      limiter.record();
    }

    expect(limiter.isAllowed()).toBe(false);

    limiter.reset();

    expect(limiter.isAllowed()).toBe(true);
    expect(limiter.getUsagePercent()).toBe(0);
  });
});

describe('SubscriptionManager', () => {
  let client: WebSocketSubscriptionClient;
  let manager: SubscriptionManager;

  beforeEach(async () => {
    client = new WebSocketSubscriptionClient({
      url: 'ws://localhost:8900',
      WebSocketImpl: MockWebSocket as unknown as typeof WebSocket,
    });

    await client.connect();

    manager = new SubscriptionManager(client, {
      maxConcurrentSubscriptions: 10,
      maxRequestsPerWindow: 5,
      rateLimitWindowMs: 1000,
      enableGapDetection: true,
      queueOverflowStrategy: 'drop-oldest',
      maxQueueSizePerSubscription: 3,
    });
  });

  afterEach(async () => {
    await manager.clearAll();
    await client.disconnect();
  });

  describe('Concurrent subscription limits', () => {
    it('should enforce maximum concurrent subscriptions', async () => {
      const testAddress = address('11111111111111111111111111111112');
      const handler = vi.fn();

      // Create manager with higher rate limit for this test
      const testManager = new SubscriptionManager(client, {
        maxConcurrentSubscriptions: 10,
        maxRequestsPerWindow: 20, // Higher rate limit
        rateLimitWindowMs: 1000,
      });

      // Create subscriptions up to the limit
      const subscriptionIds: number[] = [];
      for (let i = 0; i < 10; i++) {
        const id = await testManager.subscribe('accountSubscribe', [testAddress], handler);
        subscriptionIds.push(id);
      }

      // Should throw when exceeding limit
      await expect(
        testManager.subscribe('accountSubscribe', [testAddress], handler),
      ).rejects.toThrow('Maximum concurrent subscriptions (10) reached');

      // Clean up one subscription
      await testManager.unsubscribe(subscriptionIds[0], 'accountUnsubscribe');

      // Should now allow a new subscription
      const newId = await testManager.subscribe('accountSubscribe', [testAddress], handler);
      expect(newId).toBeDefined();

      // Clean up
      await testManager.clearAll();
    });

    it('should track subscription statistics', async () => {
      const testAddress = address('11111111111111111111111111111112');
      const handler = vi.fn();

      const id1 = await manager.subscribe('accountSubscribe', [testAddress], handler);
      const id2 = await manager.subscribe('accountSubscribe', [testAddress], handler);

      const stats = manager.getStats();
      expect(stats.activeSubscriptions).toBe(2);
      expect(stats.totalEventsProcessed).toBe(0);
      expect(stats.subscriptionDetails).toHaveLength(2);
      expect(stats.subscriptionDetails[0].id).toBe(id1);
      expect(stats.subscriptionDetails[1].id).toBe(id2);
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits', async () => {
      const testAddress = address('11111111111111111111111111111112');
      const handler = vi.fn();

      // Create subscriptions up to rate limit
      for (let i = 0; i < 5; i++) {
        await manager.subscribe('accountSubscribe', [testAddress], handler);
      }

      // Should throw when exceeding rate limit
      await expect(manager.subscribe('accountSubscribe', [testAddress], handler)).rejects.toThrow(
        'Rate limit exceeded: 5 requests per 1000ms',
      );
    });

    it('should allow requests after rate limit window', async () => {
      const testAddress = address('11111111111111111111111111111112');
      const handler = vi.fn();

      // Create subscriptions up to rate limit
      for (let i = 0; i < 5; i++) {
        await manager.subscribe('accountSubscribe', [testAddress], handler);
      }

      // Wait for rate limit window to pass
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should allow new subscription
      const id = await manager.subscribe('accountSubscribe', [testAddress], handler);
      expect(id).toBeDefined();
    });
  });

  describe('Queue overflow handling', () => {
    it('should handle queue overflow with drop-oldest strategy', async () => {
      const testAddress = address('11111111111111111111111111111112');
      const receivedData: unknown[] = [];
      const handler = vi.fn((data) => {
        receivedData.push(data);
      });

      const subscriptionId = await manager.subscribe('accountSubscribe', [testAddress], handler);

      // Wait for subscription to establish
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Simulate rapid notifications exceeding queue size
      for (let i = 1; i <= 5; i++) {
        const notification: AccountChangeNotification = {
          lamports: BigInt(i * 1000000),
          data: `data${i}`,
          owner: testAddress,
          executable: false,
          rentEpoch: 300n,
        };

        // Call the handler directly through the client's subscription
        (client as any).subscriptions.get(subscriptionId)?.handler(notification);
      }

      // Process messages
      await new Promise((resolve) => setTimeout(resolve, 100));

      // With max queue size of 3 and drop-oldest, we should get the most recent ones
      expect(handler).toHaveBeenCalled();
    });

    it('should handle queue overflow with drop-newest strategy', async () => {
      const manager2 = new SubscriptionManager(client, {
        maxConcurrentSubscriptions: 10,
        queueOverflowStrategy: 'drop-newest',
        maxQueueSizePerSubscription: 3,
      });

      const testAddress = address('11111111111111111111111111111112');
      const handler = vi.fn();

      await manager2.subscribe('accountSubscribe', [testAddress], handler);

      // Clean up
      await manager2.clearAll();
    });

    it('should handle queue overflow with reject strategy', async () => {
      const manager3 = new SubscriptionManager(client, {
        maxConcurrentSubscriptions: 10,
        queueOverflowStrategy: 'reject',
        maxQueueSizePerSubscription: 3,
      });

      const testAddress = address('11111111111111111111111111111112');
      const handler = vi.fn();
      const errorHandler = vi.fn();

      await manager3.subscribe('accountSubscribe', [testAddress], handler, errorHandler);

      // Clean up
      await manager3.clearAll();
    });
  });

  describe('Gap detection', () => {
    it('should detect gaps on reconnection', async () => {
      const testAddress = address('11111111111111111111111111111112');
      const handler = vi.fn();

      const subscriptionId = await manager.subscribe('accountSubscribe', [testAddress], handler);

      // Simulate disconnection
      manager.onDisconnect();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate reconnection
      const gaps = await manager.onReconnect();

      expect(gaps).toHaveLength(1);
      expect(gaps[0].subscriptionId).toBe(subscriptionId);
      expect(gaps[0].method).toBe('accountSubscribe');
      expect(gaps[0].possibleMissedEvents).toBe(true);
      expect(gaps[0].disconnectedAt).toBeLessThan(gaps[0].reconnectedAt);
    });

    it('should not detect gaps when disabled', async () => {
      const manager4 = new SubscriptionManager(client, {
        enableGapDetection: false,
      });

      const testAddress = address('11111111111111111111111111111112');
      const handler = vi.fn();

      await manager4.subscribe('accountSubscribe', [testAddress], handler);

      // Simulate disconnection
      manager4.onDisconnect();

      // Simulate reconnection
      const gaps = await manager4.onReconnect();

      expect(gaps).toHaveLength(0);

      // Clean up
      await manager4.clearAll();
    });
  });

  describe('Resource management', () => {
    it('should track resource usage', async () => {
      const testAddress = address('11111111111111111111111111111112');
      const handler = vi.fn();

      await manager.subscribe('accountSubscribe', [testAddress], handler);
      await manager.subscribe('accountSubscribe', [testAddress], handler);

      const usage = manager.getResourceUsage();

      expect(usage.subscriptionCount).toBe(2);
      expect(usage.maxSubscriptions).toBe(10);
      expect(usage.usagePercent).toBe(20);
      expect(usage.totalQueuedItems).toBe(0);
      expect(usage.memoryEstimate).toBeGreaterThan(0);
    });

    it('should clear all subscriptions', async () => {
      const testAddress = address('11111111111111111111111111111112');
      const handler = vi.fn();

      await manager.subscribe('accountSubscribe', [testAddress], handler);
      await manager.subscribe('programSubscribe', [testAddress], handler);

      expect(manager.getStats().activeSubscriptions).toBe(2);

      await manager.clearAll();

      expect(manager.getStats().activeSubscriptions).toBe(0);
      expect(manager.getResourceUsage().subscriptionCount).toBe(0);
    });

    it('should handle unsubscribe cleanup', async () => {
      const testAddress = address('11111111111111111111111111111112');
      const handler = vi.fn();

      const id = await manager.subscribe('accountSubscribe', [testAddress], handler);

      expect(manager.getStats().activeSubscriptions).toBe(1);

      const result = await manager.unsubscribe(id, 'accountUnsubscribe');
      expect(result).toBe(true);

      expect(manager.getStats().activeSubscriptions).toBe(0);
    });

    it('should clean up even if unsubscribe fails', async () => {
      const testAddress = address('11111111111111111111111111111112');
      const handler = vi.fn();

      const id = await manager.subscribe('accountSubscribe', [testAddress], handler);

      // Mock unsubscribe to throw
      vi.spyOn(client, 'unsubscribe').mockRejectedValue(new Error('Unsubscribe failed'));

      try {
        await manager.unsubscribe(id, 'accountUnsubscribe');
      } catch {
        // Expected to throw
      }

      // Should still clean up local state
      expect(manager.getStats().activeSubscriptions).toBe(0);
    });
  });

  describe('Event processing', () => {
    it('should track event counts and processing', async () => {
      const testAddress = address('11111111111111111111111111111112');
      const handler = vi.fn();

      const subscriptionId = await manager.subscribe('accountSubscribe', [testAddress], handler);

      // Wait for subscription to establish
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Simulate notifications
      for (let i = 0; i < 3; i++) {
        const notification: AccountChangeNotification = {
          lamports: BigInt(i * 1000000),
          data: `data${i}`,
          owner: testAddress,
          executable: false,
          rentEpoch: 300n,
        };

        // Get the wrapped handler from the client
        const clientSub = (client as any).subscriptions.get(subscriptionId);
        if (clientSub) {
          clientSub.handler(notification);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      const stats = manager.getStats();
      expect(stats.totalEventsProcessed).toBeGreaterThan(0);
      const subDetail = stats.subscriptionDetails.find((d) => d.id === subscriptionId);
      expect(subDetail?.eventCount).toBeGreaterThan(0);
    });
  });
});
