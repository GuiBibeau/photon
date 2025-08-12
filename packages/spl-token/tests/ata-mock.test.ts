import { describe, it, expect } from 'vitest';
import {
  address,
  TOKEN_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  SYSTEM_PROGRAM_ADDRESS,
} from '@photon/addresses';
import {
  createAssociatedTokenAccountInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  isValidTokenProgram,
  getTokenProgramForMint,
} from '../src/ata';

describe('Associated Token Account Utilities (Mocked)', () => {
  const mint = address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC mint
  const owner = address('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
  const payer = address('GRvbLBz5Ey1H39pxJ2cVsX7nkKbBTkZmuy8fksFMnJHK');

  // Mock ATA addresses for testing
  const mockAta = address('7UT4ujaxzCZVzwiVW37kDK8zzkaKFDcPPnLii7VNDb5w');

  describe('createAssociatedTokenAccountInstruction', () => {
    it('should create ATA instruction with correct accounts', () => {
      const instruction = createAssociatedTokenAccountInstruction(payer, mockAta, owner, mint);

      expect(instruction.programId).toBe(ASSOCIATED_TOKEN_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(6);

      // Check account order
      expect(instruction.accounts[0].pubkey).toBe(payer);
      expect(instruction.accounts[0].isSigner).toBe(true);
      expect(instruction.accounts[0].isWritable).toBe(true);

      expect(instruction.accounts[1].pubkey).toBe(mockAta);
      expect(instruction.accounts[1].isSigner).toBe(false);
      expect(instruction.accounts[1].isWritable).toBe(true);

      expect(instruction.accounts[2].pubkey).toBe(owner);
      expect(instruction.accounts[2].isSigner).toBe(false);
      expect(instruction.accounts[2].isWritable).toBe(false);

      expect(instruction.accounts[3].pubkey).toBe(mint);
      expect(instruction.accounts[3].isSigner).toBe(false);
      expect(instruction.accounts[3].isWritable).toBe(false);

      // System program
      expect(instruction.accounts[4].pubkey).toBe(SYSTEM_PROGRAM_ADDRESS);

      // Token program
      expect(instruction.accounts[5].pubkey).toBe(TOKEN_PROGRAM_ADDRESS);

      // No data for standard create
      expect(instruction.data.length).toBe(0);
    });

    it('should create ATA instruction with Token-2022', () => {
      const instruction = createAssociatedTokenAccountInstruction(
        payer,
        mockAta,
        owner,
        mint,
        TOKEN_2022_PROGRAM_ADDRESS,
      );

      expect(instruction.accounts[5].pubkey).toBe(TOKEN_2022_PROGRAM_ADDRESS);
    });
  });

  describe('createAssociatedTokenAccountIdempotentInstruction', () => {
    it('should create idempotent ATA instruction', () => {
      const instruction = createAssociatedTokenAccountIdempotentInstruction(
        payer,
        mockAta,
        owner,
        mint,
      );

      expect(instruction.programId).toBe(ASSOCIATED_TOKEN_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(6);

      // Idempotent instruction has discriminator 1
      expect(instruction.data.length).toBe(1);
      expect(instruction.data[0]).toBe(1);
    });
  });

  describe('isValidTokenProgram', () => {
    it('should validate standard token program', () => {
      expect(isValidTokenProgram(TOKEN_PROGRAM_ADDRESS)).toBe(true);
    });

    it('should validate Token-2022 program', () => {
      expect(isValidTokenProgram(TOKEN_2022_PROGRAM_ADDRESS)).toBe(true);
    });

    it('should reject invalid token program', () => {
      const invalidProgram = address('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
      expect(isValidTokenProgram(invalidProgram)).toBe(false);
    });
  });

  describe('getTokenProgramForMint', () => {
    it('should default to standard token program', () => {
      // This is a placeholder implementation for now
      const program = getTokenProgramForMint(mint);
      expect(program).toBe(TOKEN_PROGRAM_ADDRESS);
    });
  });

  describe('ATA Creation Instruction Structure', () => {
    it('should have correct structure for system program interaction', () => {
      const instruction = createAssociatedTokenAccountInstruction(payer, mockAta, owner, mint);

      // Verify the instruction can be used in a transaction
      expect(instruction).toHaveProperty('programId');
      expect(instruction).toHaveProperty('accounts');
      expect(instruction).toHaveProperty('data');

      // Check all accounts are valid addresses
      for (const account of instruction.accounts) {
        expect(account.pubkey).toBeTruthy();
        expect(typeof account.pubkey).toBe('string');
        expect(typeof account.isSigner).toBe('boolean');
        expect(typeof account.isWritable).toBe('boolean');
      }
    });
  });
});
