/**
 * @photon/rpc-subscriptions
 *
 * WebSocket subscription client for Solana RPC.
 * Provides real-time data subscriptions with automatic reconnection
 * and robust error handling.
 */

// Main client
export { WebSocketSubscriptionClient } from './client.js';

// Factory functions
export {
  createWebSocketSubscriptionClient,
  createAndConnectWebSocketClient,
} from './create-subscription-client.js';

// Subscription methods
export {
  accountSubscribe,
  signatureSubscribe,
  programSubscribe,
  slotSubscribe,
  rootSubscribe,
  logsSubscribe,
  bufferSubscription,
  type BufferedSubscriptionOptions,
} from './subscription-methods.js';

// Subscription management
export {
  SubscriptionManager,
  RateLimiter,
  type SubscriptionManagerConfig,
  type SubscriptionGap,
} from './subscription-manager.js';

// Types
export type {
  // Configuration
  WebSocketSubscriptionConfig,
  ConnectionState,

  // Core types
  SubscriptionRequest,
  SubscriptionResponse,
  SubscriptionNotification,
  UnsubscribeRequest,
  SubscriptionHandler,
  ErrorHandler,
  SubscriptionInfo,
  SubscriptionMethod,

  // Notification types
  AccountChangeNotification,
  SignatureNotification,
  SlotNotification,
  ProgramAccountChangeNotification,
  LogNotification,

  // Options
  AccountSubscriptionOptions,
  ProgramSubscriptionOptions,
  SignatureSubscriptionOptions,
  LogsSubscriptionOptions,
  LogsFilter,
} from './types.js';
