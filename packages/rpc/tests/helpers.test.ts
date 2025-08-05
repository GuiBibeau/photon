/**
 * Tests for RPC type helpers.
 */

import { describe, it, expect, expectTypeOf } from 'vitest';
import type { SolanaRpcApi } from '../src/api.js';
import {
  type RpcMethodNames,
  type RpcMethodParams,
  type RpcMethodReturn,
  type RpcRequest,
  type RpcResponseSuccess,
  type RpcResponseError,
  type RpcResponseEnvelope,
  type RpcClient,
  RpcErrorCode,
  isRpcSuccess,
  isRpcError,
  extractRpcResult,
  isValidRpcMethod,
  createMethodName,
  RpcParamsBuilder,
  paramsBuilder,
  getMethodMetadata,
} from '../src/helpers.js';

describe('RPC Type Helpers', () => {
  describe('RpcMethodNames Type', () => {
    it('should extract all method names from SolanaRpcApi', () => {
      expectTypeOf<RpcMethodNames>().toMatchTypeOf<keyof SolanaRpcApi>();

      const validMethod: RpcMethodNames = 'getAccountInfo';
      const anotherMethod: RpcMethodNames = 'getBalance';

      expect(validMethod).toBe('getAccountInfo');
      expect(anotherMethod).toBe('getBalance');
    });
  });

  describe('RpcMethodParams Type', () => {
    it('should extract parameters for specific methods', () => {
      type GetAccountInfoParams = RpcMethodParams<'getAccountInfo'>;
      type GetBalanceParams = RpcMethodParams<'getBalance'>;

      expectTypeOf<GetAccountInfoParams>().toMatchTypeOf<[any, any?]>();
      expectTypeOf<GetBalanceParams>().toMatchTypeOf<[any, any?]>();
    });
  });

  describe('RpcMethodReturn Type', () => {
    it('should extract return type for specific methods', () => {
      type GetAccountInfoReturn = RpcMethodReturn<'getAccountInfo'>;
      type GetBalanceReturn = RpcMethodReturn<'getBalance'>;
      type GetHealthReturn = RpcMethodReturn<'getHealth'>;

      expectTypeOf<GetAccountInfoReturn>().toMatchTypeOf<any>();
      expectTypeOf<GetBalanceReturn>().toMatchTypeOf<any>();
      expectTypeOf<GetHealthReturn>().toMatchTypeOf<'ok'>();
    });
  });

  describe('RpcRequest Type', () => {
    it('should create type-safe request structure', () => {
      const request: RpcRequest<'getBalance'> = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: ['11111111111111111111111111111112' as any],
      };

      expect(request.jsonrpc).toBe('2.0');
      expect(request.method).toBe('getBalance');
      expectTypeOf(request.params).toMatchTypeOf<RpcMethodParams<'getBalance'>>();
    });
  });

  describe('RpcResponseSuccess Type', () => {
    it('should create type-safe success response', () => {
      const response: RpcResponseSuccess<'getHealth'> = {
        jsonrpc: '2.0',
        id: 1,
        result: 'ok',
      };

      expect(response.result).toBe('ok');
      expectTypeOf(response.result).toMatchTypeOf<RpcMethodReturn<'getHealth'>>();
    });
  });

  describe('RpcResponseError Type', () => {
    it('should create error response structure', () => {
      const errorResponse: RpcResponseError = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: RpcErrorCode.InvalidParams,
          message: 'Invalid parameters',
          data: { details: 'Address is invalid' },
        },
      };

      expect(errorResponse.error.code).toBe(RpcErrorCode.InvalidParams);
      expect(errorResponse.error.message).toBe('Invalid parameters');
    });
  });

  describe('RpcErrorCode Enum', () => {
    it('should have standard JSON-RPC error codes', () => {
      expect(RpcErrorCode.ParseError).toBe(-32700);
      expect(RpcErrorCode.InvalidRequest).toBe(-32600);
      expect(RpcErrorCode.MethodNotFound).toBe(-32601);
      expect(RpcErrorCode.InvalidParams).toBe(-32602);
      expect(RpcErrorCode.InternalError).toBe(-32603);
      expect(RpcErrorCode.ServerError).toBe(-32000);
    });
  });

  describe('Response Type Guards', () => {
    it('should identify success responses', () => {
      const successResponse: RpcResponseEnvelope<'getHealth'> = {
        jsonrpc: '2.0',
        id: 1,
        result: 'ok',
      };

      const errorResponse: RpcResponseEnvelope<'getHealth'> = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32600,
          message: 'Invalid request',
        },
      };

      expect(isRpcSuccess(successResponse)).toBe(true);
      expect(isRpcSuccess(errorResponse)).toBe(false);
      expect(isRpcError(successResponse)).toBe(false);
      expect(isRpcError(errorResponse)).toBe(true);
    });
  });

  describe('extractRpcResult', () => {
    it('should extract result from success response', () => {
      const successResponse: RpcResponseEnvelope<'getHealth'> = {
        jsonrpc: '2.0',
        id: 1,
        result: 'ok',
      };

      const result = extractRpcResult(successResponse);
      expect(result).toBe('ok');
    });

    it('should throw on error response', () => {
      const errorResponse: RpcResponseEnvelope<'getHealth'> = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32600,
          message: 'Invalid request',
        },
      };

      expect(() => extractRpcResult(errorResponse)).toThrow('RPC Error -32600: Invalid request');
    });
  });

  describe('isValidRpcMethod', () => {
    it('should validate RPC method names', () => {
      expect(isValidRpcMethod('getAccountInfo')).toBe(true);
      expect(isValidRpcMethod('getBalance')).toBe(true);
      expect(isValidRpcMethod('sendTransaction')).toBe(true);
      expect(isValidRpcMethod('invalidMethod')).toBe(false);
      expect(isValidRpcMethod('')).toBe(false);
    });
  });

  describe('createMethodName', () => {
    it('should create type-safe method names', () => {
      const method = createMethodName('getAccountInfo');
      expect(method).toBe('getAccountInfo');
      expectTypeOf(method).toMatchTypeOf<'getAccountInfo'>();
    });

    it('should throw for invalid method names', () => {
      expect(() => createMethodName('invalidMethod' as any)).toThrow(
        'Invalid RPC method: invalidMethod',
      );
    });
  });

  describe('RpcParamsBuilder', () => {
    it('should build type-safe RPC requests', () => {
      const builder = new RpcParamsBuilder('getBalance');
      const request = builder
        .setParams('11111111111111111111111111111112' as any, { commitment: 'finalized' })
        .build(123);

      expect(request.jsonrpc).toBe('2.0');
      expect(request.id).toBe(123);
      expect(request.method).toBe('getBalance');
      expect(request.params).toHaveLength(2);
    });
  });

  describe('paramsBuilder Helper', () => {
    it('should create parameter builders', () => {
      const builder = paramsBuilder('getAccountInfo');
      const request = builder.setParams('11111111111111111111111111111112' as any).build();

      expect(request.method).toBe('getAccountInfo');
      expect(request.id).toBe(1); // Default ID
    });
  });

  describe('getMethodMetadata', () => {
    it('should return method metadata', () => {
      const metadata = getMethodMetadata('getRecentBlockhash');

      expect(metadata.name).toBe('getRecentBlockhash');
      expect(metadata.isDeprecated).toBe(true);
      expectTypeOf(metadata.paramCount).toMatchTypeOf<number>();
      expectTypeOf(metadata.hasConfig).toMatchTypeOf<boolean>();
    });

    it('should identify non-deprecated methods', () => {
      const metadata = getMethodMetadata('getLatestBlockhash');
      expect(metadata.isDeprecated).toBe(false);
    });
  });

  describe('RpcClient Type', () => {
    it('should transform API interface to callable client', () => {
      expectTypeOf<RpcClient>().toHaveProperty('getAccountInfo');
      expectTypeOf<RpcClient>().toHaveProperty('getBalance');
      expectTypeOf<RpcClient>().toHaveProperty('sendTransaction');

      expectTypeOf<RpcClient['getAccountInfo']>().toBeFunction();
      expectTypeOf<RpcClient['getBalance']>().toBeFunction();
    });
  });

  describe('Batch Request Types', () => {
    it('should support batch requests', () => {
      type BatchRequest = [
        RpcRequest<'getAccountInfo'>,
        RpcRequest<'getBalance'>,
        RpcRequest<'getSlot'>,
      ];

      const batch: BatchRequest = [
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'getAccountInfo',
          params: ['11111111111111111111111111111112' as any],
        },
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'getBalance',
          params: ['11111111111111111111111111111112' as any],
        },
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'getSlot',
          params: [],
        },
      ];

      expect(batch).toHaveLength(3);
      expect(batch[0].method).toBe('getAccountInfo');
      expect(batch[1].method).toBe('getBalance');
      expect(batch[2].method).toBe('getSlot');
    });
  });
});
