/**
 * Codecs for SPL Token account types.
 *
 * Provides encoders and decoders for TokenAccount, MintAccount, and Multisig
 * accounts, with support for both legacy Token and Token-2022 formats.
 */

// import type { Address } from '@photon/addresses';
import type { Codec, FixedSizeCodec, VariableSizeCodec } from '@photon/codecs';
import { struct } from '@photon/codecs/composites';
import { u8, u32, u64 } from '@photon/codecs/primitives/numeric';
import { publicKey } from '@photon/codecs/primitives/bytes';
import { boolean } from '@photon/codecs/primitives/boolean';
// import { mapCodec } from '@photon/codecs/composition';
import { CodecError } from '@photon/codecs';
import {
  type AccountState,
  type TokenAccount,
  type MintAccount,
  type Multisig,
  type TokenExtension,
  type ExtensionType,
} from '../types.js';
// import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '../constants.js';
import { parseTlv, LazyTlvParser } from './tlv.js';
import { getExtensionCodec } from './extensions.js';

/**
 * Size constants for account types.
 */
export const ACCOUNT_SIZE = {
  /** Legacy token account size */
  TOKEN: 165,
  /** Legacy mint account size */
  MINT: 82,
  /** Multisig account size (1 + 1 + 1 + 32 * 11) */
  MULTISIG: 355,
  /** Account type discriminator size */
  DISCRIMINATOR: 1,
} as const;

/**
 * Account type discriminator values.
 */
export enum AccountTypeDiscriminator {
  Uninitialized = 0,
  Mint = 1,
  Account = 2,
  Multisig = 3,
}

/**
 * Token account codec (165 bytes for legacy, variable for Token-2022).
 */
export const tokenAccountCodec: Codec<TokenAccount> = {
  encode(value: TokenAccount): Uint8Array {
    const baseStruct = struct({
      mint: publicKey,
      owner: publicKey,
      amount: u64,
      delegateOption: u32,
      delegate: publicKey,
      state: u8,
      isNativeOption: u32,
      isNative: u64,
      delegatedAmount: u64,
      closeAuthorityOption: u32,
      closeAuthority: publicKey,
    });

    const baseData = {
      mint: value.mint,
      owner: value.owner,
      amount: value.amount,
      delegateOption: value.delegate ? 1 : 0,
      delegate: value.delegate || new Uint8Array(32),
      state: value.state,
      isNativeOption: value.isNative ? 1 : 0,
      isNative: value.isNative ? 1n : 0n,
      delegatedAmount: value.delegatedAmount || 0n,
      closeAuthorityOption: value.closeAuthority ? 1 : 0,
      closeAuthority: value.closeAuthority || new Uint8Array(32),
    };

    const baseBytes = baseStruct.encode(baseData);

    // No extensions for legacy token accounts
    return baseBytes;
  },

  decode(bytes: Uint8Array, offset = 0): readonly [TokenAccount, number] {
    if (bytes.length - offset < ACCOUNT_SIZE.TOKEN) {
      throw new CodecError(`Token account requires at least ${ACCOUNT_SIZE.TOKEN} bytes`);
    }

    const baseStruct = struct({
      mint: publicKey,
      owner: publicKey,
      amount: u64,
      delegateOption: u32,
      delegate: publicKey,
      state: u8,
      isNativeOption: u32,
      isNative: u64,
      delegatedAmount: u64,
      closeAuthorityOption: u32,
      closeAuthority: publicKey,
    });

    const [baseData, baseSize] = baseStruct.decode(bytes, offset);

    const account: TokenAccount = {
      mint: baseData.mint,
      owner: baseData.owner,
      amount: baseData.amount,
      delegate: baseData.delegateOption === 1 ? baseData.delegate : undefined,
      state: baseData.state as AccountState,
      isNative: baseData.isNativeOption === 1,
      delegatedAmount: baseData.delegatedAmount > 0n ? baseData.delegatedAmount : undefined,
      closeAuthority: baseData.closeAuthorityOption === 1 ? baseData.closeAuthority : undefined,
    };

    // Check for Token-2022 extensions
    if (bytes.length - offset > ACCOUNT_SIZE.TOKEN) {
      const extensionBytes = bytes.slice(offset + ACCOUNT_SIZE.TOKEN);
      const tlvParser = new LazyTlvParser(extensionBytes);
      const extensions: TokenExtension[] = [];

      for (const entry of tlvParser.getAll()) {
        const codec = getExtensionCodec(entry.type as ExtensionType);
        if (codec) {
          const [extension] = codec.decode(entry.data);
          extensions.push(extension);
        }
      }

      if (extensions.length > 0) {
        account.extensions = extensions;
      }
    }

    return [account, baseSize] as const;
  },

  size: (value: TokenAccount): number => {
    let size = ACCOUNT_SIZE.TOKEN;

    if (value.extensions && value.extensions.length > 0) {
      for (const extension of value.extensions) {
        const codec = getExtensionCodec(extension.type);
        if (codec) {
          size += 4; // TLV header
          if ('size' in codec) {
            size += typeof codec.size === 'function' ? codec.size(extension) : codec.size;
          } else {
            size += codec.encode(extension).length;
          }
        }
      }
    }

    return size;
  },
} as VariableSizeCodec<TokenAccount>;

/**
 * Mint account codec (82 bytes for legacy, variable for Token-2022).
 */
export const mintAccountCodec: Codec<MintAccount> = {
  encode(value: MintAccount): Uint8Array {
    const baseStruct = struct({
      mintAuthorityOption: u32,
      mintAuthority: publicKey,
      supply: u64,
      decimals: u8,
      isInitialized: boolean,
      freezeAuthorityOption: u32,
      freezeAuthority: publicKey,
    });

    const baseData = {
      mintAuthorityOption: value.mintAuthority ? 1 : 0,
      mintAuthority: value.mintAuthority || new Uint8Array(32),
      supply: value.supply,
      decimals: value.decimals,
      isInitialized: value.isInitialized,
      freezeAuthorityOption: value.freezeAuthority ? 1 : 0,
      freezeAuthority: value.freezeAuthority || new Uint8Array(32),
    };

    const baseBytes = baseStruct.encode(baseData);

    // Add extensions for Token-2022
    if (value.extensions && value.extensions.length > 0) {
      const extensionBuffers: Uint8Array[] = [baseBytes];

      for (const extension of value.extensions) {
        const codec = getExtensionCodec(extension.type);
        if (codec) {
          const tlvBytes = new Uint8Array(4 + codec.encode(extension).length);
          tlvBytes.set(u16.encode(extension.type), 0);
          const dataBytes = codec.encode(extension);
          tlvBytes.set(u16.encode(dataBytes.length), 2);
          tlvBytes.set(dataBytes, 4);
          extensionBuffers.push(tlvBytes);
        }
      }

      const totalSize = extensionBuffers.reduce((sum, buf) => sum + buf.length, 0);
      const result = new Uint8Array(totalSize);
      let offset = 0;

      for (const buffer of extensionBuffers) {
        result.set(buffer, offset);
        offset += buffer.length;
      }

      return result;
    }

    return baseBytes;
  },

  decode(bytes: Uint8Array, offset = 0): readonly [MintAccount, number] {
    if (bytes.length - offset < ACCOUNT_SIZE.MINT) {
      throw new CodecError(`Mint account requires at least ${ACCOUNT_SIZE.MINT} bytes`);
    }

    const baseStruct = struct({
      mintAuthorityOption: u32,
      mintAuthority: publicKey,
      supply: u64,
      decimals: u8,
      isInitialized: boolean,
      freezeAuthorityOption: u32,
      freezeAuthority: publicKey,
    });

    const [baseData, baseSize] = baseStruct.decode(bytes, offset);

    const account: MintAccount = {
      supply: baseData.supply,
      decimals: baseData.decimals,
      isInitialized: baseData.isInitialized,
      mintAuthority: baseData.mintAuthorityOption === 1 ? baseData.mintAuthority : undefined,
      freezeAuthority: baseData.freezeAuthorityOption === 1 ? baseData.freezeAuthority : undefined,
    };

    // Check for Token-2022 extensions
    let totalBytesRead = baseSize;
    if (bytes.length - offset > ACCOUNT_SIZE.MINT) {
      const extensionBytes = bytes.slice(offset + ACCOUNT_SIZE.MINT);
      const { entries, bytesRead } = parseTlv(extensionBytes);

      if (entries.length > 0) {
        const extensions: TokenExtension[] = [];

        for (const entry of entries) {
          const codec = getExtensionCodec(entry.type as ExtensionType);
          if (codec) {
            const [extension] = codec.decode(entry.data);
            extensions.push(extension);
          }
        }

        if (extensions.length > 0) {
          account.extensions = extensions;
        }

        totalBytesRead += bytesRead;
      }
    }

    return [account, totalBytesRead] as const;
  },

  size: (value: MintAccount): number => {
    let size = ACCOUNT_SIZE.MINT;

    if (value.extensions && value.extensions.length > 0) {
      for (const extension of value.extensions) {
        const codec = getExtensionCodec(extension.type);
        if (codec) {
          size += 4; // TLV header
          if ('size' in codec) {
            size += typeof codec.size === 'function' ? codec.size(extension) : codec.size;
          } else {
            size += codec.encode(extension).length;
          }
        }
      }
    }

    return size;
  },
} as VariableSizeCodec<MintAccount>;

/**
 * Multisig account codec (355 bytes fixed).
 */
export const multisigCodec: FixedSizeCodec<Multisig> = {
  encode(value: Multisig): Uint8Array {
    const buffer = new Uint8Array(ACCOUNT_SIZE.MULTISIG);

    // Write m (number of required signers)
    buffer[0] = value.m;

    // Write n (number of valid signers)
    buffer[1] = value.n;

    // Write is_initialized
    buffer[2] = value.isInitialized ? 1 : 0;

    // Write signers (11 * 32 bytes)
    for (let i = 0; i < 11; i++) {
      const signer = value.signers[i];
      if (signer) {
        buffer.set(signer, 3 + i * 32);
      }
    }

    return buffer;
  },

  decode(bytes: Uint8Array, offset = 0): readonly [Multisig, number] {
    if (bytes.length - offset < ACCOUNT_SIZE.MULTISIG) {
      throw new CodecError(`Multisig account requires ${ACCOUNT_SIZE.MULTISIG} bytes`);
    }

    const m = bytes[offset];
    const n = bytes[offset + 1];
    const isInitialized = bytes[offset + 2] === 1;

    const signers: (Uint8Array | undefined)[] = [];
    for (let i = 0; i < 11; i++) {
      const signerOffset = offset + 3 + i * 32;
      const signer = bytes.slice(signerOffset, signerOffset + 32);

      // Check if signer is empty (all zeros)
      const isEmpty = signer.every((b) => b === 0);
      signers.push(isEmpty ? undefined : signer);
    }

    return [
      {
        m,
        n,
        isInitialized,
        signers,
      },
      ACCOUNT_SIZE.MULTISIG,
    ] as const;
  },

  size: ACCOUNT_SIZE.MULTISIG,
};

/**
 * Detect account type from discriminator byte.
 */
export function detectAccountType(bytes: Uint8Array, offset = 0): AccountTypeDiscriminator | null {
  if (bytes.length - offset < 1) {
    return null;
  }

  // SPL Token doesn't use explicit discriminators, so we need to infer from size
  // Check exact sizes first, then fall back to minimum sizes

  // Check if it looks like a multisig (exactly 355 bytes for legacy)
  if (bytes.length - offset === ACCOUNT_SIZE.MULTISIG) {
    return AccountTypeDiscriminator.Multisig;
  }

  // Check if it looks like a token account (exactly 165 bytes for legacy, or more for Token-2022)
  if (bytes.length - offset === ACCOUNT_SIZE.TOKEN || bytes.length - offset > ACCOUNT_SIZE.TOKEN) {
    // Token accounts are larger than mints, so check this first
    if (bytes.length - offset >= ACCOUNT_SIZE.TOKEN) {
      return AccountTypeDiscriminator.Account;
    }
  }

  // Check if it looks like a mint (exactly 82 bytes for legacy, or more for Token-2022)
  if (
    bytes.length - offset === ACCOUNT_SIZE.MINT ||
    (bytes.length - offset > ACCOUNT_SIZE.MINT && bytes.length - offset < ACCOUNT_SIZE.TOKEN)
  ) {
    return AccountTypeDiscriminator.Mint;
  }

  return AccountTypeDiscriminator.Uninitialized;
}

/**
 * Detect if an account is Token-2022 based on size and content.
 */
export function isToken2022Account(
  bytes: Uint8Array,
  accountType: AccountTypeDiscriminator,
): boolean {
  switch (accountType) {
    case AccountTypeDiscriminator.Mint:
      return bytes.length > ACCOUNT_SIZE.MINT;
    case AccountTypeDiscriminator.Account:
      return bytes.length > ACCOUNT_SIZE.TOKEN;
    default:
      return false;
  }
}

// Import needed for u16
import { u16 } from '@photon/codecs/primitives/numeric';
