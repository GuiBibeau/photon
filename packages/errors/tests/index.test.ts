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
      // Original error codes
      INVALID_KEYPAIR: 'INVALID_KEYPAIR',
      INVALID_ADDRESS: 'INVALID_ADDRESS',
      RPC_ERROR: 'RPC_ERROR',
      TRANSACTION_FAILED: 'TRANSACTION_FAILED',
      INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',

      // RPC-specific error codes
      RPC_PARSE_ERROR: 'RPC_PARSE_ERROR',
      RPC_INVALID_REQUEST: 'RPC_INVALID_REQUEST',
      RPC_METHOD_NOT_FOUND: 'RPC_METHOD_NOT_FOUND',
      RPC_INVALID_PARAMS: 'RPC_INVALID_PARAMS',
      RPC_INTERNAL_ERROR: 'RPC_INTERNAL_ERROR',
      RPC_SERVER_ERROR: 'RPC_SERVER_ERROR',
      RPC_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE:
        'RPC_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE',
      RPC_BLOCKHASH_NOT_FOUND: 'RPC_BLOCKHASH_NOT_FOUND',
      RPC_SLOT_SKIPPED: 'RPC_SLOT_SKIPPED',
      RPC_NO_HEALTHY_CONNECTION: 'RPC_NO_HEALTHY_CONNECTION',

      // Validation error codes
      INVALID_SIGNATURE: 'INVALID_SIGNATURE',
      INVALID_SIGNATURE_LENGTH: 'INVALID_SIGNATURE_LENGTH',
      INVALID_ADDRESS_LENGTH: 'INVALID_ADDRESS_LENGTH',
      INVALID_ADDRESS_FORMAT: 'INVALID_ADDRESS_FORMAT',
      TRANSACTION_TOO_LARGE: 'TRANSACTION_TOO_LARGE',
      INSUFFICIENT_SIGNATURES: 'INSUFFICIENT_SIGNATURES',
      DUPLICATE_SIGNATURE: 'DUPLICATE_SIGNATURE',
      INVALID_ACCOUNT_INDEX: 'INVALID_ACCOUNT_INDEX',
      INVALID_INSTRUCTION_DATA: 'INVALID_INSTRUCTION_DATA',

      // Network and connection errors
      NETWORK_ERROR: 'NETWORK_ERROR',
      TIMEOUT_ERROR: 'TIMEOUT_ERROR',
      CONNECTION_ERROR: 'CONNECTION_ERROR',

      // Transaction simulation and enhancement errors
      SIMULATION_FAILED: 'SIMULATION_FAILED',
      PREFLIGHT_FAILURE: 'PREFLIGHT_FAILURE',
      ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
      PROGRAM_ERROR: 'PROGRAM_ERROR',

      // Cryptographic errors
      CRYPTO_NOT_SUPPORTED: 'CRYPTO_NOT_SUPPORTED',
      KEY_GENERATION_FAILED: 'KEY_GENERATION_FAILED',
      INVALID_KEY_OPTIONS: 'INVALID_KEY_OPTIONS',
      KEY_EXTRACTION_FAILED: 'KEY_EXTRACTION_FAILED',
      INVALID_KEY_TYPE: 'INVALID_KEY_TYPE',
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

  describe('Error Code Mapping Accuracy', () => {
    it('should have consistent error code values', () => {
      // Verify that each error code maps to itself
      Object.entries(SolanaErrorCodes).forEach(([key, value]) => {
        expect(value).toBe(key);
      });
    });

    it('should support all error codes for SolanaError construction', () => {
      // Test that all error codes can be used to create SolanaError instances
      Object.values(SolanaErrorCodes).forEach((code) => {
        const error = new SolanaError(code);
        expect(error.code).toBe(code);
        expect(error.message).toBeTruthy();
        expect(error.message.length).toBeGreaterThan(0);
      });
    });

    it('should categorize error codes correctly', () => {
      const originalCodes = [
        'INVALID_KEYPAIR',
        'INVALID_ADDRESS',
        'RPC_ERROR',
        'TRANSACTION_FAILED',
        'INSUFFICIENT_BALANCE',
      ];

      const rpcCodes = [
        'RPC_PARSE_ERROR',
        'RPC_INVALID_REQUEST',
        'RPC_METHOD_NOT_FOUND',
        'RPC_INVALID_PARAMS',
        'RPC_INTERNAL_ERROR',
        'RPC_SERVER_ERROR',
        'RPC_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE',
        'RPC_BLOCKHASH_NOT_FOUND',
        'RPC_SLOT_SKIPPED',
        'RPC_NO_HEALTHY_CONNECTION',
      ];

      const validationCodes = [
        'INVALID_SIGNATURE',
        'INVALID_SIGNATURE_LENGTH',
        'INVALID_ADDRESS_LENGTH',
        'INVALID_ADDRESS_FORMAT',
        'TRANSACTION_TOO_LARGE',
        'INSUFFICIENT_SIGNATURES',
        'DUPLICATE_SIGNATURE',
        'INVALID_ACCOUNT_INDEX',
        'INVALID_INSTRUCTION_DATA',
      ];

      const networkCodes = ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'CONNECTION_ERROR'];

      const simulationCodes = [
        'SIMULATION_FAILED',
        'PREFLIGHT_FAILURE',
        'ACCOUNT_NOT_FOUND',
        'PROGRAM_ERROR',
      ];

      const cryptoCodes = [
        'CRYPTO_NOT_SUPPORTED',
        'KEY_GENERATION_FAILED',
        'INVALID_KEY_OPTIONS',
        'KEY_EXTRACTION_FAILED',
        'INVALID_KEY_TYPE',
      ];

      // Verify all codes are accounted for
      const allExpectedCodes = [
        ...originalCodes,
        ...rpcCodes,
        ...validationCodes,
        ...networkCodes,
        ...simulationCodes,
        ...cryptoCodes,
      ];

      const actualCodes = Object.keys(SolanaErrorCodes);
      expect(actualCodes.sort()).toEqual(allExpectedCodes.sort());
    });

    it('should generate appropriate error messages for each code category', () => {
      // Test RPC errors contain appropriate terms in message
      const rpcCodes = Object.keys(SolanaErrorCodes).filter((code) => code.startsWith('RPC_'));
      rpcCodes.forEach((code) => {
        const error = new SolanaError(code as any);
        expect(error.message.toLowerCase()).toMatch(
          /rpc|request|server|internal|parse|method|param|transaction|blockhash|slot|connection|precompile|verification/,
        );
      });

      // Test validation errors are descriptive
      const validationCodes = [
        'INVALID_SIGNATURE',
        'INVALID_ADDRESS',
        'TRANSACTION_TOO_LARGE',
        'INSUFFICIENT_SIGNATURES',
      ];
      validationCodes.forEach((code) => {
        const error = new SolanaError(code as any);
        expect(error.message.toLowerCase()).toMatch(
          /invalid|insufficient|signature|address|transaction|large/,
        );
      });

      // Test network errors mention network/connection
      const networkCodes = ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'CONNECTION_ERROR'];
      networkCodes.forEach((code) => {
        const error = new SolanaError(code as any);
        expect(error.message.toLowerCase()).toMatch(/network|timeout|connection/);
      });
    });
  });
});
