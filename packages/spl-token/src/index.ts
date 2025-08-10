/**
 * @module @photon/spl-token
 *
 * SPL Token program support for the Photon SDK
 *
 * This package provides constants, types, and utilities for working with
 * SPL Token programs on Solana, including:
 * - Program IDs for Token, Token-2022, Associated Token, and Metadata programs
 * - Comprehensive type definitions for accounts, instructions, and extensions
 * - Branded types for type-safe mint and token account addresses
 * - Common constants like NATIVE_MINT and standard decimal configurations
 * - Validation utilities for program and account identification
 * - Full support for Token-2022 extensions
 * - Codecs for encoding/decoding accounts, instructions, and extensions
 *
 * @example
 * ```typescript
 * import {
 *   TOKEN_PROGRAM_ID,
 *   NATIVE_MINT,
 *   isTokenProgramId,
 *   type TokenAccount,
 *   type MintAccount,
 *   AccountState,
 *   TokenInstruction
 * } from '@photon/spl-token';
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
 * // Use typed account structures
 * const tokenAccount: TokenAccount = {
 *   mint: someMintAddress,
 *   owner: someOwnerAddress,
 *   amount: 1000000n,
 *   state: AccountState.Initialized,
 *   // ...
 * };
 * ```
 */

// Re-export all constants and utilities
export * from './constants';

// Re-export all types
export * from './types';

// Re-export all instruction types
export * from './instructions';

// Re-export codec functions and types (avoid conflicting exports)
export {
  // Account codecs
  tokenAccountCodec,
  mintAccountCodec,
  multisigCodec,
  detectAccountType,
  isToken2022Account,
  AccountTypeDiscriminator,
  // Re-export ACCOUNT_SIZE with an alias to avoid conflict
  ACCOUNT_SIZE as TOKEN_ACCOUNT_SIZES,
} from './codecs/accounts';

export {
  // Instruction codecs
  initializeMintCodec,
  initializeAccountCodec,
  initializeMultisigCodec,
  transferCodec,
  approveCodec,
  revokeCodec,
  setAuthorityCodec,
  mintToCodec,
  burnCodec,
  closeAccountCodec,
  freezeAccountCodec,
  thawAccountCodec,
  transferCheckedCodec,
  approveCheckedCodec,
  mintToCheckedCodec,
  burnCheckedCodec,
  initializeAccount2Codec,
  syncNativeCodec,
  initializeAccount3Codec,
  initializeMultisig2Codec,
  initializeMint2Codec,
  decodeTokenInstruction,
  encodeTokenInstruction,
  // Types from instruction codecs
  type InitializeMintData,
  type InitializeMultisigData,
  type TransferData,
  type ApproveData,
  type SetAuthorityData,
  type MintToData,
  type BurnData,
  type TransferCheckedData,
  type ApproveCheckedData,
  type MintToCheckedData,
  type BurnCheckedData,
  type InitializeAccount2Data,
  type InitializeAccount3Data,
  type InitializeMultisig2Data,
  type InitializeMint2Data,
  // Don't re-export TokenInstructionData as it conflicts
} from './codecs/instructions';

export {
  // Extension codecs
  transferFeeConfigCodec,
  interestBearingConfigCodec,
  defaultAccountStateCodec,
  mintCloseAuthorityCodec,
  permanentDelegateCodec,
  transferHookCodec,
  metadataPointerCodec,
  nonTransferableCodec,
  cpiGuardCodec,
  immutableOwnerCodec,
  memoTransferCodec,
  getExtensionCodec,
  createExtensionTlvCodec,
  getExtensionSize,
  isExtensionSupported,
  extensionSupport,
} from './codecs/extensions';

export {
  // TLV utilities
  parseTlv,
  encodeTlv,
  findTlvEntry,
  findAllTlvEntries,
  calculateTlvSize,
  tlvCodec,
  LazyTlvParser,
  type TlvEntry,
  type TlvParseResult,
} from './codecs/tlv';

export {
  // Program detection utilities
  detectProgramVersion,
  detectProgramVersionFromAccount,
  detectProgramVersionFromInstruction,
  getProgramIdForVersion,
  supportsExtensions,
  validateAccountVersion,
  ProgramVersion,
} from './codecs/program-detection';
