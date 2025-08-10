import { describe, it, expect } from 'vitest';
import { address } from '@photon/addresses';
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
  NATIVE_MINT,
  TOKEN_DECIMALS,
  ACCOUNT_SIZE,
  isTokenProgramId,
  isToken2022ProgramId,
  isTokenProgram,
  isAssociatedTokenProgramId,
  isTokenMetadataProgramId,
  isNativeMint,
  asMintAddress,
  asTokenAccountAddress,
  type MintAddress,
  type TokenAccountAddress,
} from '../src/constants';

describe('SPL Token Constants', () => {
  describe('Program IDs', () => {
    it('should have correct TOKEN_PROGRAM_ID', () => {
      expect(TOKEN_PROGRAM_ID).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    });

    it('should have correct TOKEN_2022_PROGRAM_ID', () => {
      expect(TOKEN_2022_PROGRAM_ID).toBe('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
    });

    it('should have correct ASSOCIATED_TOKEN_PROGRAM_ID', () => {
      expect(ASSOCIATED_TOKEN_PROGRAM_ID).toBe('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
    });

    it('should have correct TOKEN_METADATA_PROGRAM_ID', () => {
      expect(TOKEN_METADATA_PROGRAM_ID).toBe('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
    });

    it('should have correct NATIVE_MINT address', () => {
      expect(NATIVE_MINT).toBe('So11111111111111111111111111111111111111112');
    });
  });

  describe('Decimal Constants', () => {
    it('should have correct USDC decimals', () => {
      expect(TOKEN_DECIMALS.USDC).toBe(6);
    });

    it('should have correct SOL decimals', () => {
      expect(TOKEN_DECIMALS.SOL).toBe(9);
    });

    it('should have correct NFT decimals', () => {
      expect(TOKEN_DECIMALS.NFT).toBe(0);
    });
  });

  describe('Account Size Constants', () => {
    it('should have correct mint account size', () => {
      expect(ACCOUNT_SIZE.MINT).toBe(82);
    });

    it('should have correct token account size', () => {
      expect(ACCOUNT_SIZE.TOKEN).toBe(165);
    });

    it('should have correct multisig account size', () => {
      expect(ACCOUNT_SIZE.MULTISIG).toBe(355);
    });
  });

  describe('Validation Functions', () => {
    describe('isTokenProgramId', () => {
      it('should return true for TOKEN_PROGRAM_ID', () => {
        expect(isTokenProgramId(TOKEN_PROGRAM_ID)).toBe(true);
      });

      it('should return false for other addresses', () => {
        expect(isTokenProgramId(TOKEN_2022_PROGRAM_ID)).toBe(false);
        expect(isTokenProgramId(ASSOCIATED_TOKEN_PROGRAM_ID)).toBe(false);
        expect(isTokenProgramId(address('11111111111111111111111111111111'))).toBe(false);
      });
    });

    describe('isToken2022ProgramId', () => {
      it('should return true for TOKEN_2022_PROGRAM_ID', () => {
        expect(isToken2022ProgramId(TOKEN_2022_PROGRAM_ID)).toBe(true);
      });

      it('should return false for other addresses', () => {
        expect(isToken2022ProgramId(TOKEN_PROGRAM_ID)).toBe(false);
        expect(isToken2022ProgramId(ASSOCIATED_TOKEN_PROGRAM_ID)).toBe(false);
        expect(isToken2022ProgramId(address('11111111111111111111111111111111'))).toBe(false);
      });
    });

    describe('isTokenProgram', () => {
      it('should return true for both token programs', () => {
        expect(isTokenProgram(TOKEN_PROGRAM_ID)).toBe(true);
        expect(isTokenProgram(TOKEN_2022_PROGRAM_ID)).toBe(true);
      });

      it('should return false for other addresses', () => {
        expect(isTokenProgram(ASSOCIATED_TOKEN_PROGRAM_ID)).toBe(false);
        expect(isTokenProgram(address('11111111111111111111111111111111'))).toBe(false);
      });
    });

    describe('isAssociatedTokenProgramId', () => {
      it('should return true for ASSOCIATED_TOKEN_PROGRAM_ID', () => {
        expect(isAssociatedTokenProgramId(ASSOCIATED_TOKEN_PROGRAM_ID)).toBe(true);
      });

      it('should return false for other addresses', () => {
        expect(isAssociatedTokenProgramId(TOKEN_PROGRAM_ID)).toBe(false);
        expect(isAssociatedTokenProgramId(address('11111111111111111111111111111111'))).toBe(false);
      });
    });

    describe('isTokenMetadataProgramId', () => {
      it('should return true for TOKEN_METADATA_PROGRAM_ID', () => {
        expect(isTokenMetadataProgramId(TOKEN_METADATA_PROGRAM_ID)).toBe(true);
      });

      it('should return false for other addresses', () => {
        expect(isTokenMetadataProgramId(TOKEN_PROGRAM_ID)).toBe(false);
        expect(isTokenMetadataProgramId(address('11111111111111111111111111111111'))).toBe(false);
      });
    });

    describe('isNativeMint', () => {
      it('should return true for NATIVE_MINT', () => {
        expect(isNativeMint(NATIVE_MINT)).toBe(true);
      });

      it('should return false for other addresses', () => {
        expect(isNativeMint(TOKEN_PROGRAM_ID)).toBe(false);
        expect(isNativeMint(address('11111111111111111111111111111111'))).toBe(false);
      });
    });
  });

  describe('Type Casting Functions', () => {
    it('should cast address to MintAddress', () => {
      const addr = address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      const mintAddr: MintAddress = asMintAddress(addr);
      expect(mintAddr).toBe(addr);
    });

    it('should cast address to TokenAccountAddress', () => {
      const addr = address('5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx');
      const tokenAccountAddr: TokenAccountAddress = asTokenAccountAddress(addr);
      expect(tokenAccountAddr).toBe(addr);
    });
  });

  describe('Type Safety', () => {
    it('should have branded types that are compile-time only', () => {
      // At runtime, branded types are just regular addresses
      const regularAddress = address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      const mintAddress = asMintAddress(regularAddress);
      const tokenAccountAddress = asTokenAccountAddress(regularAddress);

      // All should be the same at runtime
      expect(mintAddress).toBe(regularAddress);
      expect(tokenAccountAddress).toBe(regularAddress);
      expect(mintAddress).toBe(tokenAccountAddress);
    });
  });

  describe('Well-known Addresses', () => {
    it('should have valid base58 addresses for all constants', () => {
      // These should not throw when creating addresses
      expect(() => address(TOKEN_PROGRAM_ID as string)).not.toThrow();
      expect(() => address(TOKEN_2022_PROGRAM_ID as string)).not.toThrow();
      expect(() => address(ASSOCIATED_TOKEN_PROGRAM_ID as string)).not.toThrow();
      expect(() => address(TOKEN_METADATA_PROGRAM_ID as string)).not.toThrow();
      expect(() => address(NATIVE_MINT as string)).not.toThrow();
    });
  });
});
