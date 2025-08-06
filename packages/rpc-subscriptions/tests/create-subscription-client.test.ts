/**
 * Tests for subscription client factory functions.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  createWebSocketSubscriptionClient,
  createAndConnectWebSocketClient,
} from '../src/create-subscription-client.js';
import { WebSocketSubscriptionClient } from '../src/client.js';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(_data: string): void {
    // Mock implementation
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }
}

describe('createWebSocketSubscriptionClient', () => {
  let client: WebSocketSubscriptionClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  it('should create a WebSocket subscription client', () => {
    client = createWebSocketSubscriptionClient('ws://localhost:8900', {
      WebSocketImpl: MockWebSocket as any,
    });

    expect(client).toBeInstanceOf(WebSocketSubscriptionClient);
    expect(client.getConnectionState()).toBe('disconnected');
  });

  it('should accept configuration options', () => {
    client = createWebSocketSubscriptionClient('ws://localhost:8900', {
      maxReconnectAttempts: 10,
      heartbeatInterval: 60000,
      WebSocketImpl: MockWebSocket as any,
    });

    expect(client).toBeInstanceOf(WebSocketSubscriptionClient);

    // Verify config is applied (we can check behavior)
    const config = (client as any).config;
    expect(config.maxReconnectAttempts).toBe(10);
    expect(config.heartbeatInterval).toBe(60000);
  });

  it('should use provided URL', () => {
    const url = 'wss://api.mainnet-beta.solana.com';
    client = createWebSocketSubscriptionClient(url, {
      WebSocketImpl: MockWebSocket as any,
    });

    const clientConfig = (client as any).config;
    expect(clientConfig.url).toBe(url);
  });
});

describe('createAndConnectWebSocketClient', () => {
  let client: WebSocketSubscriptionClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  it('should create and connect a WebSocket client', async () => {
    client = await createAndConnectWebSocketClient('ws://localhost:8900', {
      WebSocketImpl: MockWebSocket as any,
    });

    expect(client).toBeInstanceOf(WebSocketSubscriptionClient);
    expect(client.getConnectionState()).toBe('connected');
  });

  it('should handle connection errors', async () => {
    const ErrorMockWebSocket = class {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;

      readyState = 0;
      url: string;
      onopen: ((event: Event) => void) | null = null;
      onclose: ((event: CloseEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;

      constructor(url: string) {
        this.url = url;
        // Simulate connection error
        setTimeout(() => {
          if (this.onerror) {
            this.onerror(new Event('error'));
          }
          // Then close with error code
          setTimeout(() => {
            this.readyState = 3;
            if (this.onclose) {
              this.onclose(new CloseEvent('close', { code: 1006 }));
            }
          }, 5);
        }, 5);
      }

      send(): void {}
      close(): void {
        this.readyState = 3;
      }
    };

    await expect(
      createAndConnectWebSocketClient('ws://localhost:8900', {
        WebSocketImpl: ErrorMockWebSocket as any,
        maxReconnectAttempts: 0,
      }),
    ).rejects.toThrow();
  });

  it('should pass configuration to client', async () => {
    client = await createAndConnectWebSocketClient('ws://localhost:8900', {
      reconnectDelay: 5000,
      messageQueueSize: 50,
      WebSocketImpl: MockWebSocket as any,
    });

    const config = (client as any).config;
    expect(config.reconnectDelay).toBe(5000);
    expect(config.messageQueueSize).toBe(50);
  });
});
