import { describe, it, expect } from 'vitest';
import { SolanaError, SolanaErrorCodes, SolanaErrorFactory } from '../src/index';

describe('Error Module Exports', () => {
  it('should export SolanaError correctly', () => {
    expect(typeof SolanaError).toBe('function');
    const error = new SolanaError('INVALID_KEYPAIR');
    expect(error).toBeInstanceOf(SolanaError);
    expect(error.code).toBe('INVALID_KEYPAIR');
  });

  it('should export SolanaErrorCodes correctly', () => {
    expect(SolanaErrorCodes).toEqual({
      INVALID_KEYPAIR: 'INVALID_KEYPAIR',
      INVALID_ADDRESS: 'INVALID_ADDRESS',
      RPC_ERROR: 'RPC_ERROR',
      TRANSACTION_FAILED: 'TRANSACTION_FAILED',
      INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
    });
  });

  it('should export SolanaErrorFactory correctly', () => {
    expect(typeof SolanaErrorFactory.invalidAddress).toBe('function');
    expect(typeof SolanaErrorFactory.rpcError).toBe('function');
    expect(typeof SolanaErrorFactory.invalidKeypair).toBe('function');
    expect(typeof SolanaErrorFactory.transactionFailed).toBe('function');
    expect(typeof SolanaErrorFactory.insufficientBalance).toBe('function');
  });

  it('should create errors using factory methods', () => {
    const addressError = SolanaErrorFactory.invalidAddress('test-address');
    expect(addressError.code).toBe('INVALID_ADDRESS');
    expect(addressError.context?.address).toBe('test-address');
  });
});
