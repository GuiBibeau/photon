/**
 * Solana JSON-RPC API interface definition.
 *
 * This interface defines all standard RPC methods with proper parameter and return types,
 * providing type safety and IntelliSense support for RPC client implementations.
 */

import type { Address } from '@photon/addresses';
import type {
  AccountInfo,
  BlockCommitment,
  BlockInfo,
  BlockProduction,
  BlockhashInfo,
  ClusterNode,
  Commitment,
  EpochInfo,
  EpochSchedule,
  FeeRateGovernor,
  GetAccountInfoConfig,
  GetBlockConfig,
  GetMultipleAccountsConfig,
  GetProgramAccountsConfig,
  GetRecentPrioritizationFeesConfig,
  GetSignatureStatusesConfig,
  GetSignaturesForAddressConfig,
  GetStakeActivationConfig,
  GetTokenAccountsConfig,
  GetTransactionConfig,
  Identity,
  InflationGovernor,
  InflationRate,
  InflationReward,
  LeaderSchedule,
  PerfSample,
  PrioritizationFee,
  ProgramAccount,
  RecentBlockhash,
  RequestAirdropConfig,
  RpcResponse,
  SendTransactionConfig,
  SignatureInfo,
  SignatureStatus,
  SimulateTransactionConfig,
  SimulationResult,
  SlotRange,
  StakeActivation,
  Supply,
  TokenAccount,
  TokenAccountBalance,
  TokenAccountsFilter,
  TransactionError,
  Version,
  VoteAccount,
} from './types.js';

/**
 * Complete Solana JSON-RPC API interface.
 *
 * This interface provides type-safe method signatures for all Solana RPC endpoints.
 * Each method is fully documented with parameter descriptions and return types.
 */
export interface SolanaRpcApi {
  /**
   * Returns the balance of the account of provided address.
   *
   * @param address - Public key of the account to query
   * @param config - Optional configuration
   * @returns The account balance in lamports
   */
  getBalance(
    address: Address,
    config?: { commitment?: Commitment; minContextSlot?: number },
  ): Promise<RpcResponse<bigint>>;

  /**
   * Returns identity and transaction information about a confirmed block in the ledger.
   *
   * @param slot - Slot number
   * @param config - Optional configuration
   * @returns Block information or null if not found
   */
  getBlock(slot: number, config?: GetBlockConfig): Promise<BlockInfo | null>;

  /**
   * Returns the current block height of the node.
   *
   * @param config - Optional configuration
   * @returns The current block height
   */
  getBlockHeight(config?: { commitment?: Commitment; minContextSlot?: number }): Promise<number>;

  /**
   * Returns recent block production information from the current or previous epoch.
   *
   * @param config - Optional configuration
   * @returns Block production information
   */
  getBlockProduction(config?: {
    commitment?: Commitment;
    range?: SlotRange;
    identity?: Address;
  }): Promise<RpcResponse<BlockProduction>>;

  /**
   * Returns commitment for particular block.
   *
   * @param slot - Block slot
   * @returns Block commitment information
   */
  getBlockCommitment(slot: number): Promise<BlockCommitment>;

  /**
   * Returns a list of confirmed blocks between two slots.
   *
   * @param startSlot - Start slot (inclusive)
   * @param endSlot - End slot (inclusive), optional
   * @param config - Optional configuration
   * @returns Array of confirmed block slots
   */
  getBlocks(
    startSlot: number,
    endSlot?: number,
    config?: { commitment?: Commitment },
  ): Promise<number[]>;

  /**
   * Returns a list of confirmed blocks starting at the given slot.
   *
   * @param startSlot - Start slot (inclusive)
   * @param limit - Maximum number of blocks to return
   * @param config - Optional configuration
   * @returns Array of confirmed block slots
   */
  getBlocksWithLimit(
    startSlot: number,
    limit: number,
    config?: { commitment?: Commitment },
  ): Promise<number[]>;

  /**
   * Returns the estimated production time of a confirmed block.
   *
   * @param slot - Block slot
   * @returns Unix timestamp (seconds since epoch) or null
   */
  getBlockTime(slot: number): Promise<number | null>;

  /**
   * Returns information about all the nodes participating in the cluster.
   *
   * @returns Array of cluster node information
   */
  getClusterNodes(): Promise<ClusterNode[]>;

  /**
   * Returns information about the current epoch.
   *
   * @param config - Optional configuration
   * @returns Epoch information
   */
  getEpochInfo(config?: { commitment?: Commitment; minContextSlot?: number }): Promise<EpochInfo>;

  /**
   * Returns the epoch schedule information from this cluster's genesis config.
   *
   * @returns Epoch schedule information
   */
  getEpochSchedule(): Promise<EpochSchedule>;

  /**
   * Returns the fee rate governor information from the root bank.
   *
   * @returns Fee rate governor information
   */
  getFeeRateGovernor(): Promise<RpcResponse<FeeRateGovernor>>;

  /**
   * Returns the fee calculator associated with the query blockhash, or null if the blockhash has expired.
   *
   * @param blockhash - Query blockhash
   * @param config - Optional configuration
   * @returns Fee calculator information or null
   * @deprecated Use getFeeForMessage instead
   */
  getFeeCalculatorForBlockhash(
    blockhash: string,
    config?: { commitment?: Commitment },
  ): Promise<RpcResponse<{ feeCalculator: { lamportsPerSignature: bigint } } | null>>;

  /**
   * Get the fee the network will charge for a particular Message.
   *
   * @param message - Base64 encoded message
   * @param config - Optional configuration
   * @returns The fee in lamports
   */
  getFeeForMessage(
    message: string,
    config?: { commitment?: Commitment; minContextSlot?: number },
  ): Promise<RpcResponse<bigint | null>>;

  /**
   * Returns the slot of the lowest confirmed block that has not been purged from the ledger.
   *
   * @returns First available block slot
   */
  getFirstAvailableBlock(): Promise<number>;

  /**
   * Returns the genesis hash.
   *
   * @returns Genesis hash as base58 string
   */
  getGenesisHash(): Promise<string>;

  /**
   * Returns the current health of the node.
   *
   * @returns "ok" if healthy, error otherwise
   */
  getHealth(): Promise<'ok'>;

  /**
   * Returns the highest slot information that the node has snapshots for.
   *
   * @returns Highest snapshot slot information
   */
  getHighestSnapshotSlot(): Promise<{ full: number; incremental?: number }>;

  /**
   * Returns the identity pubkey for the current node.
   *
   * @returns Identity information
   */
  getIdentity(): Promise<Identity>;

  /**
   * Returns the current inflation governor.
   *
   * @param config - Optional configuration
   * @returns Inflation governor information
   */
  getInflationGovernor(config?: { commitment?: Commitment }): Promise<InflationGovernor>;

  /**
   * Returns the specific inflation values for the current epoch.
   *
   * @returns Inflation rate information
   */
  getInflationRate(): Promise<InflationRate>;

  /**
   * Returns the inflation rewards for a list of addresses for an epoch.
   *
   * @param addresses - Array of addresses to query
   * @param config - Optional configuration
   * @returns Array of inflation rewards (null if no reward)
   */
  getInflationReward(
    addresses: Address[],
    config?: { commitment?: Commitment; epoch?: number; minContextSlot?: number },
  ): Promise<(InflationReward | null)[]>;

  /**
   * Returns the 20 largest accounts, by lamport balance.
   *
   * @param config - Optional configuration
   * @returns Large accounts information
   */
  getLargestAccounts(config?: {
    commitment?: Commitment;
    filter?: 'circulating' | 'nonCirculating';
  }): Promise<RpcResponse<Array<{ address: Address; lamports: bigint }>>>;

  /**
   * Returns the latest blockhash.
   *
   * @param config - Optional configuration
   * @returns Latest blockhash information
   */
  getLatestBlockhash(config?: {
    commitment?: Commitment;
    minContextSlot?: number;
  }): Promise<RpcResponse<BlockhashInfo>>;

  /**
   * Returns the leader schedule for an epoch.
   *
   * @param slot - Fetch the leader schedule for the epoch that corresponds to the provided slot
   * @param config - Optional configuration
   * @returns Leader schedule or null
   */
  getLeaderSchedule(
    slot?: number,
    config?: { commitment?: Commitment; identity?: Address },
  ): Promise<LeaderSchedule>;

  /**
   * Get the max slot seen from retransmit stage.
   *
   * @returns Maximum retransmit slot
   */
  getMaxRetransmitSlot(): Promise<number>;

  /**
   * Get the max slot seen from after shred insert.
   *
   * @returns Maximum shred insert slot
   */
  getMaxShredInsertSlot(): Promise<number>;

  /**
   * Returns minimum balance required to make account rent exempt.
   *
   * @param dataLength - Account data length
   * @param config - Optional configuration
   * @returns Minimum balance in lamports
   */
  getMinimumBalanceForRentExemption(
    dataLength: number,
    config?: { commitment?: Commitment },
  ): Promise<bigint>;

  /**
   * Returns the account information for a list of addresses.
   *
   * @param addresses - Array of addresses to query
   * @param config - Optional configuration
   * @returns Array of account information (null if account doesn't exist)
   */
  getMultipleAccounts(
    addresses: Address[],
    config?: GetMultipleAccountsConfig,
  ): Promise<RpcResponse<(AccountInfo | null)[]>>;

  /**
   * Returns all accounts owned by the provided program address.
   *
   * @param programId - Program address
   * @param config - Optional configuration
   * @returns Array of program accounts or response with context
   */
  getProgramAccounts(
    programId: Address,
    config?: GetProgramAccountsConfig,
  ): Promise<ProgramAccount[] | RpcResponse<ProgramAccount[]>>;

  /**
   * Returns a recent block hash from the ledger.
   *
   * @param config - Optional configuration
   * @returns Recent blockhash information
   * @deprecated Use getLatestBlockhash instead
   */
  getRecentBlockhash(config?: { commitment?: Commitment }): Promise<RpcResponse<RecentBlockhash>>;

  /**
   * Returns a list of recent performance samples.
   *
   * @param limit - Number of samples to return (max 720)
   * @returns Array of performance samples
   */
  getRecentPerformanceSamples(limit?: number): Promise<PerfSample[]>;

  /**
   * Returns a list of prioritization fees from recent blocks.
   *
   * @param config - Optional configuration
   * @returns Array of prioritization fees
   */
  getRecentPrioritizationFees(
    config?: GetRecentPrioritizationFeesConfig,
  ): Promise<PrioritizationFee[]>;

  /**
   * Returns all account info for the given public key.
   *
   * @param address - Address of the account to query
   * @param config - Optional configuration
   * @returns Account information or null if account doesn't exist
   */
  getAccountInfo(
    address: Address,
    config?: GetAccountInfoConfig,
  ): Promise<RpcResponse<AccountInfo | null>>;

  /**
   * Returns confirmed signatures for transactions involving an address.
   *
   * @param address - Account address
   * @param config - Optional configuration
   * @returns Array of signature information
   */
  getSignaturesForAddress(
    address: Address,
    config?: GetSignaturesForAddressConfig,
  ): Promise<SignatureInfo[]>;

  /**
   * Returns the statuses of a list of signatures.
   *
   * @param signatures - Array of transaction signatures
   * @param config - Optional configuration
   * @returns Array of signature statuses (null if not found)
   */
  getSignatureStatuses(
    signatures: string[],
    config?: GetSignatureStatusesConfig,
  ): Promise<RpcResponse<(SignatureStatus | null)[]>>;

  /**
   * Returns the slot that has reached the given or default commitment level.
   *
   * @param config - Optional configuration
   * @returns Current slot
   */
  getSlot(config?: { commitment?: Commitment; minContextSlot?: number }): Promise<number>;

  /**
   * Returns the current slot leader.
   *
   * @param config - Optional configuration
   * @returns Current slot leader address
   */
  getSlotLeader(config?: { commitment?: Commitment; minContextSlot?: number }): Promise<Address>;

  /**
   * Returns the slot leaders for a given slot range.
   *
   * @param startSlot - Start slot (inclusive)
   * @param limit - Limit (between 1 and 5000)
   * @returns Array of slot leader addresses
   */
  getSlotLeaders(startSlot: number, limit: number): Promise<Address[]>;

  /**
   * Returns the stake activation state for a given stake account.
   *
   * @param address - Stake account address
   * @param config - Optional configuration
   * @returns Stake activation information
   */
  getStakeActivation(address: Address, config?: GetStakeActivationConfig): Promise<StakeActivation>;

  /**
   * Returns the stake minimum delegation, in lamports.
   *
   * @param config - Optional configuration
   * @returns Minimum delegation amount in lamports
   */
  getStakeMinimumDelegation(config?: { commitment?: Commitment }): Promise<RpcResponse<bigint>>;

  /**
   * Returns information about the current supply.
   *
   * @param config - Optional configuration
   * @returns Supply information
   */
  getSupply(config?: {
    commitment?: Commitment;
    excludeNonCirculatingAccountsList?: boolean;
  }): Promise<RpcResponse<Supply>>;

  /**
   * Returns the token balance of an SPL Token account.
   *
   * @param address - Token account address
   * @param config - Optional configuration
   * @returns Token account balance
   */
  getTokenAccountBalance(
    address: Address,
    config?: { commitment?: Commitment },
  ): Promise<RpcResponse<TokenAccountBalance>>;

  /**
   * Returns all SPL Token accounts by approved Delegate.
   *
   * @param address - Account delegate address
   * @param filter - Token accounts filter
   * @param config - Optional configuration
   * @returns Array of token accounts
   */
  getTokenAccountsByDelegate(
    address: Address,
    filter: TokenAccountsFilter,
    config?: GetTokenAccountsConfig,
  ): Promise<RpcResponse<TokenAccount[]>>;

  /**
   * Returns all SPL Token accounts by token owner.
   *
   * @param address - Account owner address
   * @param filter - Token accounts filter
   * @param config - Optional configuration
   * @returns Array of token accounts
   */
  getTokenAccountsByOwner(
    address: Address,
    filter: TokenAccountsFilter,
    config?: GetTokenAccountsConfig,
  ): Promise<RpcResponse<TokenAccount[]>>;

  /**
   * Returns the 20 largest accounts of a particular SPL Token mint.
   *
   * @param mint - Token mint address
   * @param config - Optional configuration
   * @returns Array of largest token accounts
   */
  getTokenLargestAccounts(
    mint: Address,
    config?: { commitment?: Commitment },
  ): Promise<
    RpcResponse<
      Array<{
        address: Address;
        amount: string;
        decimals: number;
        uiAmount: number | null;
        uiAmountString: string;
      }>
    >
  >;

  /**
   * Returns the total supply of an SPL Token mint.
   *
   * @param mint - Token mint address
   * @param config - Optional configuration
   * @returns Token supply information
   */
  getTokenSupply(
    mint: Address,
    config?: { commitment?: Commitment },
  ): Promise<RpcResponse<TokenAccountBalance>>;

  /**
   * Returns transaction details for a confirmed transaction.
   *
   * @param signature - Transaction signature
   * @param config - Optional configuration
   * @returns Transaction information or null if not found
   */
  getTransaction(
    signature: string,
    config?: GetTransactionConfig,
  ): Promise<TransactionWithMeta | null>;

  /**
   * Returns the current transaction count from the ledger.
   *
   * @param config - Optional configuration
   * @returns Total transaction count
   */
  getTransactionCount(config?: {
    commitment?: Commitment;
    minContextSlot?: number;
  }): Promise<number>;

  /**
   * Returns the current Solana version running on the node.
   *
   * @returns Version information
   */
  getVersion(): Promise<Version>;

  /**
   * Returns the account info and associated stake for all the voting accounts in the current bank.
   *
   * @param config - Optional configuration
   * @returns Vote accounts information
   */
  getVoteAccounts(config?: {
    commitment?: Commitment;
    votePubkey?: Address;
    keepUnstakedDelinquents?: boolean;
    delinquentSlotDistance?: number;
  }): Promise<{
    current: VoteAccount[];
    delinquent: VoteAccount[];
  }>;

  /**
   * Returns whether a blockhash is still valid or not.
   *
   * @param blockhash - The blockhash to validate
   * @param config - Optional configuration
   * @returns Whether the blockhash is valid
   */
  isBlockhashValid(
    blockhash: string,
    config?: { commitment?: Commitment; minContextSlot?: number },
  ): Promise<RpcResponse<boolean>>;

  /**
   * Returns the lowest slot that the node has information about in its ledger.
   *
   * @returns Minimum ledger slot
   */
  minimumLedgerSlot(): Promise<number>;

  /**
   * Requests an airdrop of lamports to an address.
   *
   * @param address - Address to receive lamports
   * @param lamports - Amount to airdrop in lamports
   * @param config - Optional configuration
   * @returns Transaction signature
   */
  requestAirdrop(
    address: Address,
    lamports: bigint,
    config?: RequestAirdropConfig,
  ): Promise<string>;

  /**
   * Submits a signed transaction to the cluster for processing.
   *
   * @param transaction - Signed transaction (base58 or base64 encoded)
   * @param config - Optional configuration
   * @returns Transaction signature
   */
  sendTransaction(transaction: string, config?: SendTransactionConfig): Promise<string>;

  /**
   * Simulate sending a transaction.
   *
   * @param transaction - Transaction to simulate (base58 or base64 encoded)
   * @param config - Optional configuration
   * @returns Simulation result
   */
  simulateTransaction(
    transaction: string,
    config?: SimulateTransactionConfig,
  ): Promise<RpcResponse<SimulationResult>>;
}

/**
 * Transaction with metadata.
 */
export interface TransactionWithMeta {
  slot: number;
  transaction: {
    signatures: string[];
    message: {
      accountKeys: string[];
      header: {
        numRequiredSignatures: number;
        numReadonlySignedAccounts: number;
        numReadonlyUnsignedAccounts: number;
      };
      recentBlockhash: string;
      instructions: Array<{
        programIdIndex: number;
        accounts: number[];
        data: string;
      }>;
      addressTableLookups?: Array<{
        accountKey: string;
        writableIndexes: number[];
        readonlyIndexes: number[];
      }>;
    };
  };
  meta: {
    err: TransactionError | null;
    fee: bigint;
    preBalances: bigint[];
    postBalances: bigint[];
    innerInstructions?: Array<{
      index: number;
      instructions: Array<{
        programIdIndex: number;
        accounts: number[];
        data: string;
      }>;
    }>;
    logMessages?: string[];
    preTokenBalances?: Array<{
      accountIndex: number;
      mint: string;
      uiTokenAmount: {
        amount: string;
        decimals: number;
        uiAmount: number | null;
        uiAmountString: string;
      };
      owner?: string;
      programId?: string;
    }>;
    postTokenBalances?: Array<{
      accountIndex: number;
      mint: string;
      uiTokenAmount: {
        amount: string;
        decimals: number;
        uiAmount: number | null;
        uiAmountString: string;
      };
      owner?: string;
      programId?: string;
    }>;
    rewards?: Array<{
      pubkey: string;
      lamports: bigint;
      postBalance: bigint;
      rewardType: 'fee' | 'rent' | 'staking' | 'voting';
      commission?: number;
    }> | null;
    loadedAddresses?: {
      writable: string[];
      readonly: string[];
    };
    returnData?: {
      programId: string;
      data: [string, 'base64'];
    };
    computeUnitsConsumed?: bigint;
  };
  blockTime?: number | null;
  version?: 'legacy' | 0;
}
