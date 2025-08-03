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
    default:
      return 'An unknown error occurred.';
  }
}
