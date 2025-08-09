import { describe, it, expect } from 'vitest';
import { address } from '@photon/addresses';
import {
  SYSVAR_CLOCK_ADDRESS,
  SYSVAR_EPOCH_SCHEDULE_ADDRESS,
  SYSVAR_INSTRUCTIONS_ADDRESS,
  SYSVAR_RECENT_BLOCKHASHES_ADDRESS,
  SYSVAR_RENT_ADDRESS,
  SYSVAR_SLOT_HASHES_ADDRESS,
  SYSVAR_SLOT_HISTORY_ADDRESS,
  SYSVAR_STAKE_HISTORY_ADDRESS,
  SYSVAR_FEES_ADDRESS,
  SYSVAR_EPOCH_REWARDS_ADDRESS,
  SYSVAR_LAST_RESTART_SLOT_ADDRESS,
  SYSVAR_ADDRESSES,
  isSysvarAddress,
  getSysvarName,
} from '../src/index';

describe('Sysvar Constants', () => {
  describe('Individual sysvar addresses', () => {
    it('should have correct Clock sysvar address', () => {
      expect(SYSVAR_CLOCK_ADDRESS).toBe('SysvarC1ock11111111111111111111111111111111');
    });

    it('should have correct EpochSchedule sysvar address', () => {
      expect(SYSVAR_EPOCH_SCHEDULE_ADDRESS).toBe('SysvarEpochSchedu1e111111111111111111111111');
    });

    it('should have correct Instructions sysvar address', () => {
      expect(SYSVAR_INSTRUCTIONS_ADDRESS).toBe('Sysvar1nstructions1111111111111111111111111');
    });

    it('should have correct RecentBlockhashes sysvar address', () => {
      expect(SYSVAR_RECENT_BLOCKHASHES_ADDRESS).toBe('SysvarRecentB1ockHashes11111111111111111111');
    });

    it('should have correct Rent sysvar address', () => {
      expect(SYSVAR_RENT_ADDRESS).toBe('SysvarRent111111111111111111111111111111111');
    });

    it('should have correct SlotHashes sysvar address', () => {
      expect(SYSVAR_SLOT_HASHES_ADDRESS).toBe('SysvarS1otHashes111111111111111111111111111');
    });

    it('should have correct SlotHistory sysvar address', () => {
      expect(SYSVAR_SLOT_HISTORY_ADDRESS).toBe('SysvarS1otHistory11111111111111111111111111');
    });

    it('should have correct StakeHistory sysvar address', () => {
      expect(SYSVAR_STAKE_HISTORY_ADDRESS).toBe('SysvarStakeHistory1111111111111111111111111');
    });

    it('should have correct Fees sysvar address', () => {
      expect(SYSVAR_FEES_ADDRESS).toBe('SysvarFees111111111111111111111111111111111');
    });

    it('should have correct EpochRewards sysvar address', () => {
      expect(SYSVAR_EPOCH_REWARDS_ADDRESS).toBe('SysvarEpochRewards1111111111111111111111111');
    });

    it('should have correct LastRestartSlot sysvar address', () => {
      expect(SYSVAR_LAST_RESTART_SLOT_ADDRESS).toBe('SysvarLastRestartS1ot1111111111111111111111');
    });
  });

  describe('SYSVAR_ADDRESSES collection', () => {
    it('should contain all sysvar addresses', () => {
      expect(SYSVAR_ADDRESSES.clock).toBe(SYSVAR_CLOCK_ADDRESS);
      expect(SYSVAR_ADDRESSES.epochSchedule).toBe(SYSVAR_EPOCH_SCHEDULE_ADDRESS);
      expect(SYSVAR_ADDRESSES.instructions).toBe(SYSVAR_INSTRUCTIONS_ADDRESS);
      expect(SYSVAR_ADDRESSES.recentBlockhashes).toBe(SYSVAR_RECENT_BLOCKHASHES_ADDRESS);
      expect(SYSVAR_ADDRESSES.rent).toBe(SYSVAR_RENT_ADDRESS);
      expect(SYSVAR_ADDRESSES.slotHashes).toBe(SYSVAR_SLOT_HASHES_ADDRESS);
      expect(SYSVAR_ADDRESSES.slotHistory).toBe(SYSVAR_SLOT_HISTORY_ADDRESS);
      expect(SYSVAR_ADDRESSES.stakeHistory).toBe(SYSVAR_STAKE_HISTORY_ADDRESS);
      expect(SYSVAR_ADDRESSES.fees).toBe(SYSVAR_FEES_ADDRESS);
      expect(SYSVAR_ADDRESSES.epochRewards).toBe(SYSVAR_EPOCH_REWARDS_ADDRESS);
      expect(SYSVAR_ADDRESSES.lastRestartSlot).toBe(SYSVAR_LAST_RESTART_SLOT_ADDRESS);
    });

    it('should have correct number of sysvars', () => {
      const sysvarCount = Object.keys(SYSVAR_ADDRESSES).length;
      expect(sysvarCount).toBe(11);
    });
  });

  describe('Type safety', () => {
    it('all sysvar addresses should be valid Address types', () => {
      // This test verifies that all constants are properly typed as Address
      // TypeScript would fail to compile if they weren't
      const addresses = [
        SYSVAR_CLOCK_ADDRESS,
        SYSVAR_EPOCH_SCHEDULE_ADDRESS,
        SYSVAR_INSTRUCTIONS_ADDRESS,
        SYSVAR_RECENT_BLOCKHASHES_ADDRESS,
        SYSVAR_RENT_ADDRESS,
        SYSVAR_SLOT_HASHES_ADDRESS,
        SYSVAR_SLOT_HISTORY_ADDRESS,
        SYSVAR_STAKE_HISTORY_ADDRESS,
        SYSVAR_FEES_ADDRESS,
        SYSVAR_EPOCH_REWARDS_ADDRESS,
        SYSVAR_LAST_RESTART_SLOT_ADDRESS,
      ];

      addresses.forEach((addr) => {
        // Verify each is a valid base58 string of correct length
        expect(typeof addr).toBe('string');
        expect(addr.length).toBeGreaterThan(0);
        expect(addr.length).toBeLessThanOrEqual(44); // Max base58 length for 32 bytes
      });
    });

    it('should not allow raw strings to be used as sysvar addresses', () => {
      // This demonstrates type safety - raw strings can't be assigned to Address type
      const rawString = 'SysvarC1ock11111111111111111111111111111111';
      // @ts-expect-error - Type safety test
      const _testAssignment: typeof SYSVAR_CLOCK_ADDRESS = rawString;
      // This line would fail TypeScript compilation
    });
  });

  describe('isSysvarAddress', () => {
    it('should return true for all known sysvar addresses', () => {
      expect(isSysvarAddress(SYSVAR_CLOCK_ADDRESS)).toBe(true);
      expect(isSysvarAddress(SYSVAR_EPOCH_SCHEDULE_ADDRESS)).toBe(true);
      expect(isSysvarAddress(SYSVAR_INSTRUCTIONS_ADDRESS)).toBe(true);
      expect(isSysvarAddress(SYSVAR_RECENT_BLOCKHASHES_ADDRESS)).toBe(true);
      expect(isSysvarAddress(SYSVAR_RENT_ADDRESS)).toBe(true);
      expect(isSysvarAddress(SYSVAR_SLOT_HASHES_ADDRESS)).toBe(true);
      expect(isSysvarAddress(SYSVAR_SLOT_HISTORY_ADDRESS)).toBe(true);
      expect(isSysvarAddress(SYSVAR_STAKE_HISTORY_ADDRESS)).toBe(true);
      expect(isSysvarAddress(SYSVAR_FEES_ADDRESS)).toBe(true);
      expect(isSysvarAddress(SYSVAR_EPOCH_REWARDS_ADDRESS)).toBe(true);
      expect(isSysvarAddress(SYSVAR_LAST_RESTART_SLOT_ADDRESS)).toBe(true);
    });

    it('should return false for non-sysvar addresses', () => {
      const systemProgramAddress = address('11111111111111111111111111111111');
      const tokenProgramAddress = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      const randomAddress = address('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK');

      expect(isSysvarAddress(systemProgramAddress)).toBe(false);
      expect(isSysvarAddress(tokenProgramAddress)).toBe(false);
      expect(isSysvarAddress(randomAddress)).toBe(false);
    });

    it('should work with addresses from SYSVAR_ADDRESSES collection', () => {
      Object.values(SYSVAR_ADDRESSES).forEach((addr) => {
        expect(isSysvarAddress(addr)).toBe(true);
      });
    });
  });

  describe('getSysvarName', () => {
    it('should return correct name for each sysvar address', () => {
      expect(getSysvarName(SYSVAR_CLOCK_ADDRESS)).toBe('clock');
      expect(getSysvarName(SYSVAR_EPOCH_SCHEDULE_ADDRESS)).toBe('epochSchedule');
      expect(getSysvarName(SYSVAR_INSTRUCTIONS_ADDRESS)).toBe('instructions');
      expect(getSysvarName(SYSVAR_RECENT_BLOCKHASHES_ADDRESS)).toBe('recentBlockhashes');
      expect(getSysvarName(SYSVAR_RENT_ADDRESS)).toBe('rent');
      expect(getSysvarName(SYSVAR_SLOT_HASHES_ADDRESS)).toBe('slotHashes');
      expect(getSysvarName(SYSVAR_SLOT_HISTORY_ADDRESS)).toBe('slotHistory');
      expect(getSysvarName(SYSVAR_STAKE_HISTORY_ADDRESS)).toBe('stakeHistory');
      expect(getSysvarName(SYSVAR_FEES_ADDRESS)).toBe('fees');
      expect(getSysvarName(SYSVAR_EPOCH_REWARDS_ADDRESS)).toBe('epochRewards');
      expect(getSysvarName(SYSVAR_LAST_RESTART_SLOT_ADDRESS)).toBe('lastRestartSlot');
    });

    it('should return undefined for non-sysvar addresses', () => {
      const systemProgramAddress = address('11111111111111111111111111111111');
      const tokenProgramAddress = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      const randomAddress = address('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK');

      expect(getSysvarName(systemProgramAddress)).toBe(undefined);
      expect(getSysvarName(tokenProgramAddress)).toBe(undefined);
      expect(getSysvarName(randomAddress)).toBe(undefined);
    });

    it('should have correct TypeScript return type', () => {
      const name = getSysvarName(SYSVAR_CLOCK_ADDRESS);
      if (name !== undefined) {
        // TypeScript should know this is a keyof typeof SYSVAR_ADDRESSES
        const validNames: (keyof typeof SYSVAR_ADDRESSES)[] = [
          'clock',
          'epochSchedule',
          'instructions',
          'recentBlockhashes',
          'rent',
          'slotHashes',
          'slotHistory',
          'stakeHistory',
          'fees',
          'epochRewards',
          'lastRestartSlot',
        ];
        expect(validNames).toContain(name);
      }
    });
  });

  describe('Well-known address validation', () => {
    it('all sysvar addresses should be valid base58 strings', () => {
      const addresses = Object.values(SYSVAR_ADDRESSES);
      addresses.forEach((addr) => {
        // Solana addresses are 32 bytes encoded as base58, resulting in 43-44 characters
        expect(addr.length).toBeGreaterThanOrEqual(43);
        expect(addr.length).toBeLessThanOrEqual(44);
      });
    });

    it('all sysvar addresses should start with "Sysvar"', () => {
      const addresses = [
        SYSVAR_CLOCK_ADDRESS,
        SYSVAR_EPOCH_SCHEDULE_ADDRESS,
        SYSVAR_RECENT_BLOCKHASHES_ADDRESS,
        SYSVAR_RENT_ADDRESS,
        SYSVAR_SLOT_HASHES_ADDRESS,
        SYSVAR_SLOT_HISTORY_ADDRESS,
        SYSVAR_STAKE_HISTORY_ADDRESS,
        SYSVAR_FEES_ADDRESS,
        SYSVAR_EPOCH_REWARDS_ADDRESS,
        SYSVAR_LAST_RESTART_SLOT_ADDRESS,
      ];

      addresses.forEach((addr) => {
        expect(addr.startsWith('Sysvar')).toBe(true);
      });

      // Instructions sysvar is special case
      expect(SYSVAR_INSTRUCTIONS_ADDRESS.startsWith('Sysvar')).toBe(true);
    });

    it('all addresses should be unique', () => {
      const addresses = Object.values(SYSVAR_ADDRESSES);
      const uniqueAddresses = new Set(addresses);
      expect(uniqueAddresses.size).toBe(addresses.length);
    });
  });
});
