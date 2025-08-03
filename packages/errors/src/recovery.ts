import type { SolanaError } from './error';
import type { SolanaErrorCode } from './codes';

/**
 * Recovery suggestion for a specific error
 */
export interface ErrorRecovery {
  error: SolanaErrorCode;
  description: string;
  suggestions: string[];
  references?: string[];
}

/**
 * Recovery suggestions for common Solana SDK errors
 */
export const ERROR_RECOVERY_MAP: Record<SolanaErrorCode, ErrorRecovery> = {
  // Original error codes
  INVALID_KEYPAIR: {
    error: 'INVALID_KEYPAIR',
    description: 'The provided keypair is invalid or corrupted.',
    suggestions: [
      'Verify the keypair was generated correctly',
      'Check if the private key bytes are the correct length (32 or 64 bytes)',
      'Ensure the keypair format matches the expected Ed25519 format',
      'Try generating a new keypair if the current one is corrupted',
    ],
    references: ['https://docs.solana.com/developing/clients/javascript-reference#keypair'],
  },

  INVALID_ADDRESS: {
    error: 'INVALID_ADDRESS',
    description: 'The provided address is not a valid Solana public key.',
    suggestions: [
      'Verify the address is a valid base58-encoded string',
      'Check that the address is exactly 32 bytes when decoded',
      'Ensure no typos in the address string',
      'Use the address validation functions before making calls',
    ],
    references: ['https://docs.solana.com/developing/clients/javascript-reference#publickey'],
  },

  RPC_ERROR: {
    error: 'RPC_ERROR',
    description: 'A general RPC error occurred.',
    suggestions: [
      'Check your network connection',
      'Verify the RPC endpoint is correct and accessible',
      'Check if the RPC endpoint is experiencing downtime',
      'Try using a different RPC endpoint',
      'Increase request timeout if the network is slow',
    ],
    references: ['https://docs.solana.com/developing/clients/jsonrpc-api'],
  },

  TRANSACTION_FAILED: {
    error: 'TRANSACTION_FAILED',
    description: 'The transaction failed to execute successfully.',
    suggestions: [
      'Check the transaction logs for specific error details',
      'Verify all required signatures are present',
      'Ensure sufficient SOL balance for fees',
      'Check if the transaction size exceeds limits',
      'Verify the recent blockhash is still valid',
      'Check for program-specific errors in the logs',
    ],
    references: ['https://docs.solana.com/developing/programming-model/transactions'],
  },

  INSUFFICIENT_BALANCE: {
    error: 'INSUFFICIENT_BALANCE',
    description: 'The account does not have sufficient balance for the operation.',
    suggestions: [
      'Add more SOL to the account',
      'Check the account balance before the transaction',
      'Verify the fee calculation is correct',
      'Consider using a different fee payer account',
      'Check for minimum rent-exempt balance requirements',
    ],
    references: ['https://docs.solana.com/developing/programming-model/accounts#rent'],
  },

  // RPC-specific error codes
  RPC_PARSE_ERROR: {
    error: 'RPC_PARSE_ERROR',
    description: 'The JSON sent to the RPC server could not be parsed.',
    suggestions: [
      'Verify the request is valid JSON',
      'Check for malformed JSON syntax',
      'Ensure proper encoding (UTF-8)',
      'Validate the request structure before sending',
    ],
  },

  RPC_INVALID_REQUEST: {
    error: 'RPC_INVALID_REQUEST',
    description: 'The JSON-RPC request is not a valid request object.',
    suggestions: [
      'Ensure the request has required fields: jsonrpc, method, id',
      'Check that jsonrpc version is "2.0"',
      'Verify the method name is spelled correctly',
      'Validate the request structure matches JSON-RPC 2.0 spec',
    ],
    references: ['https://www.jsonrpc.org/specification'],
  },

  RPC_METHOD_NOT_FOUND: {
    error: 'RPC_METHOD_NOT_FOUND',
    description: 'The requested RPC method does not exist.',
    suggestions: [
      'Check the method name for typos',
      'Verify the method is supported by the RPC endpoint',
      'Check if the method requires a specific Solana version',
      'Refer to the official Solana RPC documentation',
    ],
    references: ['https://docs.solana.com/developing/clients/jsonrpc-api'],
  },

  RPC_INVALID_PARAMS: {
    error: 'RPC_INVALID_PARAMS',
    description: 'The method parameters are invalid.',
    suggestions: [
      'Check parameter types match the expected format',
      'Verify all required parameters are provided',
      'Ensure parameter values are within valid ranges',
      'Check the parameter order and structure',
    ],
  },

  RPC_INTERNAL_ERROR: {
    error: 'RPC_INTERNAL_ERROR',
    description: 'An internal RPC server error occurred.',
    suggestions: [
      'Retry the request after a short delay',
      'Try using a different RPC endpoint',
      'Check if the RPC server is experiencing issues',
      'Report the issue if it persists',
    ],
  },

  RPC_SERVER_ERROR: {
    error: 'RPC_SERVER_ERROR',
    description: 'A server-side error occurred.',
    suggestions: [
      'Retry the request with exponential backoff',
      'Check the RPC endpoint status',
      'Try using an alternative RPC endpoint',
      'Monitor for service outages',
    ],
  },

  RPC_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE: {
    error: 'RPC_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE',
    description: 'Transaction failed precompile verification.',
    suggestions: [
      'Check transaction structure and signatures',
      'Verify all accounts are properly referenced',
      'Ensure instruction data is valid',
      'Check for duplicate or invalid signatures',
    ],
  },

  RPC_BLOCKHASH_NOT_FOUND: {
    error: 'RPC_BLOCKHASH_NOT_FOUND',
    description: 'The specified blockhash was not found.',
    suggestions: [
      'Get a fresh recent blockhash',
      'Check if the blockhash has expired',
      'Verify the blockhash format is correct',
      'Use getLatestBlockhash to get a current blockhash',
    ],
  },

  RPC_SLOT_SKIPPED: {
    error: 'RPC_SLOT_SKIPPED',
    description: 'The requested slot was skipped.',
    suggestions: [
      'Try requesting a different slot',
      'Check if the slot number is valid',
      'Use getSlot to find the current slot',
      'Consider using a slot range instead',
    ],
  },

  RPC_NO_HEALTHY_CONNECTION: {
    error: 'RPC_NO_HEALTHY_CONNECTION',
    description: 'No healthy RPC connection is available.',
    suggestions: [
      'Check your network connectivity',
      'Try different RPC endpoints',
      'Verify firewall settings',
      'Check if the cluster is operational',
    ],
  },

  // Validation error codes
  INVALID_SIGNATURE: {
    error: 'INVALID_SIGNATURE',
    description: 'The provided signature is invalid.',
    suggestions: [
      'Verify the signature is base58-encoded',
      'Check that the signature is exactly 64 bytes',
      'Ensure the signature was created with the correct private key',
      'Validate the message being signed',
    ],
  },

  INVALID_SIGNATURE_LENGTH: {
    error: 'INVALID_SIGNATURE_LENGTH',
    description: 'The signature has an incorrect length.',
    suggestions: [
      'Ensure the signature is exactly 64 bytes',
      'Check the signature encoding format',
      'Verify the signature was not truncated or corrupted',
    ],
  },

  INVALID_ADDRESS_LENGTH: {
    error: 'INVALID_ADDRESS_LENGTH',
    description: 'The address has an incorrect length.',
    suggestions: [
      'Ensure the address is exactly 32 bytes when decoded',
      'Check the address encoding format',
      'Verify the address was not truncated or corrupted',
    ],
  },

  INVALID_ADDRESS_FORMAT: {
    error: 'INVALID_ADDRESS_FORMAT',
    description: 'The address format is invalid.',
    suggestions: [
      'Ensure the address is base58-encoded',
      'Check for invalid characters in the address',
      'Verify the address checksum if applicable',
      'Use address validation functions',
    ],
  },

  TRANSACTION_TOO_LARGE: {
    error: 'TRANSACTION_TOO_LARGE',
    description: 'The transaction exceeds the maximum size limit.',
    suggestions: [
      'Reduce the number of instructions in the transaction',
      'Split the transaction into multiple smaller transactions',
      'Optimize instruction data to use fewer bytes',
      'Remove unnecessary accounts from instructions',
      'Use lookup tables for repeated accounts (v0 transactions)',
    ],
    references: [
      'https://docs.solana.com/developing/programming-model/transactions#transaction-size-limits',
    ],
  },

  INSUFFICIENT_SIGNATURES: {
    error: 'INSUFFICIENT_SIGNATURES',
    description: 'The transaction does not have enough signatures.',
    suggestions: [
      'Add signatures for all required signers',
      'Check that the fee payer has signed',
      'Verify all writable accounts are signed by their owners',
      'Ensure multisig accounts have sufficient signatures',
    ],
  },

  DUPLICATE_SIGNATURE: {
    error: 'DUPLICATE_SIGNATURE',
    description: 'Duplicate signatures were detected.',
    suggestions: [
      'Remove duplicate signatures from the transaction',
      'Check for repeated signers in the transaction',
      'Verify the transaction construction logic',
    ],
  },

  INVALID_ACCOUNT_INDEX: {
    error: 'INVALID_ACCOUNT_INDEX',
    description: 'An account index is out of bounds.',
    suggestions: [
      'Check that account indexes are within the account list range',
      'Verify the account list is properly constructed',
      'Ensure instruction account references are valid',
    ],
  },

  INVALID_INSTRUCTION_DATA: {
    error: 'INVALID_INSTRUCTION_DATA',
    description: 'The instruction data is malformed.',
    suggestions: [
      'Verify the instruction data format matches the program requirements',
      'Check data encoding and serialization',
      'Ensure all required fields are included',
      'Validate data against the program schema',
    ],
  },

  // Network and connection errors
  NETWORK_ERROR: {
    error: 'NETWORK_ERROR',
    description: 'A network error occurred.',
    suggestions: [
      'Check your internet connection',
      'Verify DNS resolution is working',
      'Try using a different network',
      'Check firewall and proxy settings',
    ],
  },

  TIMEOUT_ERROR: {
    error: 'TIMEOUT_ERROR',
    description: 'The request timed out.',
    suggestions: [
      'Increase the request timeout',
      'Check network latency',
      'Try during off-peak hours',
      'Use a geographically closer RPC endpoint',
    ],
  },

  CONNECTION_ERROR: {
    error: 'CONNECTION_ERROR',
    description: 'Failed to establish a connection.',
    suggestions: [
      'Verify the endpoint URL is correct',
      'Check if the service is available',
      'Try using HTTPS instead of HTTP',
      'Check for SSL/TLS certificate issues',
    ],
  },

  // Transaction simulation and enhancement errors
  SIMULATION_FAILED: {
    error: 'SIMULATION_FAILED',
    description: 'Transaction simulation failed.',
    suggestions: [
      'Check the transaction logs for specific errors',
      'Verify account states are as expected',
      'Ensure sufficient balances for all operations',
      'Check program-specific error conditions',
    ],
  },

  PREFLIGHT_FAILURE: {
    error: 'PREFLIGHT_FAILURE',
    description: 'Transaction preflight check failed.',
    suggestions: [
      'Enable preflight to see detailed error information',
      'Check transaction logs for specific failures',
      'Verify all account permissions and balances',
      'Test the transaction in simulation mode first',
    ],
  },

  ACCOUNT_NOT_FOUND: {
    error: 'ACCOUNT_NOT_FOUND',
    description: 'The requested account does not exist.',
    suggestions: [
      'Verify the account address is correct',
      'Check if the account needs to be created first',
      'Ensure the account has been properly initialized',
      'Use account existence checks before operations',
    ],
  },

  PROGRAM_ERROR: {
    error: 'PROGRAM_ERROR',
    description: 'A program-specific error occurred.',
    suggestions: [
      'Check the program logs for specific error details',
      'Verify the instruction data format',
      'Ensure account permissions are correct',
      'Check program-specific error codes',
      'Refer to the program documentation',
    ],
  },
} as const;

/**
 * Gets recovery suggestions for a SolanaError
 */
export function getErrorRecovery(error: SolanaError): ErrorRecovery {
  return (
    ERROR_RECOVERY_MAP[error.code] || {
      error: error.code,
      description: 'An unknown error occurred.',
      suggestions: [
        'Check the error context for more details',
        'Refer to the Solana documentation',
        'Try the operation again',
        'Contact support if the issue persists',
      ],
      references: ['https://docs.solana.com/'],
    }
  );
}

/**
 * Gets just the suggestion strings for a SolanaError
 */
export function getErrorSuggestions(error: SolanaError): string[] {
  return getErrorRecovery(error).suggestions;
}

/**
 * Gets a formatted recovery message for a SolanaError
 */
export function formatErrorRecovery(error: SolanaError): string {
  const recovery = getErrorRecovery(error);

  let message = `${recovery.description}\n\nSuggestions:\n`;
  recovery.suggestions.forEach((suggestion, index) => {
    message += `${index + 1}. ${suggestion}\n`;
  });

  if (recovery.references && recovery.references.length > 0) {
    message += `\nReferences:\n`;
    recovery.references.forEach((ref) => {
      message += `- ${ref}\n`;
    });
  }

  return message.trim();
}

/**
 * Checks if an error has specific recovery suggestions
 */
export function hasRecoverySuggestions(errorCode: SolanaErrorCode): boolean {
  return errorCode in ERROR_RECOVERY_MAP;
}
