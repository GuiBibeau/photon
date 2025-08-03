import { describe, it, expect } from 'vitest';
import { SolanaErrorFactory } from '../src/factories';
import { SolanaError } from '../src/error';

describe('SolanaErrorFactory', () => {
  describe('invalidAddress', () => {
    it('should create an invalid address error', () => {
      const address = 'invalid-address-123';
      const error = SolanaErrorFactory.invalidAddress(address);

      expect(error).toBeInstanceOf(SolanaError);
      expect(error.code).toBe('INVALID_ADDRESS');
      expect(error.context).toEqual({ address });
      expect(error.message).toBe('The provided address is invalid: invalid-address-123');
    });
  });

  describe('rpcError', () => {
    it('should create an RPC error with method and details', () => {
      const method = 'getAccountInfo';
      const details = 'Network timeout';
      const error = SolanaErrorFactory.rpcError(method, details);

      expect(error).toBeInstanceOf(SolanaError);
      expect(error.code).toBe('RPC_ERROR');
      expect(error.context).toEqual({ method, details });
      expect(error.message).toBe(
        'RPC error occurred while calling getAccountInfo: Network timeout',
      );
    });

    it('should create an RPC error with method only', () => {
      const method = 'sendTransaction';
      const error = SolanaErrorFactory.rpcError(method);

      expect(error).toBeInstanceOf(SolanaError);
      expect(error.code).toBe('RPC_ERROR');
      expect(error.context).toEqual({ method, details: undefined });
      expect(error.message).toBe('RPC error occurred while calling sendTransaction');
    });
  });

  describe('invalidKeypair', () => {
    it('should create an invalid keypair error', () => {
      const error = SolanaErrorFactory.invalidKeypair();

      expect(error).toBeInstanceOf(SolanaError);
      expect(error.code).toBe('INVALID_KEYPAIR');
      expect(error.context).toBeUndefined();
      expect(error.message).toBe('The provided keypair is invalid.');
    });
  });

  describe('transactionFailed', () => {
    it('should create a transaction failed error with signature', () => {
      const signature = 'tx123signature';
      const error = SolanaErrorFactory.transactionFailed(signature);

      expect(error).toBeInstanceOf(SolanaError);
      expect(error.code).toBe('TRANSACTION_FAILED');
      expect(error.context).toEqual({ transactionSignature: signature });
      expect(error.message).toBe('Transaction failed with signature: tx123signature');
    });

    it('should create a transaction failed error without signature', () => {
      const error = SolanaErrorFactory.transactionFailed();

      expect(error).toBeInstanceOf(SolanaError);
      expect(error.code).toBe('TRANSACTION_FAILED');
      expect(error.context).toEqual({ transactionSignature: undefined });
      expect(error.message).toBe('Transaction failed.');
    });
  });

  describe('insufficientBalance', () => {
    it('should create an insufficient balance error with all details', () => {
      const address = 'account123';
      const requiredAmount = '1000';
      const currentAmount = '500';
      const error = SolanaErrorFactory.insufficientBalance(address, requiredAmount, currentAmount);

      expect(error).toBeInstanceOf(SolanaError);
      expect(error.code).toBe('INSUFFICIENT_BALANCE');
      expect(error.context).toEqual({
        address,
        requiredAmount,
        currentAmount,
      });
      expect(error.message).toBe(
        'Insufficient balance for account account123. Required: 1000, Current: 500',
      );
    });

    it('should create an insufficient balance error with address only', () => {
      const address = 'account123';
      const error = SolanaErrorFactory.insufficientBalance(address);

      expect(error).toBeInstanceOf(SolanaError);
      expect(error.code).toBe('INSUFFICIENT_BALANCE');
      expect(error.context).toEqual({
        address,
        requiredAmount: undefined,
        currentAmount: undefined,
      });
      expect(error.message).toBe('Insufficient balance for account account123');
    });
  });
});
