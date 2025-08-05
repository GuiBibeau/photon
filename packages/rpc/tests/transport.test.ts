import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createHttpTransport,
  createMockTransport,
  isConfigurableTransport,
  type JsonRpcRequest,
  type JsonRpcResponse,
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
});
