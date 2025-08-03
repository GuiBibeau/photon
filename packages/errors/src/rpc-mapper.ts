import { SolanaError } from './error';
import type { SolanaErrorCode } from './codes';

/**
 * Standard JSON-RPC error interface
 */
export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * Solana-specific RPC error data that may be included in the `data` field
 */
export interface SolanaRpcErrorData {
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
 * Maps standard JSON-RPC error codes to SolanaError codes
 */
export function mapRpcErrorCode(rpcCode: number): SolanaErrorCode {
  switch (rpcCode) {
    case -32700:
      return 'RPC_PARSE_ERROR';
    case -32600:
      return 'RPC_INVALID_REQUEST';
    case -32601:
      return 'RPC_METHOD_NOT_FOUND';
    case -32602:
      return 'RPC_INVALID_PARAMS';
    case -32603:
      return 'RPC_INTERNAL_ERROR';
    case -32001:
      return 'RPC_BLOCKHASH_NOT_FOUND';
    case -32002:
      return 'RPC_SLOT_SKIPPED';
    case -32003:
      return 'RPC_NO_HEALTHY_CONNECTION';
    case -32004:
      return 'RPC_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE';
    case -32000:
      return 'RPC_SERVER_ERROR';
    default:
      // For any other server error codes (-32099 to -32000)
      if (rpcCode >= -32099 && rpcCode <= -32000) {
        return 'RPC_SERVER_ERROR';
      }
      return 'RPC_ERROR';
  }
}

/**
 * Parses a JSON-RPC error response and creates a SolanaError instance
 */
export function parseRpcError(
  rpcError: JsonRpcError,
  method?: string,
  originalError?: Error,
): SolanaError {
  const errorCode = mapRpcErrorCode(rpcError.code);

  // Extract Solana-specific error data if available
  const solanaData = rpcError.data as SolanaRpcErrorData | undefined;

  const context: Record<string, unknown> = {
    rpcCode: rpcError.code,
    rpcMessage: rpcError.message,
    method,
  };

  // Add Solana-specific context if available
  if (solanaData) {
    if (solanaData.err) {
      context.err = solanaData.err;
    }
    if (solanaData.logs) {
      context.logs = solanaData.logs;
    }
    if (solanaData.accounts) {
      context.accounts = solanaData.accounts;
    }
    if (solanaData.unitsConsumed !== undefined) {
      context.unitsConsumed = solanaData.unitsConsumed;
    }
    if (solanaData.returnData) {
      context.returnData = solanaData.returnData;
    }
  }

  // Add specific context based on error type
  switch (errorCode) {
    case 'RPC_METHOD_NOT_FOUND':
    case 'RPC_INVALID_PARAMS':
      context.method = method;
      break;
    case 'RPC_SERVER_ERROR':
      context.message = rpcError.message;
      break;
  }

  return new SolanaError(errorCode, context, originalError);
}

/**
 * Parses a complete RPC response and extracts errors
 */
export function parseRpcResponse<T>(
  response: {
    jsonrpc?: string;
    id?: string | number | null;
    result?: T;
    error?: JsonRpcError;
  },
  method?: string,
): T {
  if (response.error) {
    throw parseRpcError(response.error, method);
  }

  if (response.result === undefined) {
    throw new SolanaError('RPC_INVALID_REQUEST', {
      message: 'Response missing both result and error fields',
      method,
    });
  }

  return response.result;
}

/**
 * Creates a SolanaError from a network or fetch error
 */
export function parseNetworkError(error: Error, method?: string): SolanaError {
  let errorCode: SolanaErrorCode = 'NETWORK_ERROR';
  const context: Record<string, unknown> = {
    originalMessage: error.message,
    method,
  };

  // Detect specific network error types
  if (error.name === 'AbortError') {
    errorCode = 'TIMEOUT_ERROR';
  } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
    errorCode = 'CONNECTION_ERROR';
  }

  return new SolanaError(errorCode, context, error);
}

/**
 * Type guard to check if an object is a JSON-RPC error
 */
export function isJsonRpcError(obj: unknown): obj is JsonRpcError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'code' in obj &&
    'message' in obj &&
    typeof (obj as JsonRpcError).code === 'number' &&
    typeof (obj as JsonRpcError).message === 'string'
  );
}
