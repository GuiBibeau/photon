import type { SolanaErrorCode } from './codes';

/**
 * Represents an error that occurred within the Solana SDK.
 */
export class SolanaError extends Error {
  override readonly name = 'SolanaError';

  constructor(
    readonly code: SolanaErrorCode,
    readonly context?: Record<string, unknown>,
    cause?: Error,
  ) {
    // Build message from code and context
    const message = createErrorMessage(code, context);

    super(message, { cause });

    // Ensure the prototype is set correctly
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Converts the error to a JSON-serializable object.
   */
  toJSON(): object {
    return {
      code: this.code,
      context: this.context,
      message: this.message,
      name: this.name,
      stack: this.stack,
    };
  }
}

/**
 * Creates a human-readable error message based on the error code and context.
 */
function createErrorMessage(code: SolanaErrorCode, context?: Record<string, unknown>): string {
  switch (code) {
    // Original error codes
    case 'INVALID_KEYPAIR':
      return 'The provided keypair is invalid.';
    case 'INVALID_ADDRESS':
      if (context?.address) {
        return `The provided address is invalid: ${context.address}`;
      }
      return 'The provided address is invalid.';
    case 'RPC_ERROR':
      if (context?.method && context?.details) {
        return `RPC error occurred while calling ${context.method}: ${context.details}`;
      } else if (context?.method) {
        return `RPC error occurred while calling ${context.method}`;
      }
      return 'An RPC error occurred.';
    case 'TRANSACTION_FAILED':
      if (context?.transactionSignature) {
        return `Transaction failed with signature: ${context.transactionSignature}`;
      }
      return 'Transaction failed.';
    case 'INSUFFICIENT_BALANCE':
      if (context?.address && context?.requiredAmount && context?.currentAmount) {
        return `Insufficient balance for account ${context.address}. Required: ${context.requiredAmount}, Current: ${context.currentAmount}`;
      } else if (context?.address) {
        return `Insufficient balance for account ${context.address}`;
      }
      return 'Insufficient balance.';

    // RPC-specific error codes
    case 'RPC_PARSE_ERROR':
      return 'Invalid JSON was received by the server.';
    case 'RPC_INVALID_REQUEST':
      return 'The JSON sent is not a valid Request object.';
    case 'RPC_METHOD_NOT_FOUND':
      return `The method ${context?.method || 'requested'} does not exist or is not available.`;
    case 'RPC_INVALID_PARAMS':
      return `Invalid method parameters for ${context?.method || 'the request'}.`;
    case 'RPC_INTERNAL_ERROR':
      return 'Internal JSON-RPC error.';
    case 'RPC_SERVER_ERROR':
      return `RPC server error: ${context?.message || 'Unknown server error'}`;
    case 'RPC_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE':
      return 'Transaction precompile verification failed.';
    case 'RPC_BLOCKHASH_NOT_FOUND':
      return `Blockhash not found: ${context?.blockhash || 'Unknown blockhash'}`;
    case 'RPC_SLOT_SKIPPED':
      return `Slot was skipped: ${context?.slot || 'Unknown slot'}`;
    case 'RPC_NO_HEALTHY_CONNECTION':
      return 'No healthy RPC connection available.';

    // Validation error codes
    case 'INVALID_SIGNATURE':
      return `Invalid signature: ${context?.signature || 'Unknown signature'}`;
    case 'INVALID_SIGNATURE_LENGTH':
      return `Invalid signature length. Expected 64 bytes, got ${context?.length || 'unknown'} bytes.`;
    case 'INVALID_ADDRESS_LENGTH':
      return `Invalid address length. Expected 32 bytes, got ${context?.length || 'unknown'} bytes.`;
    case 'INVALID_ADDRESS_FORMAT':
      return `Invalid address format: ${context?.address || 'Unknown address'}`;
    case 'TRANSACTION_TOO_LARGE':
      return `Transaction too large. Size: ${context?.size || 'unknown'} bytes, Maximum: ${context?.maxSize || 'unknown'} bytes.`;
    case 'INSUFFICIENT_SIGNATURES':
      return `Insufficient signatures. Required: ${context?.required || 'unknown'}, Found: ${context?.found || 'unknown'}.`;
    case 'DUPLICATE_SIGNATURE':
      return `Duplicate signature detected: ${context?.signature || 'Unknown signature'}`;
    case 'INVALID_ACCOUNT_INDEX':
      return `Invalid account index: ${context?.index || 'unknown'}`;
    case 'INVALID_INSTRUCTION_DATA':
      return 'Invalid instruction data format.';

    // Network and connection errors
    case 'NETWORK_ERROR':
      return `Network error: ${context?.message || 'Unknown network error'}`;
    case 'TIMEOUT_ERROR':
      return `Request timeout after ${context?.timeout || 'unknown'} ms.`;
    case 'CONNECTION_ERROR':
      return `Connection error: ${context?.message || 'Unknown connection error'}`;

    // Transaction simulation and enhancement errors
    case 'SIMULATION_FAILED':
      return `Transaction simulation failed: ${context?.message || 'Unknown simulation error'}`;
    case 'PREFLIGHT_FAILURE':
      return `Transaction preflight check failed: ${context?.message || 'Unknown preflight error'}`;
    case 'ACCOUNT_NOT_FOUND':
      return `Account not found: ${context?.address || 'Unknown address'}`;
    case 'PROGRAM_ERROR':
      return `Program error: ${context?.message || 'Unknown program error'}`;

    // Cryptographic errors
    case 'CRYPTO_NOT_SUPPORTED':
      return `Cryptographic operation not supported: ${context?.operation || 'Unknown operation'}. This browser may not support the required WebCrypto features.`;
    case 'KEY_GENERATION_FAILED':
      return `Key generation failed: ${context?.reason || 'Unknown reason'}`;
    case 'INVALID_KEY_OPTIONS':
      return `Invalid key options provided: ${context?.details || 'Unknown validation error'}`;
    case 'KEY_EXTRACTION_FAILED':
      return `Failed to extract key material: ${context?.reason || 'Key may not be extractable'}`;
    case 'INVALID_KEY_TYPE':
      return `Invalid key type: Expected ${context?.expected || 'unknown'}, got ${context?.actual || 'unknown'}`;

    default:
      return 'An unknown error occurred.';
  }
}
