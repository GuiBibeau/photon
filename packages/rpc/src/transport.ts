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
