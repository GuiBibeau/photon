import { describe, it, expect } from 'vitest';
import {
  getErrorRecovery,
  getErrorSuggestions,
  formatErrorRecovery,
  hasRecoverySuggestions,
  ERROR_RECOVERY_MAP,
} from '../src/recovery';
import { SolanaError } from '../src/error';

describe('Error Recovery', () => {
  describe('ERROR_RECOVERY_MAP', () => {
    it('should contain recovery information for all supported error codes', () => {
      // Test a few key error codes to ensure the map is properly structured
      expect(ERROR_RECOVERY_MAP.INVALID_ADDRESS).toBeDefined();
      expect(ERROR_RECOVERY_MAP.RPC_ERROR).toBeDefined();
      expect(ERROR_RECOVERY_MAP.TRANSACTION_FAILED).toBeDefined();
      expect(ERROR_RECOVERY_MAP.INSUFFICIENT_BALANCE).toBeDefined();
      expect(ERROR_RECOVERY_MAP.RPC_INVALID_PARAMS).toBeDefined();
      expect(ERROR_RECOVERY_MAP.INVALID_SIGNATURE).toBeDefined();
      expect(ERROR_RECOVERY_MAP.TRANSACTION_TOO_LARGE).toBeDefined();
      expect(ERROR_RECOVERY_MAP.SIMULATION_FAILED).toBeDefined();
    });

    it('should have proper structure for each recovery entry', () => {
      const recovery = ERROR_RECOVERY_MAP.INVALID_ADDRESS;

      expect(recovery).toHaveProperty('error');
      expect(recovery).toHaveProperty('description');
      expect(recovery).toHaveProperty('suggestions');
      expect(recovery.error).toBe('INVALID_ADDRESS');
      expect(typeof recovery.description).toBe('string');
      expect(Array.isArray(recovery.suggestions)).toBe(true);
      expect(recovery.suggestions.length).toBeGreaterThan(0);
    });

    it('should have actionable suggestions', () => {
      const recovery = ERROR_RECOVERY_MAP.TRANSACTION_TOO_LARGE;

      expect(recovery.suggestions).toContain(
        'Reduce the number of instructions in the transaction',
      );
      expect(recovery.suggestions).toContain(
        'Split the transaction into multiple smaller transactions',
      );
      expect(recovery.suggestions.length).toBeGreaterThanOrEqual(3);
    });

    it('should include references where appropriate', () => {
      const recovery = ERROR_RECOVERY_MAP.INVALID_KEYPAIR;

      expect(recovery.references).toBeDefined();
      expect(Array.isArray(recovery.references)).toBe(true);
      expect(recovery.references?.[0]).toContain('https://');
    });
  });

  describe('getErrorRecovery', () => {
    it('should return correct recovery information for known errors', () => {
      const error = new SolanaError('INVALID_ADDRESS', { address: 'test' });
      const recovery = getErrorRecovery(error);

      expect(recovery.error).toBe('INVALID_ADDRESS');
      expect(recovery.description).toContain('address');
      expect(recovery.suggestions.length).toBeGreaterThan(0);
      expect(recovery.suggestions[0]).toContain('base58');
    });

    it('should return default recovery for unknown error codes', () => {
      // Create an error with a code that doesn't exist in the map
      const error = new SolanaError('UNKNOWN_ERROR_CODE' as any);
      const recovery = getErrorRecovery(error);

      expect(recovery.error).toBe('UNKNOWN_ERROR_CODE');
      expect(recovery.description).toBe('An unknown error occurred.');
      expect(recovery.suggestions).toEqual([
        'Check the error context for more details',
        'Refer to the Solana documentation',
        'Try the operation again',
        'Contact support if the issue persists',
      ]);
      expect(recovery.references).toEqual(['https://docs.solana.com/']);
    });

    it('should provide specific suggestions for RPC errors', () => {
      const error = new SolanaError('RPC_METHOD_NOT_FOUND', { method: 'invalidMethod' });
      const recovery = getErrorRecovery(error);

      expect(recovery.suggestions).toContain('Check the method name for typos');
      expect(recovery.suggestions).toContain('Verify the method is supported by the RPC endpoint');
    });

    it('should provide specific suggestions for validation errors', () => {
      const error = new SolanaError('TRANSACTION_TOO_LARGE');
      const recovery = getErrorRecovery(error);

      expect(recovery.suggestions).toContain(
        'Reduce the number of instructions in the transaction',
      );
      expect(recovery.suggestions).toContain(
        'Use lookup tables for repeated accounts (v0 transactions)',
      );
    });
  });

  describe('getErrorSuggestions', () => {
    it('should return just the suggestions array', () => {
      const error = new SolanaError('INSUFFICIENT_BALANCE');
      const suggestions = getErrorSuggestions(error);

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('SOL');
    });

    it('should match suggestions from getErrorRecovery', () => {
      const error = new SolanaError('RPC_INVALID_PARAMS');
      const recovery = getErrorRecovery(error);
      const suggestions = getErrorSuggestions(error);

      expect(suggestions).toEqual(recovery.suggestions);
    });
  });

  describe('formatErrorRecovery', () => {
    it('should format recovery information as readable string', () => {
      const error = new SolanaError('INVALID_SIGNATURE');
      const formatted = formatErrorRecovery(error);

      expect(formatted).toContain('signature');
      expect(formatted).toContain('Suggestions:');
      expect(formatted).toContain('1.');
      expect(formatted).toContain('2.');
      expect(formatted).toContain('base58');
    });

    it('should include references when available', () => {
      const error = new SolanaError('TRANSACTION_FAILED');
      const formatted = formatErrorRecovery(error);

      expect(formatted).toContain('References:');
      expect(formatted).toContain('https://docs.solana.com/');
    });

    it('should not include references section when not available', () => {
      const error = new SolanaError('RPC_PARSE_ERROR');
      const formatted = formatErrorRecovery(error);

      // This error type doesn't have references defined
      expect(formatted).not.toContain('References:');
    });

    it('should format suggestions with numbered list', () => {
      const error = new SolanaError('NETWORK_ERROR');
      const formatted = formatErrorRecovery(error);
      const lines = formatted.split('\n');

      const suggestionLines = lines.filter((line) => /^\d+\./.test(line));
      expect(suggestionLines.length).toBeGreaterThan(0);
      expect(suggestionLines[0]).toMatch(/^1\. /);
    });
  });

  describe('hasRecoverySuggestions', () => {
    it('should return true for known error codes', () => {
      expect(hasRecoverySuggestions('INVALID_ADDRESS')).toBe(true);
      expect(hasRecoverySuggestions('RPC_ERROR')).toBe(true);
      expect(hasRecoverySuggestions('TRANSACTION_FAILED')).toBe(true);
      expect(hasRecoverySuggestions('INSUFFICIENT_BALANCE')).toBe(true);
      expect(hasRecoverySuggestions('RPC_INVALID_PARAMS')).toBe(true);
      expect(hasRecoverySuggestions('TRANSACTION_TOO_LARGE')).toBe(true);
    });

    it('should return false for unknown error codes', () => {
      expect(hasRecoverySuggestions('UNKNOWN_ERROR' as any)).toBe(false);
      expect(hasRecoverySuggestions('MADE_UP_ERROR' as any)).toBe(false);
    });
  });

  describe('Error Recovery Integration', () => {
    it('should provide contextual suggestions for common scenarios', () => {
      // Test insufficient balance scenario
      const balanceError = new SolanaError('INSUFFICIENT_BALANCE', {
        address: 'test-address',
        required: 1000000,
        current: 500000,
      });
      const balanceRecovery = getErrorRecovery(balanceError);

      expect(balanceRecovery.suggestions).toContain('Add more SOL to the account');
      expect(balanceRecovery.suggestions).toContain(
        'Check for minimum rent-exempt balance requirements',
      );

      // Test transaction size scenario
      const sizeError = new SolanaError('TRANSACTION_TOO_LARGE', {
        size: 1500,
        maxSize: 1232,
      });
      const sizeRecovery = getErrorRecovery(sizeError);

      expect(sizeRecovery.suggestions).toContain(
        'Reduce the number of instructions in the transaction',
      );
      expect(sizeRecovery.suggestions).toContain(
        'Use lookup tables for repeated accounts (v0 transactions)',
      );

      // Test RPC method not found scenario
      const rpcError = new SolanaError('RPC_METHOD_NOT_FOUND', {
        method: 'getNonExistentData',
      });
      const rpcRecovery = getErrorRecovery(rpcError);

      expect(rpcRecovery.suggestions).toContain('Check the method name for typos');
      expect(rpcRecovery.suggestions).toContain('Refer to the official Solana RPC documentation');
    });

    it('should provide comprehensive recovery information', () => {
      const error = new SolanaError('SIMULATION_FAILED');
      const recovery = getErrorRecovery(error);

      expect(recovery.description).toBeTruthy();
      expect(recovery.suggestions.length).toBeGreaterThanOrEqual(3);
      expect(recovery.suggestions.every((s) => s.length > 10)).toBe(true); // Ensure suggestions are descriptive
    });
  });
});
