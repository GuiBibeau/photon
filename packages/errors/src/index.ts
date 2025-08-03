// Export error codes
export { SolanaErrorCodes } from './codes';
export type { SolanaErrorCode } from './codes';

// Export main error class
export { SolanaError } from './error';

// Export factory methods
export { SolanaErrorFactory } from './factories';

// Export RPC error mapping utilities
export {
  mapRpcErrorCode,
  parseRpcError,
  parseRpcResponse,
  parseNetworkError,
  isJsonRpcError,
} from './rpc-mapper';
export type { JsonRpcError, SolanaRpcErrorData } from './rpc-mapper';

// Export validation error helpers
export {
  createAddressFormatError,
  createAddressLengthError,
  createAddressValidationError,
  createSignatureFormatError,
  createSignatureLengthError,
  createSignatureValidationError,
  createTransactionSizeError,
  createInsufficientSignaturesError,
  createDuplicateSignatureError,
  createInvalidAccountIndexError,
  createInvalidInstructionDataError,
  createInvalidKeypairError,
  validateBase58Format,
  validateAddressFormat,
  validateSignatureFormat,
} from './validation-mapper';

// Export error enhancement utilities
export {
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
} from './enhancer';
export type { SimulationResult, TransactionLogs } from './enhancer';

// Export error recovery utilities
export {
  getErrorRecovery,
  getErrorSuggestions,
  formatErrorRecovery,
  hasRecoverySuggestions,
  ERROR_RECOVERY_MAP,
} from './recovery';
export type { ErrorRecovery } from './recovery';
