/**
 * Factory function for creating WebSocket subscription clients.
 */

import { WebSocketSubscriptionClient } from './client.js';
import type { WebSocketSubscriptionConfig } from './types.js';

/**
 * Create a new WebSocket subscription client for Solana RPC.
 *
 * @param url - WebSocket endpoint URL (e.g., 'ws://localhost:8900')
 * @param config - Optional configuration options
 * @returns A new WebSocket subscription client instance
 *
 * @example
 * ```typescript
 * const client = createWebSocketSubscriptionClient('ws://localhost:8900');
 * await client.connect();
 *
 * // Subscribe to account changes
 * const subscriptionId = await client.subscribe(
 *   'accountSubscribe',
 *   [address, { commitment: 'confirmed' }],
 *   (data) => console.log('Account changed:', data)
 * );
 *
 * // Later, unsubscribe
 * await client.unsubscribe(subscriptionId, 'accountUnsubscribe');
 * ```
 */
export function createWebSocketSubscriptionClient(
  url: string,
  config?: Partial<Omit<WebSocketSubscriptionConfig, 'url'>>,
): WebSocketSubscriptionClient {
  return new WebSocketSubscriptionClient({
    url,
    ...config,
  });
}

/**
 * Create a WebSocket subscription client with auto-connect.
 *
 * @param url - WebSocket endpoint URL
 * @param config - Optional configuration options
 * @returns Promise that resolves to a connected client
 *
 * @example
 * ```typescript
 * const client = await createAndConnectWebSocketClient('ws://localhost:8900');
 * // Client is already connected and ready to use
 * ```
 */
export async function createAndConnectWebSocketClient(
  url: string,
  config?: Partial<Omit<WebSocketSubscriptionConfig, 'url'>>,
): Promise<WebSocketSubscriptionClient> {
  const client = createWebSocketSubscriptionClient(url, config);
  await client.connect();
  return client;
}
