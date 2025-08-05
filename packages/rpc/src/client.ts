/**
 * RPC client factory for creating type-safe Solana RPC clients.
 *
 * This module provides the main factory function for creating RPC clients
 * with support for custom transports, middleware, and configuration options.
 */

import type { SolanaRpcApi } from './api.js';
import type { Commitment } from './types.js';
import type { RpcClient, RpcMethodNames, RpcMethodParams, RpcMethodReturn } from './helpers.js';
import type { Transport, TransportConfig, JsonRpcRequest, JsonRpcResponse } from './transport.js';
import { createHttpTransport } from './transport.js';
import type { Middleware } from './middleware.js';
import {
  composeMiddleware,
  defaultCommitmentMiddleware,
  loggingMiddleware,
  requestIdMiddleware,
  retryMiddleware,
  timeoutMiddleware,
} from './middleware.js';
import { extractResult, generateRequestId } from './convenience.js';

/**
 * Configuration options for the RPC client.
 */
export interface RpcClientConfig {
  /**
   * Default commitment level for all requests.
   */
  commitment?: Commitment;

  /**
   * Request timeout in milliseconds.
   */
  timeout?: number;

  /**
   * Retry configuration.
   */
  retry?: {
    /**
     * Maximum number of retry attempts.
     */
    maxAttempts?: number;

    /**
     * Initial delay in milliseconds.
     */
    initialDelay?: number;

    /**
     * Maximum delay in milliseconds.
     */
    maxDelay?: number;

    /**
     * Custom retry predicate.
     */
    shouldRetry?: (error: unknown, attempt: number) => boolean;
  };

  /**
   * Custom headers to include with requests.
   */
  headers?: Record<string, string>;

  /**
   * Enable request/response logging.
   */
  logging?: boolean | ((level: 'info' | 'error', message: string, data?: unknown) => void);

  /**
   * Custom request ID generator.
   */
  generateId?: () => string | number;

  /**
   * Additional middleware to apply.
   */
  middleware?: Middleware[];
}

/**
 * Create a Solana RPC client with the specified transport.
 *
 * @param transport - Transport implementation for sending requests
 * @param config - Optional client configuration
 * @returns Type-safe RPC client
 */
export function createSolanaRpcFromTransport(
  transport: Transport,
  config?: RpcClientConfig,
): RpcClient {
  // Build middleware pipeline
  const middlewares: Middleware[] = [];

  // Add request ID middleware
  if (config?.generateId) {
    middlewares.push(requestIdMiddleware(config.generateId));
  } else {
    middlewares.push(requestIdMiddleware(generateRequestId));
  }

  // Add default commitment middleware
  if (config?.commitment) {
    middlewares.push(defaultCommitmentMiddleware(config.commitment));
  }

  // Add timeout middleware
  if (config?.timeout) {
    middlewares.push(timeoutMiddleware(config.timeout));
  }

  // Add retry middleware
  if (config?.retry) {
    middlewares.push(retryMiddleware(config.retry));
  }

  // Add logging middleware
  if (config?.logging) {
    const logger = typeof config.logging === 'function' ? config.logging : undefined;
    middlewares.push(loggingMiddleware(logger));
  }

  // Add custom middleware
  if (config?.middleware) {
    middlewares.push(...config.middleware);
  }

  // Compose all middleware
  const enhancedTransport =
    middlewares.length > 0 ? composeMiddleware(...middlewares)(transport) : transport;

  // Create the RPC client using a Proxy
  return new Proxy({} as RpcClient, {
    get<T extends object>(_target: T, method: PropertyKey): unknown {
      // Check if the method is a valid RPC method
      if (typeof method !== 'string') {
        return undefined;
      }

      // Return a function that calls the transport
      return async (...args: unknown[]) => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: 0, // Will be replaced by middleware if configured
          method: method as RpcMethodNames,
          params: args as RpcMethodParams<RpcMethodNames>,
        };

        const response = await enhancedTransport(request);
        return extractResult(response as JsonRpcResponse<RpcMethodReturn<RpcMethodNames>>);
      };
    },

    has(_target, method) {
      // Check if the method exists on the SolanaRpcApi interface
      return typeof method === 'string' && method in ({} as SolanaRpcApi);
    },

    ownKeys() {
      // Return all method names from the SolanaRpcApi interface
      // This is primarily for debugging and introspection
      return Object.keys({} as SolanaRpcApi);
    },

    getOwnPropertyDescriptor(_target, method) {
      // Provide property descriptor for valid methods
      if (typeof method === 'string') {
        return {
          configurable: true,
          enumerable: true,
          get() {
            return async (...args: unknown[]) => {
              const request: JsonRpcRequest = {
                jsonrpc: '2.0',
                id: 0, // Will be replaced by middleware if configured
                method: method as RpcMethodNames,
                params: args as RpcMethodParams<RpcMethodNames>,
              };

              const response = await enhancedTransport(request);
              return extractResult(response as JsonRpcResponse<RpcMethodReturn<RpcMethodNames>>);
            };
          },
        };
      }
      return undefined;
    },
  });
}

/**
 * Create a Solana RPC client with a URL endpoint.
 *
 * This is a convenience function that creates an HTTP transport internally.
 *
 * @param endpoint - RPC endpoint URL
 * @param config - Optional client configuration
 * @returns Type-safe RPC client
 */
export function createSolanaRpc(endpoint: string, config?: RpcClientConfig): RpcClient {
  // Create HTTP transport with headers and timeout from config
  const transportConfig: TransportConfig = {};
  if (config?.headers) {
    transportConfig.headers = config.headers;
  }
  if (config?.timeout) {
    transportConfig.timeout = config.timeout;
  }

  const transport = createHttpTransport(endpoint, transportConfig);

  return createSolanaRpcFromTransport(transport, config);
}

/**
 * Create a batch of RPC requests.
 *
 * @param client - RPC client
 * @returns Batch request builder
 */
export function createBatch(client: RpcClient) {
  const requests: Array<{
    method: RpcMethodNames;
    params: unknown[];
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
  }> = [];

  const batch = new Proxy({} as RpcClient, {
    get<T extends object>(_target: T, method: PropertyKey): unknown {
      if (method === 'execute') {
        return async () => {
          // Execute all batched requests in parallel
          const results = await Promise.allSettled(
            requests.map(({ method, params }) =>
              (client[method] as (...args: unknown[]) => Promise<unknown>)(...params),
            ),
          );

          // Resolve/reject individual promises
          results.forEach((result, index) => {
            const req = requests[index];
            if (req) {
              if (result.status === 'fulfilled') {
                req.resolve(result.value);
              } else {
                req.reject(result.reason);
              }
            }
          });

          // Clear the batch
          requests.length = 0;
        };
      }

      if (typeof method !== 'string') {
        return undefined;
      }

      // Return a function that adds to the batch
      return (...args: unknown[]) => {
        return new Promise((resolve, reject) => {
          requests.push({
            method: method as RpcMethodNames,
            params: args,
            resolve,
            reject,
          });
        });
      };
    },
  });

  return batch as RpcClient & { execute: () => Promise<void> };
}
