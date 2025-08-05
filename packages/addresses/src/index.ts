/**
 * Address utilities for Solana addresses.
 *
 * This module provides type-safe address handling with validation and conversion utilities.
 * All Solana addresses are 32-byte public keys encoded as base58 strings.
 */

import { decodeBase58, encodeBase58, isBase58 } from '@photon/codecs/primitives/base58';
import {
  createAddressFormatError,
  createAddressLengthError,
  createAddressValidationError,
} from '@photon/errors';

/**
 * Length of a Solana address in bytes.
 */
export const ADDRESS_BYTE_LENGTH = 32;

/**
 * Type-safe Address type that cannot be confused with regular strings.
 * This is an opaque type that requires validation through the `address()` function.
 */
export type Address = string & { readonly __brand: unique symbol };

/**
 * Parse and validate a base58 string as a Solana address.
 *
 * @param value - The base58 string to parse
 * @returns A validated Address type
 * @throws {SolanaError} If the string is not a valid 32-byte base58 address
 */
export function address(value: string): Address {
  if (typeof value !== 'string') {
    throw createAddressValidationError(String(value), 'Address must be a string');
  }

  if (!isBase58(value)) {
    throw createAddressFormatError(value, 'Address contains invalid base58 characters');
  }

  let bytes: Uint8Array;
  try {
    bytes = decodeBase58(value);
  } catch (error) {
    throw createAddressFormatError(
      value,
      `Failed to decode base58 address: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  if (bytes.length !== ADDRESS_BYTE_LENGTH) {
    throw createAddressLengthError(value, bytes.length);
  }

  return value as Address;
}

/**
 * Extract the raw bytes from an Address.
 *
 * @param addr - The address to convert
 * @returns The 32-byte Uint8Array representation
 */
export function getAddressBytes(addr: Address): Uint8Array {
  // Since Address is validated, this should never throw
  return decodeBase58(addr);
}

/**
 * Type guard to check if a value is a valid Address.
 * Note: This only checks runtime validity, not the type brand.
 *
 * @param value - The value to check
 * @returns True if the value is a valid address string
 */
export function isAddress(value: unknown): value is Address {
  if (typeof value !== 'string') {
    return false;
  }

  if (!isBase58(value)) {
    return false;
  }

  try {
    const bytes = decodeBase58(value);
    return bytes.length === ADDRESS_BYTE_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Assert that a value is a valid Address, throwing if not.
 * This can be used to convert validated strings to the Address type.
 *
 * @param value - The value to assert
 * @param message - Optional custom error message
 * @throws {SolanaError} If the value is not a valid address
 */
export function assertAddress(value: unknown, message?: string): asserts value is Address {
  if (!isAddress(value)) {
    throw createAddressValidationError(
      String(value),
      message ?? 'Value is not a valid Solana address',
    );
  }
}

/**
 * Compare two addresses for equality.
 *
 * @param a - First address
 * @param b - Second address
 * @returns True if the addresses are equal
 */
export function addressesEqual(a: Address, b: Address): boolean {
  return a === b;
}

/**
 * Compare two addresses for sorting purposes.
 *
 * @param a - First address
 * @param b - Second address
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareAddresses(a: Address, b: Address): -1 | 0 | 1 {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

/**
 * Create an Address from raw bytes.
 *
 * @param bytes - The 32-byte array
 * @returns The Address representation
 * @throws {SolanaError} If bytes is not 32 bytes long
 */
export function addressFromBytes(bytes: Uint8Array): Address {
  if (bytes.length !== ADDRESS_BYTE_LENGTH) {
    throw createAddressLengthError('bytes', bytes.length);
  }

  const base58String = encodeBase58(bytes);
  return base58String as Address;
}

// Well-known addresses
/**
 * The System Program address.
 * This program is responsible for account creation, transfer of lamports, and assignment of account ownership.
 */
export const SYSTEM_PROGRAM_ADDRESS = address('11111111111111111111111111111112');

/**
 * The SPL Token Program address.
 * This program is responsible for token operations like creating mints, accounts, and transfers.
 */
export const TOKEN_PROGRAM_ADDRESS = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

/**
 * The SPL Token 2022 Program address.
 * This is the newer version of the token program with additional features.
 */
export const TOKEN_2022_PROGRAM_ADDRESS = address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

/**
 * The native SOL mint address.
 * Used to represent SOL in token operations (wrapped SOL).
 */
export const NATIVE_MINT_ADDRESS = address('So11111111111111111111111111111111111111112');

/**
 * The SPL Associated Token Account Program address.
 * This program manages associated token accounts.
 */
export const ASSOCIATED_TOKEN_PROGRAM_ADDRESS = address(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

// Address derivation utilities
export {
  getAddressFromPublicKey,
  getAddressFromPublicKeyBytes,
  getAddressFromPublicKeyAsync,
} from './derive.js';

// Program Derived Address (PDA) utilities
export {
  createProgramAddress,
  findProgramAddressSync,
  isProgramAddress,
  isProgramAddressSync,
  createPdaSeed,
  createPdaSeedFromNumber,
} from './pda.js';
