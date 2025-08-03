/**
 * Error handling utilities for codec operations.
 *
 * These utilities provide consistent error handling patterns
 * across all codec implementations.
 */

/**
 * Error thrown when codec operations fail.
 */
export class CodecError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CodecError';
  }
}

/**
 * Error thrown when there are insufficient bytes to decode.
 */
export class InsufficientBytesError extends CodecError {
  constructor(required: number, available: number, offset: number = 0) {
    super(`Insufficient bytes: required ${required}, available ${available}, offset ${offset}`, {
      required,
      available,
      offset,
    });
    this.name = 'InsufficientBytesError';
  }
}

/**
 * Error thrown when decoded data doesn't match expected format.
 */
export class InvalidDataError extends CodecError {
  constructor(message: string, data?: Uint8Array, offset?: number) {
    super(message, { data: data?.slice(0, 32), offset });
    this.name = 'InvalidDataError';
  }
}

/**
 * Validate that sufficient bytes are available for decoding.
 *
 * @param bytes The byte array
 * @param offset The starting offset
 * @param required The number of bytes required
 * @throws {InsufficientBytesError} If insufficient bytes are available
 */
export function assertSufficientBytes(bytes: Uint8Array, offset: number, required: number): void {
  const available = bytes.length - offset;
  if (available < required) {
    throw new InsufficientBytesError(required, available, offset);
  }
}

/**
 * Validate that an offset is within bounds.
 *
 * @param bytes The byte array
 * @param offset The offset to validate
 * @throws {CodecError} If offset is out of bounds
 */
export function assertValidOffset(bytes: Uint8Array, offset: number): void {
  if (offset < 0 || offset > bytes.length) {
    throw new CodecError(`Invalid offset: ${offset} (array length: ${bytes.length})`);
  }
}
