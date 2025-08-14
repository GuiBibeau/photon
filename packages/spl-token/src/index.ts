/**
 * SPL Token utilities for Photon SDK
 *
 * @packageDocumentation
 */

// Re-export all instruction builders
export {
  createInitializeMintInstruction,
  createInitializeMint2Instruction,
  createInitializeAccountInstruction,
  createInitializeMultisigInstruction,
  createTransferInstruction,
  createMintToInstruction,
  createBurnInstruction,
  createApproveInstruction,
  createRevokeInstruction,
  createCloseAccountInstruction,
  createSetAuthorityInstruction,
  createFreezeAccountInstruction,
  createThawAccountInstruction,
} from './instructions.js';

// Re-export ATA utilities
export {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  isValidTokenProgram,
  getTokenProgramForMint,
} from './ata.js';

// Re-export helper functions
export {
  createMint,
  getOrCreateAssociatedTokenAccount,
  transferTokens,
  mintTokensTo,
  burnTokens,
  approveDelegate,
  closeTokenAccount,
  createTokenAccount,
} from './helpers.js';

// Re-export types
export {
  TokenInstruction,
  AuthorityType,
  type TokenAmount,
  type InitializeMintConfig,
  type TransferConfig,
  type MintToConfig,
  type BurnConfig,
  type ApproveConfig,
  type MultisigConfig,
} from './types.js';

// Re-export commonly used token addresses from @photon/addresses
export {
  TOKEN_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
} from '@photon/addresses';
