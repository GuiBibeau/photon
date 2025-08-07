import type { Address } from '@photon/addresses';
import type { Signature } from '@photon/crypto';
import type { Signer, SignerInfo, SigningResult } from './interface.js';

/**
 * Check if a value implements the Signer interface
 */
export function isSigner(value: unknown): value is Signer {
  return (
    value !== null &&
    typeof value === 'object' &&
    'publicKey' in value &&
    'sign' in value &&
    typeof (value as Record<string, unknown>).publicKey === 'string' &&
    typeof (value as Record<string, unknown>).sign === 'function'
  );
}

/**
 * Check if a value is a SignerInfo object
 */
export function isSignerInfo(value: unknown): value is SignerInfo {
  return (
    value !== null &&
    typeof value === 'object' &&
    'publicKey' in value &&
    'isFeePayer' in value &&
    'isWritable' in value &&
    typeof (value as Record<string, unknown>).publicKey === 'string' &&
    typeof (value as Record<string, unknown>).isFeePayer === 'boolean' &&
    typeof (value as Record<string, unknown>).isWritable === 'boolean'
  );
}

/**
 * Check if a value is a SigningResult
 */
export function isSigningResult(value: unknown): value is SigningResult {
  return (
    value !== null &&
    typeof value === 'object' &&
    'publicKey' in value &&
    'signature' in value &&
    typeof (value as Record<string, unknown>).publicKey === 'string' &&
    (value as Record<string, unknown>).signature instanceof Uint8Array
  );
}

/**
 * Check if a value is a valid signature
 */
export function isValidSignature(value: unknown): value is Signature {
  return value instanceof Uint8Array && value.length === 64;
}

/**
 * Check if a value is a valid public key address
 */
export function isValidAddress(value: unknown): value is Address {
  if (typeof value !== 'string') {
    return false;
  }

  // Simple validation: check if it's a base58 string of appropriate length
  // Solana addresses are typically 32-44 characters
  const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return BASE58_REGEX.test(value);
}

/**
 * Assert that a value is a Signer
 */
export function assertSigner(value: unknown): asserts value is Signer {
  if (!isSigner(value)) {
    throw new Error('Value is not a valid Signer');
  }
}

/**
 * Assert that a value is a SignerInfo
 */
export function assertSignerInfo(value: unknown): asserts value is SignerInfo {
  if (!isSignerInfo(value)) {
    throw new Error('Value is not a valid SignerInfo');
  }
}

/**
 * Assert that a value is a valid signature
 */
export function assertValidSignature(value: unknown): asserts value is Signature {
  if (!isValidSignature(value)) {
    throw new Error('Value is not a valid 64-byte signature');
  }
}

/**
 * Assert that a value is a valid address
 */
export function assertValidAddress(value: unknown): asserts value is Address {
  if (!isValidAddress(value)) {
    throw new Error('Value is not a valid base58-encoded address');
  }
}

/**
 * Validate signer collection for common issues
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSignerCollection(
  signers: readonly Signer[],
  feePayer?: Address,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (signers.length === 0) {
    errors.push('No signers provided');
  }

  const publicKeys = new Set<Address>();
  const duplicates: Address[] = [];

  for (const signer of signers) {
    if (!isSigner(signer)) {
      errors.push(`Invalid signer object for public key: ${String(signer)}`);
      continue;
    }

    if (!isValidAddress(signer.publicKey)) {
      errors.push(`Invalid public key address: ${signer.publicKey}`);
    }

    if (publicKeys.has(signer.publicKey)) {
      duplicates.push(signer.publicKey);
    }
    publicKeys.add(signer.publicKey);
  }

  if (duplicates.length > 0) {
    warnings.push(`Duplicate signers found: ${duplicates.join(', ')}`);
  }

  if (feePayer) {
    if (!isValidAddress(feePayer)) {
      errors.push(`Invalid fee payer address: ${feePayer}`);
    } else if (!publicKeys.has(feePayer)) {
      errors.push(`Fee payer ${feePayer} not found in signers collection`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
