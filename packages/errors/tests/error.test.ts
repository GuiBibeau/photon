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
  });

  describe('stack trace', () => {
    it('should preserve stack trace', () => {
      const error = new SolanaError('INVALID_KEYPAIR');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('SolanaError');
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
  });
});
