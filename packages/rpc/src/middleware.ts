/**
 * Middleware pipeline for RPC request/response processing.
 *
 * This module provides utilities for intercepting and modifying
 * RPC requests and responses through a composable middleware pipeline.
 */

import type { Commitment } from './types.js';
import type { JsonRpcRequest, JsonRpcResponse, Transport } from './transport.js';
import type { RpcMethodNames, RpcMethodParams, RpcMethodReturn } from './helpers.js';

/**
 * Middleware function that can intercept and modify requests/responses.
 */
export type Middleware = (next: Transport) => Transport;

/**
 * Context passed through middleware chain.
 */
export interface MiddlewareContext {
  /**
   * Start time of the request.
   */
  startTime?: number;

  /**
   * Request attempt count for retry logic.
   */
  attempt?: number;

  /**
   * Custom metadata that can be passed through the chain.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Compose multiple middleware functions into a single middleware.
 *
 * @param middlewares - Array of middleware functions to compose
 * @returns A single middleware function that applies all middlewares
 */
export function composeMiddleware(...middlewares: Middleware[]): Middleware {
  return (next: Transport) =>
    middlewares.reduceRight((transport, middleware) => middleware(transport), next);
}

/**
 * Middleware that adds a unique request ID to each request.
 *
 * @param generateId - Optional function to generate request IDs
 * @returns Middleware function
 */
export function requestIdMiddleware(
  generateId: () => string | number = () => Date.now() + Math.random(),
): Middleware {
  return (next: Transport): Transport => {
    return async <TMethod extends RpcMethodNames>(
      request: JsonRpcRequest<TMethod>,
    ): Promise<JsonRpcResponse<RpcMethodReturn<TMethod>>> => {
      // Always use the configured ID generator
      const requestWithId = {
        ...request,
        id: generateId(),
      };
      return next(requestWithId);
    };
  };
}

/**
 * Middleware that adds a default commitment level to requests that support it.
 *
 * @param commitment - Default commitment level
 * @returns Middleware function
 */
export function defaultCommitmentMiddleware(commitment: Commitment): Middleware {
  return (next: Transport): Transport => {
    return async <TMethod extends RpcMethodNames>(
      request: JsonRpcRequest<TMethod>,
    ): Promise<JsonRpcResponse<RpcMethodReturn<TMethod>>> => {
      // Check if params exist and is an array (most RPC methods use positional params)
      if (Array.isArray(request.params) && request.params.length > 0) {
        const lastParam = request.params[request.params.length - 1];

        // If last param is an object and doesn't have commitment, add it
        if (
          typeof lastParam === 'object' &&
          lastParam !== null &&
          !Array.isArray(lastParam) &&
          !('commitment' in lastParam)
        ) {
          const paramsWithCommitment = [...request.params];
          paramsWithCommitment[paramsWithCommitment.length - 1] = {
            ...lastParam,
            commitment,
          };

          return next({
            ...request,
            params: paramsWithCommitment as RpcMethodParams<TMethod>,
          });
        }
      }

      return next(request);
    };
  };
}

/**
 * Middleware that implements retry logic with exponential backoff.
 *
 * @param options - Retry configuration
 * @returns Middleware function
 */
export function retryMiddleware(options?: {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}): Middleware {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (_error: unknown, attempt: number) => attempt < maxAttempts,
  } = options ?? {};

  return (next: Transport): Transport => {
    return async <TMethod extends RpcMethodNames>(
      request: JsonRpcRequest<TMethod>,
    ): Promise<JsonRpcResponse<RpcMethodReturn<TMethod>>> => {
      let lastError: unknown;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const response = await next(request);

          // Check if response is an error that should be retried
          if ('error' in response && shouldRetry(response.error, attempt)) {
            lastError = response.error;

            // Wait before retrying (except on last attempt)
            if (attempt < maxAttempts) {
              const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
            continue;
          }

          return response;
        } catch (error) {
          lastError = error;

          if (!shouldRetry(error, attempt)) {
            throw error;
          }

          // Wait before retrying (except on last attempt)
          if (attempt < maxAttempts) {
            const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      // If we've exhausted all attempts, throw the last error
      throw lastError;
    };
  };
}

/**
 * Middleware that adds timeout to requests.
 *
 * @param timeout - Timeout in milliseconds
 * @returns Middleware function
 */
export function timeoutMiddleware(timeout: number): Middleware {
  return (next: Transport): Transport => {
    return async <TMethod extends RpcMethodNames>(
      request: JsonRpcRequest<TMethod>,
    ): Promise<JsonRpcResponse<RpcMethodReturn<TMethod>>> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        // Create a modified transport that includes the abort signal
        const response = await Promise.race([
          next(request),
          new Promise<never>((_, reject) => {
            controller.signal.addEventListener('abort', () => {
              reject(new Error(`Request timeout after ${timeout}ms`));
            });
          }),
        ]);

        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    };
  };
}

/**
 * Middleware that logs requests and responses.
 *
 * @param logger - Logger function
 * @returns Middleware function
 */
export function loggingMiddleware(
  logger: (level: 'info' | 'error', message: string, data?: unknown) => void = (
    level,
    message,
    data,
  ) => {
    // Default logger that respects the level
    if (level === 'error') {
      console.error(message, data);
    } else {
      console.warn(message, data);
    }
  },
): Middleware {
  return (next: Transport): Transport => {
    return async <TMethod extends RpcMethodNames>(
      request: JsonRpcRequest<TMethod>,
    ): Promise<JsonRpcResponse<RpcMethodReturn<TMethod>>> => {
      const startTime = Date.now();

      logger('info', `RPC Request: ${request.method}`, request);

      try {
        const response = await next(request);
        const duration = Date.now() - startTime;

        if ('error' in response) {
          logger('error', `RPC Error Response: ${request.method} (${duration}ms)`, response.error);
        } else {
          logger(
            'info',
            `RPC Success Response: ${request.method} (${duration}ms)`,
            response.result,
          );
        }

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger('error', `RPC Transport Error: ${request.method} (${duration}ms)`, error);
        throw error;
      }
    };
  };
}
