/**
 * Solana JSON-RPC client package.
 *
 * This package provides type-safe JSON-RPC communication with Solana nodes,
 * including comprehensive TypeScript types for all RPC methods, parameters, and responses.
 *
 * @module @photon/rpc
 */

// Export core types
export * from './types.js';

// Export API interface
export type { SolanaRpcApi, TransactionWithMeta } from './api.js';

// Export type helpers
export {
  type RpcMethodNames,
  type RpcMethodParams,
  type RpcMethodReturn,
  type RpcRequest,
  type RpcResponseSuccess,
  type RpcResponseError,
  type RpcResponseEnvelope,
  type RpcMethodProxy,
  type RpcClient,
  type RpcBatchRequest,
  type RpcBatchResponse,
  type WithOptionalConfig,
  type RpcApiWithOptionalConfigs,
  type RpcMethodMetadata,
  RpcErrorCode,
  isRpcSuccess,
  isRpcError,
  extractRpcResult,
  isValidRpcMethod,
  createMethodName,
  RpcParamsBuilder,
  paramsBuilder,
  getMethodMetadata,
} from './helpers.js';

// Export client factory
export {
  createSolanaRpc,
  createSolanaRpcFromTransport,
  createBatch,
  type RpcClientConfig,
} from './client.js';

// Export transport interface
export {
  type Transport,
  type ConfigurableTransport,
  type TransportConfig,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type JsonRpcResponseSuccess,
  type JsonRpcResponseError,
  isConfigurableTransport,
  createMockTransport,
} from './transport.js';

// Export middleware utilities
export {
  type Middleware,
  type MiddlewareContext,
  composeMiddleware,
  requestIdMiddleware,
  defaultCommitmentMiddleware,
  retryMiddleware,
  timeoutMiddleware,
  loggingMiddleware,
} from './middleware.js';

// Export convenience utilities
export {
  type RpcHealthCheck,
  type ClusterInfo,
  type RpcMetrics,
  checkRpcHealth,
  getClusterInfo,
  createMetricsCollector,
  isSuccessResponse,
  isErrorResponse,
  extractResult,
  generateRequestId,
  createCorrelationId,
} from './convenience.js';
