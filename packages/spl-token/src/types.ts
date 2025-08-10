import type { Address } from '@photon/addresses';
import type { MintAddress } from './constants';

/**
 * Maximum supply for a token (2^64 - 1)
 */
export const MAX_SUPPLY = 18446744073709551615n; // 2^64 - 1

/**
 * Account state for token accounts
 */
export enum AccountState {
  /**
   * Account is not yet initialized
   */
  Uninitialized = 0,

  /**
   * Account is initialized and active
   */
  Initialized = 1,

  /**
   * Account is frozen (cannot perform transfers)
   */
  Frozen = 2,
}

/**
 * Authority types for SPL Token
 */
export enum AuthorityType {
  /**
   * Authority to mint new tokens
   */
  MintTokens = 0,

  /**
   * Authority to freeze token accounts
   */
  FreezeAccount = 1,

  /**
   * Authority over a token account (owner)
   */
  AccountOwner = 2,

  /**
   * Authority to close a token account
   */
  CloseAccount = 3,

  /**
   * Authority to transfer tokens from an account
   */
  TransferTokens = 4,

  /**
   * Authority to close the mint (Token-2022)
   */
  CloseMint = 5,

  /**
   * Authority for transfer fees (Token-2022)
   */
  TransferFeeConfig = 6,

  /**
   * Authority to withdraw withheld fees (Token-2022)
   */
  WithheldWithdraw = 7,

  /**
   * Authority to update interest rate (Token-2022)
   */
  InterestRate = 8,

  /**
   * Permanent delegate authority (Token-2022)
   */
  PermanentDelegate = 9,

  /**
   * Authority to update metadata (Token-2022)
   */
  MetadataPointer = 10,

  /**
   * Authority to update group (Token-2022)
   */
  GroupPointer = 11,

  /**
   * Authority to update group member (Token-2022)
   */
  GroupMemberPointer = 12,
}

/**
 * Token account data structure
 */
export interface TokenAccount {
  /**
   * The mint associated with this account
   */
  mint: MintAddress;

  /**
   * The owner of this account
   */
  owner: Address;

  /**
   * The amount of tokens in this account
   */
  amount: bigint;

  /**
   * Optional delegate for this account
   */
  delegate?: Address;

  /**
   * The account state
   */
  state: AccountState;

  /**
   * Whether this account holds wrapped native SOL
   */
  isNative?: boolean;

  /**
   * Amount delegated to the delegate
   */
  delegatedAmount?: bigint;

  /**
   * Optional authority to close this account
   */
  closeAuthority?: Address;

  /**
   * Extensions for Token-2022 (if applicable)
   */
  extensions?: TokenExtension[];
}

/**
 * Mint account data structure
 */
export interface MintAccount {
  /**
   * Total supply of tokens
   */
  supply: bigint;

  /**
   * Number of decimals for the token
   */
  decimals: number;

  /**
   * Whether the mint is initialized
   */
  isInitialized: boolean;

  /**
   * Optional authority to freeze token accounts
   */
  freezeAuthority?: Address;

  /**
   * Optional authority to mint new tokens
   */
  mintAuthority?: Address;

  /**
   * Extensions for Token-2022 (if applicable)
   */
  extensions?: TokenExtension[];
}

/**
 * Multisig account data structure
 */
export interface Multisig {
  /**
   * Number of signers required
   */
  m: number;

  /**
   * Total number of signers
   */
  n: number;

  /**
   * Whether the multisig is initialized
   */
  isInitialized: boolean;

  /**
   * Array of signer public keys
   */
  signers: Address[];
}

/**
 * Base interface for token extensions (Token-2022)
 */
export interface TokenExtension {
  /**
   * Type of the extension
   */
  type: ExtensionType;
}

/**
 * Extension types available in Token-2022
 */
export enum ExtensionType {
  Uninitialized = 0,
  TransferFeeConfig = 1,
  TransferFeeAmount = 2,
  MintCloseAuthority = 3,
  ConfidentialTransferMint = 4,
  ConfidentialTransferAccount = 5,
  DefaultAccountState = 6,
  ImmutableOwner = 7,
  MemoTransfer = 8,
  NonTransferable = 9,
  InterestBearingConfig = 10,
  CpiGuard = 11,
  PermanentDelegate = 12,
  NonTransferableAccount = 13,
  TransferHook = 14,
  TransferHookAccount = 15,
  MetadataPointer = 16,
  TokenMetadata = 17,
  GroupPointer = 18,
  GroupMemberPointer = 19,
  TokenGroup = 20,
  TokenGroupMember = 21,
}

/**
 * Transfer fee configuration extension
 */
export interface TransferFeeConfig extends TokenExtension {
  type: ExtensionType.TransferFeeConfig;
  transferFeeConfigAuthority?: Address;
  withdrawWithheldAuthority?: Address;
  withheldAmount: bigint;
  olderTransferFee: {
    epoch: bigint;
    maximumFee: bigint;
    transferFeeBasisPoints: number;
  };
  newerTransferFee: {
    epoch: bigint;
    maximumFee: bigint;
    transferFeeBasisPoints: number;
  };
}

/**
 * Interest bearing configuration extension
 */
export interface InterestBearingConfig extends TokenExtension {
  type: ExtensionType.InterestBearingConfig;
  rateAuthority?: Address;
  initializationTimestamp: number;
  preUpdateAverageRate: number;
  lastUpdateTimestamp: number;
  currentRate: number;
}

/**
 * Default account state extension
 */
export interface DefaultAccountState extends TokenExtension {
  type: ExtensionType.DefaultAccountState;
  state: AccountState;
}

/**
 * Permanent delegate extension
 */
export interface PermanentDelegateExtension extends TokenExtension {
  type: ExtensionType.PermanentDelegate;
  delegate?: Address;
}

/**
 * Transfer hook extension
 */
export interface TransferHookExtension extends TokenExtension {
  type: ExtensionType.TransferHook;
  authority?: Address;
  programId?: Address;
}

/**
 * Metadata pointer extension
 */
export interface MetadataPointerExtension extends TokenExtension {
  type: ExtensionType.MetadataPointer;
  authority?: Address;
  metadataAddress?: Address;
}

/**
 * Token metadata extension
 */
export interface TokenMetadataExtension extends TokenExtension {
  type: ExtensionType.TokenMetadata;
  updateAuthority?: Address;
  mint: MintAddress;
  name: string;
  symbol: string;
  uri: string;
  additionalMetadata: Array<[string, string]>;
}

/**
 * Mint close authority extension
 */
export interface MintCloseAuthorityExtension extends TokenExtension {
  type: ExtensionType.MintCloseAuthority;
  closeAuthority?: Address;
}

/**
 * Non-transferable extension
 */
export interface NonTransferableExtension extends TokenExtension {
  type: ExtensionType.NonTransferable;
}

/**
 * CPI Guard extension for token accounts
 */
export interface CpiGuardExtension extends TokenExtension {
  type: ExtensionType.CpiGuard;
  lockCpi: boolean;
}

/**
 * Immutable owner extension for token accounts
 */
export interface ImmutableOwnerExtension extends TokenExtension {
  type: ExtensionType.ImmutableOwner;
}

/**
 * Memo transfer extension for token accounts
 */
export interface MemoTransferExtension extends TokenExtension {
  type: ExtensionType.MemoTransfer;
  requireIncomingTransferMemos: boolean;
}
