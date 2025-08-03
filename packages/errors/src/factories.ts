import { SolanaError } from './error';

/**
 * Factory methods for creating common Solana errors.
 */
export const SolanaErrorFactory = {
  /**
   * Creates an error for an invalid address.
   * @param address - The invalid address
   * @returns A SolanaError with code INVALID_ADDRESS
   */
  invalidAddress(address: string): SolanaError {
    return new SolanaError('INVALID_ADDRESS', { address });
  },

  /**
   * Creates an error for an RPC error.
   * @param method - The RPC method that failed
   * @param details - Additional details about the error
   * @returns A SolanaError with code RPC_ERROR
   */
  rpcError(method: string, details?: string): SolanaError {
    return new SolanaError('RPC_ERROR', { method, details });
  },

  /**
   * Creates an error for an invalid keypair.
   * @returns A SolanaError with code INVALID_KEYPAIR
   */
  invalidKeypair(): SolanaError {
    return new SolanaError('INVALID_KEYPAIR');
  },

  /**
   * Creates an error for a failed transaction.
   * @param transactionSignature - The transaction signature
   * @returns A SolanaError with code TRANSACTION_FAILED
   */
  transactionFailed(transactionSignature?: string): SolanaError {
    return new SolanaError('TRANSACTION_FAILED', { transactionSignature });
  },

  /**
   * Creates an error for insufficient balance.
   * @param address - The account address
   * @param requiredAmount - The required amount
   * @param currentAmount - The current amount
   * @returns A SolanaError with code INSUFFICIENT_BALANCE
   */
  insufficientBalance(
    address: string,
    requiredAmount?: string,
    currentAmount?: string,
  ): SolanaError {
    return new SolanaError('INSUFFICIENT_BALANCE', {
      address,
      requiredAmount,
      currentAmount,
    });
  },
} as const;
