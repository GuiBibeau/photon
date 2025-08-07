/**
 * WebSocket subscription types and interfaces for Solana RPC.
 */

import type { Address } from '@photon/addresses';
import type { Commitment, TransactionError } from '@photon/rpc';

/**
 * WebSocket connection states.
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnecting' | 'disconnected';

/**
 * Configuration options for the WebSocket subscription client.
 */
export interface WebSocketSubscriptionConfig {
  /** WebSocket endpoint URL */
  url: string;
  /** Maximum reconnection attempts (default: 5) */
  maxReconnectAttempts?: number;
  /** Initial reconnect delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Maximum reconnect delay in ms (default: 30000) */
  maxReconnectDelay?: number;
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval?: number;
  /** Connection timeout in ms (default: 10000) */
  connectionTimeout?: number;
  /** Message queue size for offline messages (default: 100) */
  messageQueueSize?: number;
  /** Custom WebSocket implementation (for testing) */
  WebSocketImpl?: typeof WebSocket;
}

/**
 * Base subscription request structure.
 */
export interface SubscriptionRequest<T = unknown> {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: T;
}

/**
 * Subscription response structure.
 */
export interface SubscriptionResponse {
  jsonrpc: '2.0';
  result?: number;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: number;
}

/**
 * Subscription notification structure.
 */
export interface SubscriptionNotification<T = unknown> {
  jsonrpc: '2.0';
  method: string;
  params: {
    result: T;
    subscription: number;
  };
}

/**
 * Unsubscribe request structure.
 */
export interface UnsubscribeRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: [number];
}

/**
 * Handler function for subscription events.
 */
export type SubscriptionHandler<T = unknown> = (data: T) => void;

/**
 * Error handler function.
 */
export type ErrorHandler = (error: Error) => void;

/**
 * Subscription information stored in the registry.
 */
export interface SubscriptionInfo<T = unknown> {
  method: string;
  handler: SubscriptionHandler<T>;
  errorHandler?: ErrorHandler;
  params?: unknown;
}

/**
 * Account change notification data.
 */
export interface AccountChangeNotification {
  lamports: bigint;
  data: string | { program: string; parsed: unknown; space: number };
  owner: Address;
  executable: boolean;
  rentEpoch: bigint;
}

/**
 * Signature notification data.
 */
export interface SignatureNotification {
  err: TransactionError | null;
}

/**
 * Slot notification data.
 */
export interface SlotNotification {
  slot: number;
  parent?: number;
  root?: number;
}

/**
 * Program account change notification.
 */
export interface ProgramAccountChangeNotification {
  pubkey: Address;
  account: AccountChangeNotification;
}

/**
 * Subscription methods available.
 */
export type SubscriptionMethod =
  | 'accountSubscribe'
  | 'accountUnsubscribe'
  | 'logsSubscribe'
  | 'logsUnsubscribe'
  | 'programSubscribe'
  | 'programUnsubscribe'
  | 'signatureSubscribe'
  | 'signatureUnsubscribe'
  | 'slotSubscribe'
  | 'slotUnsubscribe'
  | 'rootSubscribe'
  | 'rootUnsubscribe';

/**
 * Account subscription options.
 */
export interface AccountSubscriptionOptions {
  commitment?: Commitment;
  encoding?: 'base64' | 'base64+zstd' | 'jsonParsed';
}

/**
 * Program subscription options.
 */
export interface ProgramSubscriptionOptions extends AccountSubscriptionOptions {
  filters?: Array<
    | { dataSize: number }
    | {
        memcmp: {
          offset: number;
          bytes: string;
        };
      }
  >;
}

/**
 * Signature subscription options.
 */
export interface SignatureSubscriptionOptions {
  commitment?: Commitment;
}

/**
 * Logs subscription options.
 */
export interface LogsSubscriptionOptions {
  commitment?: Commitment;
}

/**
 * Logs filter type.
 */
export type LogsFilter = 'all' | 'allWithVotes' | { mentions: [Address] };

/**
 * Log notification data.
 */
export interface LogNotification {
  signature: string;
  err: TransactionError | null;
  logs: string[];
}
