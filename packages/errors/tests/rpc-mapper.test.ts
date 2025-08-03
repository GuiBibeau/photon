import { describe, it, expect } from 'vitest';
import {
  mapRpcErrorCode,
  parseRpcError,
  parseRpcResponse,
  parseNetworkError,
  isJsonRpcError,
  type JsonRpcError,
} from '../src/rpc-mapper';
import { SolanaError } from '../src/error';

describe('RPC Mapper', () => {
  describe('mapRpcErrorCode', () => {
    it('should map standard JSON-RPC error codes', () => {
      expect(mapRpcErrorCode(-32700)).toBe('RPC_PARSE_ERROR');
      expect(mapRpcErrorCode(-32600)).toBe('RPC_INVALID_REQUEST');
      expect(mapRpcErrorCode(-32601)).toBe('RPC_METHOD_NOT_FOUND');
      expect(mapRpcErrorCode(-32602)).toBe('RPC_INVALID_PARAMS');
      expect(mapRpcErrorCode(-32603)).toBe('RPC_INTERNAL_ERROR');
    });

    it('should map Solana-specific RPC error codes', () => {
      expect(mapRpcErrorCode(-32001)).toBe('RPC_BLOCKHASH_NOT_FOUND');
      expect(mapRpcErrorCode(-32002)).toBe('RPC_SLOT_SKIPPED');
      expect(mapRpcErrorCode(-32003)).toBe('RPC_NO_HEALTHY_CONNECTION');
      expect(mapRpcErrorCode(-32004)).toBe('RPC_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE');
      expect(mapRpcErrorCode(-32000)).toBe('RPC_SERVER_ERROR');
    });

    it('should map server error range to RPC_SERVER_ERROR', () => {
      expect(mapRpcErrorCode(-32099)).toBe('RPC_SERVER_ERROR');
      expect(mapRpcErrorCode(-32050)).toBe('RPC_SERVER_ERROR');
      expect(mapRpcErrorCode(-32001)).toBe('RPC_BLOCKHASH_NOT_FOUND'); // Specific code takes precedence
    });

    it('should default to RPC_ERROR for unknown codes', () => {
      expect(mapRpcErrorCode(-40000)).toBe('RPC_ERROR');
      expect(mapRpcErrorCode(123)).toBe('RPC_ERROR');
      expect(mapRpcErrorCode(-100)).toBe('RPC_ERROR');
    });
  });

  describe('parseRpcError', () => {
    it('should create SolanaError from basic RPC error', () => {
      const rpcError: JsonRpcError = {
        code: -32602,
        message: 'Invalid params',
      };

      const error = parseRpcError(rpcError, 'getAccountInfo');

      expect(error).toBeInstanceOf(SolanaError);
      expect(error.code).toBe('RPC_INVALID_PARAMS');
      expect(error.context).toEqual({
        rpcCode: -32602,
        rpcMessage: 'Invalid params',
        method: 'getAccountInfo',
      });
    });

    it('should include Solana-specific error data', () => {
      const rpcError: JsonRpcError = {
        code: -32603,
        message: 'Internal error',
        data: {
          err: { InstructionError: [0, 'InvalidAccountData'] },
          logs: ['Program log: Error occurred', 'Program failed'],
          accounts: ['account1', 'account2'],
          unitsConsumed: 5000,
          returnData: {
            programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
            data: ['SGVsbG8gV29ybGQ=', 'base64'],
          },
        },
      };

      const error = parseRpcError(rpcError);

      expect(error.code).toBe('RPC_INTERNAL_ERROR');
      expect(error.context).toEqual({
        rpcCode: -32603,
        rpcMessage: 'Internal error',
        method: undefined,
        err: { InstructionError: [0, 'InvalidAccountData'] },
        logs: ['Program log: Error occurred', 'Program failed'],
        accounts: ['account1', 'account2'],
        unitsConsumed: 5000,
        returnData: {
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          data: ['SGVsbG8gV29ybGQ=', 'base64'],
        },
      });
    });

    it('should preserve original error as cause', () => {
      const originalError = new Error('Network timeout');
      const rpcError: JsonRpcError = {
        code: -32000,
        message: 'Server error',
      };

      const error = parseRpcError(rpcError, 'sendTransaction', originalError);

      expect(error.cause).toBe(originalError);
      expect(error.code).toBe('RPC_SERVER_ERROR');
    });

    it('should add method-specific context', () => {
      const rpcError: JsonRpcError = {
        code: -32601,
        message: 'Method not found',
      };

      const error = parseRpcError(rpcError, 'invalidMethod');

      expect(error.context?.method).toBe('invalidMethod');
    });
  });

  describe('parseRpcResponse', () => {
    it('should return result when no error', () => {
      const response = {
        jsonrpc: '2.0',
        id: 1,
        result: { value: 'success' },
      };

      const result = parseRpcResponse(response, 'getAccountInfo');

      expect(result).toEqual({ value: 'success' });
    });

    it('should throw SolanaError when error is present', () => {
      const response = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32602,
          message: 'Invalid params',
        },
      };

      expect(() => parseRpcResponse(response, 'getAccountInfo')).toThrow(SolanaError);
    });

    it('should throw when both result and error are missing', () => {
      const response = {
        jsonrpc: '2.0',
        id: 1,
      };

      expect(() => parseRpcResponse(response, 'getAccountInfo')).toThrow(SolanaError);

      try {
        parseRpcResponse(response, 'getAccountInfo');
      } catch (error) {
        expect(error).toBeInstanceOf(SolanaError);
        expect((error as SolanaError).code).toBe('RPC_INVALID_REQUEST');
      }
    });

    it('should handle null result', () => {
      const response = {
        jsonrpc: '2.0',
        id: 1,
        result: null,
      };

      const result = parseRpcResponse(response, 'getAccountInfo');

      expect(result).toBeNull();
    });
  });

  describe('parseNetworkError', () => {
    it('should create TIMEOUT_ERROR for AbortError', () => {
      const originalError = new Error('Request aborted');
      originalError.name = 'AbortError';

      const error = parseNetworkError(originalError, 'getAccountInfo');

      expect(error.code).toBe('TIMEOUT_ERROR');
      expect(error.context?.originalMessage).toBe('Request aborted');
      expect(error.context?.method).toBe('getAccountInfo');
      expect(error.cause).toBe(originalError);
    });

    it('should create CONNECTION_ERROR for fetch TypeError', () => {
      const originalError = new TypeError('Failed to fetch');

      const error = parseNetworkError(originalError, 'sendTransaction');

      expect(error.code).toBe('CONNECTION_ERROR');
      expect(error.context?.originalMessage).toBe('Failed to fetch');
      expect(error.context?.method).toBe('sendTransaction');
      expect(error.cause).toBe(originalError);
    });

    it('should create NETWORK_ERROR for other errors', () => {
      const originalError = new Error('Some network issue');

      const error = parseNetworkError(originalError);

      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.context?.originalMessage).toBe('Some network issue');
      expect(error.context?.method).toBeUndefined();
      expect(error.cause).toBe(originalError);
    });
  });

  describe('isJsonRpcError', () => {
    it('should return true for valid JSON-RPC error objects', () => {
      const validError = {
        code: -32600,
        message: 'Invalid request',
      };

      expect(isJsonRpcError(validError)).toBe(true);
    });

    it('should return true for JSON-RPC error with data', () => {
      const validError = {
        code: -32603,
        message: 'Internal error',
        data: { details: 'something' },
      };

      expect(isJsonRpcError(validError)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(isJsonRpcError(null)).toBe(false);
      expect(isJsonRpcError(undefined)).toBe(false);
      expect(isJsonRpcError('string')).toBe(false);
      expect(isJsonRpcError(123)).toBe(false);
      expect(isJsonRpcError({})).toBe(false);
      expect(isJsonRpcError({ code: 'string' })).toBe(false);
      expect(isJsonRpcError({ message: 'error' })).toBe(false);
      expect(isJsonRpcError({ code: 123 })).toBe(false);
    });
  });
});
