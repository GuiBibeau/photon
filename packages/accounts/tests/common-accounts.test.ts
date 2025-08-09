/**
 * Tests for common account types and decoders.
 */

import { describe, it, expect } from 'vitest';
import type { Address } from '@photon/addresses';
import {
  AccountType,
  detectAccountType,
  getCodecForAccountType,
  autoDecodeAccount,
  isValidAccountData,
  systemAccountCodec,
  tokenAccountCodec,
  tokenMintCodec,
  multisigAccountCodec,
} from '../src/common-accounts.js';

describe('detectAccountType', () => {
  const systemProgram = '11111111111111111111111111111111' as Address;
  const tokenProgram = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address;
  const unknownProgram = 'Unknown111111111111111111111111111111111111' as Address;

  it('should detect system accounts', () => {
    expect(detectAccountType(systemProgram, 0)).toBe(AccountType.System);
    expect(detectAccountType(systemProgram, 100)).toBe(AccountType.System);
  });

  it('should detect token accounts', () => {
    expect(detectAccountType(tokenProgram, 165)).toBe(AccountType.TokenAccount);
  });

  it('should detect token mint accounts', () => {
    expect(detectAccountType(tokenProgram, 82)).toBe(AccountType.TokenMint);
  });

  it('should detect multisig accounts', () => {
    expect(detectAccountType(tokenProgram, 355)).toBe(AccountType.Multisig);
  });

  it('should return unknown for unrecognized accounts', () => {
    expect(detectAccountType(tokenProgram, 100)).toBe(AccountType.Unknown);
    expect(detectAccountType(unknownProgram, 165)).toBe(AccountType.Unknown);
  });
});

describe('getCodecForAccountType', () => {
  it('should return correct codec for each account type', () => {
    expect(getCodecForAccountType(AccountType.System)).toBe(systemAccountCodec);
    expect(getCodecForAccountType(AccountType.TokenAccount)).toBe(tokenAccountCodec);
    expect(getCodecForAccountType(AccountType.TokenMint)).toBe(tokenMintCodec);
    expect(getCodecForAccountType(AccountType.Multisig)).toBe(multisigAccountCodec);
  });

  it('should return undefined for unknown account type', () => {
    expect(getCodecForAccountType(AccountType.Unknown)).toBeUndefined();
  });
});

describe('systemAccountCodec', () => {
  it('should encode to empty array', () => {
    const encoded = systemAccountCodec.encode({});
    expect(encoded).toEqual(new Uint8Array(0));
  });

  it('should decode any data to empty object', () => {
    const [decoded, offset] = systemAccountCodec.decode(new Uint8Array([1, 2, 3]), 0);
    expect(decoded).toEqual({});
    expect(offset).toBe(0);
  });

  it('should have size 0', () => {
    expect(systemAccountCodec.size).toBe(0);
  });
});

describe('tokenAccountCodec', () => {
  it('should decode valid token account data with correct size', () => {
    // Token account should be 165 bytes
    const data = new Uint8Array(165);
    expect(() => tokenAccountCodec.decode(data, 0)).not.toThrow();
  });

  it('should decode valid token account data', () => {
    // Create mock token account data (165 bytes)
    const data = new Uint8Array(165);

    // Set mint (32 bytes at offset 0)
    data.set(new Uint8Array(32).fill(1), 0);

    // Set owner (32 bytes at offset 32)
    data.set(new Uint8Array(32).fill(2), 32);

    // Set amount (8 bytes at offset 64)
    data[64] = 100; // 100 lamports

    // Set delegate option (1 byte for None at offset 72)
    data[72] = 0; // None (0x00)

    // Set state (1 byte at offset 73 when delegate is None)
    data[73] = 1; // Initialized

    // Set isNative option (1 byte for None at offset 74)
    data[74] = 0; // None (0x00)

    // Set delegatedAmount (8 bytes at offset 75)
    data[75] = 50;

    // Set closeAuthority option (1 byte for None at offset 83)
    data[83] = 0; // None (0x00)

    const [decoded] = tokenAccountCodec.decode(data, 0);

    expect(decoded).toBeDefined();
    expect(decoded.amount).toBe(100n);
    expect(decoded.state).toBe(1);
  });
});

describe('tokenMintCodec', () => {
  it('should decode valid mint data with correct size', () => {
    // Mint account should be 82 bytes
    const data = new Uint8Array(82);
    expect(() => tokenMintCodec.decode(data, 0)).not.toThrow();
  });

  it('should decode valid mint data', () => {
    // Create mock mint data (82 bytes)
    const data = new Uint8Array(82);

    // Set mintAuthority option (1 + 32 bytes at offset 0)
    data[0] = 1; // Some
    data.set(new Uint8Array(32).fill(1), 1);

    // Set supply (8 bytes at offset 33)
    data[33] = 100;
    data[34] = 1; // 356 total supply

    // Set decimals (1 byte at offset 41)
    data[41] = 9;

    // Set isInitialized (1 byte at offset 42)
    data[42] = 1;

    // Set freezeAuthority option (1 + 32 bytes at offset 43)
    data[43] = 0; // None

    const [decoded] = tokenMintCodec.decode(data, 0);

    expect(decoded).toBeDefined();
    expect(decoded.supply).toBe(356n);
    expect(decoded.decimals).toBe(9);
    expect(decoded.isInitialized).toBe(1); // Now it's a number, not boolean
  });
});

describe('autoDecodeAccount', () => {
  const tokenProgram = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address;
  const systemProgram = '11111111111111111111111111111111' as Address;

  it('should auto-decode token account', () => {
    const data = new Uint8Array(165);
    // Set some recognizable values
    // When all options are None, state is at offset 73
    data[72] = 0; // delegate option = None
    data[73] = 1; // state = initialized
    data[74] = 0; // isNative option = None
    data[83] = 0; // closeAuthority option = None

    const result = autoDecodeAccount(tokenProgram, data);

    expect(result).toBeDefined();
    expect(result?.type).toBe(AccountType.TokenAccount);
    expect(result?.decoded).toBeDefined();
    expect(result?.decoded.state).toBe(1);
  });

  it('should auto-decode system account', () => {
    const data = new Uint8Array(0);
    const result = autoDecodeAccount(systemProgram, data);

    expect(result).toBeDefined();
    expect(result?.type).toBe(AccountType.System);
    expect(result?.decoded).toEqual({});
  });

  it('should return undefined for unknown account types', () => {
    const data = new Uint8Array(100);
    const result = autoDecodeAccount(tokenProgram, data);

    expect(result).toBeUndefined();
  });

  it('should return undefined on decode error', () => {
    // Create invalid token account data (wrong size)
    const data = new Uint8Array(50);
    const result = autoDecodeAccount(tokenProgram, data);

    expect(result).toBeUndefined();
  });
});

describe('isValidAccountData', () => {
  it('should validate correct token account data', () => {
    const data = new Uint8Array(165);
    expect(isValidAccountData(data, AccountType.TokenAccount)).toBe(true);
  });

  it('should reject incorrect data for token account', () => {
    const data = new Uint8Array(100); // Wrong size
    expect(isValidAccountData(data, AccountType.TokenAccount)).toBe(false);
  });

  it('should validate correct mint data', () => {
    const data = new Uint8Array(82);
    expect(isValidAccountData(data, AccountType.TokenMint)).toBe(true);
  });

  it('should reject incorrect data for mint', () => {
    const data = new Uint8Array(50); // Wrong size
    expect(isValidAccountData(data, AccountType.TokenMint)).toBe(false);
  });

  it('should return false for unknown account type', () => {
    const data = new Uint8Array(100);
    expect(isValidAccountData(data, AccountType.Unknown)).toBe(false);
  });
});
