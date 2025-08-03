/**
 * Error codes for the Solana SDK.
 */
export const SolanaErrorCodes = {
  INVALID_KEYPAIR: 'INVALID_KEYPAIR',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  RPC_ERROR: 'RPC_ERROR',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
} as const;

/**
 * Type for Solana error codes.
 */
export type SolanaErrorCode = (typeof SolanaErrorCodes)[keyof typeof SolanaErrorCodes];
