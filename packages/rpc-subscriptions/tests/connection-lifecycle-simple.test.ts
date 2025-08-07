/**
 * Simplified tests for WebSocket connection lifecycle.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocketSubscriptionClient } from '../src/client.js';
import { MockWebSocket, MockEvent, MockCloseEvent } from './mocks/websocket.js';

describe('WebSocket Connection Lifecycle (Simplified)', () => {
  beforeEach(() => {
    MockWebSocket.reset();
  });

  afterEach(() => {
    MockWebSocket.reset();
  });

  describe('Connection', () => {
    it('should connect successfully', async () => {
      const client = new WebSocketSubscriptionClient({
        url: 'ws://localhost:8900',
        WebSocketImpl: MockWebSocket as any,
      });

      const connectPromise = client.connect();
      expect(client.getConnectionState()).toBe('connecting');

      // Wait for connection (uses real timers in mock)
      await connectPromise;

      expect(client.getConnectionState()).toBe('connected');
      expect(MockWebSocket.lastInstance).toBeDefined();
      expect(MockWebSocket.lastInstance?.readyState).toBe(MockWebSocket.OPEN);

      await client.disconnect();
    });

    it('should handle connection failure', async () => {
      // Create a custom WebSocket class that fails immediately
      class WebSocketFail {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;

        readyState = WebSocketFail.CONNECTING;
        url: string;
        protocol = '';
        bufferedAmount = 0;
        extensions = '';
        binaryType: BinaryType = 'blob';

        onopen: ((event: Event) => void) | null = null;
        onclose: ((event: CloseEvent) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        onmessage: ((event: MessageEvent) => void) | null = null;

        private timer: NodeJS.Timeout;

        constructor(url: string, _protocols?: string | string[]) {
          this.url = url;
          // Trigger error immediately after construction
          this.timer = setTimeout(() => {
            if (this.readyState !== WebSocketFail.CLOSED) {
              this.readyState = WebSocketFail.CLOSED;
              if (this.onerror) {
                this.onerror(new MockEvent('error'));
              }
              if (this.onclose) {
                this.onclose(new MockCloseEvent(1006, 'Connection failed'));
              }
            }
          }, 0);
        }

        close() {
          clearTimeout(this.timer);
          this.readyState = WebSocketFail.CLOSED;
        }

        send() {
          // no-op
        }

        addEventListener() {
          // no-op
        }

        removeEventListener() {
          // no-op
        }

        dispatchEvent() {
          return true;
        }
      }

      const client = new WebSocketSubscriptionClient({
        url: 'ws://localhost:8900',
        WebSocketImpl: WebSocketFail as any,
      });

      await expect(client.connect()).rejects.toThrow('WebSocket error: error');
      expect(client.getConnectionState()).toBe('disconnected');
    });

    it('should return immediately if already connected', async () => {
      const client = new WebSocketSubscriptionClient({
        url: 'ws://localhost:8900',
        WebSocketImpl: MockWebSocket as any,
      });

      // First connection
      await client.connect();
      expect(client.getConnectionState()).toBe('connected');

      // Second connection should return immediately
      const promise = client.connect();
      await expect(promise).resolves.toBeUndefined();
      expect(MockWebSocket.instances.length).toBe(1);

      await client.disconnect();
    });
  });

  describe('Disconnection', () => {
    it('should disconnect cleanly', async () => {
      const client = new WebSocketSubscriptionClient({
        url: 'ws://localhost:8900',
        WebSocketImpl: MockWebSocket as any,
      });

      await client.connect();
      expect(client.getConnectionState()).toBe('connected');

      await client.disconnect();
      expect(client.getConnectionState()).toBe('disconnected');

      const ws = MockWebSocket.lastInstance;
      // Wait a bit for close to complete
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(ws?.readyState).toBe(MockWebSocket.CLOSED);
    });

    it('should handle disconnect when already disconnected', async () => {
      const client = new WebSocketSubscriptionClient({
        url: 'ws://localhost:8900',
        WebSocketImpl: MockWebSocket as any,
      });

      // Disconnect without connecting
      await client.disconnect();
      expect(client.getConnectionState()).toBe('disconnected');

      // Disconnect again
      await client.disconnect();
      expect(client.getConnectionState()).toBe('disconnected');
    });
  });

  describe('WebSocket Events', () => {
    it('should handle WebSocket close event', async () => {
      const client = new WebSocketSubscriptionClient({
        url: 'ws://localhost:8900',
        WebSocketImpl: MockWebSocket as any,
      });

      await client.connect();

      const ws = MockWebSocket.lastInstance as MockWebSocket;

      // Simulate unexpected close
      ws.simulateClose(1006, 'Connection lost');

      expect(client.getConnectionState()).toBe('disconnected');
    });

    it('should not reconnect on clean close', async () => {
      const client = new WebSocketSubscriptionClient({
        url: 'ws://localhost:8900',
        WebSocketImpl: MockWebSocket as any,
        reconnectDelay: 100,
      });

      await client.connect();

      const ws = MockWebSocket.lastInstance as MockWebSocket;
      const instanceCount = MockWebSocket.instances.length;

      // Simulate clean close (code 1000)
      ws.simulateClose(1000, 'Normal closure');

      // Wait a bit - should not reconnect
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(client.getConnectionState()).toBe('disconnected');
      expect(MockWebSocket.instances.length).toBe(instanceCount); // No new connection

      await client.disconnect();
    });
  });

  describe('Subscription and Unsubscribe', () => {
    it('should subscribe and receive notifications', async () => {
      const client = new WebSocketSubscriptionClient({
        url: 'ws://localhost:8900',
        WebSocketImpl: MockWebSocket as any,
      });

      await client.connect();

      const received: any[] = [];
      const subscriptionId = await client.subscribe('accountSubscribe', ['test-address'], (data) =>
        received.push(data),
      );

      expect(subscriptionId).toBe(1);

      // Simulate notification
      const ws = MockWebSocket.lastInstance as MockWebSocket;
      ws.simulateNotification(subscriptionId, { test: 'data' });

      // Wait a bit for async processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(received).toHaveLength(1);
      expect(received[0]).toEqual({ test: 'data' });

      await client.disconnect();
    });

    it('should handle unsubscribe', async () => {
      const client = new WebSocketSubscriptionClient({
        url: 'ws://localhost:8900',
        WebSocketImpl: MockWebSocket as any,
      });

      await client.connect();

      const subscriptionId = await client.subscribe('accountSubscribe', ['test-address'], () => {});

      const success = await client.unsubscribe(subscriptionId, 'accountUnsubscribe');
      expect(success).toBe(true);

      await client.disconnect();
    });
  });

  describe('Reconnection', () => {
    it('should attempt reconnection on unexpected disconnect', async () => {
      const client = new WebSocketSubscriptionClient({
        url: 'ws://localhost:8900',
        WebSocketImpl: MockWebSocket as any,
        reconnectDelay: 50,
        maxReconnectAttempts: 3,
      });

      await client.connect();

      const firstWs = MockWebSocket.lastInstance as MockWebSocket;
      const instanceCount = MockWebSocket.instances.length;

      // Simulate unexpected disconnect
      firstWs.simulateClose(1006, 'Connection lost');

      // Wait for reconnection attempt
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have created a new WebSocket instance
      expect(MockWebSocket.instances.length).toBeGreaterThan(instanceCount);

      await client.disconnect();
    });
  });
});
