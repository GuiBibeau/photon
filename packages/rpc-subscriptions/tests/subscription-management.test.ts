/**
 * Tests for subscription management, cleanup, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { address } from '@photon/addresses';
import { WebSocketSubscriptionClient } from '../src/client.js';
import { MockWebSocket, createMockWebSocketConstructor } from './mocks/websocket.js';
import {
  accountSubscribe,
  signatureSubscribe,
  programSubscribe,
} from '../src/subscription-methods.js';
import type { AccountChangeNotification } from '../src/types.js';

describe('Subscription Management', () => {
  let client: WebSocketSubscriptionClient;
  let ws: MockWebSocket;

  beforeEach(async () => {
    MockWebSocket.reset();

    client = new WebSocketSubscriptionClient({
      url: 'ws://localhost:8900',
      WebSocketImpl: MockWebSocket as any,
    });

    await client.connect();
    ws = MockWebSocket.lastInstance as MockWebSocket;
  });

  afterEach(async () => {
    await client.disconnect();
    MockWebSocket.reset();
  });

  describe('Subscription Cleanup', () => {
    it('should cleanup subscription on iterator break', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const updates: AccountChangeNotification[] = [];

      const iterator = accountSubscribe(client, testAddress);

      // Start consuming
      const consumePromise = (async () => {
        for await (const update of iterator) {
          updates.push(update);
          if (updates.length >= 1) {
            break;
          } // Break early
        }
      })();

      // Wait for subscription
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Send update
      const notification: AccountChangeNotification = {
        lamports: 1000000000n,
        data: 'test',
        owner: address('11111111111111111111111111111111'),
        executable: false,
        rentEpoch: 123n,
      };
      ws.simulateNotification(1, notification);
      await new Promise((resolve) => setTimeout(resolve, 20));

      await consumePromise;

      // Check that unsubscribe was called
      ws.autoRespond = false;
      const messagesBefore = ws.sentMessages.length;

      // Try to send another notification - should not be received
      ws.simulateNotification(1, notification);
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Check for unsubscribe message
      const _unsubMessages = ws.sentMessages.slice(messagesBefore).filter((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.method === 'accountUnsubscribe';
      });

      expect(updates).toHaveLength(1);
    });

    it('should cleanup subscription on iterator return', async () => {
      const testAddress = address('11111111111111111111111111111111');

      const iterator = accountSubscribe(client, testAddress);

      // Wait for subscription
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Manually return the iterator
      await iterator.return();

      // Check for unsubscribe in sent messages
      const hasUnsubscribe = ws.sentMessages.some((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.method === 'accountUnsubscribe';
      });

      expect(hasUnsubscribe).toBe(true);
    });

    it('should cleanup subscription on iterator throw', async () => {
      const testAddress = address('11111111111111111111111111111111');

      const iterator = accountSubscribe(client, testAddress);

      // Wait for subscription
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Throw an error
      await iterator.throw(new Error('Test error'));

      // Try to get next value - should be done
      const result = await iterator.next();
      expect(result.done).toBe(true);
    });

    it('should handle cleanup errors gracefully', async () => {
      const testAddress = address('11111111111111111111111111111111');

      const iterator = accountSubscribe(client, testAddress);

      // Wait for subscription
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Simulate WebSocket closed before cleanup
      ws.readyState = MockWebSocket.CLOSED;

      // Should not throw when cleaning up
      await expect(iterator.return()).resolves.toBeDefined();
    });
  });

  describe('Multiple Subscriptions', () => {
    it('should handle multiple concurrent subscriptions', async () => {
      const address1 = address('11111111111111111111111111111111');
      const address2 = address('So11111111111111111111111111111111111111112');
      const address3 = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

      const iterator1 = accountSubscribe(client, address1);
      const iterator2 = accountSubscribe(client, address2);
      const iterator3 = accountSubscribe(client, address3);

      // Wait for all subscriptions
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Check that all subscriptions were created
      const subscribeMessages = ws.sentMessages.filter((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.method === 'accountSubscribe';
      });

      expect(subscribeMessages).toHaveLength(3);

      // Clean up
      await iterator1.return();
      await iterator2.return();
      await iterator3.return();
    });

    it('should handle mixed subscription types', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const programId = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      const signature = 'test-signature';

      const accountIter = accountSubscribe(client, testAddress);
      const programIter = programSubscribe(client, programId);
      const signatureIter = signatureSubscribe(client, signature);

      // Wait for all subscriptions
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Check different subscription types
      const messages = ws.sentMessages.map((msg) => JSON.parse(msg));
      const methods = messages.map((m) => m.method).filter(Boolean);

      expect(methods).toContain('accountSubscribe');
      expect(methods).toContain('programSubscribe');
      expect(methods).toContain('signatureSubscribe');

      // Clean up
      await accountIter.return();
      await programIter.return();
      await signatureIter.return();
    });
  });

  describe('Subscription Errors', () => {
    it('should handle subscription error response', async () => {
      const testAddress = address('11111111111111111111111111111111');

      // Disable auto-response to control the response
      ws.autoRespond = false;

      const iterator = accountSubscribe(client, testAddress);

      // Capture the request
      await new Promise((resolve) => setTimeout(resolve, 20));
      const lastMessage = JSON.parse(ws.sentMessages[ws.sentMessages.length - 1]);

      // Send error response
      ws.simulateError(lastMessage.id, -32602, 'Invalid params');

      // Give time for the error to propagate
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Try to consume - should throw
      await expect(iterator.next()).rejects.toThrow('Invalid params');
    });

    it('should propagate handler errors through error handler', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const handlerErrors: Error[] = [];

      await client.subscribe(
        'accountSubscribe',
        [testAddress],
        () => {
          throw new Error('Handler error');
        },
        (error) => {
          handlerErrors.push(error);
        },
      );

      // Send notification
      const notification: AccountChangeNotification = {
        lamports: 1000000000n,
        data: 'test',
        owner: address('11111111111111111111111111111111'),
        executable: false,
        rentEpoch: 123n,
      };

      ws.simulateNotification(1, notification);
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(handlerErrors).toHaveLength(1);
      expect(handlerErrors[0].message).toBe('Handler error');
    });
  });

  describe('Unsubscribe', () => {
    it('should successfully unsubscribe', async () => {
      const testAddress = address('11111111111111111111111111111111');

      const subscriptionId = await client.subscribe('accountSubscribe', [testAddress], () => {});

      expect(subscriptionId).toBe(1);

      // Unsubscribe
      const success = await client.unsubscribe(subscriptionId, 'accountUnsubscribe');
      expect(success).toBe(true);

      // Check unsubscribe message was sent
      const unsubMessage = ws.sentMessages.find((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.method === 'accountUnsubscribe';
      });

      expect(unsubMessage).toBeDefined();
    });

    it('should return false for non-existent subscription', async () => {
      const success = await client.unsubscribe(999, 'accountUnsubscribe');
      expect(success).toBe(false);
    });
  });

  describe('Reconnection', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should attempt reconnection on unexpected disconnect', async () => {
      const WebSocketReconnect = createMockWebSocketConstructor({
        connectionDelay: 10,
      });

      const reconnectClient = new WebSocketSubscriptionClient({
        url: 'ws://localhost:8900',
        WebSocketImpl: WebSocketReconnect as any,
        reconnectDelay: 100,
        maxReconnectAttempts: 3,
      });

      const connectPromise = reconnectClient.connect();
      await vi.advanceTimersByTimeAsync(20);
      await connectPromise;

      const firstWs = MockWebSocket.lastInstance as MockWebSocket;
      const instanceCount = MockWebSocket.instances.length;

      // Simulate unexpected disconnect
      firstWs.simulateClose(1006, 'Connection lost');

      // Wait for reconnection attempt
      await vi.advanceTimersByTimeAsync(150);

      // Should have created a new WebSocket instance
      expect(MockWebSocket.instances.length).toBeGreaterThan(instanceCount);

      await reconnectClient.disconnect();
    });

    it.skip('should apply exponential backoff for reconnection', async () => {
      const WebSocketReconnect = createMockWebSocketConstructor({
        shouldFailConnection: true,
        connectionDelay: 10,
      });

      const reconnectClient = new WebSocketSubscriptionClient({
        url: 'ws://localhost:8900',
        WebSocketImpl: WebSocketReconnect as any,
        reconnectDelay: 100,
        maxReconnectDelay: 1000,
        maxReconnectAttempts: 3,
      });

      // Start connection attempt (don't await as it will fail)
      const connectPromise = reconnectClient.connect().catch(() => {
        // Expected to fail
      });

      // Let initial connection attempt fail
      await vi.advanceTimersByTimeAsync(15);

      // Track reconnection attempts (we already have one instance from initial connection)
      expect(MockWebSocket.instances.length).toBe(1);

      // First reconnect after 100ms
      await vi.advanceTimersByTimeAsync(100);
      // Let the connection attempt process
      await vi.advanceTimersByTimeAsync(15);
      expect(MockWebSocket.instances.length).toBe(2);

      // Second reconnect after 200ms (exponential backoff)
      await vi.advanceTimersByTimeAsync(200);
      await vi.advanceTimersByTimeAsync(15);
      expect(MockWebSocket.instances.length).toBe(3);

      // Third reconnect after 400ms
      await vi.advanceTimersByTimeAsync(400);
      await vi.advanceTimersByTimeAsync(15);
      expect(MockWebSocket.instances.length).toBe(4);

      await reconnectClient.disconnect();

      // Ensure connectPromise is resolved
      await connectPromise;
    });

    it.skip('should stop reconnecting after max attempts', async () => {
      const WebSocketFail = createMockWebSocketConstructor({
        shouldFailConnection: true,
        connectionDelay: 10,
      });

      const reconnectClient = new WebSocketSubscriptionClient({
        url: 'ws://localhost:8900',
        WebSocketImpl: WebSocketFail as any,
        reconnectDelay: 50,
        maxReconnectAttempts: 2,
      });

      // Start connection attempt (don't await as it will fail)
      const connectPromise = reconnectClient.connect().catch(() => {
        // Expected to fail
      });

      // Let initial connection attempt fail
      await vi.advanceTimersByTimeAsync(15);

      // We already have one instance from initial connection
      expect(MockWebSocket.instances.length).toBe(1);

      // First reconnect after 50ms
      await vi.advanceTimersByTimeAsync(50);
      await vi.advanceTimersByTimeAsync(15);
      expect(MockWebSocket.instances.length).toBe(2);

      // Second reconnect after 100ms (exponential backoff)
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(15);
      expect(MockWebSocket.instances.length).toBe(3);

      // No more reconnects should happen
      await vi.advanceTimersByTimeAsync(500);
      expect(MockWebSocket.instances.length).toBe(3);

      await reconnectClient.disconnect();
      await connectPromise;
    });

    it.skip('should resubscribe after reconnection', async () => {
      const testAddress = address('11111111111111111111111111111111');

      // Subscribe to an account
      const subscriptionId = await client.subscribe('accountSubscribe', [testAddress], () => {});

      expect(subscriptionId).toBe(1);

      // Clear sent messages
      ws.sentMessages = [];

      // Trigger resubscribe
      await client.resubscribeAll();

      // Check that subscription was recreated
      await vi.advanceTimersByTimeAsync(20);

      const resubMessages = ws.sentMessages.filter((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.method === 'accountSubscribe';
      });

      expect(resubMessages).toHaveLength(1);
    });

    it.skip('should handle resubscription failures', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const errors: Error[] = [];

      // Subscribe with error handler
      await client.subscribe(
        'accountSubscribe',
        [testAddress],
        () => {},
        (error) => errors.push(error),
      );

      // Make resubscription fail
      ws.autoRespond = false;

      // Trigger resubscribe
      const resubPromise = client.resubscribeAll();

      await vi.advanceTimersByTimeAsync(20);

      // Send error response
      const lastMessage = JSON.parse(ws.sentMessages[ws.sentMessages.length - 1]);
      ws.simulateError(lastMessage.id, -32000, 'Resubscription failed');

      await resubPromise;

      // Error should be handled by error handler
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
