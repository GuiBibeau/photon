/**
 * Tests for RPC convenience utilities.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkRpcHealth,
  getClusterInfo,
  createMetricsCollector,
  isSuccessResponse,
  isErrorResponse,
  extractResult,
  generateRequestId,
  createCorrelationId,
} from '../src/convenience.js';
import type { RpcClient } from '../src/helpers.js';
import type { JsonRpcResponse, JsonRpcResponseError } from '../src/transport.js';

describe('RPC Convenience Utilities', () => {
  describe('checkRpcHealth', () => {
    it('should return healthy status when RPC responds successfully', async () => {
      const mockClient = {
        getVersion: vi.fn().mockResolvedValue({
          'solana-core': '1.16.0',
          'feature-set': 123456789,
        }),
      } as unknown as RpcClient;

      const result = await checkRpcHealth(mockClient);

      expect(result.healthy).toBe(true);
      expect(result.version).toEqual({
        'solana-core': '1.16.0',
        'feature-set': 123456789,
      });
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should return unhealthy status when RPC fails', async () => {
      const mockError = new Error('Connection failed');
      const mockClient = {
        getVersion: vi.fn().mockRejectedValue(mockError),
      } as unknown as RpcClient;

      const result = await checkRpcHealth(mockClient);

      expect(result.healthy).toBe(false);
      expect(result.version).toBeUndefined();
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.error).toBe(mockError);
    });

    it('should handle non-Error rejections', async () => {
      const mockClient = {
        getVersion: vi.fn().mockRejectedValue('String error'),
      } as unknown as RpcClient;

      const result = await checkRpcHealth(mockClient);

      expect(result.healthy).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('String error');
    });

    it('should measure response time accurately', async () => {
      const mockClient = {
        getVersion: vi
          .fn()
          .mockImplementation(
            () =>
              new Promise((resolve) => setTimeout(() => resolve({ 'solana-core': '1.16.0' }), 50)),
          ),
      } as unknown as RpcClient;

      const result = await checkRpcHealth(mockClient);

      expect(result.healthy).toBe(true);
      // Allow more tolerance for timing precision (45-100ms range for 50ms delay)
      expect(result.responseTime).toBeGreaterThanOrEqual(45);
      expect(result.responseTime).toBeLessThan(100);
    });
  });

  describe('getClusterInfo', () => {
    it('should fetch and combine cluster information', async () => {
      const mockClient = {
        getSlot: vi.fn().mockResolvedValue(123456),
        getBlockHeight: vi.fn().mockResolvedValue(100000),
        getVersion: vi.fn().mockResolvedValue({
          'solana-core': '1.16.0',
          'feature-set': 123456789,
        }),
        getEpochInfo: vi.fn().mockResolvedValue({
          epoch: 500,
          absoluteSlot: 123456,
          slotIndex: 456,
          slotsInEpoch: 432000,
        }),
        getTransactionCount: vi.fn().mockResolvedValue(999999),
      } as unknown as RpcClient;

      const result = await getClusterInfo(mockClient);

      expect(result).toEqual({
        slot: 123456,
        blockHeight: 100000,
        version: {
          'solana-core': '1.16.0',
          'feature-set': 123456789,
        },
        epoch: 500,
        absoluteSlot: 123456,
        slotIndex: 456,
        slotsInEpoch: 432000,
        transactionCount: 999999,
      });

      expect(mockClient.getSlot).toHaveBeenCalledOnce();
      expect(mockClient.getBlockHeight).toHaveBeenCalledOnce();
      expect(mockClient.getVersion).toHaveBeenCalledOnce();
      expect(mockClient.getEpochInfo).toHaveBeenCalledOnce();
      expect(mockClient.getTransactionCount).toHaveBeenCalledOnce();
    });

    it('should handle failed transaction count gracefully', async () => {
      const mockClient = {
        getSlot: vi.fn().mockResolvedValue(123456),
        getBlockHeight: vi.fn().mockResolvedValue(100000),
        getVersion: vi.fn().mockResolvedValue({
          'solana-core': '1.16.0',
        }),
        getEpochInfo: vi.fn().mockResolvedValue({
          epoch: 500,
          absoluteSlot: 123456,
          slotIndex: 456,
          slotsInEpoch: 432000,
        }),
        getTransactionCount: vi.fn().mockRejectedValue(new Error('Not available')),
      } as unknown as RpcClient;

      const result = await getClusterInfo(mockClient);

      expect(result.transactionCount).toBeUndefined();
      expect(result.slot).toBe(123456);
      expect(result.blockHeight).toBe(100000);
    });

    it('should execute requests in parallel', async () => {
      const delays = [100, 150, 50, 75, 25];
      const callOrder: string[] = [];

      const mockClient = {
        getSlot: vi.fn().mockImplementation(async () => {
          await new Promise((r) => setTimeout(r, delays[0]));
          callOrder.push('slot');
          return 123456;
        }),
        getBlockHeight: vi.fn().mockImplementation(async () => {
          await new Promise((r) => setTimeout(r, delays[1]));
          callOrder.push('blockHeight');
          return 100000;
        }),
        getVersion: vi.fn().mockImplementation(async () => {
          await new Promise((r) => setTimeout(r, delays[2]));
          callOrder.push('version');
          return { 'solana-core': '1.16.0' };
        }),
        getEpochInfo: vi.fn().mockImplementation(async () => {
          await new Promise((r) => setTimeout(r, delays[3]));
          callOrder.push('epochInfo');
          return { epoch: 500, absoluteSlot: 123456, slotIndex: 456, slotsInEpoch: 432000 };
        }),
        getTransactionCount: vi.fn().mockImplementation(async () => {
          await new Promise((r) => setTimeout(r, delays[4]));
          callOrder.push('transactionCount');
          return 999999;
        }),
      } as unknown as RpcClient;

      const startTime = Date.now();
      await getClusterInfo(mockClient);
      const totalTime = Date.now() - startTime;

      // All calls should have been made in parallel
      // Total time should be close to the longest delay (150ms), not the sum
      expect(totalTime).toBeLessThan(250); // Allow some overhead
      // Allow for slight timing variations (145ms minimum instead of 150ms)
      expect(totalTime).toBeGreaterThanOrEqual(145);

      // Verify completion order matches delay order
      expect(callOrder).toEqual([
        'transactionCount',
        'version',
        'epochInfo',
        'slot',
        'blockHeight',
      ]);
    });
  });

  describe('createMetricsCollector', () => {
    let collector: ReturnType<typeof createMetricsCollector>;

    beforeEach(() => {
      collector = createMetricsCollector();
    });

    it('should track successful requests', () => {
      collector.recordRequest('getBalance', 100, true);
      collector.recordRequest('getSlot', 50, true);
      collector.recordRequest('getBalance', 150, true);

      const metrics = collector.getMetrics();

      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successfulRequests).toBe(3);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageResponseTime).toBe(100); // (100 + 50 + 150) / 3
      expect(metrics.minResponseTime).toBe(50);
      expect(metrics.maxResponseTime).toBe(150);
    });

    it('should track failed requests', () => {
      collector.recordRequest('getBalance', 100, false);
      collector.recordRequest('getSlot', 200, false);

      const metrics = collector.getMetrics();

      expect(metrics.totalRequests).toBe(2);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(2);
      expect(metrics.averageResponseTime).toBe(150);
    });

    it('should track per-method metrics', () => {
      collector.recordRequest('getBalance', 100, true);
      collector.recordRequest('getBalance', 200, true);
      collector.recordRequest('getBalance', 150, false);
      collector.recordRequest('getSlot', 50, true);

      const metrics = collector.getMetrics();

      const balanceMetrics = metrics.methodMetrics.get('getBalance');
      expect(balanceMetrics).toEqual({
        count: 3,
        totalTime: 450,
        avgTime: 150,
        minTime: 100,
        maxTime: 200,
      });

      const slotMetrics = metrics.methodMetrics.get('getSlot');
      expect(slotMetrics).toEqual({
        count: 1,
        totalTime: 50,
        avgTime: 50,
        minTime: 50,
        maxTime: 50,
      });
    });

    it('should reset metrics', () => {
      collector.recordRequest('getBalance', 100, true);
      collector.recordRequest('getSlot', 50, true);

      collector.reset();

      const metrics = collector.getMetrics();

      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
      expect(metrics.minResponseTime).toBe(Number.MAX_SAFE_INTEGER);
      expect(metrics.maxResponseTime).toBe(0);
      expect(metrics.methodMetrics.size).toBe(0);
    });

    it('should handle edge cases for min/max times', () => {
      collector.recordRequest('getBalance', 0, true);

      const metrics = collector.getMetrics();

      expect(metrics.minResponseTime).toBe(0);
      expect(metrics.maxResponseTime).toBe(0);
    });

    it('should return a copy of method metrics', () => {
      collector.recordRequest('getBalance', 100, true);

      const metrics1 = collector.getMetrics();
      const metrics2 = collector.getMetrics();

      expect(metrics1.methodMetrics).not.toBe(metrics2.methodMetrics);
      expect(metrics1.methodMetrics.get('getBalance')).toEqual(
        metrics2.methodMetrics.get('getBalance'),
      );
    });

    it('should update existing method metrics', () => {
      collector.recordRequest('getBalance', 100, true);
      collector.recordRequest('getBalance', 300, true);

      const metrics = collector.getMetrics();
      const balanceMetrics = metrics.methodMetrics.get('getBalance');

      expect(balanceMetrics?.count).toBe(2);
      expect(balanceMetrics?.avgTime).toBe(200);
      expect(balanceMetrics?.minTime).toBe(100);
      expect(balanceMetrics?.maxTime).toBe(300);
    });
  });

  describe('Response type guards', () => {
    describe('isSuccessResponse', () => {
      it('should return true for success responses', () => {
        const response: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: 1,
          result: { data: 'test' },
        };

        expect(isSuccessResponse(response)).toBe(true);
      });

      it('should return false for error responses', () => {
        const response: JsonRpcResponseError = {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: -32000,
            message: 'Error',
          },
        };

        expect(isSuccessResponse(response)).toBe(false);
      });

      it('should provide type narrowing', () => {
        const response: JsonRpcResponse<string> = {
          jsonrpc: '2.0',
          id: 1,
          result: 'test',
        };

        if (isSuccessResponse(response)) {
          // TypeScript should know response.result exists here
          expect(response.result).toBe('test');
        }
      });
    });

    describe('isErrorResponse', () => {
      it('should return true for error responses', () => {
        const response: JsonRpcResponseError = {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: -32000,
            message: 'Error',
          },
        };

        expect(isErrorResponse(response)).toBe(true);
      });

      it('should return false for success responses', () => {
        const response: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: 1,
          result: { data: 'test' },
        };

        expect(isErrorResponse(response)).toBe(false);
      });
    });
  });

  describe('extractResult', () => {
    it('should extract result from success response', () => {
      const response: JsonRpcResponse<string> = {
        jsonrpc: '2.0',
        id: 1,
        result: 'test data',
      };

      const result = extractResult(response);
      expect(result).toBe('test data');
    });

    it('should throw error for error response', () => {
      const response: JsonRpcResponseError = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32000,
          message: 'Test error',
          data: { details: 'additional info' },
        },
      };

      expect(() => extractResult(response)).toThrow('RPC Error -32000: Test error');
    });

    it('should include error code and data in thrown error', () => {
      const response: JsonRpcResponseError = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32601,
          message: 'Method not found',
          data: { method: 'unknownMethod' },
        },
      };

      try {
        extractResult(response);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toBe('RPC Error -32601: Method not found');
        expect(error.code).toBe(-32601);
        expect(error.data).toEqual({ method: 'unknownMethod' });
      }
    });

    it('should handle error without data field', () => {
      const response: JsonRpcResponseError = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32700,
          message: 'Parse error',
        },
      };

      try {
        extractResult(response);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toBe('RPC Error -32700: Parse error');
        expect(error.code).toBe(-32700);
        expect(error.data).toBeUndefined();
      }
    });
  });

  describe('ID generation utilities', () => {
    describe('generateRequestId', () => {
      it('should generate unique IDs', () => {
        const id1 = generateRequestId();
        const id2 = generateRequestId();

        expect(id1).toBeTypeOf('string');
        expect(id2).toBeTypeOf('string');
        expect(id1).not.toBe(id2);
      });

      it('should include timestamp in ID', () => {
        const before = Date.now();
        const id = generateRequestId();
        const after = Date.now();

        const timestamp = parseInt(id.split('-')[0]);
        expect(timestamp).toBeGreaterThanOrEqual(before);
        expect(timestamp).toBeLessThanOrEqual(after);
      });

      it('should have consistent format', () => {
        const id = generateRequestId();
        expect(id).toMatch(/^\d+-[a-z0-9]+$/);
      });
    });

    describe('createCorrelationId', () => {
      it('should use crypto.randomUUID when available', () => {
        const originalRandomUUID = crypto.randomUUID;
        const mockUUID = 'mock-uuid-1234';
        crypto.randomUUID = vi.fn().mockReturnValue(mockUUID);

        const id = createCorrelationId();

        expect(id).toBe(mockUUID);
        expect(crypto.randomUUID).toHaveBeenCalled();

        crypto.randomUUID = originalRandomUUID;
      });

      it('should fallback to generateRequestId when randomUUID is not available', () => {
        const originalRandomUUID = crypto.randomUUID;
        // @ts-expect-error - Temporarily set randomUUID to undefined
        crypto.randomUUID = undefined;

        const id = createCorrelationId();

        expect(id).toMatch(/^\d+-[a-z0-9]+$/);

        crypto.randomUUID = originalRandomUUID;
      });

      it('should generate unique IDs', () => {
        const id1 = createCorrelationId();
        const id2 = createCorrelationId();

        expect(id1).not.toBe(id2);
      });
    });
  });
});
