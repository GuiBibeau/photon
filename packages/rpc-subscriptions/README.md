# @photon/rpc-subscriptions

WebSocket subscription client for Solana RPC, providing real-time data subscriptions with automatic reconnection and robust error handling.

## Features

- 🔄 **Automatic Reconnection** - Exponential backoff with configurable limits
- 📦 **Message Queue** - Buffers messages during reconnection
- 💓 **Heartbeat Mechanism** - Keeps connections alive
- 🎯 **Type-Safe** - Full TypeScript support with comprehensive types
- 🌲 **Tree-Shakeable** - Multiple entry points for optimal bundle size
- 🔌 **Zero Dependencies** - Uses only Web Standards APIs

## Installation

```bash
npm install @photon/rpc-subscriptions
```

## Usage

```typescript
import { createWebSocketSubscriptionClient } from '@photon/rpc-subscriptions';

// Create and connect to WebSocket
const client = await createAndConnectWebSocketClient('ws://localhost:8900');

// Subscribe to account changes
const subscriptionId = await client.subscribe(
  'accountSubscribe',
  [accountAddress, { commitment: 'confirmed' }],
  (data) => {
    console.log('Account changed:', data);
  },
  (error) => {
    console.error('Subscription error:', error);
  }
);

// Later, unsubscribe
await client.unsubscribe(subscriptionId, 'accountUnsubscribe');

// Disconnect when done
await client.disconnect();
```

## Configuration

```typescript
const client = createWebSocketSubscriptionClient('ws://localhost:8900', {
  maxReconnectAttempts: 5,      // Maximum reconnection attempts
  reconnectDelay: 1000,          // Initial reconnect delay in ms
  maxReconnectDelay: 30000,      // Maximum reconnect delay in ms
  heartbeatInterval: 30000,      // Heartbeat interval in ms
  connectionTimeout: 10000,      // Connection timeout in ms
  messageQueueSize: 100,         // Maximum queued messages
});
```

## API

### WebSocketSubscriptionClient

The main client class for managing WebSocket subscriptions.

#### Methods

- `connect()` - Connect to the WebSocket server
- `disconnect()` - Disconnect from the server
- `subscribe()` - Subscribe to a method
- `unsubscribe()` - Unsubscribe from a subscription
- `getConnectionState()` - Get current connection state
- `resubscribeAll()` - Resubscribe all active subscriptions

### Factory Functions

- `createWebSocketSubscriptionClient()` - Create a new client instance
- `createAndConnectWebSocketClient()` - Create and auto-connect a client

## Tree-Shaking

Import only what you need for optimal bundle size:

```typescript
// Import just the client
import { WebSocketSubscriptionClient } from '@photon/rpc-subscriptions/client';

// Import just types
import type { AccountChangeNotification } from '@photon/rpc-subscriptions/types';

// Import factory functions
import { createWebSocketSubscriptionClient } from '@photon/rpc-subscriptions/create-subscription-client';
```

## License

MIT