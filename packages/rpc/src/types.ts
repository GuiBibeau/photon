/**
 * Core RPC type definitions for the Solana JSON-RPC API.
 *
 * This module provides comprehensive TypeScript types for all Solana RPC methods,
 * ensuring type safety and excellent developer experience.
 */

import type { Address } from '@photon/addresses';

/**
 * Commitment levels for transaction and account state.
 *
 * - processed: Query the most recent block which has reached 1 confirmation by the connected node
 * - confirmed: Query the most recent block which has reached 1 confirmation by the cluster
 * - finalized: Query the most recent block which has been finalized by the cluster
 */
export type Commitment = 'processed' | 'confirmed' | 'finalized';

/**
 * Encoding options for account data.
 */
export type Encoding = 'base58' | 'base64' | 'base64+zstd' | 'jsonParsed';

/**
 * Transaction encoding options.
 */
export type TransactionEncoding = 'base58' | 'base64' | 'json' | 'jsonParsed';

/**
 * Transaction version.
 */
export type TransactionVersion = 'legacy' | 0;

/**
 * Transaction signature string.
 */
export type TransactionSignature = string;

/**
 * Transaction details level.
 */
export type TransactionDetails = 'full' | 'accounts' | 'signatures' | 'none';

/**
 * Signature status information.
 */
export interface SignatureStatus {
  slot: number;
  confirmations: number | null;
  err: TransactionError | null;
  confirmationStatus?: Commitment;
}

/**
 * Transaction error type.
 */
export type TransactionError =
  | string
  | {
      InstructionError: [number, InstructionError];
    }
  | {
      InsufficientFundsForRent: { account_index: number };
    };

/**
 * Instruction-level error types.
 */
export type InstructionError =
  | 'GenericError'
  | 'InvalidArgument'
  | 'InvalidInstructionData'
  | 'InvalidAccountData'
  | 'AccountDataTooSmall'
  | 'InsufficientFunds'
  | 'IncorrectProgramId'
  | 'MissingRequiredSignature'
  | 'AccountAlreadyInitialized'
  | 'UninitializedAccount'
  | 'UnbalancedInstruction'
  | 'ModifiedProgramId'
  | 'ExternalAccountLamportSpend'
  | 'ExternalAccountDataModified'
  | 'ReadonlyLamportChange'
  | 'ReadonlyDataModified'
  | 'DuplicateAccountIndex'
  | 'ExecutableModified'
  | 'RentEpochModified'
  | 'NotEnoughAccountKeys'
  | 'AccountDataSizeChanged'
  | 'AccountNotExecutable'
  | 'AccountBorrowFailed'
  | 'AccountBorrowOutstanding'
  | 'DuplicateAccountOutOfSync'
  | 'Custom'
  | 'InvalidError'
  | 'ExecutableDataModified'
  | 'ExecutableLamportChange'
  | 'ExecutableAccountNotRentExempt'
  | 'UnsupportedProgramId'
  | 'CallDepth'
  | 'MissingAccount'
  | 'ReentrancyNotAllowed'
  | 'MaxSeedLengthExceeded'
  | 'InvalidSeeds'
  | 'InvalidRealloc'
  | 'ComputationalBudgetExceeded'
  | 'PrivilegeEscalation'
  | 'ProgramEnvironmentSetupFailure'
  | 'ProgramFailedToComplete'
  | 'ProgramFailedToCompile'
  | 'Immutable'
  | 'IncorrectAuthority'
  | 'BorshIoError'
  | 'AccountNotRentExempt'
  | 'InvalidAccountOwner'
  | 'ArithmeticOverflow'
  | 'UnsupportedSysvar'
  | 'IllegalOwner'
  | 'MaxAccountsDataSizeExceeded'
  | 'MaxAccountsExceeded';

/**
 * Context information returned with RPC responses.
 */
export interface Context {
  slot: number;
  apiVersion?: string;
}

/**
 * Response wrapper with context.
 */
export interface RpcResponse<T> {
  context: Context;
  value: T;
}

/**
 * Account information structure.
 */
export interface AccountInfo<TData = string | Uint8Array | ParsedAccountData> {
  lamports: bigint;
  owner: Address;
  data: TData;
  executable: boolean;
  rentEpoch: bigint;
  size?: number;
}

/**
 * Parsed account data structure.
 */
export interface ParsedAccountData {
  program: string;
  parsed: unknown;
  space: number;
}

/**
 * Supply information.
 */
export interface Supply {
  total: bigint;
  circulating: bigint;
  nonCirculating: bigint;
  nonCirculatingAccounts: Address[];
}

/**
 * Token amount with decimals.
 */
export interface TokenAmount {
  amount: string;
  decimals: number;
  uiAmount: number | null;
  uiAmountString: string;
}

/**
 * Block production information.
 */
export interface BlockProduction {
  byIdentity: Record<string, [number, number]>;
  range: {
    firstSlot: number;
    lastSlot: number;
  };
}

/**
 * Block commitment information.
 */
export interface BlockCommitment {
  commitment: (bigint | null)[];
  totalStake: bigint;
}

/**
 * Blockhash information with validity.
 */
export interface BlockhashInfo {
  blockhash: string;
  lastValidBlockHeight: bigint;
}

/**
 * Fee calculator (deprecated but still used in some methods).
 */
export interface FeeCalculator {
  lamportsPerSignature: bigint;
}

/**
 * Recent blockhash response (deprecated).
 */
export interface RecentBlockhash {
  blockhash: string;
  feeCalculator: FeeCalculator;
}

/**
 * Block information.
 */
export interface BlockInfo {
  blockhash: string;
  previousBlockhash: string;
  parentSlot: number;
  transactions: TransactionInfo[];
  rewards?: Reward[];
  blockTime: number | null;
  blockHeight: number | null;
}

/**
 * Transaction information in a block.
 */
export interface TransactionInfo {
  transaction: Transaction | string;
  meta: TransactionMeta | null;
  version?: TransactionVersion;
}

/**
 * Transaction structure.
 */
export interface Transaction {
  signatures: string[];
  message: Message;
}

/**
 * Transaction message structure.
 */
export interface Message {
  accountKeys: string[];
  header: MessageHeader;
  recentBlockhash: string;
  instructions: CompiledInstruction[];
  addressTableLookups?: AddressTableLookup[];
}

/**
 * Message header.
 */
export interface MessageHeader {
  numRequiredSignatures: number;
  numReadonlySignedAccounts: number;
  numReadonlyUnsignedAccounts: number;
}

/**
 * Compiled instruction.
 */
export interface CompiledInstruction {
  programIdIndex: number;
  accounts: number[];
  data: string;
}

/**
 * Address table lookup for versioned transactions.
 */
export interface AddressTableLookup {
  accountKey: string;
  writableIndexes: number[];
  readonlyIndexes: number[];
}

/**
 * Transaction metadata.
 */
export interface TransactionMeta {
  err: TransactionError | null;
  fee: bigint;
  preBalances: bigint[];
  postBalances: bigint[];
  innerInstructions?: InnerInstruction[];
  preTokenBalances?: TokenBalance[];
  postTokenBalances?: TokenBalance[];
  logMessages?: string[];
  rewards?: Reward[] | null;
  loadedAddresses?: {
    writable: string[];
    readonly: string[];
  };
  returnData?: {
    programId: string;
    data: [string, Encoding];
  };
  computeUnitsConsumed?: bigint;
}

/**
 * Inner instruction structure.
 */
export interface InnerInstruction {
  index: number;
  instructions: CompiledInstruction[];
}

/**
 * Token balance information.
 */
export interface TokenBalance {
  accountIndex: number;
  mint: string;
  owner?: string;
  programId?: string;
  uiTokenAmount: TokenAmount;
}

/**
 * Reward information.
 */
export interface Reward {
  pubkey: string;
  lamports: bigint;
  postBalance: bigint;
  rewardType: RewardType;
  commission?: number;
}

/**
 * Reward types.
 */
export type RewardType = 'fee' | 'rent' | 'staking' | 'voting';

/**
 * Cluster node information.
 */
export interface ClusterNode {
  pubkey: string;
  gossip: string | null;
  tpu: string | null;
  rpc: string | null;
  version: string | null;
  featureSet?: number | null;
  shredVersion?: number | null;
}

/**
 * Epoch information.
 */
export interface EpochInfo {
  epoch: bigint;
  slotIndex: bigint;
  slotsInEpoch: bigint;
  absoluteSlot: bigint;
  blockHeight?: bigint;
  transactionCount?: bigint;
}

/**
 * Epoch schedule information.
 */
export interface EpochSchedule {
  slotsPerEpoch: bigint;
  leaderScheduleSlotOffset: bigint;
  warmup: boolean;
  firstNormalEpoch: bigint;
  firstNormalSlot: bigint;
}

/**
 * Fee rate governor.
 */
export interface FeeRateGovernor {
  burnPercent: number;
  maxLamportsPerSignature: bigint;
  minLamportsPerSignature: bigint;
  targetLamportsPerSignature: bigint;
  targetSignaturesPerSlot: bigint;
}

/**
 * Identity information.
 */
export interface Identity {
  identity: string;
}

/**
 * Inflation governor.
 */
export interface InflationGovernor {
  initial: number;
  terminal: number;
  taper: number;
  foundation: number;
  foundationTerm: number;
}

/**
 * Inflation rate.
 */
export interface InflationRate {
  total: number;
  validator: number;
  foundation: number;
  epoch: bigint;
}

/**
 * Inflation reward.
 */
export interface InflationReward {
  epoch: bigint;
  effectiveSlot: bigint;
  amount: bigint;
  postBalance: bigint;
  commission?: number;
}

/**
 * Leader schedule.
 */
export type LeaderSchedule = Record<string, number[]> | null;

/**
 * Performance sample.
 */
export interface PerfSample {
  slot: bigint;
  numTransactions: bigint;
  numSlots: bigint;
  samplePeriodSecs: number;
}

/**
 * Prioritization fee.
 */
export interface PrioritizationFee {
  slot: bigint;
  prioritizationFee: bigint;
}

/**
 * Program account information.
 */
export interface ProgramAccount {
  pubkey: Address;
  account: AccountInfo;
}

/**
 * Get program accounts response type.
 */
export type GetProgramAccountsResponse = ProgramAccount;

/**
 * Signature information for recent transactions.
 */
export interface SignatureInfo {
  signature: string;
  slot: number;
  err: TransactionError | null;
  memo: string | null;
  blockTime: number | null;
  confirmationStatus?: Commitment;
}

/**
 * Slot range.
 */
export interface SlotRange {
  firstSlot: number;
  lastSlot: number;
}

/**
 * Stake activation information.
 */
export interface StakeActivation {
  state: 'active' | 'inactive' | 'activating' | 'deactivating';
  active: bigint;
  inactive: bigint;
}

/**
 * Token account balance.
 */
export interface TokenAccountBalance {
  amount: string;
  decimals: number;
  uiAmount: number | null;
  uiAmountString: string;
}

/**
 * Token account information.
 */
export interface TokenAccount {
  pubkey: Address;
  account: AccountInfo<ParsedAccountData>;
}

/**
 * Transaction simulation result.
 */
export interface SimulationResult {
  err: TransactionError | null;
  logs: string[] | null;
  accounts: (AccountInfo | null)[] | null;
  unitsConsumed?: bigint;
  returnData?: {
    programId: string;
    data: [string, Encoding];
  } | null;
}

/**
 * Simulate transaction response type.
 */
export type SimulateTransactionResponse = SimulationResult;

/**
 * Transaction with metadata.
 */
export interface TransactionWithMeta {
  slot: number;
  transaction: Transaction;
  meta: TransactionMeta | null;
  blockTime?: number | null;
  version?: TransactionVersion;
}

/**
 * Version information.
 */
export interface Version {
  'solana-core': string;
  'feature-set'?: number;
}

/**
 * Vote account information.
 */
export interface VoteAccount {
  votePubkey: string;
  nodePubkey: string;
  activatedStake: bigint;
  epochVoteAccount: boolean;
  commission: number;
  lastVote: bigint;
  epochCredits: Array<[bigint, bigint, bigint]>;
  rootSlot: bigint;
}

/**
 * Configuration options for RPC requests.
 */
export interface RpcConfig {
  commitment?: Commitment;
  minContextSlot?: number;
  encoding?: Encoding;
}

/**
 * Configuration for send transaction.
 */
export interface SendTransactionConfig {
  skipPreflight?: boolean;
  preflightCommitment?: Commitment;
  encoding?: TransactionEncoding;
  maxRetries?: number;
  minContextSlot?: number;
}

/**
 * Configuration for simulate transaction.
 */
export interface SimulateTransactionConfig {
  sigVerify?: boolean;
  commitment?: Commitment;
  encoding?: TransactionEncoding;
  replaceRecentBlockhash?: boolean;
  accounts?: {
    encoding?: Encoding;
    addresses: Address[];
  };
  minContextSlot?: number;
}

/**
 * Configuration for get account info.
 */
export interface GetAccountInfoConfig {
  commitment?: Commitment;
  encoding?: Encoding;
  dataSlice?: {
    offset: number;
    length: number;
  };
  minContextSlot?: number;
}

/**
 * Configuration for get multiple accounts.
 */
export interface GetMultipleAccountsConfig {
  commitment?: Commitment;
  encoding?: Encoding;
  dataSlice?: {
    offset: number;
    length: number;
  };
  minContextSlot?: number;
}

/**
 * Configuration for get program accounts.
 */
export interface GetProgramAccountsConfig {
  commitment?: Commitment;
  encoding?: Encoding;
  dataSlice?: {
    offset: number;
    length: number;
  };
  filters?: Array<
    | { dataSize: number }
    | { memcmp: { offset: number; bytes: string; encoding?: 'base58' | 'base64' } }
  >;
  withContext?: boolean;
  minContextSlot?: number;
}

/**
 * Configuration for get block.
 */
export interface GetBlockConfig {
  encoding?: TransactionEncoding;
  transactionDetails?: TransactionDetails;
  rewards?: boolean;
  commitment?: Commitment;
  maxSupportedTransactionVersion?: number;
}

/**
 * Configuration for get transaction.
 */
export interface GetTransactionConfig {
  encoding?: TransactionEncoding;
  commitment?: Commitment;
  maxSupportedTransactionVersion?: number;
}

/**
 * Configuration for get signatures for address.
 */
export interface GetSignaturesForAddressConfig {
  limit?: number;
  before?: string;
  until?: string;
  commitment?: Commitment;
  minContextSlot?: number;
}

/**
 * Configuration for get signature statuses.
 */
export interface GetSignatureStatusesConfig {
  searchTransactionHistory?: boolean;
}

/**
 * Configuration for get recent prioritization fees.
 */
export interface GetRecentPrioritizationFeesConfig {
  lockedWritableAccounts?: Address[];
}

/**
 * Configuration for get stake activation.
 */
export interface GetStakeActivationConfig {
  commitment?: Commitment;
  epoch?: number;
  minContextSlot?: number;
}

/**
 * Configuration for get token accounts.
 */
export interface GetTokenAccountsConfig {
  commitment?: Commitment;
  encoding?: Encoding;
  dataSlice?: {
    offset: number;
    length: number;
  };
  minContextSlot?: number;
}

/**
 * Token accounts filter.
 */
export interface TokenAccountsFilter {
  mint?: Address;
  programId?: Address;
}

/**
 * Configuration for request airdrop.
 */
export interface RequestAirdropConfig {
  commitment?: Commitment;
}

/**
 * Data slice for partial data fetching.
 */
export interface DataSlice {
  offset: number;
  length: number;
}

/**
 * Memory comparison filter.
 */
export interface MemcmpFilter {
  offset: number;
  bytes: string;
  encoding?: 'base58' | 'base64';
}

/**
 * Program account filter.
 */
export type AccountFilter = { dataSize: number } | { memcmp: MemcmpFilter };
