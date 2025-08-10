import { describe, it, expect } from 'vitest';
import {
  detectProgramVersion,
  detectProgramVersionFromAccount,
  detectProgramVersionFromInstruction,
  getProgramIdForVersion,
  supportsExtensions,
  validateAccountVersion,
  ProgramVersion,
} from '../../src/codecs/program-detection';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '../../src/constants';
import { tokenAccountCodec, mintAccountCodec } from '../../src/codecs/accounts';
import { AccountState } from '../../src/types';
import type { TokenAccount, MintAccount } from '../../src/types';

describe('Program Detection', () => {
  describe('detectProgramVersion', () => {
    it('should detect Token program from ID', () => {
      const version = detectProgramVersion(TOKEN_PROGRAM_ID);
      expect(version).toBe(ProgramVersion.Token);
    });

    it('should detect Token-2022 program from ID', () => {
      const version = detectProgramVersion(TOKEN_2022_PROGRAM_ID);
      expect(version).toBe(ProgramVersion.Token2022);
    });

    it('should return Unknown for unrecognized program ID', () => {
      const version = detectProgramVersion('SomeRandomProgramId123456789');
      expect(version).toBe(ProgramVersion.Unknown);
    });

    it('should handle Uint8Array program ID', () => {
      // This would need proper base58 encoding in production
      const programBytes = new Uint8Array(32).fill(1);
      const version = detectProgramVersion(programBytes);
      expect(version).toBe(ProgramVersion.Unknown);
    });
  });

  describe('detectProgramVersionFromAccount', () => {
    it('should detect legacy Token account (no extensions)', () => {
      const account: TokenAccount = {
        mint: new Uint8Array(32).fill(1),
        owner: new Uint8Array(32).fill(2),
        amount: 1000000n,
        state: AccountState.Initialized,
        isNative: false,
      };

      const encoded = tokenAccountCodec.encode(account);
      const version = detectProgramVersionFromAccount(encoded);

      expect(version).toBe(ProgramVersion.Token);
    });

    it('should detect Token-2022 account (with extensions)', () => {
      // Create account data larger than standard size to simulate extensions
      const standardAccount: TokenAccount = {
        mint: new Uint8Array(32).fill(1),
        owner: new Uint8Array(32).fill(2),
        amount: 1000000n,
        state: AccountState.Initialized,
        isNative: false,
      };

      const encoded = tokenAccountCodec.encode(standardAccount);
      // Add extra bytes to simulate extensions
      const withExtensions = new Uint8Array(encoded.length + 100);
      withExtensions.set(encoded);

      const version = detectProgramVersionFromAccount(withExtensions);
      expect(version).toBe(ProgramVersion.Token2022);
    });

    it('should detect legacy Mint account', () => {
      const mint: MintAccount = {
        supply: 1000000n,
        decimals: 9,
        isInitialized: true,
      };

      const encoded = mintAccountCodec.encode(mint);
      const version = detectProgramVersionFromAccount(encoded);

      expect(version).toBe(ProgramVersion.Token);
    });

    it('should detect Token-2022 Mint with extensions', () => {
      const mint: MintAccount = {
        supply: 1000000n,
        decimals: 9,
        isInitialized: true,
      };

      const encoded = mintAccountCodec.encode(mint);
      // Add extra bytes to simulate extensions
      const withExtensions = new Uint8Array(encoded.length + 50);
      withExtensions.set(encoded);

      const version = detectProgramVersionFromAccount(withExtensions);
      expect(version).toBe(ProgramVersion.Token2022);
    });

    it('should return Unknown for invalid account data', () => {
      const invalidData = new Uint8Array(10); // Too small to be valid
      const version = detectProgramVersionFromAccount(invalidData);

      expect(version).toBe(ProgramVersion.Unknown);
    });

    it('should return Unknown for empty account data', () => {
      const emptyData = new Uint8Array(0);
      const version = detectProgramVersionFromAccount(emptyData);

      expect(version).toBe(ProgramVersion.Unknown);
    });
  });

  describe('detectProgramVersionFromInstruction', () => {
    it('should return Unknown for legacy instructions (0-20)', () => {
      // These instructions exist in both programs
      for (let i = 0; i <= 20; i++) {
        const instruction = new Uint8Array([i]);
        const version = detectProgramVersionFromInstruction(instruction);
        expect(version).toBe(ProgramVersion.Unknown);
      }
    });

    it('should detect Token-2022 for new instructions (21+)', () => {
      // These instructions only exist in Token-2022
      for (let i = 21; i <= 30; i++) {
        const instruction = new Uint8Array([i]);
        const version = detectProgramVersionFromInstruction(instruction);
        expect(version).toBe(ProgramVersion.Token2022);
      }
    });

    it('should return Unknown for empty instruction', () => {
      const emptyInstruction = new Uint8Array(0);
      const version = detectProgramVersionFromInstruction(emptyInstruction);

      expect(version).toBe(ProgramVersion.Unknown);
    });
  });

  describe('getProgramIdForVersion', () => {
    it('should return Token program ID for Token version', () => {
      const programId = getProgramIdForVersion(ProgramVersion.Token);
      expect(programId).toBe(TOKEN_PROGRAM_ID);
    });

    it('should return Token-2022 program ID for Token2022 version', () => {
      const programId = getProgramIdForVersion(ProgramVersion.Token2022);
      expect(programId).toBe(TOKEN_2022_PROGRAM_ID);
    });

    it('should return null for Unknown version', () => {
      const programId = getProgramIdForVersion(ProgramVersion.Unknown);
      expect(programId).toBeNull();
    });
  });

  describe('supportsExtensions', () => {
    it('should return true for Token-2022', () => {
      expect(supportsExtensions(ProgramVersion.Token2022)).toBe(true);
    });

    it('should return false for legacy Token', () => {
      expect(supportsExtensions(ProgramVersion.Token)).toBe(false);
    });

    it('should return false for Unknown', () => {
      expect(supportsExtensions(ProgramVersion.Unknown)).toBe(false);
    });
  });

  describe('validateAccountVersion', () => {
    it('should validate legacy Token account correctly', () => {
      const account: TokenAccount = {
        mint: new Uint8Array(32).fill(1),
        owner: new Uint8Array(32).fill(2),
        amount: 1000000n,
        state: AccountState.Initialized,
        isNative: false,
      };

      const encoded = tokenAccountCodec.encode(account);

      expect(validateAccountVersion(encoded, ProgramVersion.Token)).toBe(true);
      expect(validateAccountVersion(encoded, ProgramVersion.Token2022)).toBe(false);
    });

    it('should validate Token-2022 account correctly', () => {
      const account: TokenAccount = {
        mint: new Uint8Array(32).fill(1),
        owner: new Uint8Array(32).fill(2),
        amount: 1000000n,
        state: AccountState.Initialized,
        isNative: false,
      };

      const encoded = tokenAccountCodec.encode(account);
      // Add extensions
      const withExtensions = new Uint8Array(encoded.length + 100);
      withExtensions.set(encoded);

      expect(validateAccountVersion(withExtensions, ProgramVersion.Token2022)).toBe(true);
      expect(validateAccountVersion(withExtensions, ProgramVersion.Token)).toBe(false);
    });

    it('should return false for invalid data', () => {
      const invalidData = new Uint8Array(10);

      expect(validateAccountVersion(invalidData, ProgramVersion.Token)).toBe(false);
      expect(validateAccountVersion(invalidData, ProgramVersion.Token2022)).toBe(false);
    });
  });
});
