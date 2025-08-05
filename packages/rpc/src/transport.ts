/**
 * Transport layer abstraction for RPC communication.
 *
 * This module defines the transport interface that enables pluggable
 * communication mechanisms for the RPC client.
 */

import type { RpcMethodNames, RpcMethodParams, RpcMethodReturn } from './helpers.js';

/**
 * JSON-RPC request structure.
 */
export interface JsonRpcRequest<TMethod extends RpcMethodNames = RpcMethodNames> {
  jsonrpc: '2.0';
  id: string | number;
  method: TMethod;
  params?: RpcMethodParams<TMethod>;
}

/**
 * JSON-RPC successful response structure.
 */
export interface JsonRpcResponseSuccess<T = unknown> {
  jsonrpc: '2.0';
  id: string | number;
  result: T;
}

/**
 * JSON-RPC error response structure.
 */
export interface JsonRpcResponseError {
  jsonrpc: '2.0';
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Combined JSON-RPC response type.
 */
export type JsonRpcResponse<T = unknown> = JsonRpcResponseSuccess<T> | JsonRpcResponseError;

/**
 * Transport interface for sending RPC requests.
 *
 * Implementations of this interface handle the actual communication
 * with the RPC endpoint (HTTP, WebSocket, etc.).
 */
export interface Transport {
  /**
   * Send a JSON-RPC request and receive a response.
   *
   * @param request - The JSON-RPC request to send
   * @returns Promise resolving to the JSON-RPC response
   * @throws Error if the transport fails (network error, timeout, etc.)
   */
  <TMethod extends RpcMethodNames>(
    request: JsonRpcRequest<TMethod>,
  ): Promise<JsonRpcResponse<RpcMethodReturn<TMethod>>>;
}

/**
 * Configuration options for transports.
 */
export interface TransportConfig {
  /**
   * Request timeout in milliseconds.
   */
  timeout?: number;

  /**
   * Custom headers to include with requests.
   */
  headers?: Record<string, string>;

  /**
   * Signal for aborting requests.
   */
  signal?: AbortSignal;
}

/**
 * Extended transport with configuration support.
 */
export interface ConfigurableTransport extends Transport {
  /**
   * Create a new transport with updated configuration.
   */
  withConfig(config: TransportConfig): ConfigurableTransport;
}

/**
 * Type guard to check if a transport is configurable.
 */
export function isConfigurableTransport(
  transport: Transport | ConfigurableTransport,
): transport is ConfigurableTransport {
  return 'withConfig' in transport && typeof transport.withConfig === 'function';
}

/**
 * Create an HTTP transport for JSON-RPC communication.
 *
 * @param url - The RPC endpoint URL
 * @param config - Optional transport configuration
 * @returns A configurable transport implementation
 */
export function createHttpTransport(url: string, config?: TransportConfig): ConfigurableTransport {
  const transport = async <TMethod extends RpcMethodNames>(
    request: JsonRpcRequest<TMethod>,
  ): Promise<JsonRpcResponse<RpcMethodReturn<TMethod>>> => {
    // Create abort controller for timeout
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let didTimeout = false;

    // Set up timeout if configured
    if (config?.timeout) {
      timeoutId = setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, config.timeout);
    }

    // Combine signals if one was provided
    let signal: AbortSignal;
    if (config?.signal) {
      // Check if AbortSignal.any is available (Node 20+)
      if ('any' in AbortSignal && typeof AbortSignal.any === 'function') {
        signal = AbortSignal.any([controller.signal, config.signal]);
      } else {
        // Fallback for older environments
        signal = controller.signal;
        config.signal.addEventListener('abort', () => {
          if (!didTimeout) {
            controller.abort();
          }
        });
      }
    } else {
      signal = controller.signal;
    }

    try {
      // Make the fetch request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config?.headers,
        },
        body: JSON.stringify(request),
        signal,
        // Connection hints for better performance
        keepalive: true,
        // Enable compression if available
        ...(typeof CompressionStream !== 'undefined' && {
          compress: true,
        }),
      });

      // Clear timeout if set
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Check HTTP status
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }

      // Parse JSON response
      let jsonResponse: unknown;
      try {
        jsonResponse = await response.json();
      } catch (error) {
        throw new Error(
          `Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      // Validate JSON-RPC response format
      if (
        typeof jsonResponse !== 'object' ||
        jsonResponse === null ||
        !('jsonrpc' in jsonResponse) ||
        (jsonResponse as { jsonrpc: unknown }).jsonrpc !== '2.0'
      ) {
        throw new Error('Invalid JSON-RPC response format');
      }

      const rpcResponse = jsonResponse as JsonRpcResponse<RpcMethodReturn<TMethod>>;

      // Validate response ID matches request ID
      if (rpcResponse.id !== request.id) {
        throw new Error(`Response ID mismatch. Expected ${request.id}, got ${rpcResponse.id}`);
      }

      return rpcResponse;
    } catch (error) {
      // Clear timeout if set
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Handle abort errors (DOMException or Error)
      if (
        (error instanceof Error ||
          (typeof DOMException !== 'undefined' && error instanceof DOMException)) &&
        (error as Error).name === 'AbortError'
      ) {
        // Check if the abort was due to timeout
        if (didTimeout) {
          throw new Error(`Request timeout after ${config?.timeout}ms`);
        }
        // Re-throw the original abort error for external aborts
        throw error;
      }

      // Re-throw other errors
      throw error;
    }
  };

  // Create configurable transport
  const configurableTransport = Object.assign(transport, {
    withConfig(newConfig: TransportConfig): ConfigurableTransport {
      return createHttpTransport(url, { ...config, ...newConfig });
    },
  });

  return configurableTransport;
}

/**
 * Mock transport for testing purposes.
 */
export function createMockTransport<TMethod extends RpcMethodNames>(
  responses: Map<TMethod, RpcMethodReturn<TMethod> | Error>,
): Transport {
  return async <T extends RpcMethodNames>(
    request: JsonRpcRequest<T>,
  ): Promise<JsonRpcResponse<RpcMethodReturn<T>>> => {
    const response = responses.get(request.method as unknown as TMethod);

    if (response instanceof Error) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32000,
          message: response.message,
          data: response,
        },
      };
    }

    if (response !== undefined) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: response as RpcMethodReturn<T>,
      };
    }

    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32601,
        message: 'Method not found',
      },
    };
  };
}
