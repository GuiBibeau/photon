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
        body: JSON.stringify(request, (_key, value) =>
          typeof value === 'bigint' ? Number(value) : value,
        ),
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

/**
 * Options for retry transport wrapper.
 */
export interface RetryTransportOptions {
  /**
   * Maximum number of retry attempts.
   */
  maxAttempts?: number;

  /**
   * Initial delay in milliseconds between retries.
   */
  initialDelay?: number;

  /**
   * Maximum delay in milliseconds between retries.
   */
  maxDelay?: number;

  /**
   * Jitter to add randomness to retry delays (0-1).
   */
  jitter?: number;

  /**
   * Custom predicate to determine if a request should be retried.
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Create a transport wrapper that implements retry logic with exponential backoff.
 *
 * @param transport - The underlying transport to wrap
 * @param options - Retry configuration options
 * @returns A transport with retry capabilities
 */
export function createRetryTransport(
  transport: Transport,
  options?: RetryTransportOptions,
): Transport {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    jitter = 0.1,
    shouldRetry = (error: unknown, attempt: number) => {
      // Default: retry on network errors and 5xx responses
      if (attempt >= maxAttempts) {
        return false;
      }
      if (error instanceof Error && error.message.includes('Network')) {
        return true;
      }
      if (error instanceof Error && error.message.includes('HTTP error')) {
        return true;
      }
      return false;
    },
  } = options ?? {};

  return async <TMethod extends RpcMethodNames>(
    request: JsonRpcRequest<TMethod>,
  ): Promise<JsonRpcResponse<RpcMethodReturn<TMethod>>> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await transport(request);

        // Check if RPC error should be retried
        if ('error' in response) {
          const { error } = response;
          // Don't retry client errors (invalid params, method not found, etc.)
          if (error.code >= -32099 && error.code <= -32000) {
            if (shouldRetry(error, attempt) && attempt < maxAttempts) {
              lastError = error;
              const delay = calculateDelay(attempt, initialDelay, maxDelay, jitter);
              await sleep(delay);
              continue;
            }
          }
        }

        return response;
      } catch (error) {
        lastError = error;

        if (!shouldRetry(error, attempt) || attempt >= maxAttempts) {
          throw error;
        }

        const delay = calculateDelay(attempt, initialDelay, maxDelay, jitter);
        await sleep(delay);
      }
    }

    throw lastError;
  };
}

/**
 * Options for logging transport wrapper.
 */
export interface LoggingTransportOptions {
  /**
   * Logger function for outputting log messages.
   */
  logger?: (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown) => void;

  /**
   * Include request parameters in logs.
   */
  logParams?: boolean;

  /**
   * Include response results in logs.
   */
  logResults?: boolean;

  /**
   * Include timing information in logs.
   */
  logTiming?: boolean;
}

/**
 * Create a transport wrapper that logs requests and responses.
 *
 * @param transport - The underlying transport to wrap
 * @param options - Logging configuration options
 * @returns A transport with logging capabilities
 */
export function createLoggingTransport(
  transport: Transport,
  options?: LoggingTransportOptions,
): Transport {
  const {
    logger = (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown) => {
      const logFn = level === 'error' ? console.error : console.warn;
      logFn(`[RPC ${level.toUpperCase()}] ${message}`, data ?? '');
    },
    logParams = true,
    logResults = false,
    logTiming = true,
  } = options ?? {};

  return async <TMethod extends RpcMethodNames>(
    request: JsonRpcRequest<TMethod>,
  ): Promise<JsonRpcResponse<RpcMethodReturn<TMethod>>> => {
    const startTime = logTiming ? Date.now() : 0;
    const requestId = request.id;

    // Log outgoing request
    logger(
      'info',
      `→ ${request.method} [${requestId}]`,
      logParams ? { params: request.params } : undefined,
    );

    try {
      const response = await transport(request);
      const duration = logTiming ? Date.now() - startTime : 0;

      if ('error' in response) {
        // Log error response
        logger(
          'error',
          `← ${request.method} [${requestId}] ERROR${logTiming ? ` (${duration}ms)` : ''}`,
          {
            error: response.error,
          },
        );
      } else {
        // Log success response
        logger(
          'info',
          `← ${request.method} [${requestId}] SUCCESS${logTiming ? ` (${duration}ms)` : ''}`,
          logResults ? { result: response.result } : undefined,
        );
      }

      return response;
    } catch (error) {
      const duration = logTiming ? Date.now() - startTime : 0;
      // Log transport error
      logger(
        'error',
        `← ${request.method} [${requestId}] TRANSPORT ERROR${logTiming ? ` (${duration}ms)` : ''}`,
        { error },
      );
      throw error;
    }
  };
}

/**
 * Cache entry for storing RPC responses.
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

/**
 * Options for cache transport wrapper.
 */
export interface CacheTransportOptions {
  /**
   * Time-to-live for cache entries in milliseconds.
   */
  ttl?: number;

  /**
   * Maximum number of entries in the cache.
   */
  maxSize?: number;

  /**
   * Methods to cache (by default caches read-only methods).
   */
  cacheMethods?: string[];

  /**
   * Generate cache key from request.
   */
  getCacheKey?: (request: JsonRpcRequest) => string;
}

/**
 * Create a transport wrapper that caches responses for read-only methods.
 *
 * @param transport - The underlying transport to wrap
 * @param options - Cache configuration options
 * @returns A transport with caching capabilities
 */
export function createCacheTransport(
  transport: Transport,
  options?: CacheTransportOptions,
): Transport & { clearCache: () => void } {
  const {
    ttl = 5000, // 5 seconds default
    maxSize = 100,
    cacheMethods = [
      'getAccountInfo',
      'getBalance',
      'getBlock',
      'getBlockHeight',
      'getLatestBlockhash',
      'getMultipleAccounts',
      'getSignatureStatuses',
      'getSlot',
      'getTransaction',
      'getVersion',
    ],
    getCacheKey = (request: JsonRpcRequest) => {
      return `${request.method}:${JSON.stringify(request.params)}`;
    },
  } = options ?? {};

  const cache = new Map<string, CacheEntry<JsonRpcResponse>>();

  const wrappedTransport = async <TMethod extends RpcMethodNames>(
    request: JsonRpcRequest<TMethod>,
  ): Promise<JsonRpcResponse<RpcMethodReturn<TMethod>>> => {
    // Only cache specified methods
    if (!cacheMethods.includes(request.method)) {
      return transport(request);
    }

    const cacheKey = getCacheKey(request);
    const now = Date.now();

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && now - cached.timestamp < cached.ttl) {
      // Return cached response with the current request ID
      return {
        ...cached.value,
        id: request.id,
      } as JsonRpcResponse<RpcMethodReturn<TMethod>>;
    }

    // Make request
    const response = await transport(request);

    // Cache successful responses only
    if (!('error' in response)) {
      // Enforce max cache size
      if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value;
        if (firstKey) {
          cache.delete(firstKey);
        }
      }

      cache.set(cacheKey, {
        value: response,
        timestamp: now,
        ttl,
      });
    }

    return response;
  };

  // Add cache management method
  return Object.assign(wrappedTransport, {
    clearCache: () => cache.clear(),
  });
}

/**
 * Options for load balancer transport.
 */
export interface LoadBalancerTransportOptions {
  /**
   * Strategy for selecting endpoints.
   */
  strategy?: 'round-robin' | 'random' | 'least-failures';

  /**
   * Health check interval in milliseconds.
   */
  healthCheckInterval?: number;

  /**
   * Maximum consecutive failures before marking endpoint as unhealthy.
   */
  maxFailures?: number;

  /**
   * Timeout for health checks in milliseconds.
   */
  healthCheckTimeout?: number;
}

/**
 * Create a transport that load balances requests across multiple endpoints.
 *
 * @param endpoints - Array of RPC endpoint URLs
 * @param options - Load balancer configuration options
 * @returns A transport with load balancing capabilities
 */
export function createLoadBalancerTransport(
  endpoints: string[],
  options?: LoadBalancerTransportOptions,
): Transport & { getHealthStatus: () => Map<string, boolean> } {
  if (endpoints.length === 0) {
    throw new Error('At least one endpoint is required');
  }

  const {
    strategy = 'round-robin',
    healthCheckInterval = 30000, // 30 seconds
    maxFailures = 3,
    healthCheckTimeout = 5000,
  } = options ?? {};

  // Create transports for each endpoint
  const transports = endpoints.map((endpoint) =>
    createHttpTransport(endpoint, { timeout: healthCheckTimeout }),
  );

  // Track endpoint health and failures
  const health = new Map<string, boolean>(endpoints.map((endpoint) => [endpoint, true]));
  const failures = new Map<string, number>(endpoints.map((endpoint) => [endpoint, 0]));
  let currentIndex = 0;

  // Health check function
  const checkHealth = async () => {
    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];
      const transport = transports[i];
      if (!endpoint || !transport) {
        continue;
      }

      try {
        const response = await transport({
          jsonrpc: '2.0',
          id: 'health-check',
          method: 'getHealth' as RpcMethodNames,
        });

        if (!('error' in response)) {
          health.set(endpoint, true);
          failures.set(endpoint, 0);
        }
      } catch {
        // Mark as unhealthy if health check fails
        const failureCount = (failures.get(endpoint) ?? 0) + 1;
        failures.set(endpoint, failureCount);
        if (failureCount >= maxFailures) {
          health.set(endpoint, false);
        }
      }
    }
  };

  // Start health checking
  if (healthCheckInterval > 0) {
    const intervalId = setInterval(() => {
      checkHealth().catch(() => {
        // Ignore health check errors
      });
    }, healthCheckInterval);

    // Clean up interval on process exit (Node.js only)
    if (typeof globalThis !== 'undefined' && 'process' in globalThis) {
      const nodeProcess = (
        globalThis as { process?: { on?: (event: string, handler: () => void) => void } }
      ).process;
      if (nodeProcess && typeof nodeProcess.on === 'function') {
        nodeProcess.on('exit', () => clearInterval(intervalId));
      }
    }
  }

  // Select next healthy endpoint based on strategy
  const selectEndpoint = (): number => {
    const healthyIndices = endpoints
      .map((endpoint, index) => (health.get(endpoint) ? index : -1))
      .filter((index) => index !== -1);

    if (healthyIndices.length === 0) {
      // All endpoints unhealthy, try all
      return Math.floor(Math.random() * endpoints.length);
    }

    switch (strategy) {
      case 'random':
        return healthyIndices[Math.floor(Math.random() * healthyIndices.length)] ?? 0;
      case 'least-failures': {
        let minFailures = Infinity;
        let bestIndex = healthyIndices[0] ?? 0;
        for (const index of healthyIndices) {
          const endpoint = endpoints[index];
          const failureCount = endpoint ? (failures.get(endpoint) ?? 0) : Infinity;
          if (failureCount < minFailures) {
            minFailures = failureCount;
            bestIndex = index;
          }
        }
        return bestIndex;
      }
      case 'round-robin':
      default: {
        // Find next healthy endpoint in round-robin order
        for (let i = 0; i < endpoints.length; i++) {
          const index = (currentIndex + i) % endpoints.length;
          if (healthyIndices.includes(index)) {
            currentIndex = (index + 1) % endpoints.length;
            return index;
          }
        }
        return healthyIndices[0] ?? 0;
      }
    }
  };

  const balancedTransport = async <TMethod extends RpcMethodNames>(
    request: JsonRpcRequest<TMethod>,
  ): Promise<JsonRpcResponse<RpcMethodReturn<TMethod>>> => {
    const maxRetries = endpoints.length;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const index = selectEndpoint();
      const transport = transports[index];
      const endpoint = endpoints[index];

      if (!transport || !endpoint) {
        continue;
      }

      try {
        const response = await transport(request);

        // Reset failures on success
        failures.set(endpoint, 0);
        health.set(endpoint, true);

        return response;
      } catch (error) {
        lastError = error;

        // Increment failure count
        const failureCount = (failures.get(endpoint) ?? 0) + 1;
        failures.set(endpoint, failureCount);

        // Mark as unhealthy if too many failures
        if (failureCount >= maxFailures) {
          health.set(endpoint, false);
        }

        // Try next endpoint
        continue;
      }
    }

    throw lastError ?? new Error('All endpoints failed');
  };

  return Object.assign(balancedTransport, {
    getHealthStatus: () => new Map(health),
  });
}

/**
 * Options for authenticated transport.
 */
export interface AuthenticatedTransportOptions {
  /**
   * Authentication token or API key.
   */
  token?: string;

  /**
   * Custom header name for the authentication token.
   */
  headerName?: string;

  /**
   * Token refresh function for dynamic tokens.
   */
  getToken?: () => Promise<string> | string;

  /**
   * Additional headers to include with authenticated requests.
   */
  additionalHeaders?: Record<string, string>;
}

/**
 * Create a transport wrapper that adds authentication headers to requests.
 *
 * @param transport - The underlying transport to wrap
 * @param options - Authentication configuration options
 * @returns A transport with authentication capabilities
 */
export function createAuthenticatedTransport(
  transport: Transport | ConfigurableTransport,
  options: AuthenticatedTransportOptions,
): Transport {
  const { token, headerName = 'Authorization', getToken, additionalHeaders = {} } = options;

  if (!token && !getToken) {
    throw new Error('Either token or getToken must be provided');
  }

  return async <TMethod extends RpcMethodNames>(
    request: JsonRpcRequest<TMethod>,
  ): Promise<JsonRpcResponse<RpcMethodReturn<TMethod>>> => {
    // Get the current token
    const authToken = getToken ? await getToken() : token;

    if (!authToken) {
      throw new Error('Failed to obtain authentication token');
    }

    // Add authentication headers if transport is configurable
    if (isConfigurableTransport(transport)) {
      const authenticatedTransport = transport.withConfig({
        headers: {
          [headerName]: authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`,
          ...additionalHeaders,
        },
      });
      return authenticatedTransport(request);
    }

    // For non-configurable transports, just pass through
    // (authentication should be handled at transport creation)
    return transport(request);
  };
}

// Helper functions

/**
 * Calculate delay with exponential backoff and jitter.
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  jitter: number,
): number {
  const exponentialDelay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
  const jitterAmount = exponentialDelay * jitter * Math.random();
  return Math.floor(exponentialDelay + jitterAmount);
}

/**
 * Sleep for the specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
