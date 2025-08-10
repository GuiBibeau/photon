/**
 * Codecs for Token-2022 extensions.
 *
 * Token-2022 introduces an extension model that allows additional functionality
 * to be added to mints and token accounts while maintaining backward compatibility.
 */

import { addressFromBytes, getAddressBytes } from '@photon/addresses';
import type { Codec } from '@photon/codecs';
import { struct, option, some, none } from '@photon/codecs/composites';
import { u8, u16, u64, i64 } from '@photon/codecs/primitives/numeric';
import { publicKey } from '@photon/codecs/primitives/bytes';
import { boolean } from '@photon/codecs/primitives/boolean';
import { mapCodec } from '@photon/codecs/composition';
import { ExtensionType, type AccountState } from '../types.js';
import type {
  TransferFeeConfig,
  InterestBearingConfig,
  DefaultAccountState,
  MintCloseAuthorityExtension as MintCloseAuthority,
  PermanentDelegateExtension as PermanentDelegate,
  TransferHookExtension as TransferHook,
  MetadataPointerExtension as MetadataPointer,
  // TokenMetadataExtension as TokenMetadata,
  CpiGuardExtension as CpiGuard,
  ImmutableOwnerExtension as ImmutableOwner,
  MemoTransferExtension as MemoTransfer,
  NonTransferableExtension as NonTransferable,
} from '../types.js';
import { tlvCodec } from './tlv.js';

/**
 * Transfer fee configuration codec.
 */
export const transferFeeConfigCodec: Codec<TransferFeeConfig> = mapCodec(
  struct({
    transferFeeConfigAuthority: option(publicKey) as Codec<any>,
    withdrawWithheldAuthority: option(publicKey) as Codec<any>,
    withheldAmount: u64,
    olderTransferFee: struct({
      epoch: u64,
      maximumFee: u64,
      transferFeeBasisPoints: u16,
    }),
    newerTransferFee: struct({
      epoch: u64,
      maximumFee: u64,
      transferFeeBasisPoints: u16,
    }),
  }),
  (value: TransferFeeConfig) => ({
    transferFeeConfigAuthority: value.transferFeeConfigAuthority
      ? some(value.transferFeeConfigAuthority)
      : none(),
    withdrawWithheldAuthority: value.withdrawWithheldAuthority
      ? some(value.withdrawWithheldAuthority)
      : none(),
    withheldAmount: value.withheldAmount,
    olderTransferFee: value.olderTransferFee,
    newerTransferFee: value.newerTransferFee,
  }),
  (value: any) => ({
    type: ExtensionType.TransferFeeConfig,
    ...(value.transferFeeConfigAuthority.__option === 'some' && {
      transferFeeConfigAuthority: value.transferFeeConfigAuthority.value,
    }),
    ...(value.withdrawWithheldAuthority.__option === 'some' && {
      withdrawWithheldAuthority: value.withdrawWithheldAuthority.value,
    }),
    withheldAmount: value.withheldAmount,
    olderTransferFee: value.olderTransferFee,
    newerTransferFee: value.newerTransferFee,
  }),
);

/**
 * Interest bearing configuration codec.
 */
export const interestBearingConfigCodec: Codec<InterestBearingConfig> = mapCodec(
  struct({
    rateAuthority: option(publicKey),
    initializationTimestamp: i64,
    preUpdateAverageRate: u16,
    lastUpdateTimestamp: i64,
    currentRate: u16,
  }),
  (value: InterestBearingConfig) => ({
    rateAuthority: value.rateAuthority ? some(value.rateAuthority) : none(),
    initializationTimestamp: value.initializationTimestamp,
    preUpdateAverageRate: value.preUpdateAverageRate,
    lastUpdateTimestamp: value.lastUpdateTimestamp,
    currentRate: value.currentRate,
  }),
  (value: any) => ({
    type: ExtensionType.InterestBearingConfig,
    rateAuthority: value.rateAuthority.__option === 'some' ? value.rateAuthority.value : undefined,
    initializationTimestamp: value.initializationTimestamp,
    preUpdateAverageRate: value.preUpdateAverageRate,
    lastUpdateTimestamp: value.lastUpdateTimestamp,
    currentRate: value.currentRate,
  }),
);

/**
 * Default account state codec.
 */
export const defaultAccountStateCodec: Codec<DefaultAccountState> = mapCodec(
  u8,
  (value: DefaultAccountState) => value.state,
  (value: any) => ({
    type: ExtensionType.DefaultAccountState,
    state: value as AccountState,
  }),
);

/**
 * Mint close authority codec.
 */
export const mintCloseAuthorityCodec: Codec<MintCloseAuthority> = mapCodec(
  option(publicKey) as Codec<any>,
  (value: MintCloseAuthority) => (value.closeAuthority ? some(value.closeAuthority) : none()),
  (value: any) => ({
    type: ExtensionType.MintCloseAuthority,
    ...(value.__option === 'some' && { closeAuthority: value.value }),
  }),
);

/**
 * Permanent delegate codec.
 */
export const permanentDelegateCodec: Codec<PermanentDelegate> = mapCodec(
  publicKey,
  (value: PermanentDelegate) => value.delegate ? getAddressBytes(value.delegate) : new Uint8Array(32),
  (value: any) => ({
    type: ExtensionType.PermanentDelegate,
    ...(value && value.length === 32 && !value.every((b: number) => b === 0) && { delegate: addressFromBytes(value) }),
  }),
);

/**
 * Transfer hook codec.
 */
export const transferHookCodec: Codec<TransferHook> = mapCodec(
  struct({
    authority: option(publicKey) as Codec<any>,
    programId: option(publicKey) as Codec<any>,
  }),
  (value: TransferHook) => ({
    authority: value.authority ? some(value.authority) : none(),
    programId: value.programId ? some(value.programId) : none(),
  }),
  (value: any) => ({
    type: ExtensionType.TransferHook,
    ...(value.authority.__option === 'some' && { authority: value.authority.value }),
    ...(value.programId.__option === 'some' && { programId: value.programId.value }),
  }),
);

/**
 * Metadata pointer codec.
 */
export const metadataPointerCodec: Codec<MetadataPointer> = mapCodec(
  struct({
    authority: option(publicKey) as Codec<any>,
    metadataAddress: option(publicKey) as Codec<any>,
  }),
  (value: MetadataPointer) => ({
    authority: value.authority ? some(value.authority) : none(),
    metadataAddress: value.metadataAddress ? some(value.metadataAddress) : none(),
  }),
  (value: any) => ({
    type: ExtensionType.MetadataPointer,
    ...((value.authority as any).__option === 'some' && { authority: (value.authority as any).value }),
    ...((value.metadataAddress as any).__option === 'some' && { metadataAddress: (value.metadataAddress as any).value }),
  }),
);

/**
 * Non-transferable extension codec (empty extension).
 */
export const nonTransferableCodec: Codec<NonTransferable> = mapCodec(
  struct({}),
  (_value: NonTransferable) => ({}),
  (_value) => ({
    type: ExtensionType.NonTransferable,
  }),
);

/**
 * CPI Guard codec for token accounts.
 */
export const cpiGuardCodec: Codec<CpiGuard> = mapCodec(
  boolean,
  (value: CpiGuard) => value.lockCpi,
  (value: any) => ({
    type: ExtensionType.CpiGuard,
    lockCpi: value,
  }),
);

/**
 * Immutable owner codec for token accounts.
 */
export const immutableOwnerCodec: Codec<ImmutableOwner> = mapCodec(
  struct({}),
  (_value: ImmutableOwner) => ({}),
  (_value) => ({
    type: ExtensionType.ImmutableOwner,
  }),
);

/**
 * Memo transfer codec for token accounts.
 */
export const memoTransferCodec: Codec<MemoTransfer> = mapCodec(
  boolean,
  (value: MemoTransfer) => value.requireIncomingTransferMemos,
  (value: any) => ({
    type: ExtensionType.MemoTransfer,
    requireIncomingTransferMemos: value,
  }),
);

/**
 * Registry of extension codecs by type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const extensionCodecs: Map<ExtensionType, Codec<any>> = new Map([
  [ExtensionType.TransferFeeConfig, transferFeeConfigCodec as Codec<any>],
  [ExtensionType.InterestBearingConfig, interestBearingConfigCodec as Codec<any>],
  [ExtensionType.DefaultAccountState, defaultAccountStateCodec as Codec<any>],
  [ExtensionType.MintCloseAuthority, mintCloseAuthorityCodec as Codec<any>],
  [ExtensionType.PermanentDelegate, permanentDelegateCodec as Codec<any>],
  [ExtensionType.TransferHook, transferHookCodec as Codec<any>],
  [ExtensionType.MetadataPointer, metadataPointerCodec as Codec<any>],
  [ExtensionType.NonTransferable, nonTransferableCodec as Codec<any>],
  [ExtensionType.CpiGuard, cpiGuardCodec as Codec<any>],
  [ExtensionType.ImmutableOwner, immutableOwnerCodec as Codec<any>],
  [ExtensionType.MemoTransfer, memoTransferCodec as Codec<any>],
]);

/**
 * Get the codec for a specific extension type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getExtensionCodec(type: ExtensionType): Codec<any> | undefined {
  return extensionCodecs.get(type);
}

/**
 * Create a TLV codec for a specific extension.
 */
export function createExtensionTlvCodec<T>(type: ExtensionType, codec: Codec<T>): Codec<T> {
  return tlvCodec(type, codec);
}

/**
 * Calculate the size of an extension in TLV format.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getExtensionSize(type: ExtensionType, data?: any): number {
  const codec = getExtensionCodec(type);
  if (!codec) {
    return 0;
  }

  // TLV header (4 bytes) + data size
  if ('size' in codec) {
    if (typeof codec.size === 'function') {
      return 4 + (data ? codec.size(data) : 0);
    }
    return 4 + codec.size;
  }

  // Fallback: encode and measure
  return 4 + (data ? (codec as any).encode(data).length : 0);
}

/**
 * Account type extension support matrix.
 * Maps extension types to whether they're supported on mint vs token accounts.
 */
export const extensionSupport = {
  // Mint extensions
  [ExtensionType.TransferFeeConfig]: { mint: true, token: false },
  [ExtensionType.InterestBearingConfig]: { mint: true, token: false },
  [ExtensionType.DefaultAccountState]: { mint: true, token: false },
  [ExtensionType.MintCloseAuthority]: { mint: true, token: false },
  [ExtensionType.PermanentDelegate]: { mint: true, token: false },
  [ExtensionType.TransferHook]: { mint: true, token: false },
  [ExtensionType.MetadataPointer]: { mint: true, token: false },
  [ExtensionType.NonTransferable]: { mint: true, token: false },

  // Token account extensions
  [ExtensionType.CpiGuard]: { mint: false, token: true },
  [ExtensionType.ImmutableOwner]: { mint: false, token: true },
  [ExtensionType.MemoTransfer]: { mint: false, token: true },
};

/**
 * Check if an extension is supported for a given account type.
 */
export function isExtensionSupported(type: ExtensionType, accountType: 'mint' | 'token'): boolean {
  const support = extensionSupport[type as keyof typeof extensionSupport];
  return support ? support[accountType] : false;
}
