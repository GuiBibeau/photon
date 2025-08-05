/**
 * Convenience utilities for RPC operations.
 *
 * This module provides utility functions for common RPC operations
 * and performance monitoring.
 */

import type { Version } from './types.js';
import type { RpcClient } from './helpers.js';
import type { JsonRpcResponse, JsonRpcResponseError } from './transport.js';

/**
 * RPC health check result.
 */
export interface RpcHealthCheck {
  /**
   * Whether the RPC endpoint is healthy.
   */
  healthy: boolean;

  /**
   * Response time in milliseconds.
   */
  responseTime: number;

  /**
   * Node version information.
   */
  version?: Version;

  /**
   * Error if health check failed.
   */
  error?: Error;
}

/**
 * Cluster information.
 */
export interface ClusterInfo {
  /**
   * Current slot number.
   */
  slot: number;

  /**
   * Current block height.
   */
  blockHeight: number;

  /**
   * Node version.
   */
  version: Version;

  /**
   * Current epoch.
   */
  epoch: number;

  /**
   * Absolute slot in epoch.
   */
  absoluteSlot: number;

  /**
   * Slot index in epoch.
   */
  slotIndex: number;

  /**
   * Slots in epoch.
   */
  slotsInEpoch: number;

  /**
   * Transaction count.
   */
  transactionCount: number | undefined;
}

/**
 * Performance metrics for RPC operations.
 */
export interface RpcMetrics {
  /**
   * Total number of requests made.
   */
  totalRequests: number;

  /**
   * Number of successful requests.
   */
  successfulRequests: number;

  /**
   * Number of failed requests.
   */
  failedRequests: number;

  /**
   * Average response time in milliseconds.
   */
  averageResponseTime: number;

  /**
   * Minimum response time in milliseconds.
   */
  minResponseTime: number;

  /**
   * Maximum response time in milliseconds.
   */
  maxResponseTime: number;

  /**
   * Response times per method.
   */
  methodMetrics: Map<
    string,
    {
      count: number;
      totalTime: number;
      avgTime: number;
      minTime: number;
      maxTime: number;
    }
  >;
}

/**
 * Perform a health check on the RPC endpoint.
 *
 * @param client - RPC client to check
 * @returns Health check result
 */
export async function checkRpcHealth(client: RpcClient): Promise<RpcHealthCheck> {
  const startTime = Date.now();

  try {
    const version = await client.getVersion();
    const responseTime = Date.now() - startTime;

    return {
      healthy: true,
      responseTime,
      version,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      healthy: false,
      responseTime,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Get comprehensive cluster information.
 *
 * @param client - RPC client
 * @returns Cluster information
 */
export async function getClusterInfo(client: RpcClient): Promise<ClusterInfo> {
  // Fetch multiple pieces of information in parallel
  const results = await Promise.all([
    client.getSlot(),
    client.getBlockHeight(),
    client.getVersion(),
    client.getEpochInfo(),
    client.getTransactionCount().catch(() => undefined), // Optional, may fail
  ]);

  const slot = results[0] as number;
  const blockHeight = results[1] as number;
  const version = results[2] as Version;
  const epochInfo = results[3] as unknown as {
    epoch: number;
    absoluteSlot: number;
    slotIndex: number;
    slotsInEpoch: number;
  }; // Type will be properly defined when RPC methods are implemented
  const transactionCount = results[4] as number | undefined;

  return {
    slot,
    blockHeight,
    version,
    epoch: epochInfo.epoch,
    absoluteSlot: epochInfo.absoluteSlot,
    slotIndex: epochInfo.slotIndex,
    slotsInEpoch: epochInfo.slotsInEpoch,
    transactionCount,
  };
}

/**
 * Create a metrics collector for monitoring RPC performance.
 *
 * @returns Metrics collector
 */
export function createMetricsCollector() {
  const metrics: RpcMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    minResponseTime: Number.MAX_SAFE_INTEGER,
    maxResponseTime: 0,
    methodMetrics: new Map(),
  };

  const responseTimes: number[] = [];

  return {
    /**
     * Record a request.
     */
    recordRequest(method: string, responseTime: number, success: boolean) {
      metrics.totalRequests++;

      if (success) {
        metrics.successfulRequests++;
      } else {
        metrics.failedRequests++;
      }

      // Update response times
      responseTimes.push(responseTime);
      metrics.minResponseTime = Math.min(metrics.minResponseTime, responseTime);
      metrics.maxResponseTime = Math.max(metrics.maxResponseTime, responseTime);
      metrics.averageResponseTime =
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

      // Update method-specific metrics
      const methodMetric = metrics.methodMetrics.get(method) ?? {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Number.MAX_SAFE_INTEGER,
        maxTime: 0,
      };

      methodMetric.count++;
      methodMetric.totalTime += responseTime;
      methodMetric.avgTime = methodMetric.totalTime / methodMetric.count;
      methodMetric.minTime = Math.min(methodMetric.minTime, responseTime);
      methodMetric.maxTime = Math.max(methodMetric.maxTime, responseTime);

      metrics.methodMetrics.set(method, methodMetric);
    },

    /**
     * Get current metrics.
     */
    getMetrics(): RpcMetrics {
      return { ...metrics, methodMetrics: new Map(metrics.methodMetrics) };
    },

    /**
     * Reset metrics.
     */
    reset() {
      metrics.totalRequests = 0;
      metrics.successfulRequests = 0;
      metrics.failedRequests = 0;
      metrics.averageResponseTime = 0;
      metrics.minResponseTime = Number.MAX_SAFE_INTEGER;
      metrics.maxResponseTime = 0;
      metrics.methodMetrics.clear();
      responseTimes.length = 0;
    },
  };
}

/**
 * Type guard to check if a response is successful.
 */
export function isSuccessResponse<T>(
  response: JsonRpcResponse<T>,
): response is { jsonrpc: '2.0'; id: string | number; result: T } {
  return 'result' in response;
}

/**
 * Type guard to check if a response is an error.
 */
export function isErrorResponse(response: JsonRpcResponse): response is JsonRpcResponseError {
  return 'error' in response;
}

/**
 * Extract the result from a response or throw an error.
 */
export function extractResult<T>(response: JsonRpcResponse<T>): T {
  if (isSuccessResponse(response)) {
    return response.result;
  }

  const error = response.error as { code: number; message: string; data?: unknown };
  const rpcError = new Error(`RPC Error ${error.code}: ${error.message}`);
  Object.assign(rpcError, { code: error.code, data: error.data });
  throw rpcError;
}

/**
 * Generate a unique request ID.
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a correlation ID for tracking related requests.
 */
export function createCorrelationId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : generateRequestId();
}
