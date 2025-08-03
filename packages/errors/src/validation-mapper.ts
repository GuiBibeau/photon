import { SolanaError } from './error';

/**
 * Creates a SolanaError for invalid address format
 */
export function createAddressFormatError(address: string, reason?: string): SolanaError {
  return new SolanaError('INVALID_ADDRESS_FORMAT', {
    address,
    reason: reason || 'Invalid base58 encoding or format',
  });
}

/**
 * Creates a SolanaError for invalid address length
 */
export function createAddressLengthError(address: string, actualLength: number): SolanaError {
  return new SolanaError('INVALID_ADDRESS_LENGTH', {
    address,
    length: actualLength,
    expected: 32,
  });
}

/**
 * Creates a SolanaError for general address validation failures
 */
export function createAddressValidationError(address: string, reason: string): SolanaError {
  // Choose the most specific error code based on the reason
  if (reason.includes('length')) {
    // Try to extract the actual length from the reason
    const lengthMatch = reason.match(/(\d+)/);
    const actualLength = lengthMatch?.[1] ? parseInt(lengthMatch[1], 10) : 0;
    return createAddressLengthError(address, actualLength);
  }

  if (reason.includes('format') || reason.includes('base58') || reason.includes('encoding')) {
    return createAddressFormatError(address, reason);
  }

  return new SolanaError('INVALID_ADDRESS', {
    address,
    reason,
  });
}

/**
 * Creates a SolanaError for invalid signature format
 */
export function createSignatureFormatError(signature: string, reason?: string): SolanaError {
  return new SolanaError('INVALID_SIGNATURE', {
    signature,
    reason: reason || 'Invalid signature format',
  });
}

/**
 * Creates a SolanaError for invalid signature length
 */
export function createSignatureLengthError(signature: string, actualLength: number): SolanaError {
  return new SolanaError('INVALID_SIGNATURE_LENGTH', {
    signature,
    length: actualLength,
    expected: 64,
  });
}

/**
 * Creates a SolanaError for general signature validation failures
 */
export function createSignatureValidationError(signature: string, reason: string): SolanaError {
  // Choose the most specific error code based on the reason
  if (reason.includes('length')) {
    // Try to extract the actual length from the reason
    const lengthMatch = reason.match(/(\d+)/);
    const actualLength = lengthMatch?.[1] ? parseInt(lengthMatch[1], 10) : 0;
    return createSignatureLengthError(signature, actualLength);
  }

  if (reason.includes('format') || reason.includes('base58') || reason.includes('encoding')) {
    return createSignatureFormatError(signature, reason);
  }

  return new SolanaError('INVALID_SIGNATURE', {
    signature,
    reason,
  });
}

/**
 * Creates a SolanaError for transaction size violations
 */
export function createTransactionSizeError(actualSize: number, maxSize: number): SolanaError {
  return new SolanaError('TRANSACTION_TOO_LARGE', {
    size: actualSize,
    maxSize,
    bytesOver: actualSize - maxSize,
  });
}

/**
 * Creates a SolanaError for insufficient signatures
 */
export function createInsufficientSignaturesError(required: number, found: number): SolanaError {
  return new SolanaError('INSUFFICIENT_SIGNATURES', {
    required,
    found,
    missing: required - found,
  });
}

/**
 * Creates a SolanaError for duplicate signatures
 */
export function createDuplicateSignatureError(signature: string, indexes?: number[]): SolanaError {
  return new SolanaError('DUPLICATE_SIGNATURE', {
    signature,
    indexes,
  });
}

/**
 * Creates a SolanaError for invalid account index
 */
export function createInvalidAccountIndexError(index: number, maxIndex?: number): SolanaError {
  return new SolanaError('INVALID_ACCOUNT_INDEX', {
    index,
    maxIndex,
  });
}

/**
 * Creates a SolanaError for invalid instruction data
 */
export function createInvalidInstructionDataError(reason?: string): SolanaError {
  return new SolanaError('INVALID_INSTRUCTION_DATA', {
    reason: reason || 'Invalid instruction data format or encoding',
  });
}

/**
 * Creates a SolanaError for keypair validation failures
 */
export function createInvalidKeypairError(reason?: string): SolanaError {
  return new SolanaError('INVALID_KEYPAIR', {
    reason: reason || 'Keypair validation failed',
  });
}

/**
 * Validates a base58 string format (basic check)
 */
export function validateBase58Format(value: string): boolean {
  // Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(value);
}

/**
 * Validates and throws appropriate errors for address format
 */
export function validateAddressFormat(address: string): void {
  if (typeof address !== 'string') {
    throw createAddressValidationError(String(address), 'Address must be a string');
  }

  if (address.length === 0) {
    throw createAddressValidationError(address, 'Address cannot be empty');
  }

  if (!validateBase58Format(address)) {
    throw createAddressFormatError(address, 'Invalid base58 characters in address');
  }

  // Additional validation can be added here (e.g., length checks after base58 decoding)
}

/**
 * Validates and throws appropriate errors for signature format
 */
export function validateSignatureFormat(signature: string): void {
  if (typeof signature !== 'string') {
    throw createSignatureValidationError(String(signature), 'Signature must be a string');
  }

  if (signature.length === 0) {
    throw createSignatureValidationError(signature, 'Signature cannot be empty');
  }

  if (!validateBase58Format(signature)) {
    throw createSignatureFormatError(signature, 'Invalid base58 characters in signature');
  }

  // Additional validation can be added here (e.g., length checks after base58 decoding)
}
