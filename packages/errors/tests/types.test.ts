import { describe, it, expect, expectTypeOf } from 'vitest';
import { SolanaError, SolanaErrorCodes, type SolanaErrorCode } from '../src/index';

describe('TypeScript Type Inference Tests', () => {
  describe('SolanaErrorCode type', () => {
    it('should infer correct type for error codes', () => {
      // Test that SolanaErrorCode is properly typed
      expectTypeOf<SolanaErrorCode>().toEqualTypeOf<
        | 'INVALID_KEYPAIR'
        | 'INVALID_ADDRESS'
        | 'RPC_ERROR'
        | 'TRANSACTION_FAILED'
        | 'INSUFFICIENT_BALANCE'
        | 'RPC_PARSE_ERROR'
        | 'RPC_INVALID_REQUEST'
        | 'RPC_METHOD_NOT_FOUND'
        | 'RPC_INVALID_PARAMS'
        | 'RPC_INTERNAL_ERROR'
        | 'RPC_SERVER_ERROR'
        | 'RPC_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE'
        | 'RPC_BLOCKHASH_NOT_FOUND'
        | 'RPC_SLOT_SKIPPED'
        | 'RPC_NO_HEALTHY_CONNECTION'
        | 'INVALID_SIGNATURE'
        | 'INVALID_SIGNATURE_LENGTH'
        | 'INVALID_ADDRESS_LENGTH'
        | 'INVALID_ADDRESS_FORMAT'
        | 'TRANSACTION_TOO_LARGE'
        | 'INSUFFICIENT_SIGNATURES'
        | 'DUPLICATE_SIGNATURE'
        | 'INVALID_ACCOUNT_INDEX'
        | 'INVALID_INSTRUCTION_DATA'
        | 'NETWORK_ERROR'
        | 'TIMEOUT_ERROR'
        | 'CONNECTION_ERROR'
        | 'SIMULATION_FAILED'
        | 'PREFLIGHT_FAILURE'
        | 'ACCOUNT_NOT_FOUND'
        | 'PROGRAM_ERROR'
      >();
    });

    it('should only accept valid error codes', () => {
      // These should compile (valid codes)
      const validCode1: SolanaErrorCode = 'INVALID_KEYPAIR';
      const validCode2: SolanaErrorCode = 'RPC_ERROR';
      const validCode3: SolanaErrorCode = 'NETWORK_ERROR';

      expect(validCode1).toBe('INVALID_KEYPAIR');
      expect(validCode2).toBe('RPC_ERROR');
      expect(validCode3).toBe('NETWORK_ERROR');

      // Test that SolanaErrorCodes values are properly typed
      expectTypeOf(SolanaErrorCodes.INVALID_KEYPAIR).toEqualTypeOf<'INVALID_KEYPAIR'>();
      expectTypeOf(SolanaErrorCodes.RPC_ERROR).toEqualTypeOf<'RPC_ERROR'>();
      expectTypeOf(SolanaErrorCodes.NETWORK_ERROR).toEqualTypeOf<'NETWORK_ERROR'>();
    });
  });

  describe('SolanaError constructor type safety', () => {
    it('should accept valid error codes', () => {
      // These should all compile and work
      const error1 = new SolanaError('INVALID_KEYPAIR');
      const error2 = new SolanaError('RPC_ERROR');
      const error3 = new SolanaError(SolanaErrorCodes.INVALID_ADDRESS);

      expect(error1.code).toBe('INVALID_KEYPAIR');
      expect(error2.code).toBe('RPC_ERROR');
      expect(error3.code).toBe('INVALID_ADDRESS');

      // Test type inference for the code property
      expectTypeOf(error1.code).toEqualTypeOf<SolanaErrorCode>();
      expectTypeOf(error2.code).toEqualTypeOf<SolanaErrorCode>();
      expectTypeOf(error3.code).toEqualTypeOf<SolanaErrorCode>();
    });

    it('should properly type the context parameter', () => {
      // Test context typing with different error codes
      const addressError = new SolanaError('INVALID_ADDRESS', { address: 'test123' });
      const rpcError = new SolanaError('RPC_ERROR', {
        method: 'getAccountInfo',
        details: 'timeout',
      });
      const balanceError = new SolanaError('INSUFFICIENT_BALANCE', {
        address: 'addr',
        requiredAmount: '1000',
        currentAmount: '500',
      });

      expect(addressError.context?.address).toBe('test123');
      expect(rpcError.context?.method).toBe('getAccountInfo');
      expect(balanceError.context?.requiredAmount).toBe('1000');

      // Context should be typed as Record<string, any> | undefined
      expectTypeOf(addressError.context).toEqualTypeOf<Record<string, any> | undefined>();
      expectTypeOf(rpcError.context).toEqualTypeOf<Record<string, any> | undefined>();
      expectTypeOf(balanceError.context).toEqualTypeOf<Record<string, any> | undefined>();
    });

    it('should properly type the cause parameter', () => {
      const originalError = new Error('Original error');
      const wrappedError = new SolanaError(
        'NETWORK_ERROR',
        { details: 'connection failed' },
        originalError,
      );

      expect(wrappedError.cause).toBe(originalError);
      expectTypeOf(wrappedError.cause).toEqualTypeOf<Error | undefined>();
    });
  });

  describe('SolanaErrorCodes const assertion', () => {
    it('should maintain readonly properties', () => {
      // Test that SolanaErrorCodes is readonly
      expectTypeOf(SolanaErrorCodes).toMatchTypeOf<Readonly<Record<string, string>>>();

      // Test specific properties are readonly
      expectTypeOf(SolanaErrorCodes.INVALID_KEYPAIR).toEqualTypeOf<'INVALID_KEYPAIR'>();
      expectTypeOf(SolanaErrorCodes.RPC_ERROR).toEqualTypeOf<'RPC_ERROR'>();
    });

    it('should provide correct key-value mapping', () => {
      // Test that keys and values match for type safety
      type ErrorCodeKeys = keyof typeof SolanaErrorCodes;
      type ErrorCodeValues = (typeof SolanaErrorCodes)[ErrorCodeKeys];

      expectTypeOf<ErrorCodeKeys>().toEqualTypeOf<SolanaErrorCode>();
      expectTypeOf<ErrorCodeValues>().toEqualTypeOf<SolanaErrorCode>();
    });
  });

  describe('Generic type constraints', () => {
    it('should work with generic functions accepting error codes', () => {
      // Function that accepts any valid error code
      function createTypedError<T extends SolanaErrorCode>(
        code: T,
        context?: Record<string, any>,
      ): SolanaError {
        return new SolanaError(code, context);
      }

      const error1 = createTypedError('INVALID_KEYPAIR');
      const error2 = createTypedError('RPC_ERROR', { method: 'test' });

      expect(error1.code).toBe('INVALID_KEYPAIR');
      expect(error2.code).toBe('RPC_ERROR');

      // Return type should be SolanaError
      expectTypeOf(error1).toEqualTypeOf<SolanaError>();
      expectTypeOf(error2).toEqualTypeOf<SolanaError>();
    });

    it('should work with error code filtering', () => {
      // Function that only accepts RPC error codes
      type RpcErrorCode = Extract<SolanaErrorCode, `RPC_${string}`>;

      function createRpcError(code: RpcErrorCode): SolanaError {
        return new SolanaError(code);
      }

      const rpcError = createRpcError('RPC_PARSE_ERROR');
      expect(rpcError.code).toBe('RPC_PARSE_ERROR');

      // Test that the type constraint works
      expectTypeOf<RpcErrorCode>().toMatchTypeOf<
        'RPC_PARSE_ERROR' | 'RPC_INVALID_REQUEST' | 'RPC_METHOD_NOT_FOUND'
      >();
    });
  });

  describe('Error message type consistency', () => {
    it('should always return string messages', () => {
      Object.values(SolanaErrorCodes).forEach((code) => {
        const error = new SolanaError(code);
        expect(typeof error.message).toBe('string');
        expectTypeOf(error.message).toEqualTypeOf<string>();
      });
    });

    it('should maintain Error interface compatibility', () => {
      const error = new SolanaError('INVALID_KEYPAIR');

      // Should be compatible with Error interface
      expectTypeOf(error).toMatchTypeOf<Error>();
      expectTypeOf(error.name).toEqualTypeOf<string>();
      expectTypeOf(error.message).toEqualTypeOf<string>();
      expectTypeOf(error.stack).toEqualTypeOf<string | undefined>();
    });
  });
});
