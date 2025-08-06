/**
 * WebSocket subscription client for Solana RPC subscriptions.
 *
 * Provides a robust WebSocket client with automatic reconnection,
 * subscription management, and event handling.
 */

import type {
  ConnectionState,
  ErrorHandler,
  SubscriptionHandler,
  SubscriptionInfo,
  SubscriptionNotification,
  SubscriptionRequest,
  SubscriptionResponse,
  UnsubscribeRequest,
  WebSocketSubscriptionConfig,
} from './types.js';

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG: Required<Omit<WebSocketSubscriptionConfig, 'url' | 'WebSocketImpl'>> = {
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  heartbeatInterval: 30000,
  connectionTimeout: 10000,
  messageQueueSize: 100,
};

/**
 * WebSocket subscription client for managing Solana RPC subscriptions.
 */
export class WebSocketSubscriptionClient {
  private ws: WebSocket | null = null;
  private config: Required<Omit<WebSocketSubscriptionConfig, 'WebSocketImpl'>>;
  private WebSocketImpl: typeof WebSocket;
  private connectionState: ConnectionState = 'disconnected';
  private subscriptions = new Map<number, SubscriptionInfo>();
  private pendingRequests = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  private nextRequestId = 1;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private messageQueue: (() => void)[] = [];
  private connectionPromise: Promise<void> | null = null;
  private connectionResolve: (() => void) | null = null;
  private connectionReject: ((error: Error) => void) | null = null;

  constructor(config: WebSocketSubscriptionConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    this.WebSocketImpl = config.WebSocketImpl ?? WebSocket;
  }

  /**
   * Get the current connection state.
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Connect to the WebSocket server.
   */
  async connect(): Promise<void> {
    if (this.connectionState === 'connected') {
      return;
    }

    if (this.connectionState === 'connecting') {
      return this.connectionPromise ?? Promise.resolve();
    }

    this.connectionState = 'connecting';
    this.connectionPromise = new Promise<void>((resolve, reject) => {
      this.connectionResolve = resolve;
      this.connectionReject = reject;
    });

    try {
      await this.establishConnection();
    } catch (error) {
      this.connectionState = 'disconnected';
      this.connectionPromise = null;
      throw error;
    }

    return this.connectionPromise;
  }

  /**
   * Disconnect from the WebSocket server.
   */
  async disconnect(): Promise<void> {
    if (this.connectionState === 'disconnected') {
      return;
    }

    this.connectionState = 'disconnecting';
    this.clearTimers();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connectionState = 'disconnected';
    this.connectionPromise = null;
    this.connectionResolve = null;
    this.connectionReject = null;
  }

  /**
   * Subscribe to a method with a handler.
   */
  async subscribe<T>(
    method: string,
    params: unknown[] | undefined,
    handler: SubscriptionHandler<T>,
    errorHandler?: ErrorHandler,
  ): Promise<number> {
    await this.connect();

    const requestId = this.getNextRequestId();
    const request: SubscriptionRequest = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params,
    };

    return new Promise<number>((resolve, reject) => {
      this.pendingRequests.set(requestId, {
        resolve: (response: unknown) => {
          const subResponse = response as SubscriptionResponse;
          if (subResponse.error) {
            reject(new Error(subResponse.error.message));
          } else if (subResponse.result !== undefined) {
            const subscriptionId = subResponse.result;
            const subInfo: SubscriptionInfo = {
              method,
              handler: handler as SubscriptionHandler,
              params,
            };
            if (errorHandler) {
              subInfo.errorHandler = errorHandler;
            }
            this.subscriptions.set(subscriptionId, subInfo);
            resolve(subscriptionId);
          } else {
            reject(new Error('Invalid subscription response'));
          }
        },
        reject,
      });

      this.send(JSON.stringify(request));
    });
  }

  /**
   * Unsubscribe from a subscription.
   */
  async unsubscribe(subscriptionId: number, unsubscribeMethod: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    const requestId = this.getNextRequestId();
    const request: UnsubscribeRequest = {
      jsonrpc: '2.0',
      id: requestId,
      method: unsubscribeMethod,
      params: [subscriptionId],
    };

    return new Promise<boolean>((resolve, reject) => {
      this.pendingRequests.set(requestId, {
        resolve: (response: unknown) => {
          const unsubResponse = response as { result?: boolean };
          this.subscriptions.delete(subscriptionId);
          resolve(unsubResponse.result ?? false);
        },
        reject,
      });

      this.send(JSON.stringify(request));
    });
  }

  /**
   * Establish WebSocket connection.
   */
  private async establishConnection(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let isResolved = false;

      try {
        this.ws = new this.WebSocketImpl(this.config.url);

        // Set connection timeout
        this.connectionTimer = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            const error = new Error('Connection timeout');
            if (this.connectionReject) {
              this.connectionReject(error);
              this.connectionReject = null;
              this.connectionResolve = null;
            }
            if (this.ws) {
              this.ws.close();
            }
            reject(error);
          }
        }, this.config.connectionTimeout);

        this.ws.onopen = () => {
          if (!isResolved) {
            isResolved = true;
            this.clearConnectionTimer();
            this.connectionState = 'connected';
            this.reconnectAttempts = 0;
            this.startHeartbeat();
            this.processMessageQueue();

            if (this.connectionResolve) {
              this.connectionResolve();
              this.connectionResolve = null;
              this.connectionReject = null;
            }
            resolve();
          }
        };

        this.ws.onerror = (event) => {
          if (!isResolved) {
            const error = new Error(`WebSocket error: ${event.type}`);
            if (this.connectionState === 'connecting' && this.connectionReject) {
              this.connectionReject(error);
              this.connectionReject = null;
              this.connectionResolve = null;
            }
          }
        };

        this.ws.onclose = (event) => {
          this.clearConnectionTimer();
          if (!isResolved) {
            isResolved = true;
            const error = new Error('WebSocket closed during connection');
            if (this.connectionReject) {
              this.connectionReject(error);
              this.connectionReject = null;
              this.connectionResolve = null;
            }
            reject(error);
          } else {
            this.handleDisconnection(event);
          }
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        if (!isResolved) {
          isResolved = true;
          this.clearConnectionTimer();
          const err = error instanceof Error ? error : new Error('Failed to create WebSocket');
          if (this.connectionReject) {
            this.connectionReject(err);
            this.connectionReject = null;
            this.connectionResolve = null;
          }
          reject(err);
        }
      }
    });
  }

  /**
   * Handle incoming WebSocket messages.
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as SubscriptionResponse | SubscriptionNotification;

      // Handle subscription notifications
      if ('method' in message && message.method === 'subscription') {
        const notification = message as SubscriptionNotification;
        const subscription = this.subscriptions.get(notification.params.subscription);
        if (subscription) {
          try {
            subscription.handler(notification.params.result);
          } catch (error) {
            if (subscription.errorHandler) {
              subscription.errorHandler(
                error instanceof Error ? error : new Error('Handler error'),
              );
            }
          }
        }
        return;
      }

      // Handle request responses
      if ('id' in message && message.id !== undefined) {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          this.pendingRequests.delete(message.id);
          pending.resolve(message);
        }
      }
    } catch (error) {
      console.error('Failed to handle WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket disconnection.
   */
  private handleDisconnection(event: CloseEvent): void {
    this.connectionState = 'disconnected';
    this.ws = null;
    this.stopHeartbeat();

    // Don't reconnect if it was a clean close
    if (event.code === 1000) {
      return;
    }

    // Attempt reconnection if within limits
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnection();
    } else {
      // Notify all pending requests of the failure
      this.pendingRequests.forEach((pending) => {
        pending.reject(new Error('WebSocket connection lost'));
      });
      this.pendingRequests.clear();
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   */
  private scheduleReconnection(): void {
    // Check if we should still attempt reconnection
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      return;
    }

    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.config.maxReconnectDelay,
    );

    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
        // Check again after failure if we should continue
        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnection();
        }
      });
    }, delay);
  }

  /**
   * Start heartbeat mechanism.
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send ping frame (WebSocket protocol handles this automatically in most browsers)
        // For explicit ping, we could send a custom ping message if the server supports it
        this.send('{"jsonrpc":"2.0","method":"ping","id":0}');
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat mechanism.
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Clear all timers.
   */
  private clearTimers(): void {
    this.clearConnectionTimer();
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Clear connection timer.
   */
  private clearConnectionTimer(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  /**
   * Send a message through the WebSocket.
   */
  private send(message: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      // Queue message if not connected
      if (this.messageQueue.length < this.config.messageQueueSize) {
        this.messageQueue.push(() => this.send(message));
      } else {
        throw new Error('Message queue is full');
      }
    }
  }

  /**
   * Process queued messages after reconnection.
   */
  private processMessageQueue(): void {
    const queue = [...this.messageQueue];
    this.messageQueue = [];
    queue.forEach((sendFn) => sendFn());
  }

  /**
   * Get the next request ID.
   */
  private getNextRequestId(): number {
    return this.nextRequestId++;
  }

  /**
   * Resubscribe to all active subscriptions after reconnection.
   */
  async resubscribeAll(): Promise<void> {
    const subscriptionEntries = Array.from(this.subscriptions.entries());
    this.subscriptions.clear();

    for (const [, info] of subscriptionEntries) {
      try {
        await this.subscribe(
          info.method,
          info.params as unknown[],
          info.handler,
          info.errorHandler,
        );
      } catch (error) {
        console.error(`Failed to resubscribe to ${info.method}:`, error);
        if (info.errorHandler) {
          info.errorHandler(error instanceof Error ? error : new Error('Resubscription failed'));
        }
      }
    }
  }
}
