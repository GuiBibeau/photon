/**
 * Codecs for SPL Token instruction encoding and decoding.
 *
 * Provides codecs for all SPL Token and Token-2022 instructions,
 * including basic operations, checked variants, and extension instructions.
 */

// import type { Address } from '@photon/addresses';
import type { FixedSizeCodec } from '@photon/codecs';
import { struct } from '@photon/codecs/composites';
import { u8, u64 } from '@photon/codecs/primitives/numeric';
import { publicKey } from '@photon/codecs/primitives/bytes';
import { mapCodec } from '@photon/codecs/composition';
import { CodecError } from '@photon/codecs';
import { TokenInstruction, type AuthorityType } from '../instructions.js';

/**
 * Base instruction type discriminator.
 */
export const instructionDiscriminatorCodec = u8;

/**
 * Initialize Mint instruction data.
 */
export interface InitializeMintData {
  decimals: number;
  mintAuthority: Uint8Array;
  freezeAuthority?: Uint8Array | undefined;
}

export const initializeMintCodec = mapCodec(
  struct({
    instruction: u8,
    decimals: u8,
    mintAuthority: publicKey,
    freezeAuthorityOption: u8,
    freezeAuthority: publicKey,
  }),
  (value: InitializeMintData) => ({
    instruction: TokenInstruction.InitializeMint,
    decimals: value.decimals,
    mintAuthority: value.mintAuthority,
    freezeAuthorityOption: value.freezeAuthority ? 1 : 0,
    freezeAuthority: value.freezeAuthority ?? new Uint8Array(32),
  }),
  (value) => ({
    decimals: value.decimals,
    mintAuthority: value.mintAuthority,
    freezeAuthority: value.freezeAuthorityOption === 1 ? value.freezeAuthority : undefined,
  }),
);

/**
 * Initialize Account instruction data.
 */
export const initializeAccountCodec: FixedSizeCodec<void> = {
  encode(): Uint8Array {
    return new Uint8Array([TokenInstruction.InitializeAccount]);
  },
  decode(_bytes: Uint8Array, _offset = 0): readonly [void, number] {
    return [undefined, 1] as const;
  },
  size: 1,
};

/**
 * Initialize Multisig instruction data.
 */
export interface InitializeMultisigData {
  m: number; // Number of required signers
}

export const initializeMultisigCodec: FixedSizeCodec<InitializeMultisigData> = {
  encode(value: InitializeMultisigData): Uint8Array {
    return new Uint8Array([TokenInstruction.InitializeMultisig, value.m]);
  },
  decode(bytes: Uint8Array, offset = 0): readonly [InitializeMultisigData, number] {
    return [{ m: bytes[offset + 1] ?? 0 }, 2] as const;
  },
  size: 2,
};

/**
 * Transfer instruction data.
 */
export interface TransferData {
  amount: bigint;
}

export const transferCodec: FixedSizeCodec<TransferData> = {
  encode(value: TransferData): Uint8Array {
    const buffer = new Uint8Array(9);
    buffer[0] = TokenInstruction.Transfer;
    buffer.set(u64.encode(value.amount), 1);
    return buffer;
  },
  decode(bytes: Uint8Array, offset = 0): readonly [TransferData, number] {
    const [amount] = u64.decode(bytes, offset + 1);
    return [{ amount }, 9] as const;
  },
  size: 9,
};

/**
 * Approve instruction data.
 */
export interface ApproveData {
  amount: bigint;
}

export const approveCodec: FixedSizeCodec<ApproveData> = {
  encode(value: ApproveData): Uint8Array {
    const buffer = new Uint8Array(9);
    buffer[0] = TokenInstruction.Approve;
    buffer.set(u64.encode(value.amount), 1);
    return buffer;
  },
  decode(bytes: Uint8Array, offset = 0): readonly [ApproveData, number] {
    const [amount] = u64.decode(bytes, offset + 1);
    return [{ amount }, 9] as const;
  },
  size: 9,
};

/**
 * Revoke instruction data.
 */
export const revokeCodec: FixedSizeCodec<void> = {
  encode(): Uint8Array {
    return new Uint8Array([TokenInstruction.Revoke]);
  },
  decode(_bytes: Uint8Array, _offset = 0): readonly [void, number] {
    return [undefined, 1] as const;
  },
  size: 1,
};

/**
 * Set Authority instruction data.
 */
export interface SetAuthorityData {
  authorityType: AuthorityType;
  newAuthority?: Uint8Array | undefined;
}

export const setAuthorityCodec = mapCodec(
  struct({
    instruction: u8,
    authorityType: u8,
    newAuthorityOption: u8,
    newAuthority: publicKey,
  }),
  (value: SetAuthorityData) => ({
    instruction: TokenInstruction.SetAuthority,
    authorityType: value.authorityType,
    newAuthorityOption: value.newAuthority ? 1 : 0,
    newAuthority: value.newAuthority ?? new Uint8Array(32),
  }),
  (value) => ({
    authorityType: value.authorityType as AuthorityType,
    newAuthority: value.newAuthorityOption === 1 ? value.newAuthority : undefined,
  }),
);

/**
 * Mint To instruction data.
 */
export interface MintToData {
  amount: bigint;
}

export const mintToCodec: FixedSizeCodec<MintToData> = {
  encode(value: MintToData): Uint8Array {
    const buffer = new Uint8Array(9);
    buffer[0] = TokenInstruction.MintTo;
    buffer.set(u64.encode(value.amount), 1);
    return buffer;
  },
  decode(bytes: Uint8Array, offset = 0): readonly [MintToData, number] {
    const [amount] = u64.decode(bytes, offset + 1);
    return [{ amount }, 9] as const;
  },
  size: 9,
};

/**
 * Burn instruction data.
 */
export interface BurnData {
  amount: bigint;
}

export const burnCodec: FixedSizeCodec<BurnData> = {
  encode(value: BurnData): Uint8Array {
    const buffer = new Uint8Array(9);
    buffer[0] = TokenInstruction.Burn;
    buffer.set(u64.encode(value.amount), 1);
    return buffer;
  },
  decode(bytes: Uint8Array, offset = 0): readonly [BurnData, number] {
    const [amount] = u64.decode(bytes, offset + 1);
    return [{ amount }, 9] as const;
  },
  size: 9,
};

/**
 * Close Account instruction data.
 */
export const closeAccountCodec: FixedSizeCodec<void> = {
  encode(): Uint8Array {
    return new Uint8Array([TokenInstruction.CloseAccount]);
  },
  decode(_bytes: Uint8Array, _offset = 0): readonly [void, number] {
    return [undefined, 1] as const;
  },
  size: 1,
};

/**
 * Freeze Account instruction data.
 */
export const freezeAccountCodec: FixedSizeCodec<void> = {
  encode(): Uint8Array {
    return new Uint8Array([TokenInstruction.FreezeAccount]);
  },
  decode(_bytes: Uint8Array, _offset = 0): readonly [void, number] {
    return [undefined, 1] as const;
  },
  size: 1,
};

/**
 * Thaw Account instruction data.
 */
export const thawAccountCodec: FixedSizeCodec<void> = {
  encode(): Uint8Array {
    return new Uint8Array([TokenInstruction.ThawAccount]);
  },
  decode(_bytes: Uint8Array, _offset = 0): readonly [void, number] {
    return [undefined, 1] as const;
  },
  size: 1,
};

/**
 * Transfer Checked instruction data.
 */
export interface TransferCheckedData {
  amount: bigint;
  decimals: number;
}

export const transferCheckedCodec: FixedSizeCodec<TransferCheckedData> = {
  encode(value: TransferCheckedData): Uint8Array {
    const buffer = new Uint8Array(10);
    buffer[0] = TokenInstruction.TransferChecked;
    buffer.set(u64.encode(value.amount), 1);
    buffer[9] = value.decimals;
    return buffer;
  },
  decode(bytes: Uint8Array, offset = 0): readonly [TransferCheckedData, number] {
    const [amount] = u64.decode(bytes, offset + 1);
    const decimals = bytes[offset + 9] ?? 0;
    return [{ amount, decimals }, 10] as const;
  },
  size: 10,
};

/**
 * Approve Checked instruction data.
 */
export interface ApproveCheckedData {
  amount: bigint;
  decimals: number;
}

export const approveCheckedCodec: FixedSizeCodec<ApproveCheckedData> = {
  encode(value: ApproveCheckedData): Uint8Array {
    const buffer = new Uint8Array(10);
    buffer[0] = TokenInstruction.ApproveChecked;
    buffer.set(u64.encode(value.amount), 1);
    buffer[9] = value.decimals;
    return buffer;
  },
  decode(bytes: Uint8Array, offset = 0): readonly [ApproveCheckedData, number] {
    const [amount] = u64.decode(bytes, offset + 1);
    const decimals = bytes[offset + 9] ?? 0;
    return [{ amount, decimals }, 10] as const;
  },
  size: 10,
};

/**
 * Mint To Checked instruction data.
 */
export interface MintToCheckedData {
  amount: bigint;
  decimals: number;
}

export const mintToCheckedCodec: FixedSizeCodec<MintToCheckedData> = {
  encode(value: MintToCheckedData): Uint8Array {
    const buffer = new Uint8Array(10);
    buffer[0] = TokenInstruction.MintToChecked;
    buffer.set(u64.encode(value.amount), 1);
    buffer[9] = value.decimals;
    return buffer;
  },
  decode(bytes: Uint8Array, offset = 0): readonly [MintToCheckedData, number] {
    const [amount] = u64.decode(bytes, offset + 1);
    const decimals = bytes[offset + 9] ?? 0;
    return [{ amount, decimals }, 10] as const;
  },
  size: 10,
};

/**
 * Burn Checked instruction data.
 */
export interface BurnCheckedData {
  amount: bigint;
  decimals: number;
}

export const burnCheckedCodec: FixedSizeCodec<BurnCheckedData> = {
  encode(value: BurnCheckedData): Uint8Array {
    const buffer = new Uint8Array(10);
    buffer[0] = TokenInstruction.BurnChecked;
    buffer.set(u64.encode(value.amount), 1);
    buffer[9] = value.decimals;
    return buffer;
  },
  decode(bytes: Uint8Array, offset = 0): readonly [BurnCheckedData, number] {
    const [amount] = u64.decode(bytes, offset + 1);
    const decimals = bytes[offset + 9] ?? 0;
    return [{ amount, decimals }, 10] as const;
  },
  size: 10,
};

/**
 * Initialize Account 2 instruction data.
 */
export interface InitializeAccount2Data {
  owner: Uint8Array;
}

export const initializeAccount2Codec: FixedSizeCodec<InitializeAccount2Data> = {
  encode(value: InitializeAccount2Data): Uint8Array {
    const buffer = new Uint8Array(33);
    buffer[0] = TokenInstruction.InitializeAccount2;
    buffer.set(value.owner, 1);
    return buffer;
  },
  decode(bytes: Uint8Array, offset = 0): readonly [InitializeAccount2Data, number] {
    const owner = bytes.slice(offset + 1, offset + 33);
    return [{ owner }, 33] as const;
  },
  size: 33,
};

/**
 * Sync Native instruction data.
 */
export const syncNativeCodec: FixedSizeCodec<void> = {
  encode(): Uint8Array {
    return new Uint8Array([TokenInstruction.SyncNative]);
  },
  decode(_bytes: Uint8Array, _offset = 0): readonly [void, number] {
    return [undefined, 1] as const;
  },
  size: 1,
};

/**
 * Initialize Account 3 instruction data.
 */
export interface InitializeAccount3Data {
  owner: Uint8Array;
}

export const initializeAccount3Codec: FixedSizeCodec<InitializeAccount3Data> = {
  encode(value: InitializeAccount3Data): Uint8Array {
    const buffer = new Uint8Array(33);
    buffer[0] = TokenInstruction.InitializeAccount3;
    buffer.set(value.owner, 1);
    return buffer;
  },
  decode(bytes: Uint8Array, offset = 0): readonly [InitializeAccount3Data, number] {
    const owner = bytes.slice(offset + 1, offset + 33);
    return [{ owner }, 33] as const;
  },
  size: 33,
};

/**
 * Initialize Multisig 2 instruction data.
 */
export interface InitializeMultisig2Data {
  m: number;
}

export const initializeMultisig2Codec: FixedSizeCodec<InitializeMultisig2Data> = {
  encode(value: InitializeMultisig2Data): Uint8Array {
    return new Uint8Array([TokenInstruction.InitializeMultisig2, value.m]);
  },
  decode(bytes: Uint8Array, offset = 0): readonly [InitializeMultisig2Data, number] {
    return [{ m: bytes[offset + 1] ?? 0 }, 2] as const;
  },
  size: 2,
};

/**
 * Initialize Mint 2 instruction data (Token-2022).
 */
export interface InitializeMint2Data {
  decimals: number;
  mintAuthority: Uint8Array;
  freezeAuthority?: Uint8Array | undefined;
}

export const initializeMint2Codec = mapCodec(
  struct({
    instruction: u8,
    decimals: u8,
    mintAuthority: publicKey,
    freezeAuthorityOption: u8,
    freezeAuthority: publicKey,
  }),
  (value: InitializeMint2Data) => ({
    instruction: TokenInstruction.InitializeMint2,
    decimals: value.decimals,
    mintAuthority: value.mintAuthority,
    freezeAuthorityOption: value.freezeAuthority ? 1 : 0,
    freezeAuthority: value.freezeAuthority ?? new Uint8Array(32),
  }),
  (value) => ({
    decimals: value.decimals,
    mintAuthority: value.mintAuthority,
    freezeAuthority: value.freezeAuthorityOption === 1 ? value.freezeAuthority : undefined,
  }),
);

/**
 * Master codec for all SPL Token instructions.
 */
export type TokenInstructionData =
  | { type: 'InitializeMint'; data: InitializeMintData }
  | { type: 'InitializeAccount'; data: void }
  | { type: 'InitializeMultisig'; data: InitializeMultisigData }
  | { type: 'Transfer'; data: TransferData }
  | { type: 'Approve'; data: ApproveData }
  | { type: 'Revoke'; data: void }
  | { type: 'SetAuthority'; data: SetAuthorityData }
  | { type: 'MintTo'; data: MintToData }
  | { type: 'Burn'; data: BurnData }
  | { type: 'CloseAccount'; data: void }
  | { type: 'FreezeAccount'; data: void }
  | { type: 'ThawAccount'; data: void }
  | { type: 'TransferChecked'; data: TransferCheckedData }
  | { type: 'ApproveChecked'; data: ApproveCheckedData }
  | { type: 'MintToChecked'; data: MintToCheckedData }
  | { type: 'BurnChecked'; data: BurnCheckedData }
  | { type: 'InitializeAccount2'; data: InitializeAccount2Data }
  | { type: 'SyncNative'; data: void }
  | { type: 'InitializeAccount3'; data: InitializeAccount3Data }
  | { type: 'InitializeMultisig2'; data: InitializeMultisig2Data }
  | { type: 'InitializeMint2'; data: InitializeMint2Data };

/**
 * Decode a token instruction from bytes.
 */
export function decodeTokenInstruction(bytes: Uint8Array, offset = 0): TokenInstructionData {
  const instructionType = bytes[offset];

  switch (instructionType) {
    case TokenInstruction.InitializeMint: {
      const [initMintData] = initializeMintCodec.decode(bytes, offset);
      return { type: 'InitializeMint', data: initMintData };
    }

    case TokenInstruction.InitializeAccount:
      return { type: 'InitializeAccount', data: undefined };

    case TokenInstruction.InitializeMultisig: {
      const [initMultisigData] = initializeMultisigCodec.decode(bytes, offset);
      return { type: 'InitializeMultisig', data: initMultisigData };
    }

    case TokenInstruction.Transfer: {
      const [transferData] = transferCodec.decode(bytes, offset);
      return { type: 'Transfer', data: transferData };
    }

    case TokenInstruction.Approve: {
      const [approveData] = approveCodec.decode(bytes, offset);
      return { type: 'Approve', data: approveData };
    }

    case TokenInstruction.Revoke:
      return { type: 'Revoke', data: undefined };

    case TokenInstruction.SetAuthority: {
      const [setAuthData] = setAuthorityCodec.decode(bytes, offset);
      return { type: 'SetAuthority', data: setAuthData };
    }

    case TokenInstruction.MintTo: {
      const [mintToData] = mintToCodec.decode(bytes, offset);
      return { type: 'MintTo', data: mintToData };
    }

    case TokenInstruction.Burn: {
      const [burnData] = burnCodec.decode(bytes, offset);
      return { type: 'Burn', data: burnData };
    }

    case TokenInstruction.CloseAccount:
      return { type: 'CloseAccount', data: undefined };

    case TokenInstruction.FreezeAccount:
      return { type: 'FreezeAccount', data: undefined };

    case TokenInstruction.ThawAccount:
      return { type: 'ThawAccount', data: undefined };

    case TokenInstruction.TransferChecked: {
      const [transferCheckedData] = transferCheckedCodec.decode(bytes, offset);
      return { type: 'TransferChecked', data: transferCheckedData };
    }

    case TokenInstruction.ApproveChecked: {
      const [approveCheckedData] = approveCheckedCodec.decode(bytes, offset);
      return { type: 'ApproveChecked', data: approveCheckedData };
    }

    case TokenInstruction.MintToChecked: {
      const [mintToCheckedData] = mintToCheckedCodec.decode(bytes, offset);
      return { type: 'MintToChecked', data: mintToCheckedData };
    }

    case TokenInstruction.BurnChecked: {
      const [burnCheckedData] = burnCheckedCodec.decode(bytes, offset);
      return { type: 'BurnChecked', data: burnCheckedData };
    }

    case TokenInstruction.InitializeAccount2: {
      const [initAccount2Data] = initializeAccount2Codec.decode(bytes, offset);
      return { type: 'InitializeAccount2', data: initAccount2Data };
    }

    case TokenInstruction.SyncNative:
      return { type: 'SyncNative', data: undefined };

    case TokenInstruction.InitializeAccount3: {
      const [initAccount3Data] = initializeAccount3Codec.decode(bytes, offset);
      return { type: 'InitializeAccount3', data: initAccount3Data };
    }

    case TokenInstruction.InitializeMultisig2: {
      const [initMultisig2Data] = initializeMultisig2Codec.decode(bytes, offset);
      return { type: 'InitializeMultisig2', data: initMultisig2Data };
    }

    case TokenInstruction.InitializeMint2: {
      const [initMint2Data] = initializeMint2Codec.decode(bytes, offset);
      return { type: 'InitializeMint2', data: initMint2Data };
    }

    default:
      throw new CodecError(`Unknown token instruction type: ${instructionType}`);
  }
}

/**
 * Encode a token instruction to bytes.
 */
export function encodeTokenInstruction(instruction: TokenInstructionData): Uint8Array {
  switch (instruction.type) {
    case 'InitializeMint':
      return initializeMintCodec.encode({ ...instruction.data, freezeAuthority: instruction.data.freezeAuthority });
    case 'InitializeAccount':
      return initializeAccountCodec.encode();
    case 'InitializeMultisig':
      return initializeMultisigCodec.encode(instruction.data);
    case 'Transfer':
      return transferCodec.encode(instruction.data);
    case 'Approve':
      return approveCodec.encode(instruction.data);
    case 'Revoke':
      return revokeCodec.encode();
    case 'SetAuthority':
      return setAuthorityCodec.encode({ ...instruction.data, newAuthority: instruction.data.newAuthority });
    case 'MintTo':
      return mintToCodec.encode(instruction.data);
    case 'Burn':
      return burnCodec.encode(instruction.data);
    case 'CloseAccount':
      return closeAccountCodec.encode();
    case 'FreezeAccount':
      return freezeAccountCodec.encode();
    case 'ThawAccount':
      return thawAccountCodec.encode();
    case 'TransferChecked':
      return transferCheckedCodec.encode(instruction.data);
    case 'ApproveChecked':
      return approveCheckedCodec.encode(instruction.data);
    case 'MintToChecked':
      return mintToCheckedCodec.encode(instruction.data);
    case 'BurnChecked':
      return burnCheckedCodec.encode(instruction.data);
    case 'InitializeAccount2':
      return initializeAccount2Codec.encode(instruction.data);
    case 'SyncNative':
      return syncNativeCodec.encode();
    case 'InitializeAccount3':
      return initializeAccount3Codec.encode(instruction.data);
    case 'InitializeMultisig2':
      return initializeMultisig2Codec.encode(instruction.data);
    case 'InitializeMint2':
      return initializeMint2Codec.encode({ ...instruction.data, freezeAuthority: instruction.data.freezeAuthority });
    default:
      throw new CodecError(`Unknown token instruction type`);
  }
}
