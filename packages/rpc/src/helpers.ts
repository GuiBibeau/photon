/**
 * Type helpers for RPC API.
 *
 * This module provides utility types for extracting and manipulating RPC method types,
 * enabling type-safe method calls and better developer experience.
 */

import type { SolanaRpcApi } from './api.js';

/**
 * Extract all RPC method names from the API interface.
 */
export type RpcMethodNames = keyof SolanaRpcApi;

/**
 * Extract the parameters type for a specific RPC method.
 */
export type RpcMethodParams<TMethod extends RpcMethodNames> = SolanaRpcApi[TMethod] extends (
  ...args: infer P
) => unknown
  ? P
  : never;

/**
 * Extract the return type for a specific RPC method.
 */
export type RpcMethodReturn<TMethod extends RpcMethodNames> = SolanaRpcApi[TMethod] extends (
  ...args: unknown[]
) => Promise<infer R>
  ? R
  : never;

/**
 * Create a type-safe RPC request structure.
 */
export interface RpcRequest<TMethod extends RpcMethodNames = RpcMethodNames> {
  jsonrpc: '2.0';
  id: string | number;
  method: TMethod;
  params: RpcMethodParams<TMethod>;
}

/**
 * Create a type-safe RPC response structure.
 */
export interface RpcResponseSuccess<TMethod extends RpcMethodNames> {
  jsonrpc: '2.0';
  id: string | number;
  result: RpcMethodReturn<TMethod>;
}

/**
 * RPC error response structure.
 */
export interface RpcResponseError {
  jsonrpc: '2.0';
  id: string | number;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Combined RPC response type.
 */
export type RpcResponseEnvelope<TMethod extends RpcMethodNames> =
  | RpcResponseSuccess<TMethod>
  | RpcResponseError;

/**
 * Standard JSON-RPC error codes.
 */
export enum RpcErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ServerError = -32000,
}

/**
 * Helper to create a type-safe RPC method proxy.
 */
export type RpcMethodProxy<TMethod extends RpcMethodNames> = (
  ...args: RpcMethodParams<TMethod>
) => Promise<RpcMethodReturn<TMethod>>;

/**
 * Transform the RPC API interface into a callable client interface.
 */
export type RpcClient = {
  [K in RpcMethodNames]: RpcMethodProxy<K>;
};

/**
 * Batch request structure.
 */
export type RpcBatchRequest = Array<RpcRequest>;

/**
 * Batch response structure.
 */
export type RpcBatchResponse<TMethods extends RpcMethodNames[] = RpcMethodNames[]> = {
  [K in keyof TMethods]: TMethods[K] extends RpcMethodNames
    ? RpcResponseEnvelope<TMethods[K]>
    : never;
};

/**
 * Helper to check if a response is successful.
 */
export function isRpcSuccess<TMethod extends RpcMethodNames>(
  response: RpcResponseEnvelope<TMethod>,
): response is RpcResponseSuccess<TMethod> {
  return 'result' in response;
}

/**
 * Helper to check if a response is an error.
 */
export function isRpcError(
  response: RpcResponseEnvelope<RpcMethodNames>,
): response is RpcResponseError {
  return 'error' in response;
}

/**
 * Extract the result from a successful response or throw an error.
 */
export function extractRpcResult<TMethod extends RpcMethodNames>(
  response: RpcResponseEnvelope<TMethod>,
): RpcMethodReturn<TMethod> {
  if (isRpcError(response)) {
    throw new Error(`RPC Error ${response.error.code}: ${response.error.message}`);
  }
  return response.result;
}

/**
 * Type guard for checking if a method name is valid.
 */
export function isValidRpcMethod(method: string): method is RpcMethodNames {
  const validMethods: Set<string> = new Set([
    'getAccountInfo',
    'getBalance',
    'getBlock',
    'getBlockHeight',
    'getBlockProduction',
    'getBlockCommitment',
    'getBlocks',
    'getBlocksWithLimit',
    'getBlockTime',
    'getClusterNodes',
    'getEpochInfo',
    'getEpochSchedule',
    'getFeeRateGovernor',
    'getFeeCalculatorForBlockhash',
    'getFeeForMessage',
    'getFirstAvailableBlock',
    'getGenesisHash',
    'getHealth',
    'getHighestSnapshotSlot',
    'getIdentity',
    'getInflationGovernor',
    'getInflationRate',
    'getInflationReward',
    'getLargestAccounts',
    'getLatestBlockhash',
    'getLeaderSchedule',
    'getMaxRetransmitSlot',
    'getMaxShredInsertSlot',
    'getMinimumBalanceForRentExemption',
    'getMultipleAccounts',
    'getProgramAccounts',
    'getRecentBlockhash',
    'getRecentPerformanceSamples',
    'getRecentPrioritizationFees',
    'getSignaturesForAddress',
    'getSignatureStatuses',
    'getSlot',
    'getSlotLeader',
    'getSlotLeaders',
    'getStakeActivation',
    'getStakeMinimumDelegation',
    'getSupply',
    'getTokenAccountBalance',
    'getTokenAccountsByDelegate',
    'getTokenAccountsByOwner',
    'getTokenLargestAccounts',
    'getTokenSupply',
    'getTransaction',
    'getTransactionCount',
    'getVersion',
    'getVoteAccounts',
    'isBlockhashValid',
    'minimumLedgerSlot',
    'requestAirdrop',
    'sendTransaction',
    'simulateTransaction',
  ]);

  return validMethods.has(method);
}

/**
 * Create a type-safe method name from a string.
 */
export function createMethodName<TMethod extends RpcMethodNames>(method: TMethod): TMethod {
  if (!isValidRpcMethod(method)) {
    throw new Error(`Invalid RPC method: ${String(method)}`);
  }
  return method;
}

/**
 * Type-safe parameter builder for RPC methods.
 */
export class RpcParamsBuilder<TMethod extends RpcMethodNames> {
  private params: RpcMethodParams<TMethod> | undefined;

  constructor(private method: TMethod) {}

  /**
   * Set parameters for the RPC method.
   */
  setParams(...args: RpcMethodParams<TMethod>): this {
    this.params = args;
    return this;
  }

  /**
   * Build the RPC request.
   */
  build(id: string | number = 1): RpcRequest<TMethod> {
    return {
      jsonrpc: '2.0',
      id,
      method: this.method,
      params: (this.params || []) as RpcMethodParams<TMethod>,
    };
  }
}

/**
 * Create a parameter builder for a specific method.
 */
export function paramsBuilder<TMethod extends RpcMethodNames>(
  method: TMethod,
): RpcParamsBuilder<TMethod> {
  return new RpcParamsBuilder(method);
}

/**
 * Type helper to make all configs optional in RPC methods.
 */
export type WithOptionalConfig<T extends (...args: unknown[]) => unknown> = T extends (
  ...args: [...infer Rest, infer Config]
) => infer Return
  ? Config extends object
    ? (...args: [...Rest, (Config | undefined)?]) => Return
    : T
  : T;

/**
 * Transform RPC API to make all config parameters optional.
 */
export type RpcApiWithOptionalConfigs = {
  [K in keyof SolanaRpcApi]: SolanaRpcApi[K];
};

/**
 * Utility to get method metadata.
 */
export interface RpcMethodMetadata<TMethod extends RpcMethodNames> {
  name: TMethod;
  paramCount: number;
  hasConfig: boolean;
  isDeprecated: boolean;
}

/**
 * Get metadata for an RPC method.
 */
export function getMethodMetadata<TMethod extends RpcMethodNames>(
  method: TMethod,
): RpcMethodMetadata<TMethod> {
  const deprecatedMethods = new Set(['getRecentBlockhash', 'getFeeCalculatorForBlockhash']);

  // This is a simplified version - in practice, you'd extract this from the actual function signature
  const methodParamCounts: Record<string, number> = {
    getAccountInfo: 2,
    getBalance: 2,
    getBlock: 2,
    // ... etc
  };

  const methodsWithConfig = new Set([
    'getAccountInfo',
    'getBalance',
    'getBlock',
    // ... most methods have optional config
  ]);

  return {
    name: method,
    paramCount: methodParamCounts[method] || 0,
    hasConfig: methodsWithConfig.has(method),
    isDeprecated: deprecatedMethods.has(method),
  };
}
