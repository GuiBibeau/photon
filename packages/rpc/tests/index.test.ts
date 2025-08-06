/**
 * Tests for main index exports.
 */

import { describe, it, expect } from 'vitest';
import * as rpcExports from '../src/index.js';

describe('RPC Package Exports', () => {
  it('should export core types', () => {
    // Types are exported at compile time, not runtime
    // We can verify that specific functions that use these types are exported
    expect(typeof rpcExports.parseCommitment).toBe('function');
  });

  it('should export client factory functions', () => {
    expect(typeof rpcExports.createSolanaRpc).toBe('function');
    expect(typeof rpcExports.createSolanaRpcFromTransport).toBe('function');
    expect(typeof rpcExports.createBatch).toBe('function');
  });

  it('should export transport functions', () => {
    expect(typeof rpcExports.createHttpTransport).toBe('function');
    expect(typeof rpcExports.createMockTransport).toBe('function');
    expect(typeof rpcExports.isConfigurableTransport).toBe('function');
    expect(typeof rpcExports.createRetryTransport).toBe('function');
    expect(typeof rpcExports.createLoggingTransport).toBe('function');
    expect(typeof rpcExports.createCacheTransport).toBe('function');
    expect(typeof rpcExports.createLoadBalancerTransport).toBe('function');
    expect(typeof rpcExports.createAuthenticatedTransport).toBe('function');
  });

  it('should export middleware functions', () => {
    expect(typeof rpcExports.composeMiddleware).toBe('function');
    expect(typeof rpcExports.requestIdMiddleware).toBe('function');
    expect(typeof rpcExports.defaultCommitmentMiddleware).toBe('function');
    expect(typeof rpcExports.retryMiddleware).toBe('function');
    expect(typeof rpcExports.timeoutMiddleware).toBe('function');
    expect(typeof rpcExports.loggingMiddleware).toBe('function');
  });

  it('should export convenience utilities', () => {
    expect(typeof rpcExports.checkRpcHealth).toBe('function');
    expect(typeof rpcExports.getClusterInfo).toBe('function');
    expect(typeof rpcExports.createMetricsCollector).toBe('function');
    expect(typeof rpcExports.isSuccessResponse).toBe('function');
    expect(typeof rpcExports.isErrorResponse).toBe('function');
    expect(typeof rpcExports.extractResult).toBe('function');
    expect(typeof rpcExports.generateRequestId).toBe('function');
    expect(typeof rpcExports.createCorrelationId).toBe('function');
  });

  it('should export helper functions', () => {
    expect(typeof rpcExports.isRpcSuccess).toBe('function');
    expect(typeof rpcExports.isRpcError).toBe('function');
    expect(typeof rpcExports.extractRpcResult).toBe('function');
    expect(typeof rpcExports.isValidRpcMethod).toBe('function');
    expect(typeof rpcExports.createMethodName).toBe('function');
    expect(typeof rpcExports.paramsBuilder).toBe('function');
    expect(typeof rpcExports.getMethodMetadata).toBe('function');
    expect(rpcExports.RpcParamsBuilder).toBeDefined();
    expect(rpcExports.RpcErrorCode).toBeDefined();
  });

  it('should export RPC method implementations', () => {
    // Account methods
    expect(typeof rpcExports.getAccountInfo).toBe('function');
    expect(typeof rpcExports.getMultipleAccounts).toBe('function');
    expect(typeof rpcExports.getBalance).toBe('function');
    expect(typeof rpcExports.getProgramAccounts).toBe('function');

    // Transaction methods
    expect(typeof rpcExports.sendTransaction).toBe('function');
    expect(typeof rpcExports.simulateTransaction).toBe('function');
    expect(typeof rpcExports.getTransaction).toBe('function');
    expect(typeof rpcExports.getSignatureStatuses).toBe('function');

    // Block methods
    expect(typeof rpcExports.getLatestBlockhash).toBe('function');
    expect(typeof rpcExports.getBlock).toBe('function');
    expect(typeof rpcExports.getBlockHeight).toBe('function');

    // Utility methods
    expect(typeof rpcExports.getMinimumBalanceForRentExemption).toBe('function');
    expect(typeof rpcExports.getSlot).toBe('function');
    expect(typeof rpcExports.getVersion).toBe('function');
  });

  it('should export parser functions', () => {
    // Base64 parsers
    expect(typeof rpcExports.decodeBase64).toBe('function');
    expect(typeof rpcExports.encodeBase64).toBe('function');
    expect(typeof rpcExports.decodeData).toBe('function');
    expect(typeof rpcExports.parseAccountData).toBe('function');
    expect(typeof rpcExports.isBase64).toBe('function');
    expect(typeof rpcExports.base64ByteSize).toBe('function');

    // BigInt parsers
    expect(typeof rpcExports.parseBigInt).toBe('function');
    expect(typeof rpcExports.parseBigIntOrNull).toBe('function');
    expect(typeof rpcExports.parseBigIntWithDefault).toBe('function');
    expect(typeof rpcExports.needsBigInt).toBe('function');
    expect(typeof rpcExports.parseNumeric).toBe('function');
    expect(typeof rpcExports.bigIntToNumber).toBe('function');
    expect(typeof rpcExports.bigIntToNumberSafe).toBe('function');

    // Type parsers
    expect(typeof rpcExports.parseAddress).toBe('function');
    expect(typeof rpcExports.parseAddressOrNull).toBe('function');
    expect(typeof rpcExports.parseAddressArray).toBe('function');
    expect(typeof rpcExports.parseSignature).toBe('function');
    expect(typeof rpcExports.parseSignatureArray).toBe('function');
    expect(typeof rpcExports.parseRpcResponse).toBe('function');
    expect(typeof rpcExports.parseAccountInfo).toBe('function');
    expect(typeof rpcExports.parseMultipleAccounts).toBe('function');
    expect(typeof rpcExports.parseBlockhashInfo).toBe('function');
    expect(typeof rpcExports.parseSignatureStatus).toBe('function');
    expect(typeof rpcExports.parseSignatureStatuses).toBe('function');
    expect(typeof rpcExports.parseBlockInfo).toBe('function');
    expect(typeof rpcExports.parseTransaction).toBe('function');
    expect(typeof rpcExports.parseVersion).toBe('function');
    expect(typeof rpcExports.parseCommitment).toBe('function');
    expect(typeof rpcExports.isRpcError).toBe('function');
    expect(typeof rpcExports.extractRpcError).toBe('function');
  });

  it('should export all expected type definitions', () => {
    // Verify that type exports exist by checking the module structure
    const exportKeys = Object.keys(rpcExports);

    // Check for common type-related exports (these are actual runtime values)
    expect(exportKeys).toContain('RpcErrorCode');
    expect(exportKeys).toContain('RpcParamsBuilder');
  });

  it('should have consistent export structure', () => {
    // Ensure no unexpected undefined exports
    Object.entries(rpcExports).forEach(([key, value]) => {
      expect(value).toBeDefined();
      expect(key).toBeTruthy();
    });
  });

  it('should export transport-related types as values or functions', () => {
    // These are runtime checks for exported functions/values
    expect(rpcExports.isConfigurableTransport).toBeDefined();
    expect(rpcExports.createHttpTransport).toBeDefined();
    expect(rpcExports.createMockTransport).toBeDefined();
  });
});
