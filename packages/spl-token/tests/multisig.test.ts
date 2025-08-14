/**
 * Tests for SPL Token multisig instructions
 */

import { describe, it, expect } from 'vitest';
import { address, type Address } from '@photon/addresses';
import { SYSVAR_RENT_ADDRESS } from '@photon/sysvars';
import { createInitializeMultisigInstruction, type MultisigConfig } from '../src/index.js';
import { TokenInstruction } from '../src/types.js';

describe('InitializeMultisig Instruction', () => {
  const multisigAccount = address('7WkXXPMACJLXW7v2TytXK8gYbPbo9Qu5vB84NQPwNZKz');
  const signer1 = address('11111111111111111111111111111112');
  const signer2 = address('2ZxTBjwCbNPFPRYmPRYmPRYmPRYmPRYmPRYmPRYmgJgh');
  const signer3 = address('3CnAZhj3inbcxLRvEBbfgJZEwdvZEEPKkzJiVXiSrNEZ');

  describe('Instruction Creation', () => {
    it('should create a valid InitializeMultisig instruction', () => {
      const config: MultisigConfig = {
        m: 2,
        signers: [signer1, signer2, signer3],
      };

      const instruction = createInitializeMultisigInstruction(multisigAccount, config);

      // Check program ID
      expect(instruction.programId).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address);

      // Check instruction data
      expect(instruction.data.length).toBe(2);
      expect(instruction.data[0]).toBe(TokenInstruction.InitializeMultisig); // Discriminator
      expect(instruction.data[1]).toBe(2); // M value

      // Check accounts
      expect(instruction.accounts).toHaveLength(5); // multisig + rent + 3 signers

      // Account 0: Multisig account (writable)
      expect(instruction.accounts[0].pubkey).toBe(multisigAccount);
      expect(instruction.accounts[0].isSigner).toBe(false);
      expect(instruction.accounts[0].isWritable).toBe(true);

      // Account 1: Rent sysvar
      expect(instruction.accounts[1].pubkey).toBe(SYSVAR_RENT_ADDRESS);
      expect(instruction.accounts[1].isSigner).toBe(false);
      expect(instruction.accounts[1].isWritable).toBe(false);

      // Accounts 2-4: Signers (read-only)
      for (let i = 0; i < config.signers.length; i++) {
        expect(instruction.accounts[i + 2].pubkey).toBe(config.signers[i]);
        expect(instruction.accounts[i + 2].isSigner).toBe(false);
        expect(instruction.accounts[i + 2].isWritable).toBe(false);
      }
    });

    it('should handle minimum number of signers (2)', () => {
      const config: MultisigConfig = {
        m: 1,
        signers: [signer1, signer2],
      };

      const instruction = createInitializeMultisigInstruction(multisigAccount, config);

      expect(instruction.accounts).toHaveLength(4); // multisig + rent + 2 signers
      expect(instruction.data[1]).toBe(1); // M value
    });

    it('should handle maximum number of signers (11)', () => {
      // Use valid base58 addresses that decode to 32 bytes
      const signers = [
        address('11111111111111111111111111111112'),
        address('2ZxTBjwCbNPFPRYmPRYmPRYmPRYmPRYmPRYmPRYmgJgh'),
        address('3CnAZhj3inbcxLRvEBbfgJZEwdvZEEPKkzJiVXiSrNEZ'),
        address('4hjMPMBRKXVyxmMFV8dAMK3Rh5XjB5PJexqYVTVrNjFb'),
        address('5rPJKdt9EbR5YnMRgjwn2egMTvaC7k9pyLnUL7JTVYVs'),
        address('6nGhPSAqmaN2sQPFNSPPCvyZ3pZFDFYNaLpMZJdz4n5L'),
        address('7WkXXPMACJLXW7v2TytXK8gYbPbo9Qu5vB84NQPwNZKz'),
        address('8bPUHCmVLMhTVgKPH15JKb3wfAupBtJhtqZkVtwNYswG'),
        address('9TfHLJcKJnYbAZRLVEi5kKwtyF2hPBp6u6w3i5qxq7oE'),
        address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
        address('BPFLoaderUpgradeab1e11111111111111111111111'),
      ];

      const config: MultisigConfig = {
        m: 6,
        signers,
      };

      const instruction = createInitializeMultisigInstruction(multisigAccount, config);

      expect(instruction.accounts).toHaveLength(13); // multisig + rent + 11 signers
      expect(instruction.data[1]).toBe(6); // M value
    });

    it('should allow duplicate signers for weighting', () => {
      // This is a feature - duplicate signers give more voting power
      const config: MultisigConfig = {
        m: 2,
        signers: [signer1, signer1, signer2], // signer1 appears twice
      };

      const instruction = createInitializeMultisigInstruction(multisigAccount, config);

      expect(instruction.accounts).toHaveLength(5); // multisig + rent + 3 signers (including duplicate)
      expect(instruction.accounts[2].pubkey).toBe(signer1);
      expect(instruction.accounts[3].pubkey).toBe(signer1); // Duplicate is allowed
      expect(instruction.accounts[4].pubkey).toBe(signer2);
    });

    it('should set M equal to N for unanimous multisig', () => {
      const config: MultisigConfig = {
        m: 3,
        signers: [signer1, signer2, signer3],
      };

      const instruction = createInitializeMultisigInstruction(multisigAccount, config);

      expect(instruction.data[1]).toBe(3); // M = N = 3
    });
  });

  describe('Validation', () => {
    it('should throw error for less than 2 signers', () => {
      const config: MultisigConfig = {
        m: 1,
        signers: [signer1], // Only 1 signer
      };

      expect(() => {
        createInitializeMultisigInstruction(multisigAccount, config);
      }).toThrow('Invalid signer count: 1. Must be between 2 and 11 signers.');
    });

    it('should throw error for more than 11 signers', () => {
      // Use valid base58 addresses that decode to 32 bytes
      const signers = [
        address('11111111111111111111111111111112'),
        address('2ZxTBjwCbNPFPRYmPRYmPRYmPRYmPRYmPRYmPRYmgJgh'),
        address('3CnAZhj3inbcxLRvEBbfgJZEwdvZEEPKkzJiVXiSrNEZ'),
        address('4hjMPMBRKXVyxmMFV8dAMK3Rh5XjB5PJexqYVTVrNjFb'),
        address('5rPJKdt9EbR5YnMRgjwn2egMTvaC7k9pyLnUL7JTVYVs'),
        address('6nGhPSAqmaN2sQPFNSPPCvyZ3pZFDFYNaLpMZJdz4n5L'),
        address('7WkXXPMACJLXW7v2TytXK8gYbPbo9Qu5vB84NQPwNZKz'),
        address('8bPUHCmVLMhTVgKPH15JKb3wfAupBtJhtqZkVtwNYswG'),
        address('9TfHLJcKJnYbAZRLVEi5kKwtyF2hPBp6u6w3i5qxq7oE'),
        address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
        address('BPFLoaderUpgradeab1e11111111111111111111111'),
        address('ComputeBudget111111111111111111111111111111'), // 12th signer
      ];

      const config: MultisigConfig = {
        m: 6,
        signers,
      };

      expect(() => {
        createInitializeMultisigInstruction(multisigAccount, config);
      }).toThrow('Invalid signer count: 12. Must be between 2 and 11 signers.');
    });

    it('should throw error for M value less than 1', () => {
      const config: MultisigConfig = {
        m: 0,
        signers: [signer1, signer2],
      };

      expect(() => {
        createInitializeMultisigInstruction(multisigAccount, config);
      }).toThrow('Invalid M value: 0. Must be between 1 and 2 (total signers).');
    });

    it('should throw error for M value greater than N', () => {
      const config: MultisigConfig = {
        m: 4,
        signers: [signer1, signer2, signer3], // Only 3 signers
      };

      expect(() => {
        createInitializeMultisigInstruction(multisigAccount, config);
      }).toThrow('Invalid M value: 4. Must be between 1 and 3 (total signers).');
    });

    it('should throw error for M value exceeding absolute maximum', () => {
      // Even if we somehow bypass the signer count check, M cannot exceed 11
      const config: MultisigConfig = {
        m: 12,
        signers: [signer1, signer2], // This would normally fail on signer count
      };

      expect(() => {
        createInitializeMultisigInstruction(multisigAccount, config);
      }).toThrow('Invalid M value: 12. Cannot exceed 11.');
    });

    it('should throw error for empty signers array', () => {
      const config: MultisigConfig = {
        m: 1,
        signers: [],
      };

      expect(() => {
        createInitializeMultisigInstruction(multisigAccount, config);
      }).toThrow('Invalid signer count: 0. Must be between 2 and 11 signers.');
    });
  });

  describe('Edge Cases', () => {
    it('should handle M=1 with 2 signers (any signer can act)', () => {
      const config: MultisigConfig = {
        m: 1,
        signers: [signer1, signer2],
      };

      const instruction = createInitializeMultisigInstruction(multisigAccount, config);
      expect(instruction.data[1]).toBe(1);
    });

    it('should handle M=11 with 11 signers (all must sign)', () => {
      // Use valid base58 addresses that decode to 32 bytes
      const signers = [
        address('11111111111111111111111111111112'),
        address('2ZxTBjwCbNPFPRYmPRYmPRYmPRYmPRYmPRYmPRYmgJgh'),
        address('3CnAZhj3inbcxLRvEBbfgJZEwdvZEEPKkzJiVXiSrNEZ'),
        address('4hjMPMBRKXVyxmMFV8dAMK3Rh5XjB5PJexqYVTVrNjFb'),
        address('5rPJKdt9EbR5YnMRgjwn2egMTvaC7k9pyLnUL7JTVYVs'),
        address('6nGhPSAqmaN2sQPFNSPPCvyZ3pZFDFYNaLpMZJdz4n5L'),
        address('7WkXXPMACJLXW7v2TytXK8gYbPbo9Qu5vB84NQPwNZKz'),
        address('8bPUHCmVLMhTVgKPH15JKb3wfAupBtJhtqZkVtwNYswG'),
        address('9TfHLJcKJnYbAZRLVEi5kKwtyF2hPBp6u6w3i5qxq7oE'),
        address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
        address('BPFLoaderUpgradeab1e11111111111111111111111'),
      ];

      const config: MultisigConfig = {
        m: 11,
        signers,
      };

      const instruction = createInitializeMultisigInstruction(multisigAccount, config);
      expect(instruction.data[1]).toBe(11);
    });

    it('should preserve signer order in accounts', () => {
      const config: MultisigConfig = {
        m: 2,
        signers: [signer3, signer1, signer2], // Specific order
      };

      const instruction = createInitializeMultisigInstruction(multisigAccount, config);

      // Verify signers are in the same order as provided
      expect(instruction.accounts[2].pubkey).toBe(signer3);
      expect(instruction.accounts[3].pubkey).toBe(signer1);
      expect(instruction.accounts[4].pubkey).toBe(signer2);
    });
  });

  describe('Security Considerations', () => {
    it('should not require any signers on the instruction itself', () => {
      // This is critical - the instruction must have NO signers
      // It must be included in same transaction as CreateAccount
      const config: MultisigConfig = {
        m: 2,
        signers: [signer1, signer2, signer3],
      };

      const instruction = createInitializeMultisigInstruction(multisigAccount, config);

      // Verify NO accounts are marked as signers
      for (const account of instruction.accounts) {
        expect(account.isSigner).toBe(false);
      }
    });

    it('should mark multisig account as writable', () => {
      const config: MultisigConfig = {
        m: 2,
        signers: [signer1, signer2],
      };

      const instruction = createInitializeMultisigInstruction(multisigAccount, config);

      // Only the multisig account should be writable
      expect(instruction.accounts[0].isWritable).toBe(true);

      // All other accounts should be read-only
      for (let i = 1; i < instruction.accounts.length; i++) {
        expect(instruction.accounts[i].isWritable).toBe(false);
      }
    });

    it('should include rent sysvar for validation', () => {
      const config: MultisigConfig = {
        m: 2,
        signers: [signer1, signer2],
      };

      const instruction = createInitializeMultisigInstruction(multisigAccount, config);

      // Rent sysvar must be second account
      expect(instruction.accounts[1].pubkey).toBe(SYSVAR_RENT_ADDRESS);
      expect(instruction.accounts[1].isSigner).toBe(false);
      expect(instruction.accounts[1].isWritable).toBe(false);
    });
  });
});
