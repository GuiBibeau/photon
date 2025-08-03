import { describe, it, expect } from 'vitest';
import { SolanaError } from '../src/error';

describe('SolanaError', () => {
  describe('construction', () => {
    it('should create an error with code and message', () => {
      const error = new SolanaError('INVALID_KEYPAIR');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SolanaError);
      expect(error.code).toBe('INVALID_KEYPAIR');
      expect(error.message).toBe('The provided keypair is invalid.');
      expect(error.name).toBe('SolanaError');
    });

    it('should create an error with code, message, and context', () => {
      const context = { address: 'invalid-address' };
      const error = new SolanaError('INVALID_ADDRESS', context);

      expect(error.code).toBe('INVALID_ADDRESS');
      expect(error.context).toEqual(context);
      expect(error.message).toBe('The provided address is invalid: invalid-address');
    });

    it('should create an error with cause', () => {
      const cause = new Error('Original error');
      const error = new SolanaError('RPC_ERROR', { method: 'getAccountInfo' }, cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const context = { address: 'test-address' };
      const error = new SolanaError('INVALID_ADDRESS', context);
      const json = error.toJSON();

      expect(json).toEqual({
        code: 'INVALID_ADDRESS',
        context,
        message: 'The provided address is invalid: test-address',
        name: 'SolanaError',
        stack: expect.any(String),
      });
    });

    it('should serialize complex nested contexts', () => {
      const complexContext = {
        transaction: {
          signature: 'abc123',
          accounts: ['addr1', 'addr2', 'addr3'],
          instructions: [
            { programId: 'prog1', data: [1, 2, 3] },
            { programId: 'prog2', data: [4, 5, 6] },
          ],
        },
        simulation: {
          logs: ['log1', 'log2'],
          unitsConsumed: 5000,
          accounts: {
            addr1: { lamports: 1000000, owner: 'system' },
            addr2: { lamports: 2000000, owner: 'token' },
          },
        },
        metadata: {
          timestamp: new Date('2023-01-01T00:00:00Z'),
          version: '1.0.0',
        },
      };

      const error = new SolanaError('SIMULATION_FAILED', complexContext);
      const json = error.toJSON();

      expect(json.context).toEqual(complexContext);
      expect(json.code).toBe('SIMULATION_FAILED');
      expect(json.message).toContain('Transaction simulation failed');
    });

    it('should handle circular references in context', () => {
      const circularContext: any = { name: 'test' };
      circularContext.self = circularContext; // Create circular reference

      const error = new SolanaError('INVALID_KEYPAIR', circularContext);

      // Should not throw when serializing with circular reference
      expect(() => error.toJSON()).not.toThrow();

      const json = error.toJSON();
      expect(json.code).toBe('INVALID_KEYPAIR');
      expect(json.context).toBeDefined();
    });

    it('should serialize errors with cause chain', () => {
      const rootCause = new Error('Root error');
      const intermediateCause = new SolanaError(
        'NETWORK_ERROR',
        { details: 'Connection lost' },
        rootCause,
      );
      const finalError = new SolanaError(
        'RPC_ERROR',
        { method: 'getAccountInfo' },
        intermediateCause,
      );

      const json = finalError.toJSON();

      expect(json.code).toBe('RPC_ERROR');
      expect(json.context).toEqual({ method: 'getAccountInfo' });
      expect(json.stack).toBeDefined();
      // The cause should be the intermediate error
      expect(finalError.cause).toBe(intermediateCause);
    });

    it('should serialize large context objects without truncation', () => {
      const largeContext = {
        accounts: Array.from({ length: 100 }, (_, i) => `account_${i}`),
        logs: Array.from({ length: 200 }, (_, i) => `Program log: Message ${i}`),
        data: Array.from({ length: 1000 }, (_, i) => i),
        metadata: Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [`key_${i}`, `value_${i}`]),
        ),
      };

      const error = new SolanaError('PREFLIGHT_FAILURE', largeContext);
      const json = error.toJSON();

      expect(json.context).toEqual(largeContext);
      expect(json.context.accounts).toHaveLength(100);
      expect(json.context.logs).toHaveLength(200);
      expect(json.context.data).toHaveLength(1000);
      expect(Object.keys(json.context.metadata)).toHaveLength(50);
    });

    it('should handle undefined and null values in context', () => {
      const contextWithNulls = {
        address: 'test',
        signature: null,
        metadata: undefined,
        details: '',
        count: 0,
        flag: false,
      };

      const error = new SolanaError('TRANSACTION_FAILED', contextWithNulls);
      const json = error.toJSON();

      expect(json.context).toEqual(contextWithNulls);
      expect(json.context.signature).toBeNull();
      expect(json.context.metadata).toBeUndefined();
      expect(json.context.details).toBe('');
      expect(json.context.count).toBe(0);
      expect(json.context.flag).toBe(false);
    });

    it('should serialize and be deserializable via JSON.parse', () => {
      const context = {
        address: 'test-address',
        amount: 1000,
        timestamp: '2023-01-01T00:00:00Z',
      };

      const error = new SolanaError('INSUFFICIENT_BALANCE', context);
      const serialized = JSON.stringify(error.toJSON());
      const deserialized = JSON.parse(serialized);

      expect(deserialized.code).toBe('INSUFFICIENT_BALANCE');
      expect(deserialized.context).toEqual(context);
      expect(deserialized.message).toBe(error.message);
      expect(deserialized.name).toBe('SolanaError');
      expect(typeof deserialized.stack).toBe('string');
    });
  });

  describe('stack trace', () => {
    it('should preserve stack trace', () => {
      const error = new SolanaError('INVALID_KEYPAIR');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('SolanaError');
    });

    it('should preserve stack trace through error chains', () => {
      function createChainedError() {
        const originalError = new Error('Original network error');
        const networkError = new SolanaError(
          'NETWORK_ERROR',
          { details: 'Connection failed' },
          originalError,
        );
        const rpcError = new SolanaError('RPC_ERROR', { method: 'getAccountInfo' }, networkError);
        return rpcError;
      }

      const chainedError = createChainedError();

      // Root error should have its stack
      expect(chainedError.stack).toBeDefined();
      expect(chainedError.stack).toContain('SolanaError');
      expect(chainedError.stack).toContain('createChainedError');

      // Cause should also have its stack
      expect(chainedError.cause).toBeInstanceOf(SolanaError);
      expect((chainedError.cause as SolanaError).stack).toBeDefined();
      expect((chainedError.cause as SolanaError).stack).toContain('SolanaError');

      // Original cause should have its stack
      const networkError = chainedError.cause as SolanaError;
      expect(networkError.cause).toBeInstanceOf(Error);
      expect((networkError.cause as Error).stack).toBeDefined();
      expect((networkError.cause as Error).stack).toContain('Original network error');
    });

    it('should maintain unique stack traces for each error in chain', () => {
      function level1() {
        return new Error('Level 1 error');
      }

      function level2() {
        const cause = level1();
        return new SolanaError('NETWORK_ERROR', { level: 2 }, cause);
      }

      function level3() {
        const cause = level2();
        return new SolanaError('RPC_ERROR', { level: 3 }, cause);
      }

      const topError = level3();

      // Each error should have its own stack trace
      expect(topError.stack).toContain('level3');
      expect((topError.cause as SolanaError).stack).toContain('level2');
      expect(((topError.cause as SolanaError).cause as Error).stack).toContain('level1');

      // Stack traces should be different
      expect(topError.stack).not.toBe((topError.cause as SolanaError).stack);
      expect((topError.cause as SolanaError).stack).not.toBe(
        ((topError.cause as SolanaError).cause as Error).stack,
      );
    });

    it('should preserve stack trace with wrapped errors', () => {
      function createWrappedError() {
        try {
          throw new Error('Original failure');
        } catch (originalError) {
          throw new SolanaError(
            'TRANSACTION_FAILED',
            {
              reason: 'Wrapped error',
            },
            originalError as Error,
          );
        }
      }

      expect(() => createWrappedError()).toThrow(SolanaError);

      try {
        createWrappedError();
      } catch (error) {
        const solanaError = error as SolanaError;

        // Should have stack pointing to where it was thrown
        expect(solanaError.stack).toBeDefined();
        expect(solanaError.stack).toContain('createWrappedError');

        // Cause should have its own stack
        expect(solanaError.cause).toBeInstanceOf(Error);
        expect((solanaError.cause as Error).stack).toBeDefined();
        expect((solanaError.cause as Error).stack).toContain('Original failure');
      }
    });

    it('should include function names in stack trace', () => {
      function specificFunctionName() {
        return new SolanaError('INVALID_ADDRESS', { address: 'test' });
      }

      const error = specificFunctionName();

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('specificFunctionName');
    });

    it('should handle async function stack traces', async () => {
      async function asyncErrorFunction() {
        await new Promise((resolve) => setTimeout(resolve, 1));
        throw new SolanaError('TIMEOUT_ERROR', { duration: 1000 });
      }

      try {
        await asyncErrorFunction();
      } catch (error) {
        const solanaError = error as SolanaError;
        expect(solanaError.stack).toBeDefined();
        expect(solanaError.stack).toContain('SolanaError');
        // Note: async stack traces may not always contain function names in all environments
      }
    });
  });

  describe('error messages', () => {
    it('should generate correct message for INVALID_KEYPAIR', () => {
      const error = new SolanaError('INVALID_KEYPAIR');
      expect(error.message).toBe('The provided keypair is invalid.');
    });

    it('should generate correct message for INVALID_ADDRESS with context', () => {
      const error = new SolanaError('INVALID_ADDRESS', { address: 'test123' });
      expect(error.message).toBe('The provided address is invalid: test123');
    });

    it('should generate correct message for INVALID_ADDRESS without context', () => {
      const error = new SolanaError('INVALID_ADDRESS');
      expect(error.message).toBe('The provided address is invalid.');
    });

    it('should generate correct message for RPC_ERROR with method and details', () => {
      const error = new SolanaError('RPC_ERROR', {
        method: 'getAccountInfo',
        details: 'Network timeout',
      });
      expect(error.message).toBe(
        'RPC error occurred while calling getAccountInfo: Network timeout',
      );
    });

    it('should generate correct message for RPC_ERROR with method only', () => {
      const error = new SolanaError('RPC_ERROR', { method: 'getAccountInfo' });
      expect(error.message).toBe('RPC error occurred while calling getAccountInfo');
    });

    it('should generate correct message for RPC_ERROR without context', () => {
      const error = new SolanaError('RPC_ERROR');
      expect(error.message).toBe('An RPC error occurred.');
    });

    it('should generate correct message for TRANSACTION_FAILED with signature', () => {
      const error = new SolanaError('TRANSACTION_FAILED', { transactionSignature: 'sig123' });
      expect(error.message).toBe('Transaction failed with signature: sig123');
    });

    it('should generate correct message for TRANSACTION_FAILED without signature', () => {
      const error = new SolanaError('TRANSACTION_FAILED');
      expect(error.message).toBe('Transaction failed.');
    });

    it('should generate correct message for INSUFFICIENT_BALANCE with all details', () => {
      const error = new SolanaError('INSUFFICIENT_BALANCE', {
        address: 'test-address',
        requiredAmount: '1000',
        currentAmount: '500',
      });
      expect(error.message).toBe(
        'Insufficient balance for account test-address. Required: 1000, Current: 500',
      );
    });

    it('should generate correct message for INSUFFICIENT_BALANCE with address only', () => {
      const error = new SolanaError('INSUFFICIENT_BALANCE', { address: 'test-address' });
      expect(error.message).toBe('Insufficient balance for account test-address');
    });

    it('should generate correct message for INSUFFICIENT_BALANCE without context', () => {
      const error = new SolanaError('INSUFFICIENT_BALANCE');
      expect(error.message).toBe('Insufficient balance.');
    });

    it('should generate correct message for unknown error', () => {
      const error = new SolanaError('UNKNOWN_ERROR' as any);
      expect(error.message).toBe('An unknown error occurred.');
    });

    it('should generate correct message for RPC_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE', () => {
      const error = new SolanaError('RPC_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE');
      expect(error.message).toBe('Transaction precompile verification failed.');
    });

    it('should generate correct message for RPC_BLOCKHASH_NOT_FOUND with blockhash', () => {
      const error = new SolanaError('RPC_BLOCKHASH_NOT_FOUND', { blockhash: 'test-blockhash' });
      expect(error.message).toBe('Blockhash not found: test-blockhash');
    });

    it('should generate correct message for RPC_BLOCKHASH_NOT_FOUND without blockhash', () => {
      const error = new SolanaError('RPC_BLOCKHASH_NOT_FOUND');
      expect(error.message).toBe('Blockhash not found: Unknown blockhash');
    });

    it('should generate correct message for RPC_SLOT_SKIPPED with slot', () => {
      const error = new SolanaError('RPC_SLOT_SKIPPED', { slot: 12345 });
      expect(error.message).toBe('Slot was skipped: 12345');
    });

    it('should generate correct message for RPC_SLOT_SKIPPED without slot', () => {
      const error = new SolanaError('RPC_SLOT_SKIPPED');
      expect(error.message).toBe('Slot was skipped: Unknown slot');
    });

    it('should generate correct message for RPC_NO_HEALTHY_CONNECTION', () => {
      const error = new SolanaError('RPC_NO_HEALTHY_CONNECTION');
      expect(error.message).toBe('No healthy RPC connection available.');
    });
  });
});
