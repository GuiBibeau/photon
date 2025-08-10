/**
 * @module @photon/spl-token
 *
 * SPL Token program support for the Photon SDK
 *
 * This package provides constants, types, and utilities for working with
 * SPL Token programs on Solana, including:
 * - Program IDs for Token, Token-2022, Associated Token, and Metadata programs
 * - Branded types for type-safe mint and token account addresses
 * - Common constants like NATIVE_MINT and standard decimal configurations
 * - Validation utilities for program and account identification
 *
 * @example
 * ```typescript
 * import { TOKEN_PROGRAM_ID, NATIVE_MINT, isTokenProgramId } from '@photon/spl-token';
 *
 * // Use the token program ID in instructions
 * const instruction = {
 *   programId: TOKEN_PROGRAM_ID,
 *   // ...
 * };
 *
 * // Check if an address is a token program
 * if (isTokenProgramId(someAddress)) {
 *   console.log('This is the SPL Token program');
 * }
 *
 * // Use the native mint for wrapped SOL
 * const wrappedSolMint = NATIVE_MINT;
 * ```
 */

// Re-export all constants and utilities
export * from './constants';
