/**
 * Tests for RPC middleware functions.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  composeMiddleware,
  requestIdMiddleware,
  defaultCommitmentMiddleware,
  retryMiddleware,
  timeoutMiddleware,
  loggingMiddleware,
} from '../src/middleware.js';
import type { Transport, JsonRpcRequest, JsonRpcResponse } from '../src/transport.js';
import type { Middleware } from '../src/middleware.js';

describe('RPC Middleware', () => {
  describe('composeMiddleware', () => {
    it('should compose multiple middleware in correct order', async () => {
      const order: number[] = [];

      const middleware1: Middleware = (next) => async (request) => {
        order.push(1);
        const result = await next(request);
        order.push(4);
        return result;
      };

      const middleware2: Middleware = (next) => async (request) => {
        order.push(2);
        const result = await next(request);
        order.push(3);
        return result;
      };

      const baseTransport: Transport = async (request) => {
        order.push(0);
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: 'test',
        } as JsonRpcResponse;
      };

      const composed = composeMiddleware(middleware1, middleware2);
      const transport = composed(baseTransport);

      await transport({ jsonrpc: '2.0', id: 1, method: 'test' as any });

      expect(order).toEqual([1, 2, 0, 3, 4]);
    });

    it('should work with single middleware', async () => {
      let executed = false;

      const middleware: Middleware = (next) => async (request) => {
        executed = true;
        return next(request);
      };

      const baseTransport: Transport = async (request) =>
        ({
          jsonrpc: '2.0',
          id: request.id,
          result: 'test',
        }) as JsonRpcResponse;

      const composed = composeMiddleware(middleware);
      const transport = composed(baseTransport);

      await transport({ jsonrpc: '2.0', id: 1, method: 'test' as any });

      expect(executed).toBe(true);
    });

    it('should work with no middleware', async () => {
      const baseTransport: Transport = async (request) =>
        ({
          jsonrpc: '2.0',
          id: request.id,
          result: 'test',
        }) as JsonRpcResponse;

      const composed = composeMiddleware();
      const transport = composed(baseTransport);

      const response = await transport({ jsonrpc: '2.0', id: 1, method: 'test' as any });

      expect(response.result).toBe('test');
    });
  });

  describe('requestIdMiddleware', () => {
    it('should add request ID using default generator', async () => {
      let capturedRequest: JsonRpcRequest | undefined;

      const baseTransport: Transport = async (request) => {
        capturedRequest = request;
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: 'test',
        } as JsonRpcResponse;
      };

      const middleware = requestIdMiddleware();
      const transport = middleware(baseTransport);

      await transport({ jsonrpc: '2.0', id: 'old-id', method: 'test' as any });

      expect(capturedRequest?.id).toBeTypeOf('number');
      expect(capturedRequest?.id).not.toBe('old-id');
    });

    it('should use custom ID generator', async () => {
      let capturedRequest: JsonRpcRequest | undefined;
      const customId = 'custom-id-123';

      const baseTransport: Transport = async (request) => {
        capturedRequest = request;
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: 'test',
        } as JsonRpcResponse;
      };

      const middleware = requestIdMiddleware(() => customId);
      const transport = middleware(baseTransport);

      await transport({ jsonrpc: '2.0', id: 'old-id', method: 'test' as any });

      expect(capturedRequest?.id).toBe(customId);
    });

    it('should generate unique IDs for multiple requests', async () => {
      const capturedIds: (string | number)[] = [];

      const baseTransport: Transport = async (request) => {
        capturedIds.push(request.id);
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: 'test',
        } as JsonRpcResponse;
      };

      const middleware = requestIdMiddleware();
      const transport = middleware(baseTransport);

      await transport({ jsonrpc: '2.0', id: 0, method: 'test' as any });
      // Add small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1));
      await transport({ jsonrpc: '2.0', id: 0, method: 'test' as any });

      expect(capturedIds[0]).not.toBe(capturedIds[1]);
    });
  });

  describe('defaultCommitmentMiddleware', () => {
    it('should add commitment to config object', async () => {
      let capturedRequest: JsonRpcRequest | undefined;

      const baseTransport: Transport = async (request) => {
        capturedRequest = request;
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: 'test',
        } as JsonRpcResponse;
      };

      const middleware = defaultCommitmentMiddleware('finalized');
      const transport = middleware(baseTransport);

      await transport({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance' as any,
        params: ['address', { minContextSlot: 100 }],
      });

      expect(capturedRequest?.params).toEqual([
        'address',
        { minContextSlot: 100, commitment: 'finalized' },
      ]);
    });

    it('should not override existing commitment', async () => {
      let capturedRequest: JsonRpcRequest | undefined;

      const baseTransport: Transport = async (request) => {
        capturedRequest = request;
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: 'test',
        } as JsonRpcResponse;
      };

      const middleware = defaultCommitmentMiddleware('finalized');
      const transport = middleware(baseTransport);

      await transport({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance' as any,
        params: ['address', { commitment: 'confirmed' }],
      });

      expect(capturedRequest?.params).toEqual(['address', { commitment: 'confirmed' }]);
    });

    it('should not modify params when last param is not an object', async () => {
      let capturedRequest: JsonRpcRequest | undefined;

      const baseTransport: Transport = async (request) => {
        capturedRequest = request;
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: 'test',
        } as JsonRpcResponse;
      };

      const middleware = defaultCommitmentMiddleware('finalized');
      const transport = middleware(baseTransport);

      await transport({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance' as any,
        params: ['address', 'string-param'],
      });

      expect(capturedRequest?.params).toEqual(['address', 'string-param']);
    });

    it('should not modify params when last param is an array', async () => {
      let capturedRequest: JsonRpcRequest | undefined;

      const baseTransport: Transport = async (request) => {
        capturedRequest = request;
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: 'test',
        } as JsonRpcResponse;
      };

      const middleware = defaultCommitmentMiddleware('finalized');
      const transport = middleware(baseTransport);

      await transport({
        jsonrpc: '2.0',
        id: 1,
        method: 'test' as any,
        params: ['address', ['array', 'param']],
      });

      expect(capturedRequest?.params).toEqual(['address', ['array', 'param']]);
    });

    it('should not modify params when last param is null', async () => {
      let capturedRequest: JsonRpcRequest | undefined;

      const baseTransport: Transport = async (request) => {
        capturedRequest = request;
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: 'test',
        } as JsonRpcResponse;
      };

      const middleware = defaultCommitmentMiddleware('finalized');
      const transport = middleware(baseTransport);

      await transport({
        jsonrpc: '2.0',
        id: 1,
        method: 'test' as any,
        params: ['address', null],
      });

      expect(capturedRequest?.params).toEqual(['address', null]);
    });

    it('should handle empty params array', async () => {
      let capturedRequest: JsonRpcRequest | undefined;

      const baseTransport: Transport = async (request) => {
        capturedRequest = request;
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: 'test',
        } as JsonRpcResponse;
      };

      const middleware = defaultCommitmentMiddleware('finalized');
      const transport = middleware(baseTransport);

      await transport({
        jsonrpc: '2.0',
        id: 1,
        method: 'test' as any,
        params: [],
      });

      expect(capturedRequest?.params).toEqual([]);
    });

    it('should handle non-array params', async () => {
      let capturedRequest: JsonRpcRequest | undefined;

      const baseTransport: Transport = async (request) => {
        capturedRequest = request;
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: 'test',
        } as JsonRpcResponse;
      };

      const middleware = defaultCommitmentMiddleware('finalized');
      const transport = middleware(baseTransport);

      await transport({
        jsonrpc: '2.0',
        id: 1,
        method: 'test' as any,
        params: { named: 'param' },
      });

      expect(capturedRequest?.params).toEqual({ named: 'param' });
    });
  });

  describe('retryMiddleware', () => {
    it('should retry failed requests', async () => {
      let attemptCount = 0;

      const baseTransport: Transport = async (request) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network error');
        }
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: 'success',
        } as JsonRpcResponse;
      };

      const middleware = retryMiddleware({
        maxAttempts: 3,
        initialDelay: 10,
      });
      const transport = middleware(baseTransport);

      const response = await transport({ jsonrpc: '2.0', id: 1, method: 'test' as any });

      expect(response.result).toBe('success');
      expect(attemptCount).toBe(3);
    });

    it('should retry error responses when shouldRetry returns true', async () => {
      let attemptCount = 0;

      const baseTransport: Transport = async (request) => {
        attemptCount++;
        if (attemptCount < 3) {
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32000,
              message: 'Server error',
            },
          } as JsonRpcResponse;
        }
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: 'success',
        } as JsonRpcResponse;
      };

      const middleware = retryMiddleware({
        maxAttempts: 3,
        initialDelay: 10,
        shouldRetry: (error, attempt) => attempt < 3,
      });
      const transport = middleware(baseTransport);

      const response = await transport({ jsonrpc: '2.0', id: 1, method: 'test' as any });

      expect(response.result).toBe('success');
      expect(attemptCount).toBe(3);
    });

    it('should not retry when shouldRetry returns false', async () => {
      let attemptCount = 0;

      const baseTransport: Transport = async () => {
        attemptCount++;
        throw new Error('Permanent error');
      };

      const middleware = retryMiddleware({
        maxAttempts: 3,
        shouldRetry: () => false,
      });
      const transport = middleware(baseTransport);

      await expect(transport({ jsonrpc: '2.0', id: 1, method: 'test' as any })).rejects.toThrow(
        'Permanent error',
      );

      expect(attemptCount).toBe(1);
    });

    it('should apply exponential backoff', async () => {
      const attemptTimes: number[] = [];

      const baseTransport: Transport = async () => {
        attemptTimes.push(Date.now());
        if (attemptTimes.length < 3) {
          throw new Error('Retry me');
        }
        return {
          jsonrpc: '2.0',
          id: 1,
          result: 'success',
        } as JsonRpcResponse;
      };

      const middleware = retryMiddleware({
        maxAttempts: 3,
        initialDelay: 50,
      });
      const transport = middleware(baseTransport);

      await transport({ jsonrpc: '2.0', id: 1, method: 'test' as any });

      expect(attemptTimes.length).toBe(3);

      // Check delays are increasing
      const delay1 = (attemptTimes[1] ?? 0) - (attemptTimes[0] ?? 0);
      const delay2 = (attemptTimes[2] ?? 0) - (attemptTimes[1] ?? 0);

      // Allow 2ms tolerance for timer precision
      expect(delay1).toBeGreaterThanOrEqual(48);
      expect(delay1).toBeLessThan(60);
      expect(delay2).toBeGreaterThanOrEqual(98);
      expect(delay2).toBeLessThan(120);
    });

    it('should respect maxDelay', async () => {
      const attemptTimes: number[] = [];

      const baseTransport: Transport = async () => {
        attemptTimes.push(Date.now());
        if (attemptTimes.length < 4) {
          throw new Error('Retry me');
        }
        return {
          jsonrpc: '2.0',
          id: 1,
          result: 'success',
        } as JsonRpcResponse;
      };

      const middleware = retryMiddleware({
        maxAttempts: 4,
        initialDelay: 100,
        maxDelay: 150,
      });
      const transport = middleware(baseTransport);

      await transport({ jsonrpc: '2.0', id: 1, method: 'test' as any });

      // The third delay should be capped at maxDelay
      const delay3 = (attemptTimes[3] ?? 0) - (attemptTimes[2] ?? 0);
      expect(delay3).toBeLessThanOrEqual(200); // Allow some overhead
    });

    it('should throw last error after max attempts', async () => {
      let lastError: Error | undefined;

      const baseTransport: Transport = async () => {
        lastError = new Error(`Attempt error`);
        throw lastError;
      };

      const middleware = retryMiddleware({
        maxAttempts: 2,
        initialDelay: 10,
      });
      const transport = middleware(baseTransport);

      await expect(transport({ jsonrpc: '2.0', id: 1, method: 'test' as any })).rejects.toThrow(
        'Attempt error',
      );
    });

    it('should use default options when none provided', async () => {
      let attemptCount = 0;

      const baseTransport: Transport = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Retry me');
        }
        return {
          jsonrpc: '2.0',
          id: 1,
          result: 'success',
        } as JsonRpcResponse;
      };

      const middleware = retryMiddleware();
      const transport = middleware(baseTransport);

      const response = await transport({ jsonrpc: '2.0', id: 1, method: 'test' as any });

      expect(response.result).toBe('success');
      expect(attemptCount).toBe(3);
    });
  });

  describe('timeoutMiddleware', () => {
    it('should timeout slow requests', async () => {
      const baseTransport: Transport = async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return {
          jsonrpc: '2.0',
          id: 1,
          result: 'test',
        } as JsonRpcResponse;
      };

      const middleware = timeoutMiddleware(50);
      const transport = middleware(baseTransport);

      await expect(transport({ jsonrpc: '2.0', id: 1, method: 'test' as any })).rejects.toThrow(
        'Request timeout after 50ms',
      );
    });

    it('should not timeout fast requests', async () => {
      const baseTransport: Transport = async (request) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: 'success',
        } as JsonRpcResponse;
      };

      const middleware = timeoutMiddleware(100);
      const transport = middleware(baseTransport);

      const response = await transport({ jsonrpc: '2.0', id: 1, method: 'test' as any });

      expect(response.result).toBe('success');
    });

    it('should clean up timeout on success', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const baseTransport: Transport = async (request) =>
        ({
          jsonrpc: '2.0',
          id: request.id,
          result: 'test',
        }) as JsonRpcResponse;

      const middleware = timeoutMiddleware(100);
      const transport = middleware(baseTransport);

      await transport({ jsonrpc: '2.0', id: 1, method: 'test' as any });

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should clean up timeout on error', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const baseTransport: Transport = async () => {
        throw new Error('Transport error');
      };

      const middleware = timeoutMiddleware(100);
      const transport = middleware(baseTransport);

      await expect(transport({ jsonrpc: '2.0', id: 1, method: 'test' as any })).rejects.toThrow(
        'Transport error',
      );

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('loggingMiddleware', () => {
    it('should log successful requests and responses', async () => {
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

      const middleware = loggingMiddleware(logger);
      const transport = middleware(baseTransport);

      await transport({ jsonrpc: '2.0', id: 1, method: 'getBalance' as any });

      expect(logs).toHaveLength(2);
      expect(logs[0]).toMatchObject({
        level: 'info',
        message: expect.stringContaining('RPC Request: getBalance'),
      });
      expect(logs[1]).toMatchObject({
        level: 'info',
        message: expect.stringMatching(/RPC Success Response: getBalance \(\d+ms\)/),
        data: 'test-result',
      });
    });

    it('should log error responses', async () => {
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

      const middleware = loggingMiddleware(logger);
      const transport = middleware(baseTransport);

      await transport({ jsonrpc: '2.0', id: 1, method: 'getBalance' as any });

      expect(logs[1]).toMatchObject({
        level: 'error',
        message: expect.stringContaining('RPC Error Response'),
        data: {
          code: -32000,
          message: 'Test error',
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

      const middleware = loggingMiddleware(logger);
      const transport = middleware(baseTransport);

      await expect(
        transport({ jsonrpc: '2.0', id: 1, method: 'getBalance' as any }),
      ).rejects.toThrow('Transport failed');

      expect(logs[1]).toMatchObject({
        level: 'error',
        message: expect.stringContaining('RPC Transport Error'),
      });
    });

    it('should use default logger when none provided', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const baseTransport: Transport = async (request) =>
        ({
          jsonrpc: '2.0',
          id: request.id,
          result: 'test',
        }) as JsonRpcResponse;

      const middleware = loggingMiddleware();
      const transport = middleware(baseTransport);

      await transport({ jsonrpc: '2.0', id: 1, method: 'test' as any });

      expect(consoleWarnSpy).toHaveBeenCalledTimes(2); // Request and response

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should measure request duration', async () => {
      const logs: Array<{ level: string; message: string; data?: unknown }> = [];
      const logger = (level: string, message: string, data?: unknown) => {
        logs.push({ level, message, data });
      };

      const baseTransport: Transport = async (request) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: 'test',
        } as JsonRpcResponse;
      };

      const middleware = loggingMiddleware(logger);
      const transport = middleware(baseTransport);

      await transport({ jsonrpc: '2.0', id: 1, method: 'test' as any });

      const responseLog = logs[1].message;
      const durationMatch = responseLog.match(/\((\d+)ms\)/);
      expect(durationMatch).toBeTruthy();

      const duration = parseInt(durationMatch?.[1] ?? '0');
      // Allow for slight timing variations (45ms minimum instead of 50ms)
      expect(duration).toBeGreaterThanOrEqual(45);
    });
  });
});
