import { describe, it, expect } from 'vitest';
import {
  enhanceErrorWithLogs,
  enhanceErrorWithSimulation,
  wrapError,
  enhanceErrorWithContext,
  enhanceErrorWithAccount,
  enhanceErrorWithTransaction,
  enhanceErrorWithProgram,
  createSimulationError,
  createPreflightError,
  mergeErrors,
  type SimulationResult,
  type TransactionLogs,
} from '../src/enhancer';
import { SolanaError } from '../src/error';

describe('Error Enhancer', () => {
  describe('enhanceErrorWithLogs', () => {
    it('should enhance error with logs array', () => {
      const originalError = new SolanaError('TRANSACTION_FAILED', { signature: 'test-sig' });
      const logs = ['Program log: Starting execution', 'Program log: Error occurred'];

      const enhancedError = enhanceErrorWithLogs(originalError, logs);

      expect(enhancedError.code).toBe('TRANSACTION_FAILED');
      expect(enhancedError.context).toEqual({
        signature: 'test-sig',
        logs: ['Program log: Starting execution', 'Program log: Error occurred'],
      });
      expect(enhancedError.cause).toBe(originalError.cause);
    });

    it('should enhance error with TransactionLogs object', () => {
      const originalError = new SolanaError('SIMULATION_FAILED');
      const transactionLogs: TransactionLogs = {
        signature: 'tx-signature',
        logs: ['Program log: Test'],
        slot: 12345,
      };

      const enhancedError = enhanceErrorWithLogs(originalError, transactionLogs);

      expect(enhancedError.context).toEqual({
        logs: ['Program log: Test'],
        transactionSignature: 'tx-signature',
        slot: 12345,
      });
    });

    it('should preserve existing context', () => {
      const originalError = new SolanaError('RPC_ERROR', { method: 'test', existing: 'value' });
      const logs = ['Log entry'];

      const enhancedError = enhanceErrorWithLogs(originalError, logs);

      expect(enhancedError.context).toEqual({
        method: 'test',
        existing: 'value',
        logs: ['Log entry'],
      });
    });
  });

  describe('enhanceErrorWithSimulation', () => {
    it('should enhance error with simulation results', () => {
      const originalError = new SolanaError('PREFLIGHT_FAILURE');
      const simulation: SimulationResult = {
        err: { InstructionError: [0, 'InvalidAccountData'] },
        logs: ['Program log: Simulation failed'],
        accounts: ['account1', 'account2'],
        unitsConsumed: 5000,
        returnData: {
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          data: ['SGVsbG8=', 'base64'],
        },
      };

      const enhancedError = enhanceErrorWithSimulation(originalError, simulation);

      expect(enhancedError.code).toBe('PREFLIGHT_FAILURE');
      expect(enhancedError.context?.simulation).toEqual(simulation);
    });

    it('should preserve existing context and cause', () => {
      const cause = new Error('Original cause');
      const originalError = new SolanaError('SIMULATION_FAILED', { existing: 'context' }, cause);
      const simulation: SimulationResult = { err: 'test error' };

      const enhancedError = enhanceErrorWithSimulation(originalError, simulation);

      expect(enhancedError.context).toEqual({
        existing: 'context',
        simulation: { err: 'test error' },
      });
      expect(enhancedError.cause).toBe(cause);
    });
  });

  describe('wrapError', () => {
    it('should wrap original error with SolanaError', () => {
      const originalError = new TypeError('Fetch failed');
      const wrappedError = wrapError(originalError, 'NETWORK_ERROR', { endpoint: 'test-rpc' });

      expect(wrappedError).toBeInstanceOf(SolanaError);
      expect(wrappedError.code).toBe('NETWORK_ERROR');
      expect(wrappedError.context).toEqual({
        originalErrorName: 'TypeError',
        originalErrorMessage: 'Fetch failed',
        endpoint: 'test-rpc',
      });
      expect(wrappedError.cause).toBe(originalError);
    });

    it('should work without additional context', () => {
      const originalError = new Error('Test error');
      const wrappedError = wrapError(originalError, 'RPC_ERROR');

      expect(wrappedError.context).toEqual({
        originalErrorName: 'Error',
        originalErrorMessage: 'Test error',
      });
    });
  });

  describe('enhanceErrorWithContext', () => {
    it('should add additional context to existing error', () => {
      const originalError = new SolanaError('RPC_ERROR', { method: 'test' });
      const additionalContext = { retry: 3, timestamp: 1234567890 };

      const enhancedError = enhanceErrorWithContext(originalError, additionalContext);

      expect(enhancedError.context).toEqual({
        method: 'test',
        retry: 3,
        timestamp: 1234567890,
      });
    });

    it('should override existing context keys', () => {
      const originalError = new SolanaError('RPC_ERROR', { method: 'old', keep: 'value' });
      const additionalContext = { method: 'new', add: 'new-value' };

      const enhancedError = enhanceErrorWithContext(originalError, additionalContext);

      expect(enhancedError.context).toEqual({
        method: 'new', // Overridden
        keep: 'value', // Preserved
        add: 'new-value', // Added
      });
    });
  });

  describe('enhanceErrorWithAccount', () => {
    it('should enhance error with account information', () => {
      const originalError = new SolanaError('ACCOUNT_NOT_FOUND');
      const accountAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
      const accountData = {
        lamports: 1000000,
        owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        data: new Uint8Array([1, 2, 3]),
        executable: false,
        rentEpoch: 300,
      };

      const enhancedError = enhanceErrorWithAccount(originalError, accountAddress, accountData);

      expect(enhancedError.context).toEqual({
        accountAddress,
        accountData,
      });
    });

    it('should work without account data', () => {
      const originalError = new SolanaError('ACCOUNT_NOT_FOUND');
      const accountAddress = 'test-address';

      const enhancedError = enhanceErrorWithAccount(originalError, accountAddress);

      expect(enhancedError.context).toEqual({
        accountAddress: 'test-address',
      });
    });
  });

  describe('enhanceErrorWithTransaction', () => {
    it('should enhance error with transaction information', () => {
      const originalError = new SolanaError('TRANSACTION_FAILED');
      const transactionData = {
        signature: 'tx-signature',
        slot: 12345,
        blockTime: 1234567890,
        confirmationStatus: 'finalized',
        confirmations: null,
      };

      const enhancedError = enhanceErrorWithTransaction(originalError, transactionData);

      expect(enhancedError.context).toEqual({
        transaction: transactionData,
      });
    });
  });

  describe('enhanceErrorWithProgram', () => {
    it('should enhance error with program information', () => {
      const originalError = new SolanaError('PROGRAM_ERROR');
      const programData = {
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        instructionIndex: 0,
        customError: 123,
        errorCode: 'InvalidOwner',
        errorMessage: 'Token account owner mismatch',
      };

      const enhancedError = enhanceErrorWithProgram(originalError, programData);

      expect(enhancedError.context).toEqual({
        program: programData,
      });
    });
  });

  describe('createSimulationError', () => {
    it('should create simulation error with default code', () => {
      const simulation: SimulationResult = {
        err: 'Generic error',
        logs: ['Program log: Error'],
      };

      const error = createSimulationError(simulation);

      expect(error.code).toBe('SIMULATION_FAILED');
      expect(error.context).toEqual({
        simulation,
      });
    });

    it('should detect insufficient funds error', () => {
      const simulation: SimulationResult = {
        err: 'InsufficientFunds',
      };

      const error = createSimulationError(simulation);

      expect(error.code).toBe('INSUFFICIENT_BALANCE');
    });

    it('should detect account not found error', () => {
      const simulation: SimulationResult = {
        err: 'AccountNotFound',
      };

      const error = createSimulationError(simulation);

      expect(error.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it('should detect program error', () => {
      const simulation: SimulationResult = {
        err: 'ProgramError: Custom error',
      };

      const error = createSimulationError(simulation);

      expect(error.code).toBe('PROGRAM_ERROR');
    });

    it('should include additional context', () => {
      const simulation: SimulationResult = { err: 'test' };
      const context = { additional: 'data' };

      const error = createSimulationError(simulation, context);

      expect(error.context).toEqual({
        simulation,
        additional: 'data',
      });
    });
  });

  describe('createPreflightError', () => {
    it('should create preflight error', () => {
      const preflightResult = {
        err: 'Preflight failed',
        logs: ['Program log: Preflight error'],
        accounts: ['account1'],
        unitsConsumed: 1000,
        returnData: { test: 'data' },
      };

      const error = createPreflightError(preflightResult);

      expect(error.code).toBe('PREFLIGHT_FAILURE');
      expect(error.context).toEqual({
        preflight: preflightResult,
      });
    });

    it('should include additional context', () => {
      const preflightResult = { err: 'test' };
      const context = { method: 'sendTransaction' };

      const error = createPreflightError(preflightResult, context);

      expect(error.context).toEqual({
        preflight: preflightResult,
        method: 'sendTransaction',
      });
    });
  });

  describe('mergeErrors', () => {
    it('should merge multiple errors', () => {
      const primaryError = new SolanaError('TRANSACTION_FAILED', { signature: 'test' });
      const error1 = new Error('Network error');
      const error2 = new SolanaError('RPC_ERROR', { method: 'test' });

      const mergedError = mergeErrors(primaryError, error1, error2);

      expect(mergedError.code).toBe('TRANSACTION_FAILED');
      expect(mergedError.context).toEqual({
        signature: 'test',
        additionalErrors: [
          {
            index: 0,
            name: 'Error',
            message: 'Network error',
          },
          {
            index: 1,
            name: 'SolanaError',
            message: error2.message,
            code: 'RPC_ERROR',
            context: { method: 'test' },
          },
        ],
      });
      expect(mergedError.cause).toBe(primaryError.cause);
    });

    it('should work with no additional errors', () => {
      const primaryError = new SolanaError('RPC_ERROR', { test: 'value' });

      const mergedError = mergeErrors(primaryError);

      expect(mergedError.context).toEqual({
        test: 'value',
        additionalErrors: [],
      });
    });
  });
});
