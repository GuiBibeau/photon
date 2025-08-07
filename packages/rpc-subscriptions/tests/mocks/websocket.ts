/**
 * Mock WebSocket implementation for testing.
 */

import type {
  SubscriptionNotification,
  SubscriptionResponse,
  UnsubscribeResponse,
} from '../../src/types.js';

/**
 * Mock WebSocket events.
 */
export class MockEvent extends Event {
  constructor(type: string) {
    super(type);
  }
}

export class MockMessageEvent extends MessageEvent {
  constructor(data: string) {
    super('message', { data });
  }
}

export class MockCloseEvent extends CloseEvent {
  constructor(code: number, reason: string) {
    super('close', { code, reason });
  }
}

/**
 * Mock WebSocket implementation.
 */
export class MockWebSocket implements WebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  static instances: MockWebSocket[] = [];
  static lastInstance: MockWebSocket | null = null;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  protocol = '';
  bufferedAmount = 0;
  extensions = '';
  binaryType: BinaryType = 'blob';

  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  private openTimer: NodeJS.Timeout | null = null;
  private closeTimer: NodeJS.Timeout | null = null;
  private sendTimers: NodeJS.Timeout[] = [];
  private subscriptions = new Map<number, unknown>();
  private nextSubscriptionId = 1;

  // Test control properties
  shouldFailConnection = false;
  shouldTimeout = false;
  connectionDelay = 10;
  responseDelay = 5;
  autoRespond = true;
  sentMessages: string[] = [];

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    if (protocols) {
      this.protocol = Array.isArray(protocols) ? (protocols[0] ?? '') : protocols;
    }

    MockWebSocket.instances.push(this);
    MockWebSocket.lastInstance = this;

    if (this.shouldTimeout) {
      // Don't trigger any events for timeout simulation
      return;
    }

    if (this.shouldFailConnection) {
      // Simulate connection failure
      this.openTimer = setTimeout(() => {
        this.readyState = MockWebSocket.CLOSED;
        if (this.onerror) {
          this.onerror(new MockEvent('error'));
        }
        if (this.onclose) {
          this.onclose(new MockCloseEvent(1006, 'Connection failed'));
        }
        this.openTimer = null;
      }, this.connectionDelay);
    } else {
      // Simulate successful connection
      this.openTimer = setTimeout(() => {
        this.readyState = MockWebSocket.OPEN;
        if (this.onopen) {
          this.onopen(new MockEvent('open'));
        }
        this.openTimer = null;
      }, this.connectionDelay);
    }
  }

  send(data: string | ArrayBuffer | Blob | ArrayBufferView): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }

    const message = typeof data === 'string' ? data : data.toString();
    this.sentMessages.push(message);

    if (!this.autoRespond) {
      return;
    }

    // Parse and handle the message
    try {
      const request = JSON.parse(message);

      // Simulate response after a short delay
      const timer = setTimeout(() => {
        this.handleRequest(request);
        const index = this.sendTimers.indexOf(timer);
        if (index > -1) {
          this.sendTimers.splice(index, 1);
        }
      }, this.responseDelay);

      this.sendTimers.push(timer);
    } catch {
      // Invalid JSON - ignore
    }
  }

  close(code?: number, reason?: string): void {
    if (this.readyState === MockWebSocket.CLOSED || this.readyState === MockWebSocket.CLOSING) {
      return;
    }

    this.readyState = MockWebSocket.CLOSING;

    // Clear all timers
    this.clearTimers();

    this.closeTimer = setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) {
        this.onclose(new MockCloseEvent(code ?? 1000, reason ?? ''));
      }
      this.closeTimer = null;
    }, 5);
  }

  addEventListener(type: string, listener: EventListener): void {
    switch (type) {
      case 'open':
        this.onopen = listener as (event: Event) => void;
        break;
      case 'close':
        this.onclose = listener as (event: CloseEvent) => void;
        break;
      case 'error':
        this.onerror = listener as (event: Event) => void;
        break;
      case 'message':
        this.onmessage = listener as (event: MessageEvent) => void;
        break;
    }
  }

  removeEventListener(type: string, listener: EventListener): void {
    switch (type) {
      case 'open':
        if (this.onopen === listener) {
          this.onopen = null;
        }
        break;
      case 'close':
        if (this.onclose === listener) {
          this.onclose = null;
        }
        break;
      case 'error':
        if (this.onerror === listener) {
          this.onerror = null;
        }
        break;
      case 'message':
        if (this.onmessage === listener) {
          this.onmessage = null;
        }
        break;
    }
  }

  dispatchEvent(_event: Event): boolean {
    return true;
  }

  /**
   * Handle incoming request.
   */
  private handleRequest(request: { method?: string; id?: number; params?: unknown }): void {
    if (request.method === 'ping') {
      // Respond to ping
      const response = {
        jsonrpc: '2.0',
        result: 'pong',
        id: request.id,
      };
      this.sendResponse(response);
      return;
    }

    if (request.method?.includes('Subscribe')) {
      // Handle subscription
      const subscriptionId = this.nextSubscriptionId++;
      this.subscriptions.set(subscriptionId, request.params);

      const response: SubscriptionResponse = {
        jsonrpc: '2.0',
        result: subscriptionId,
        id: request.id,
      };
      this.sendResponse(response);
    } else if (request.method?.includes('Unsubscribe')) {
      // Handle unsubscribe
      const subscriptionId = request.params?.[0];
      const success = this.subscriptions.delete(subscriptionId);

      const response: UnsubscribeResponse = {
        jsonrpc: '2.0',
        result: success,
        id: request.id,
      };
      this.sendResponse(response);
    }
  }

  /**
   * Send a response to the client.
   */
  private sendResponse(response: unknown): void {
    if (this.onmessage && this.readyState === MockWebSocket.OPEN) {
      // Convert BigInt to string for JSON serialization
      const json = JSON.stringify(response, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      );
      this.onmessage(new MockMessageEvent(json));
    }
  }

  /**
   * Simulate a subscription notification.
   */
  simulateNotification(subscriptionId: number, data: unknown): void {
    if (!this.subscriptions.has(subscriptionId)) {
      return;
    }

    const notification: SubscriptionNotification = {
      jsonrpc: '2.0',
      method: 'subscription',
      params: {
        subscription: subscriptionId,
        result: data,
      },
    };

    this.sendResponse(notification);
  }

  /**
   * Simulate an error response.
   */
  simulateError(requestId: number, code: number, message: string): void {
    const response: SubscriptionResponse = {
      jsonrpc: '2.0',
      error: {
        code,
        message,
      },
      id: requestId,
    };

    this.sendResponse(response);
  }

  /**
   * Simulate connection close.
   */
  simulateClose(code: number, reason: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new MockCloseEvent(code, reason));
    }
  }

  /**
   * Simulate connection error.
   */
  simulateConnectionError(): void {
    if (this.onerror) {
      this.onerror(new MockEvent('error'));
    }
  }

  /**
   * Clear all timers.
   */
  private clearTimers(): void {
    if (this.openTimer) {
      clearTimeout(this.openTimer);
      this.openTimer = null;
    }
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    this.sendTimers.forEach((timer) => clearTimeout(timer));
    this.sendTimers = [];
  }

  /**
   * Clean up resources.
   */
  cleanup(): void {
    this.clearTimers();
    const index = MockWebSocket.instances.indexOf(this);
    if (index > -1) {
      MockWebSocket.instances.splice(index, 1);
    }
    if (MockWebSocket.lastInstance === this) {
      MockWebSocket.lastInstance = null;
    }
  }

  /**
   * Reset all mock instances.
   */
  static reset(): void {
    MockWebSocket.instances.forEach((ws) => ws.cleanup());
    MockWebSocket.instances = [];
    MockWebSocket.lastInstance = null;
  }
}

/**
 * Create a mock WebSocket constructor with specific behavior.
 */
export function createMockWebSocketConstructor(options?: {
  shouldFailConnection?: boolean;
  shouldTimeout?: boolean;
  connectionDelay?: number;
  responseDelay?: number;
  autoRespond?: boolean;
}): typeof MockWebSocket {
  return class extends MockWebSocket {
    constructor(url: string, protocols?: string | string[]) {
      super(url, protocols);
      if (options?.shouldFailConnection !== undefined) {
        this.shouldFailConnection = options.shouldFailConnection;
      }
      if (options?.shouldTimeout !== undefined) {
        this.shouldTimeout = options.shouldTimeout;
      }
      if (options?.connectionDelay !== undefined) {
        this.connectionDelay = options.connectionDelay;
      }
      if (options?.responseDelay !== undefined) {
        this.responseDelay = options.responseDelay;
      }
      if (options?.autoRespond !== undefined) {
        this.autoRespond = options.autoRespond;
      }
    }
  };
}
