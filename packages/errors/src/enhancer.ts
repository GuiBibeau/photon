import { SolanaError } from './error';
import type { SolanaErrorCode } from './codes';

/**
 * Transaction simulation result data
 */
export interface SimulationResult {
  err?: unknown;
  logs?: string[];
  accounts?: string[] | null;
  unitsConsumed?: number;
  returnData?: {
    programId: string;
    data: [string, string]; // [data, encoding]
  };
}

/**
 * Transaction logs data
 */
export interface TransactionLogs {
  signature?: string;
  logs: string[];
  slot?: number;
}

/**
 * Enhances a SolanaError with transaction logs
 */
export function enhanceErrorWithLogs(
  error: SolanaError,
  logs: string[] | TransactionLogs,
): SolanaError {
  const logsData = Array.isArray(logs) ? { logs } : logs;

  const enhancedContext = {
    ...error.context,
    logs: logsData.logs,
    ...(logsData.signature && { transactionSignature: logsData.signature }),
    ...(logsData.slot && { slot: logsData.slot }),
  };

  return new SolanaError(error.code, enhancedContext, error.cause as Error);
}

/**
 * Enhances a SolanaError with simulation results
 */
export function enhanceErrorWithSimulation(
  error: SolanaError,
  simulation: SimulationResult,
): SolanaError {
  const enhancedContext = {
    ...error.context,
    simulation: {
      err: simulation.err,
      logs: simulation.logs,
      accounts: simulation.accounts,
      unitsConsumed: simulation.unitsConsumed,
      returnData: simulation.returnData,
    },
  };

  return new SolanaError(error.code, enhancedContext, error.cause as Error);
}

/**
 * Wraps an original error with a SolanaError, preserving the original as the cause
 */
export function wrapError(
  originalError: Error,
  solanaErrorCode: SolanaErrorCode,
  context?: Record<string, unknown>,
): SolanaError {
  const enhancedContext = {
    originalErrorName: originalError.name,
    originalErrorMessage: originalError.message,
    ...context,
  };

  return new SolanaError(solanaErrorCode, enhancedContext, originalError);
}

/**
 * Enhances a SolanaError with additional context while preserving existing context
 */
export function enhanceErrorWithContext(
  error: SolanaError,
  additionalContext: Record<string, unknown>,
): SolanaError {
  const enhancedContext = {
    ...error.context,
    ...additionalContext,
  };

  return new SolanaError(error.code, enhancedContext, error.cause as Error);
}

/**
 * Enhances an error with account information
 */
export function enhanceErrorWithAccount(
  error: SolanaError,
  accountAddress: string,
  accountData?: {
    lamports?: number;
    owner?: string;
    data?: Uint8Array | string;
    executable?: boolean;
    rentEpoch?: number;
  },
): SolanaError {
  const enhancedContext = {
    ...error.context,
    accountAddress,
    ...(accountData && { accountData }),
  };

  return new SolanaError(error.code, enhancedContext, error.cause as Error);
}

/**
 * Enhances an error with transaction information
 */
export function enhanceErrorWithTransaction(
  error: SolanaError,
  transactionData: {
    signature?: string;
    slot?: number;
    blockTime?: number;
    confirmationStatus?: string;
    confirmations?: number | null;
  },
): SolanaError {
  const enhancedContext = {
    ...error.context,
    transaction: transactionData,
  };

  return new SolanaError(error.code, enhancedContext, error.cause as Error);
}

/**
 * Enhances an error with program execution information
 */
export function enhanceErrorWithProgram(
  error: SolanaError,
  programData: {
    programId: string;
    instructionIndex?: number;
    customError?: number;
    errorCode?: string;
    errorMessage?: string;
  },
): SolanaError {
  const enhancedContext = {
    ...error.context,
    program: programData,
  };

  return new SolanaError(error.code, enhancedContext, error.cause as Error);
}

/**
 * Creates a new error from a simulation failure
 */
export function createSimulationError(
  simulation: SimulationResult,
  context?: Record<string, unknown>,
): SolanaError {
  const errorContext = {
    simulation,
    ...context,
  };

  // Try to determine the most specific error code based on simulation results
  let errorCode: SolanaErrorCode = 'SIMULATION_FAILED';

  if (simulation.err) {
    // Check for specific error types in the simulation error
    const errStr = String(simulation.err);
    if (errStr.includes('InsufficientFunds') || errStr.includes('insufficient')) {
      errorCode = 'INSUFFICIENT_BALANCE';
    } else if (errStr.includes('AccountNotFound')) {
      errorCode = 'ACCOUNT_NOT_FOUND';
    } else if (errStr.includes('ProgramError')) {
      errorCode = 'PROGRAM_ERROR';
    }
  }

  return new SolanaError(errorCode, errorContext);
}

/**
 * Creates an error from preflight failure
 */
export function createPreflightError(
  preflightResult: {
    err?: unknown;
    logs?: string[];
    accounts?: string[] | null;
    unitsConsumed?: number;
    returnData?: unknown;
  },
  context?: Record<string, unknown>,
): SolanaError {
  const errorContext = {
    preflight: preflightResult,
    ...context,
  };

  return new SolanaError('PREFLIGHT_FAILURE', errorContext);
}

/**
 * Merges multiple errors into a single enhanced error
 */
export function mergeErrors(
  primaryError: SolanaError,
  ...additionalErrors: (SolanaError | Error)[]
): SolanaError {
  const enhancedContext = {
    ...primaryError.context,
    additionalErrors: additionalErrors.map((err, index) => ({
      index,
      name: err.name,
      message: err.message,
      ...(err instanceof SolanaError && { code: err.code, context: err.context }),
    })),
  };

  return new SolanaError(primaryError.code, enhancedContext, primaryError.cause as Error);
}
