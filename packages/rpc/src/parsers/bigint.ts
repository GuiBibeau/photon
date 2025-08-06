/**
 * BigInt parsing utilities for RPC responses.
 *
 * Handles conversion of numeric values that may exceed JavaScript's
 * Number.MAX_SAFE_INTEGER to BigInt.
 */

/**
 * Parse a value that might be a bigint.
 * Handles both numbers and strings that represent large integers.
 */
export function parseBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new Error(`Cannot convert non-integer number ${value} to BigInt`);
    }
    return BigInt(value);
  }

  if (typeof value === 'string') {
    // Remove any whitespace and validate
    const trimmed = value.trim();
    if (!/^-?\d+$/.test(trimmed)) {
      throw new Error(`Invalid BigInt string: ${value}`);
    }
    return BigInt(trimmed);
  }

  throw new Error(`Cannot convert ${typeof value} to BigInt`);
}

/**
 * Parse a value that might be a bigint or null.
 */
export function parseBigIntOrNull(value: unknown): bigint | null {
  if (value === null || value === undefined) {
    return null;
  }
  return parseBigInt(value);
}

/**
 * Parse a value that might be a bigint, with a default value.
 */
export function parseBigIntWithDefault(value: unknown, defaultValue: bigint): bigint {
  try {
    if (value === null || value === undefined) {
      return defaultValue;
    }
    return parseBigInt(value);
  } catch {
    return defaultValue;
  }
}

/**
 * Check if a numeric value should be represented as BigInt.
 * Values larger than MAX_SAFE_INTEGER need BigInt for accuracy.
 */
export function needsBigInt(value: number | string): boolean {
  if (typeof value === 'string') {
    try {
      const num = Number(value);
      return !Number.isSafeInteger(num);
    } catch {
      return true;
    }
  }
  return !Number.isSafeInteger(value);
}

/**
 * Parse a potentially large numeric value from RPC response.
 * Automatically uses BigInt for values that exceed safe integer range.
 */
export function parseNumeric(value: unknown): number | bigint {
  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Try to parse as number first
    const num = Number(trimmed);
    if (!isNaN(num) && Number.isSafeInteger(num)) {
      return num;
    }

    // Use BigInt for large values
    if (/^-?\d+$/.test(trimmed)) {
      return BigInt(trimmed);
    }

    throw new Error(`Invalid numeric value: ${value}`);
  }

  throw new Error(`Cannot parse numeric value from ${typeof value}`);
}

/**
 * Convert a BigInt to a number, throwing if it would lose precision.
 */
export function bigIntToNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error(`BigInt ${value} cannot be safely converted to number`);
  }
  return Number(value);
}

/**
 * Convert a BigInt to a number, returning null if it would lose precision.
 */
export function bigIntToNumberSafe(value: bigint): number | null {
  try {
    return bigIntToNumber(value);
  } catch {
    return null;
  }
}
