import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createHttpTransport,
  createMockTransport,
  isConfigurableTransport,
  createRetryTransport,
  createLoggingTransport,
  createCacheTransport,
  createLoadBalancerTransport,
  createAuthenticatedTransport,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type Transport,
} from '../src/transport.js';

describe('HTTP Transport', () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = mockFetch;
    mockFetch.mockClear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('createHttpTransport', () => {
    it('should create a configurable transport', () => {
      const transport = createHttpTransport('https://api.mainnet-beta.solana.com');
      expect(isConfigurableTransport(transport)).toBe(true);
    });

    it('should send a JSON-RPC request with correct headers', async () => {
      const transport = createHttpTransport('https://api.mainnet-beta.solana.com');
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance' as any,
        params: ['11111111111111111111111111111111'],
      };

      const mockResponse: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: { value: 1000000000 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await transport(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.mainnet-beta.solana.com',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(request),
          keepalive: true,
        }),
      );

      expect(response).toEqual(mockResponse);
    });

    it('should support custom headers', async () => {
      const transport = createHttpTransport('https://api.mainnet-beta.solana.com', {
        headers: {
          'X-Custom-Header': 'test-value',
        },
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance' as any,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {},
        }),
      });

      await transport(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.mainnet-beta.solana.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom-Header': 'test-value',
          }),
        }),
      );
    });

    it('should handle timeout', async () => {
      const transport = createHttpTransport('https://api.mainnet-beta.solana.com', {
        timeout: 100,
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance' as any,
      };

      // Track whether the signal was actually aborted
      let signalAborted = false;

      // Simulate a slow response that will be aborted
      mockFetch.mockImplementationOnce((_url, options) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ jsonrpc: '2.0', id: 1, result: {} }),
            });
          }, 200);

          // Listen for abort signal
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              signalAborted = true;
              clearTimeout(timeout);
              reject(new DOMException('The operation was aborted', 'AbortError'));
            });
          }
        });
      });

      await expect(transport(request)).rejects.toThrow('Request timeout after 100ms');
      expect(signalAborted).toBe(true);
    });

    it('should handle HTTP errors', async () => {
      const transport = createHttpTransport('https://api.mainnet-beta.solana.com');

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance' as any,
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(transport(request)).rejects.toThrow(
        'HTTP error! status: 500 Internal Server Error',
      );
    });

    it('should handle JSON parsing errors', async () => {
      const transport = createHttpTransport('https://api.mainnet-beta.solana.com');

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance' as any,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(transport(request)).rejects.toThrow(
        'Failed to parse JSON response: Invalid JSON',
      );
    });

    it('should validate JSON-RPC response format', async () => {
      const transport = createHttpTransport('https://api.mainnet-beta.solana.com');

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance' as any,
      };

      // Missing jsonrpc field
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, result: {} }),
      });

      await expect(transport(request)).rejects.toThrow('Invalid JSON-RPC response format');
    });

    it('should validate response ID matches request ID', async () => {
      const transport = createHttpTransport('https://api.mainnet-beta.solana.com');

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance' as any,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 2, // Wrong ID
          result: {},
        }),
      });

      await expect(transport(request)).rejects.toThrow('Response ID mismatch. Expected 1, got 2');
    });

    it('should handle JSON-RPC error responses', async () => {
      const transport = createHttpTransport('https://api.mainnet-beta.solana.com');

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance' as any,
      };

      const errorResponse: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32601,
          message: 'Method not found',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => errorResponse,
      });

      const response = await transport(request);
      expect(response).toEqual(errorResponse);
    });

    it('should support abort signal', async () => {
      const controller = new AbortController();
      const transport = createHttpTransport('https://api.mainnet-beta.solana.com', {
        signal: controller.signal,
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance' as any,
      };

      // Abort immediately
      controller.abort();

      mockFetch.mockRejectedValueOnce(new DOMException('The operation was aborted', 'AbortError'));

      await expect(transport(request)).rejects.toThrow('The operation was aborted');
    });

    it('should support withConfig to create new transport with updated config', async () => {
      const transport = createHttpTransport('https://api.mainnet-beta.solana.com');
      const newTransport = transport.withConfig({
        headers: { 'X-New-Header': 'new-value' },
      });

      expect(isConfigurableTransport(newTransport)).toBe(true);

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance' as any,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {},
        }),
      });

      await newTransport(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.mainnet-beta.solana.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-New-Header': 'new-value',
          }),
        }),
      );
    });

    it('should handle network errors', async () => {
      const transport = createHttpTransport('https://api.mainnet-beta.solana.com');

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance' as any,
      };

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(transport(request)).rejects.toThrow('Network error');
    });
  });

  describe('createMockTransport', () => {
    it('should return mocked successful responses', async () => {
      const responses = new Map([['getBalance' as any, { value: 1000000000 }]]);
      const transport = createMockTransport(responses);

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance' as any,
        params: ['11111111111111111111111111111111'],
      };

      const response = await transport(request);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: { value: 1000000000 },
      });
    });

    it('should return mocked error responses', async () => {
      const responses = new Map([['getBalance' as any, new Error('Something went wrong')]]);
      const transport = createMockTransport(responses);

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance' as any,
      };

      const response = await transport(request);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32000,
          message: 'Something went wrong',
          data: expect.any(Error),
        },
      });
    });

    it('should return method not found for unmocked methods', async () => {
      const responses = new Map();
      const transport = createMockTransport(responses);

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance' as any,
      };

      const response = await transport(request);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32601,
          message: 'Method not found',
        },
      });
    });
  });

  describe('isConfigurableTransport', () => {
    it('should return true for configurable transports', () => {
      const transport = createHttpTransport('https://api.mainnet-beta.solana.com');
      expect(isConfigurableTransport(transport)).toBe(true);
    });

    it('should return false for non-configurable transports', () => {
      const transport = createMockTransport(new Map());
      expect(isConfigurableTransport(transport)).toBe(false);
    });
  });

  describe('createRetryTransport', () => {
    it('should retry failed requests', async () => {
      let callCount = 0;
      const baseTransport: Transport = async (request) => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Network error');
        }
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: 'success',
        } as JsonRpcResponse;
      };

      const retryTransport = createRetryTransport(baseTransport, {
        maxAttempts: 3,
        initialDelay: 10,
        shouldRetry: () => true,
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion' as any,
      };

      const response = await retryTransport(request);
      expect(response.result).toBe('success');
      expect(callCount).toBe(3);
    });

    it('should not retry when shouldRetry returns false', async () => {
      let callCount = 0;
      const baseTransport: Transport = async () => {
        callCount++;
        throw new Error('Permanent error');
      };

      const retryTransport = createRetryTransport(baseTransport, {
        maxAttempts: 3,
        shouldRetry: () => false,
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion' as any,
      };

      await expect(retryTransport(request)).rejects.toThrow('Permanent error');
      expect(callCount).toBe(1);
    });

    it('should apply exponential backoff with jitter', async () => {
      const timestamps: number[] = [];
      const baseTransport: Transport = async () => {
        timestamps.push(Date.now());
        if (timestamps.length < 3) {
          throw new Error('Retry me');
        }
        return {
          jsonrpc: '2.0',
          id: 1,
          result: 'success',
        } as JsonRpcResponse;
      };

      const retryTransport = createRetryTransport(baseTransport, {
        maxAttempts: 3,
        initialDelay: 50,
        jitter: 0.1,
        shouldRetry: () => true,
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion' as any,
      };

      await retryTransport(request);

      // Check that delays are increasing (approximately)
      expect(timestamps.length).toBe(3);
      if (timestamps[0] && timestamps[1] && timestamps[2]) {
        const delay1 = timestamps[1] - timestamps[0];
        const delay2 = timestamps[2] - timestamps[1];
        expect(delay1).toBeGreaterThan(40); // At least close to initial delay
        expect(delay2).toBeGreaterThan(delay1); // Second delay should be larger
      }
    });

    it('should not retry client errors by default', async () => {
      let callCount = 0;
      const baseTransport: Transport = async (request) => {
        callCount++;
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32602, // Invalid params - client error
            message: 'Invalid params',
          },
        } as JsonRpcResponse;
      };

      const retryTransport = createRetryTransport(baseTransport);

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion' as any,
      };

      const response = await retryTransport(request);
      expect(response).toHaveProperty('error');
      expect(callCount).toBe(1); // Should not retry
    });
  });

  describe('createLoggingTransport', () => {
    it('should log requests and responses', async () => {
      const logs: Array<{ level: string; message: string; data?: unknown }> = [];
      const logger = (level: string, message: string, data?: unknown) => {
        logs.push({ level, message, data });
      };

      const baseTransport: Transport = async (request) =>
        ({
          jsonrpc: '2.0',
          id: request.id,
          result: 'test-result',
        }) as JsonRpcResponse;

      const loggingTransport = createLoggingTransport(baseTransport, {
        logger,
        logParams: true,
        logResults: true,
        logTiming: true,
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion' as any,
        params: ['test-param'],
      };

      await loggingTransport(request);

      expect(logs).toHaveLength(2);
      expect(logs[0]).toMatchObject({
        level: 'info',
        message: expect.stringContaining('→ getVersion [1]'),
        data: { params: ['test-param'] },
      });
      expect(logs[1]).toMatchObject({
        level: 'info',
        message: expect.stringMatching(/← getVersion \[1\] SUCCESS \(\d+ms\)/),
        data: { result: 'test-result' },
      });
    });

    it('should log errors', async () => {
      const logs: Array<{ level: string; message: string; data?: unknown }> = [];
      const logger = (level: string, message: string, data?: unknown) => {
        logs.push({ level, message, data });
      };

      const baseTransport: Transport = async (request) =>
        ({
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32000,
            message: 'Test error',
          },
        }) as JsonRpcResponse;

      const loggingTransport = createLoggingTransport(baseTransport, { logger });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion' as any,
      };

      await loggingTransport(request);

      expect(logs[1]).toMatchObject({
        level: 'error',
        message: expect.stringContaining('ERROR'),
        data: {
          error: {
            code: -32000,
            message: 'Test error',
          },
        },
      });
    });

    it('should log transport errors', async () => {
      const logs: Array<{ level: string; message: string; data?: unknown }> = [];
      const logger = (level: string, message: string, data?: unknown) => {
        logs.push({ level, message, data });
      };

      const baseTransport: Transport = async () => {
        throw new Error('Transport failed');
      };

      const loggingTransport = createLoggingTransport(baseTransport, { logger });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion' as any,
      };

      await expect(loggingTransport(request)).rejects.toThrow('Transport failed');

      expect(logs[1]).toMatchObject({
        level: 'error',
        message: expect.stringContaining('TRANSPORT ERROR'),
      });
    });
  });

  describe('createCacheTransport', () => {
    it('should cache successful responses', async () => {
      let callCount = 0;
      const baseTransport: Transport = async (request) => {
        callCount++;
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: `result-${callCount}`,
        } as JsonRpcResponse;
      };

      const cacheTransport = createCacheTransport(baseTransport, {
        ttl: 1000,
        cacheMethods: ['getAccountInfo'],
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo' as any,
        params: ['test-address'],
      };

      // First call - should hit the base transport
      const response1 = await cacheTransport(request);
      expect(response1.result).toBe('result-1');
      expect(callCount).toBe(1);

      // Second call - should be cached
      const response2 = await cacheTransport({ ...request, id: 2 });
      expect(response2.result).toBe('result-1');
      expect(response2.id).toBe(2); // ID should be updated
      expect(callCount).toBe(1); // Should not have called base transport again
    });

    it('should not cache error responses', async () => {
      let callCount = 0;
      const baseTransport: Transport = async (request) => {
        callCount++;
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32000,
            message: 'Error',
          },
        } as JsonRpcResponse;
      };

      const cacheTransport = createCacheTransport(baseTransport, {
        cacheMethods: ['getAccountInfo'],
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo' as any,
        params: ['test-address'],
      };

      await cacheTransport(request);
      await cacheTransport(request);

      expect(callCount).toBe(2); // Should have called twice (no caching)
    });

    it('should respect TTL', async () => {
      let callCount = 0;
      const baseTransport: Transport = async (request) => {
        callCount++;
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: `result-${callCount}`,
        } as JsonRpcResponse;
      };

      const cacheTransport = createCacheTransport(baseTransport, {
        ttl: 50, // 50ms TTL
        cacheMethods: ['getAccountInfo'],
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo' as any,
        params: ['test-address'],
      };

      // First call
      const response1 = await cacheTransport(request);
      expect(response1.result).toBe('result-1');

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Second call - cache should be expired
      const response2 = await cacheTransport(request);
      expect(response2.result).toBe('result-2');
      expect(callCount).toBe(2);
    });

    it('should only cache specified methods', async () => {
      let callCount = 0;
      const baseTransport: Transport = async (request) => {
        callCount++;
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: `result-${callCount}`,
        } as JsonRpcResponse;
      };

      const cacheTransport = createCacheTransport(baseTransport, {
        cacheMethods: ['getAccountInfo'], // Only cache this method
      });

      // Method that should be cached
      const cachedRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo' as any,
        params: ['test'],
      };

      // Method that should NOT be cached
      const uncachedRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'sendTransaction' as any,
        params: ['test'],
      };

      await cacheTransport(cachedRequest);
      await cacheTransport(cachedRequest);
      expect(callCount).toBe(1); // Cached

      await cacheTransport(uncachedRequest);
      await cacheTransport(uncachedRequest);
      expect(callCount).toBe(3); // Not cached
    });

    it('should provide clearCache method', async () => {
      let callCount = 0;
      const baseTransport: Transport = async (request) => {
        callCount++;
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: `result-${callCount}`,
        } as JsonRpcResponse;
      };

      const cacheTransport = createCacheTransport(baseTransport, {
        cacheMethods: ['getAccountInfo'],
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo' as any,
        params: ['test'],
      };

      await cacheTransport(request);
      expect(callCount).toBe(1);

      await cacheTransport(request);
      expect(callCount).toBe(1); // Still cached

      cacheTransport.clearCache();

      await cacheTransport(request);
      expect(callCount).toBe(2); // Cache cleared, new call made
    });

    it('should enforce max cache size', async () => {
      let callCount = 0;
      const baseTransport: Transport = async (request) => {
        callCount++;
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: `result-${request.params?.[0]}`,
        } as JsonRpcResponse;
      };

      const cacheTransport = createCacheTransport(baseTransport, {
        maxSize: 2,
        cacheMethods: ['getAccountInfo'],
      });

      // Add 3 different requests (exceeding max size)
      for (let i = 1; i <= 3; i++) {
        await cacheTransport({
          jsonrpc: '2.0',
          id: i,
          method: 'getAccountInfo' as any,
          params: [`address-${i}`],
        });
      }

      // First request should be evicted
      await cacheTransport({
        jsonrpc: '2.0',
        id: 4,
        method: 'getAccountInfo' as any,
        params: ['address-1'],
      });

      expect(callCount).toBe(4); // First was evicted, so it's called again
    });
  });

  describe('createLoadBalancerTransport', () => {
    it('should distribute requests across endpoints', async () => {
      const callCounts = new Map<string, number>();

      // Mock fetch for load balancer test
      mockFetch.mockImplementation(async (url: string) => {
        callCounts.set(url, (callCounts.get(url) ?? 0) + 1);
        return {
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            id: 1,
            result: url,
          }),
        };
      });

      const endpoints = [
        'https://rpc1.example.com',
        'https://rpc2.example.com',
        'https://rpc3.example.com',
      ];

      const loadBalancer = createLoadBalancerTransport(endpoints, {
        strategy: 'round-robin',
        healthCheckInterval: 0, // Disable health checks for test
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion' as any,
      };

      // Make several requests
      for (let i = 0; i < 6; i++) {
        await loadBalancer(request);
      }

      // Each endpoint should have been called twice (round-robin)
      expect(callCounts.get('https://rpc1.example.com')).toBe(2);
      expect(callCounts.get('https://rpc2.example.com')).toBe(2);
      expect(callCounts.get('https://rpc3.example.com')).toBe(2);
    });

    it('should handle endpoint failures', async () => {
      const working = 'https://working.example.com';
      const failing = 'https://failing.example.com';

      mockFetch.mockImplementation(async (url: string) => {
        if (url === failing) {
          throw new Error('Connection failed');
        }
        return {
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            id: 1,
            result: 'success',
          }),
        };
      });

      const loadBalancer = createLoadBalancerTransport([failing, working], {
        strategy: 'round-robin',
        healthCheckInterval: 0,
        maxFailures: 1,
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion' as any,
      };

      // Should fail over to working endpoint
      const response = await loadBalancer(request);
      expect(response.result).toBe('success');
    });

    it('should provide health status', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: 'ok',
        }),
      });

      const endpoints = ['https://rpc1.example.com', 'https://rpc2.example.com'];

      const loadBalancer = createLoadBalancerTransport(endpoints, {
        healthCheckInterval: 0,
      });

      const health = loadBalancer.getHealthStatus();
      expect(health.get('https://rpc1.example.com')).toBe(true);
      expect(health.get('https://rpc2.example.com')).toBe(true);
    });

    it('should throw error when no endpoints provided', () => {
      expect(() => createLoadBalancerTransport([])).toThrow('At least one endpoint is required');
    });

    it('should use random strategy', async () => {
      const callCounts = new Map<string, number>();

      mockFetch.mockImplementation(async (url: string) => {
        callCounts.set(url, (callCounts.get(url) ?? 0) + 1);
        return {
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            id: 1,
            result: url,
          }),
        };
      });

      const endpoints = ['https://rpc1.example.com', 'https://rpc2.example.com'];

      const loadBalancer = createLoadBalancerTransport(endpoints, {
        strategy: 'random',
        healthCheckInterval: 0,
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion' as any,
      };

      // Make many requests to ensure randomness
      for (let i = 0; i < 20; i++) {
        await loadBalancer(request);
      }

      // Both endpoints should have been called (with high probability)
      expect(callCounts.get('https://rpc1.example.com')).toBeGreaterThan(0);
      expect(callCounts.get('https://rpc2.example.com')).toBeGreaterThan(0);
    });
  });

  describe('createAuthenticatedTransport', () => {
    it('should add authentication header with static token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: 'authenticated',
        }),
      });

      const baseTransport = createHttpTransport('https://api.example.com');
      const authTransport = createAuthenticatedTransport(baseTransport, {
        token: 'my-api-key',
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion' as any,
      };

      await authTransport(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-api-key',
          }),
        }),
      );
    });

    it('should use dynamic token from getToken function', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: 'authenticated',
        }),
      });

      let tokenCounter = 0;
      const baseTransport = createHttpTransport('https://api.example.com');
      const authTransport = createAuthenticatedTransport(baseTransport, {
        getToken: async () => `dynamic-token-${++tokenCounter}`,
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion' as any,
      };

      await authTransport(request);
      await authTransport(request);

      const calls = mockFetch.mock.calls;
      expect(calls[0]?.[1]?.headers?.Authorization).toBe('Bearer dynamic-token-1');
      expect(calls[1]?.[1]?.headers?.Authorization).toBe('Bearer dynamic-token-2');
    });

    it('should use custom header name', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: 'authenticated',
        }),
      });

      const baseTransport = createHttpTransport('https://api.example.com');
      const authTransport = createAuthenticatedTransport(baseTransport, {
        token: 'my-key',
        headerName: 'X-API-Key',
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion' as any,
      };

      await authTransport(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'Bearer my-key',
          }),
        }),
      );
    });

    it('should add additional headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: 'authenticated',
        }),
      });

      const baseTransport = createHttpTransport('https://api.example.com');
      const authTransport = createAuthenticatedTransport(baseTransport, {
        token: 'my-token',
        additionalHeaders: {
          'X-Custom-Header': 'custom-value',
        },
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion' as any,
      };

      await authTransport(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-token',
            'X-Custom-Header': 'custom-value',
          }),
        }),
      );
    });

    it('should not add Bearer prefix if already present', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: 'authenticated',
        }),
      });

      const baseTransport = createHttpTransport('https://api.example.com');
      const authTransport = createAuthenticatedTransport(baseTransport, {
        token: 'Bearer existing-token',
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion' as any,
      };

      await authTransport(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer existing-token',
          }),
        }),
      );
    });

    it('should throw error if no token or getToken provided', () => {
      const baseTransport = createHttpTransport('https://api.example.com');
      expect(() => createAuthenticatedTransport(baseTransport, {})).toThrow(
        'Either token or getToken must be provided',
      );
    });

    it('should throw error if getToken returns undefined', async () => {
      const baseTransport = createHttpTransport('https://api.example.com');
      const authTransport = createAuthenticatedTransport(baseTransport, {
        getToken: async () => undefined as any,
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion' as any,
      };

      await expect(authTransport(request)).rejects.toThrow('Failed to obtain authentication token');
    });

    it('should work with non-configurable transport', async () => {
      const baseTransport: Transport = async (request) =>
        ({
          jsonrpc: '2.0',
          id: request.id,
          result: 'success',
        }) as JsonRpcResponse;

      const authTransport = createAuthenticatedTransport(baseTransport, {
        token: 'my-token',
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion' as any,
      };

      const response = await authTransport(request);
      expect(response.result).toBe('success');
    });
  });
});
