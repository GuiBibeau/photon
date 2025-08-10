import type { Address } from '@photon/addresses';
import type { AccountState, AuthorityType } from './types';

/**
 * SPL Token instruction types
 */
export enum TokenInstruction {
  /**
   * Initialize a new mint
   */
  InitializeMint = 0,

  /**
   * Initialize a new token account
   */
  InitializeAccount = 1,

  /**
   * Initialize a multisig account
   */
  InitializeMultisig = 2,

  /**
   * Transfer tokens between accounts
   */
  Transfer = 3,

  /**
   * Approve a delegate
   */
  Approve = 4,

  /**
   * Revoke a delegate
   */
  Revoke = 5,

  /**
   * Set authority on a mint or account
   */
  SetAuthority = 6,

  /**
   * Mint new tokens
   */
  MintTo = 7,

  /**
   * Burn tokens from an account
   */
  Burn = 8,

  /**
   * Close a token account
   */
  CloseAccount = 9,

  /**
   * Freeze a token account
   */
  FreezeAccount = 10,

  /**
   * Thaw a frozen token account
   */
  ThawAccount = 11,

  /**
   * Transfer with decimals check
   */
  TransferChecked = 12,

  /**
   * Approve with decimals check
   */
  ApproveChecked = 13,

  /**
   * Mint with decimals check
   */
  MintToChecked = 14,

  /**
   * Burn with decimals check
   */
  BurnChecked = 15,

  /**
   * Initialize account with seed
   */
  InitializeAccount2 = 16,

  /**
   * Sync native SOL balance
   */
  SyncNative = 17,

  /**
   * Initialize account with owner and close authority
   */
  InitializeAccount3 = 18,

  /**
   * Initialize multisig with seed
   */
  InitializeMultisig2 = 19,

  /**
   * Initialize mint with decimals and freeze authority
   */
  InitializeMint2 = 20,

  /**
   * Get account data size (Token-2022)
   */
  GetAccountDataSize = 21,

  /**
   * Initialize immutable owner (Token-2022)
   */
  InitializeImmutableOwner = 22,

  /**
   * Reallocate account space (Token-2022)
   */
  Reallocate = 23,

  /**
   * Create native mint (Token-2022)
   */
  CreateNativeMint = 24,

  /**
   * Initialize non-transferable mint (Token-2022)
   */
  InitializeNonTransferableMint = 25,

  /**
   * Enable CPI guard (Token-2022)
   */
  EnableCpiGuard = 26,

  /**
   * Disable CPI guard (Token-2022)
   */
  DisableCpiGuard = 27,

  /**
   * Enable required memo transfers (Token-2022)
   */
  EnableRequiredMemoTransfers = 28,

  /**
   * Disable required memo transfers (Token-2022)
   */
  DisableRequiredMemoTransfers = 29,

  /**
   * Transfer with fee (Token-2022)
   */
  TransferCheckedWithFee = 30,

  /**
   * Withdraw withheld tokens (Token-2022)
   */
  WithdrawWithheldTokensFromMint = 31,

  /**
   * Withdraw withheld tokens from accounts (Token-2022)
   */
  WithdrawWithheldTokensFromAccounts = 32,

  /**
   * Harvest withheld tokens to mint (Token-2022)
   */
  HarvestWithheldTokensToMint = 33,

  /**
   * Update default account state (Token-2022)
   */
  UpdateDefaultAccountState = 34,

  /**
   * Update transfer hook program (Token-2022)
   */
  UpdateTransferHook = 35,

  /**
   * Update metadata pointer (Token-2022)
   */
  UpdateMetadataPointer = 36,

  /**
   * Initialize metadata (Token-2022)
   */
  InitializeMetadata = 37,

  /**
   * Update metadata field (Token-2022)
   */
  UpdateMetadataField = 38,

  /**
   * Remove metadata field (Token-2022)
   */
  RemoveMetadataField = 39,

  /**
   * Update metadata authority (Token-2022)
   */
  UpdateMetadataAuthority = 40,

  /**
   * Puff out metadata (Token-2022)
   */
  PuffMetadata = 41,

  /**
   * Update interest rate (Token-2022)
   */
  UpdateInterestRate = 42,

  /**
   * Initialize permanent delegate (Token-2022)
   */
  InitializePermanentDelegate = 43,

  /**
   * Update group pointer (Token-2022)
   */
  UpdateGroupPointer = 44,

  /**
   * Update group member pointer (Token-2022)
   */
  UpdateGroupMemberPointer = 45,

  /**
   * Initialize group (Token-2022)
   */
  InitializeGroup = 46,

  /**
   * Update group max size (Token-2022)
   */
  UpdateGroupMaxSize = 47,

  /**
   * Update group authority (Token-2022)
   */
  UpdateGroupAuthority = 48,

  /**
   * Initialize group member (Token-2022)
   */
  InitializeGroupMember = 49,

  /**
   * Close mint (Token-2022)
   */
  CloseMint = 50,
}

/**
 * Initialize mint instruction data
 */
export interface InitializeMintInstructionData {
  instruction: TokenInstruction.InitializeMint;
  decimals: number;
  mintAuthority: Address;
  freezeAuthority?: Address;
}

/**
 * Initialize account instruction data
 */
export interface InitializeAccountInstructionData {
  instruction: TokenInstruction.InitializeAccount;
}

/**
 * Transfer instruction data
 */
export interface TransferInstructionData {
  instruction: TokenInstruction.Transfer;
  amount: bigint;
}

/**
 * Transfer checked instruction data
 */
export interface TransferCheckedInstructionData {
  instruction: TokenInstruction.TransferChecked;
  amount: bigint;
  decimals: number;
}

/**
 * Mint to instruction data
 */
export interface MintToInstructionData {
  instruction: TokenInstruction.MintTo;
  amount: bigint;
}

/**
 * Mint to checked instruction data
 */
export interface MintToCheckedInstructionData {
  instruction: TokenInstruction.MintToChecked;
  amount: bigint;
  decimals: number;
}

/**
 * Burn instruction data
 */
export interface BurnInstructionData {
  instruction: TokenInstruction.Burn;
  amount: bigint;
}

/**
 * Burn checked instruction data
 */
export interface BurnCheckedInstructionData {
  instruction: TokenInstruction.BurnChecked;
  amount: bigint;
  decimals: number;
}

/**
 * Approve instruction data
 */
export interface ApproveInstructionData {
  instruction: TokenInstruction.Approve;
  amount: bigint;
}

/**
 * Approve checked instruction data
 */
export interface ApproveCheckedInstructionData {
  instruction: TokenInstruction.ApproveChecked;
  amount: bigint;
  decimals: number;
}

/**
 * Set authority instruction data
 */
export interface SetAuthorityInstructionData {
  instruction: TokenInstruction.SetAuthority;
  authorityType: AuthorityType;
  newAuthority?: Address;
}

/**
 * Close account instruction data
 */
export interface CloseAccountInstructionData {
  instruction: TokenInstruction.CloseAccount;
}

/**
 * Freeze account instruction data
 */
export interface FreezeAccountInstructionData {
  instruction: TokenInstruction.FreezeAccount;
}

/**
 * Thaw account instruction data
 */
export interface ThawAccountInstructionData {
  instruction: TokenInstruction.ThawAccount;
}

/**
 * Revoke instruction data
 */
export interface RevokeInstructionData {
  instruction: TokenInstruction.Revoke;
}

/**
 * Sync native instruction data
 */
export interface SyncNativeInstructionData {
  instruction: TokenInstruction.SyncNative;
}

/**
 * Initialize mint 2 instruction data
 */
export interface InitializeMint2InstructionData {
  instruction: TokenInstruction.InitializeMint2;
  decimals: number;
  mintAuthority: Address;
  freezeAuthority?: Address;
}

/**
 * Initialize account 3 instruction data
 */
export interface InitializeAccount3InstructionData {
  instruction: TokenInstruction.InitializeAccount3;
  owner: Address;
}

/**
 * Initialize multisig instruction data
 */
export interface InitializeMultisigInstructionData {
  instruction: TokenInstruction.InitializeMultisig;
  m: number;
}

/**
 * Transfer with fee instruction data (Token-2022)
 */
export interface TransferCheckedWithFeeInstructionData {
  instruction: TokenInstruction.TransferCheckedWithFee;
  amount: bigint;
  decimals: number;
  fee: bigint;
}

/**
 * Update default account state instruction data (Token-2022)
 */
export interface UpdateDefaultAccountStateInstructionData {
  instruction: TokenInstruction.UpdateDefaultAccountState;
  state: AccountState;
}

/**
 * Close mint instruction data (Token-2022)
 */
export interface CloseMintInstructionData {
  instruction: TokenInstruction.CloseMint;
}

/**
 * Union type for all instruction data
 */
export type TokenInstructionData =
  | InitializeMintInstructionData
  | InitializeAccountInstructionData
  | TransferInstructionData
  | TransferCheckedInstructionData
  | MintToInstructionData
  | MintToCheckedInstructionData
  | BurnInstructionData
  | BurnCheckedInstructionData
  | ApproveInstructionData
  | ApproveCheckedInstructionData
  | SetAuthorityInstructionData
  | CloseAccountInstructionData
  | FreezeAccountInstructionData
  | ThawAccountInstructionData
  | RevokeInstructionData
  | SyncNativeInstructionData
  | InitializeMint2InstructionData
  | InitializeAccount3InstructionData
  | InitializeMultisigInstructionData
  | TransferCheckedWithFeeInstructionData
  | UpdateDefaultAccountStateInstructionData
  | CloseMintInstructionData;
