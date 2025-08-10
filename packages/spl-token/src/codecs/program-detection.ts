/**
 * Program version detection utilities for SPL Token.
 *
 * Provides functions to detect whether an account or instruction
 * belongs to the legacy Token program or Token-2022 program.
 */

import type { Address } from '@photon/addresses';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '../constants';
import { AccountTypeDiscriminator, isToken2022Account, detectAccountType } from './accounts';

/**
 * Program version enum.
 */
export enum ProgramVersion {
  /** Legacy SPL Token program */
  Token = 'token',
  /** Token-2022 program with extensions */
  Token2022 = 'token-2022',
  /** Unknown or invalid program */
  Unknown = 'unknown',
}

/**
 * Detect program version from program ID.
 *
 * @param programId - The program ID to check
 * @returns The detected program version
 */
export function detectProgramVersion(programId: Address | Uint8Array | string): ProgramVersion {
  const id =
    typeof programId === 'string'
      ? programId
      : programId instanceof Uint8Array
        ? bytesToBase58(programId)
        : programId;

  if (id === TOKEN_PROGRAM_ID) {
    return ProgramVersion.Token;
  }

  if (id === TOKEN_2022_PROGRAM_ID) {
    return ProgramVersion.Token2022;
  }

  return ProgramVersion.Unknown;
}

/**
 * Detect program version from account data.
 *
 * Analyzes account data to determine if it belongs to Token or Token-2022.
 * Token-2022 accounts have extensions that make them larger than legacy accounts.
 *
 * @param accountData - The account data bytes
 * @returns The detected program version
 */
export function detectProgramVersionFromAccount(accountData: Uint8Array): ProgramVersion {
  const accountType = detectAccountType(accountData);

  if (accountType === null || accountType === AccountTypeDiscriminator.Uninitialized) {
    return ProgramVersion.Unknown;
  }

  // Check if account has extensions (Token-2022)
  if (isToken2022Account(accountData, accountType)) {
    return ProgramVersion.Token2022;
  }

  // No extensions means legacy Token program
  return ProgramVersion.Token;
}

/**
 * Detect program version from instruction data.
 *
 * Some instructions are unique to Token-2022, allowing detection.
 *
 * @param instructionData - The instruction data bytes
 * @returns The detected program version
 */
export function detectProgramVersionFromInstruction(instructionData: Uint8Array): ProgramVersion {
  if (instructionData.length === 0) {
    return ProgramVersion.Unknown;
  }

  const instructionType = instructionData[0];
  
  if (instructionType === undefined) {
    return ProgramVersion.Unknown;
  }

  // Instructions 0-20 exist in both programs
  if (instructionType <= 20) {
    // These could be either program, need more context
    return ProgramVersion.Unknown;
  }

  // Instructions 21+ are Token-2022 specific
  if (instructionType >= 21) {
    return ProgramVersion.Token2022;
  }

  return ProgramVersion.Unknown;
}

/**
 * Get the appropriate program ID for a given version.
 *
 * @param version - The program version
 * @returns The program ID address
 */
export function getProgramIdForVersion(version: ProgramVersion): Address | null {
  switch (version) {
    case ProgramVersion.Token:
      return TOKEN_PROGRAM_ID as Address;
    case ProgramVersion.Token2022:
      return TOKEN_2022_PROGRAM_ID as Address;
    default:
      return null;
  }
}

/**
 * Check if a program version supports extensions.
 *
 * @param version - The program version to check
 * @returns True if the version supports extensions
 */
export function supportsExtensions(version: ProgramVersion): boolean {
  return version === ProgramVersion.Token2022;
}

/**
 * Validate that account data matches expected program version.
 *
 * @param accountData - The account data to validate
 * @param expectedVersion - The expected program version
 * @returns True if account data matches expected version
 */
export function validateAccountVersion(
  accountData: Uint8Array,
  expectedVersion: ProgramVersion,
): boolean {
  const detectedVersion = detectProgramVersionFromAccount(accountData);
  return detectedVersion === expectedVersion;
}

/**
 * Helper to convert bytes to base58 (simplified).
 * In production, this would use the proper base58 encoder.
 */
function bytesToBase58(bytes: Uint8Array): string {
  // This is a placeholder - in reality would use @photon/addresses base58 encoder
  return bytes.toString();
}
