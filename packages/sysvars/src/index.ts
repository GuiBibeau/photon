/**
 * System variables (sysvars) are special accounts that contain cluster state data.
 *
 * Sysvars are updated by the runtime and provide programs with cluster state information
 * without needing to pass it through instructions. Programs can access sysvars through
 * their well-known addresses.
 *
 * @module @photon/sysvars
 */

import { type Address, address } from '@photon/addresses';
import { type Codec, struct, u8, u64, boolean } from '@photon/codecs';
import type { RpcClient, Commitment, RpcResponse, AccountInfo } from '@photon/rpc';
import { decodeBase64 } from '@photon/rpc/parsers/base64';

/**
 * Clock sysvar contains data on cluster time including the current slot,
 * epoch, and estimated wall-clock Unix timestamp.
 *
 * The Clock sysvar is updated every slot and provides:
 * - slot: Current slot
 * - epoch: Current epoch
 * - unix_timestamp: Estimated Unix timestamp
 * - epoch_start_timestamp: Unix timestamp at start of current epoch
 * - leader_schedule_epoch: The epoch for which the leader schedule is valid
 *
 * @see https://docs.solana.com/developing/runtime-facilities/sysvars#clock
 */
export const SYSVAR_CLOCK_ADDRESS: Address = address('SysvarC1ock11111111111111111111111111111111');

/**
 * EpochSchedule sysvar contains information about epoch scheduling including
 * the number of slots per epoch and timing of leader schedule calculations.
 *
 * This sysvar is static after network boot and provides:
 * - slots_per_epoch: Number of slots in each epoch
 * - leader_schedule_slot_offset: Number of slots before epoch start to calculate leader schedule
 * - warmup: Whether epochs are in the warmup period
 * - first_normal_epoch: First epoch after warmup
 * - first_normal_slot: First slot after warmup
 *
 * @see https://docs.solana.com/developing/runtime-facilities/sysvars#epochschedule
 */
export const SYSVAR_EPOCH_SCHEDULE_ADDRESS: Address = address(
  'SysvarEpochSchedu1e111111111111111111111111',
);

/**
 * Instructions sysvar contains serialized instructions from the current transaction.
 *
 * This sysvar allows programs to access and validate instructions within the same
 * transaction, which is useful for implementing checks and program composability.
 *
 * @see https://docs.solana.com/developing/runtime-facilities/sysvars#instructions
 */
export const SYSVAR_INSTRUCTIONS_ADDRESS: Address = address(
  'Sysvar1nstructions1111111111111111111111111',
);

/**
 * RecentBlockhashes sysvar contains recent block hashes for transaction deduplication
 * and age verification.
 *
 * This sysvar maintains a queue of recent blockhashes (approximately 150) that can be
 * used as the recent_blockhash in transactions. Each entry includes the blockhash
 * and the fee calculator for that block.
 *
 * @deprecated Use SYSVAR_RECENT_BLOCKHASHES_ADDRESS for compatibility only.
 * New code should get recent blockhash from the getLatestBlockhash RPC method.
 *
 * @see https://docs.solana.com/developing/runtime-facilities/sysvars#recentblockhashes
 */
export const SYSVAR_RECENT_BLOCKHASHES_ADDRESS: Address = address(
  'SysvarRecentB1ockHashes11111111111111111111',
);

/**
 * Rent sysvar contains the current cluster rent configuration.
 *
 * The Rent sysvar provides:
 * - lamports_per_byte_year: Rent rate in lamports per byte-year
 * - exemption_threshold: Multiplier for minimum balance to be rent-exempt (typically 2 years)
 * - burn_percent: Percentage of collected rent that is burned (vs distributed to validators)
 *
 * Programs can use this to calculate minimum balances for rent exemption.
 *
 * @see https://docs.solana.com/developing/runtime-facilities/sysvars#rent
 */
export const SYSVAR_RENT_ADDRESS: Address = address('SysvarRent111111111111111111111111111111111');

/**
 * SlotHashes sysvar contains recent slot hashes for proof of history verification.
 *
 * This sysvar maintains a history of recent slot hashes (approximately 512 slots).
 * Each entry contains a slot number and the corresponding hash. This is primarily
 * used by the runtime for fork detection and proof of history verification.
 *
 * @see https://docs.solana.com/developing/runtime-facilities/sysvars#slothashes
 */
export const SYSVAR_SLOT_HASHES_ADDRESS: Address = address(
  'SysvarS1otHashes111111111111111111111111111',
);

/**
 * SlotHistory sysvar contains a bit vector of historical slot presence.
 *
 * This sysvar maintains a bit vector indicating which recent slots (up to ~1 million)
 * were processed by the cluster. This is used for fork detection and to determine
 * if a particular slot was skipped.
 *
 * @see https://docs.solana.com/developing/runtime-facilities/sysvars#slothistory
 */
export const SYSVAR_SLOT_HISTORY_ADDRESS: Address = address(
  'SysvarS1otHistory11111111111111111111111111',
);

/**
 * StakeHistory sysvar contains historical stake activations and deactivations.
 *
 * This sysvar maintains cluster-wide historical staking information for recent epochs,
 * including the amount of stake that was active and deactivating in each epoch.
 * This information is used by the stake program to properly calculate rewards.
 *
 * @see https://docs.solana.com/developing/runtime-facilities/sysvars#stakehistory
 */
export const SYSVAR_STAKE_HISTORY_ADDRESS: Address = address(
  'SysvarStakeHistory1111111111111111111111111',
);

/**
 * Fees sysvar contains current cluster fee configuration.
 *
 * @deprecated This sysvar has been deprecated. Use the getFeeForMessage RPC method
 * to calculate transaction fees instead.
 *
 * @see https://docs.solana.com/developing/runtime-facilities/sysvars#fees
 */
export const SYSVAR_FEES_ADDRESS: Address = address('SysvarFees111111111111111111111111111111111');

/**
 * EpochRewards sysvar contains rewards distribution information for the current epoch.
 *
 * This sysvar provides information about validator rewards being distributed in the
 * current epoch, including total rewards and distribution progress. It's updated at
 * the beginning of each epoch during reward distribution.
 *
 * @see https://docs.solana.com/developing/runtime-facilities/sysvars#epochrewards
 */
export const SYSVAR_EPOCH_REWARDS_ADDRESS: Address = address(
  'SysvarEpochRewards1111111111111111111111111',
);

/**
 * LastRestartSlot sysvar contains the slot number of the last cluster restart.
 *
 * This sysvar stores the slot at which the cluster was last restarted from a snapshot
 * or genesis. This can be useful for determining cluster uptime and detecting restarts.
 *
 * @see https://docs.solana.com/developing/runtime-facilities/sysvars#lastrestartslot
 */
export const SYSVAR_LAST_RESTART_SLOT_ADDRESS: Address = address(
  'SysvarLastRestartS1ot1111111111111111111111',
);

/**
 * Collection of all sysvar addresses for easy access and iteration.
 * Useful for programs that need to check if an account is a sysvar.
 */
export const SYSVAR_ADDRESSES = {
  clock: SYSVAR_CLOCK_ADDRESS,
  epochSchedule: SYSVAR_EPOCH_SCHEDULE_ADDRESS,
  instructions: SYSVAR_INSTRUCTIONS_ADDRESS,
  recentBlockhashes: SYSVAR_RECENT_BLOCKHASHES_ADDRESS,
  rent: SYSVAR_RENT_ADDRESS,
  slotHashes: SYSVAR_SLOT_HASHES_ADDRESS,
  slotHistory: SYSVAR_SLOT_HISTORY_ADDRESS,
  stakeHistory: SYSVAR_STAKE_HISTORY_ADDRESS,
  fees: SYSVAR_FEES_ADDRESS,
  epochRewards: SYSVAR_EPOCH_REWARDS_ADDRESS,
  lastRestartSlot: SYSVAR_LAST_RESTART_SLOT_ADDRESS,
} as const;

/**
 * Check if an address is a known sysvar address.
 *
 * @param addr - The address to check
 * @returns true if the address is a known sysvar, false otherwise
 *
 * @example
 * ```typescript
 * if (isSysvarAddress(accountAddress)) {
 *   console.log('This is a system variable account');
 * }
 * ```
 */
export function isSysvarAddress(addr: Address): boolean {
  // Compare by string value, not reference
  return Object.values(SYSVAR_ADDRESSES).some((sysvarAddr) => sysvarAddr === addr);
}

/**
 * Get the name of a sysvar from its address.
 *
 * @param addr - The sysvar address
 * @returns The name of the sysvar or undefined if not a known sysvar
 *
 * @example
 * ```typescript
 * const name = getSysvarName(SYSVAR_CLOCK_ADDRESS);
 * console.log(name); // 'clock'
 * ```
 */
export function getSysvarName(addr: Address): keyof typeof SYSVAR_ADDRESSES | undefined {
  for (const [name, address] of Object.entries(SYSVAR_ADDRESSES)) {
    if (address === addr) {
      return name as keyof typeof SYSVAR_ADDRESSES;
    }
  }
  return undefined;
}

// ============================================================================
// Sysvar Data Structures
// ============================================================================

/**
 * Clock sysvar data structure containing cluster time information
 */
export interface ClockSysvar {
  /** Current slot */
  slot: bigint;
  /** Current epoch */
  epoch: bigint;
  /** Leader schedule epoch */
  leaderScheduleEpoch: bigint;
  /** Estimated current Unix timestamp */
  unixTimestamp: bigint;
  /** Unix timestamp at start of current epoch */
  epochStartTimestamp: bigint;
}

/**
 * Rent sysvar data structure containing rent configuration
 */
export interface RentSysvar {
  /** Lamports per byte-year */
  lamportsPerByteYear: bigint;
  /** Exemption threshold in years */
  exemptionThreshold: number;
  /** Burn percentage */
  burnPercent: number;
}

/**
 * Epoch schedule sysvar data structure
 */
export interface EpochScheduleSysvar {
  /** Number of slots per epoch */
  slotsPerEpoch: bigint;
  /** Number of slots before epoch start to calculate leader schedule */
  leaderScheduleSlotOffset: bigint;
  /** Whether epochs are in warmup period */
  warmup: boolean;
  /** First normal epoch after warmup */
  firstNormalEpoch: bigint;
  /** First normal slot after warmup */
  firstNormalSlot: bigint;
}

/**
 * Recent blockhashes entry
 */
export interface RecentBlockhashEntry {
  /** The blockhash */
  blockhash: string;
  /** Fee calculator (deprecated, will be 0) */
  lamportsPerSignature: bigint;
}

/**
 * Recent blockhashes sysvar data structure
 */
export interface RecentBlockhashesSysvar {
  /** Array of recent blockhash entries */
  entries: RecentBlockhashEntry[];
}

/**
 * Stake history entry for a single epoch
 */
export interface StakeHistoryEntry {
  /** Effective stake for the epoch */
  effective: bigint;
  /** Activating stake for the epoch */
  activating: bigint;
  /** Deactivating stake for the epoch */
  deactivating: bigint;
}

/**
 * Stake history sysvar data structure
 */
export interface StakeHistorySysvar {
  /** Map of epoch to stake history entry */
  entries: Map<bigint, StakeHistoryEntry>;
}

/**
 * Fees sysvar data structure (deprecated)
 */
export interface FeesSysvar {
  /** Fee calculator */
  lamportsPerSignature: bigint;
}

/**
 * Epoch rewards sysvar data structure
 */
export interface EpochRewardsSysvar {
  /** Distribution starting block height */
  distributionStartingBlockHeight: bigint;
  /** Number of partitions */
  numPartitions: bigint;
  /** Parent blockhash */
  parentBlockhash: string;
  /** Total points */
  totalPoints: bigint;
  /** Total rewards in lamports */
  totalRewards: bigint;
  /** Distributed rewards in lamports */
  distributedRewards: bigint;
  /** Whether distribution is active */
  active: boolean;
}

/**
 * Last restart slot sysvar data structure
 */
export interface LastRestartSlotSysvar {
  /** The last restart slot */
  lastRestartSlot: bigint;
}

// ============================================================================
// Sysvar Codecs
// ============================================================================

/**
 * Float64 codec for exemption threshold
 * @internal
 */
const f64: Codec<number> = {
  encode(value: number): Uint8Array {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setFloat64(0, value, true); // little-endian
    return new Uint8Array(buffer);
  },
  decode(bytes: Uint8Array, offset = 0): readonly [number, number] {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
    const value = view.getFloat64(0, true); // little-endian
    return [value, 8] as const;
  },
  size: 8,
};

/**
 * Codec for Clock sysvar
 */
export const clockSysvarCodec: Codec<ClockSysvar> = struct({
  slot: u64,
  epoch: u64,
  leaderScheduleEpoch: u64,
  unixTimestamp: u64,
  epochStartTimestamp: u64,
});

/**
 * Codec for Rent sysvar
 */
export const rentSysvarCodec: Codec<RentSysvar> = struct({
  lamportsPerByteYear: u64,
  exemptionThreshold: f64 as unknown as Codec<unknown>,
  burnPercent: u8,
}) as unknown as Codec<RentSysvar>;

/**
 * Codec for Epoch Schedule sysvar
 */
export const epochScheduleSysvarCodec: Codec<EpochScheduleSysvar> = struct({
  slotsPerEpoch: u64,
  leaderScheduleSlotOffset: u64,
  warmup: boolean,
  firstNormalEpoch: u64,
  firstNormalSlot: u64,
});

// Note: Recent blockhashes uses a complex structure with a circular buffer
// For simplicity, we'll handle the raw decoding in the fetcher

/**
 * Codec for Fees sysvar (deprecated)
 */
export const feesSysvarCodec: Codec<FeesSysvar> = struct({
  lamportsPerSignature: u64,
});

/**
 * Codec for Last Restart Slot sysvar
 */
export const lastRestartSlotSysvarCodec: Codec<LastRestartSlotSysvar> = struct({
  lastRestartSlot: u64,
});

// ============================================================================
// Sysvar Fetchers
// ============================================================================

/**
 * Fetch and decode the Clock sysvar
 *
 * @param rpc - The Solana RPC client
 * @param commitment - Optional commitment level
 * @returns The decoded Clock sysvar data
 *
 * @example
 * ```typescript
 * const clock = await getClockSysvar(rpc);
 * console.log(`Current slot: ${clock.slot}`);
 * console.log(`Current epoch: ${clock.epoch}`);
 * ```
 */
export async function getClockSysvar(
  rpc: RpcClient,
  commitment?: Commitment,
): Promise<ClockSysvar> {
  const response = (await rpc.getAccountInfo(SYSVAR_CLOCK_ADDRESS, {
    encoding: 'base64',
    ...(commitment && { commitment }),
  })) as RpcResponse<AccountInfo<[string, 'base64']> | null>;

  if (!response.value) {
    throw new Error('Clock sysvar account not found');
  }

  const data = decodeBase64(response.value.data[0]);
  const [clock] = clockSysvarCodec.decode(data);
  return clock;
}

/**
 * Fetch and decode the Rent sysvar
 *
 * @param rpc - The Solana RPC client
 * @param commitment - Optional commitment level
 * @returns The decoded Rent sysvar data
 *
 * @example
 * ```typescript
 * const rent = await getRentSysvar(rpc);
 * console.log(`Lamports per byte-year: ${rent.lamportsPerByteYear}`);
 * ```
 */
export async function getRentSysvar(rpc: RpcClient, commitment?: Commitment): Promise<RentSysvar> {
  const response = (await rpc.getAccountInfo(SYSVAR_RENT_ADDRESS, {
    encoding: 'base64',
    ...(commitment && { commitment }),
  })) as RpcResponse<AccountInfo<[string, 'base64']> | null>;

  if (!response.value) {
    throw new Error('Rent sysvar account not found');
  }

  const data = decodeBase64(response.value.data[0]);
  const [rent] = rentSysvarCodec.decode(data);
  return rent;
}

/**
 * Fetch and decode the Epoch Schedule sysvar
 *
 * @param rpc - The Solana RPC client
 * @param commitment - Optional commitment level
 * @returns The decoded Epoch Schedule sysvar data
 *
 * @example
 * ```typescript
 * const epochSchedule = await getEpochScheduleSysvar(rpc);
 * console.log(`Slots per epoch: ${epochSchedule.slotsPerEpoch}`);
 * ```
 */
export async function getEpochScheduleSysvar(
  rpc: RpcClient,
  commitment?: Commitment,
): Promise<EpochScheduleSysvar> {
  const response = (await rpc.getAccountInfo(SYSVAR_EPOCH_SCHEDULE_ADDRESS, {
    encoding: 'base64',
    ...(commitment && { commitment }),
  })) as RpcResponse<AccountInfo<[string, 'base64']> | null>;

  if (!response.value) {
    throw new Error('Epoch Schedule sysvar account not found');
  }

  const data = decodeBase64(response.value.data[0]);
  const [epochSchedule] = epochScheduleSysvarCodec.decode(data);
  return epochSchedule;
}

/**
 * Fetch and decode the Fees sysvar (deprecated)
 *
 * Note: The fees sysvar is deprecated. Use getFeeForMessage instead.
 *
 * @param rpc - The Solana RPC client
 * @param commitment - Optional commitment level
 * @returns The decoded Fees sysvar data
 *
 * @deprecated Use getFeeForMessage instead
 */
export async function getFeesSysvar(rpc: RpcClient, commitment?: Commitment): Promise<FeesSysvar> {
  const response = (await rpc.getAccountInfo(SYSVAR_FEES_ADDRESS, {
    encoding: 'base64',
    ...(commitment && { commitment }),
  })) as RpcResponse<AccountInfo<[string, 'base64']> | null>;

  if (!response.value) {
    throw new Error('Fees sysvar account not found');
  }

  const data = decodeBase64(response.value.data[0]);
  const [fees] = feesSysvarCodec.decode(data);
  return fees;
}

/**
 * Fetch and decode the Last Restart Slot sysvar
 *
 * @param rpc - The Solana RPC client
 * @param commitment - Optional commitment level
 * @returns The decoded Last Restart Slot sysvar data
 *
 * @example
 * ```typescript
 * const lastRestartSlot = await getLastRestartSlotSysvar(rpc);
 * console.log(`Last restart slot: ${lastRestartSlot.lastRestartSlot}`);
 * ```
 */
export async function getLastRestartSlotSysvar(
  rpc: RpcClient,
  commitment?: Commitment,
): Promise<LastRestartSlotSysvar> {
  const response = (await rpc.getAccountInfo(SYSVAR_LAST_RESTART_SLOT_ADDRESS, {
    encoding: 'base64',
    ...(commitment && { commitment }),
  })) as RpcResponse<AccountInfo<[string, 'base64']> | null>;

  if (!response.value) {
    throw new Error('Last Restart Slot sysvar account not found');
  }

  const data = decodeBase64(response.value.data[0]);
  const [lastRestartSlot] = lastRestartSlotSysvarCodec.decode(data);
  return lastRestartSlot;
}
