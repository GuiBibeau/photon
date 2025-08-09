import { describe, it, expect } from 'vitest';
import { address } from '@photon/addresses';
import {
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  setTransactionMessageLifetimeUsingNonce,
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructions,
  prependTransactionMessageInstruction,
  insertTransactionMessageInstruction,
  estimateTransactionMessageSize,
  validateInstruction,
  blockhash,
  hasFeePayer,
  hasLifetime,
  isCompileable,
  type Instruction,
  type NonceInfo,
  type CompileableTransactionMessage,
} from '../src/index';

describe('Transaction Message Builder Edge Cases', () => {
  const feePayer = address('11111111111111111111111111111112');
  const programId = address('11111111111111111111111111111113');
  const account1 = address('11111111111111111111111111111114');
  const account2 = address('11111111111111111111111111111115');

  describe('Large transaction tests', () => {
    it('should handle maximum number of unique accounts', () => {
      const message = createTransactionMessage('legacy');
      const messageWithPrerequisites = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('MaxAccountsTest1234567890123456789012345678'),
          lastValidBlockHeight: 100000n,
        },
        setTransactionMessageFeePayer(feePayer, message),
      );

      // Create instructions with many unique accounts (but not too many to exceed limit)
      const instructions: Instruction[] = [];
      for (let i = 0; i < 20; i++) {
        // Creating unique but valid addresses - using known valid Solana addresses
        const addresses = [
          '11111111111111111111111111111112',
          '11111111111111111111111111111113',
          '11111111111111111111111111111114',
          '11111111111111111111111111111115',
          '11111111111111111111111111111116',
          '11111111111111111111111111111117',
          '11111111111111111111111111111118',
          '11111111111111111111111111111119',
          'So11111111111111111111111111111111111111112',
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
          'Stake11111111111111111111111111111111111111',
          'Vote111111111111111111111111111111111111111',
          'Config1111111111111111111111111111111111111',
          'SysvarC1ock11111111111111111111111111111111',
          'SysvarEpochSchedu1e111111111111111111111111',
          'SysvarFees111111111111111111111111111111111',
          'SysvarRecentB1ockHashes11111111111111111111',
          'SysvarRent111111111111111111111111111111111',
          'SysvarRewards111111111111111111111111111111',
          'SysvarS1otHashes111111111111111111111111111',
          'SysvarS1otHistory11111111111111111111111111',
          'SysvarStakeHistory1111111111111111111111111',
          'BPFLoaderUpgradeab1e11111111111111111111111',
          'Ed25519SigVerify111111111111111111111111111',
          'KeccakSecp256k11111111111111111111111111111',
          'ComputeBudget111111111111111111111111111111',
          'AddressLookupTab1e1111111111111111111111111',
          'NativeLoader1111111111111111111111111111111',
          'Va1idator1nfo111111111111111111111111111111',
        ];
        const accountAddress = address(addresses[i]);
        instructions.push({
          programId,
          accounts: [{ pubkey: accountAddress, isSigner: false, isWritable: true }],
          data: new Uint8Array([i]),
        });
      }

      const messageWithInstructions = appendTransactionMessageInstructions(
        instructions,
        messageWithPrerequisites,
      );

      const size = estimateTransactionMessageSize(messageWithInstructions);
      expect(size).toBeGreaterThan(700); // Should be large due to many accounts (20 * 32 bytes + overhead)
      expect(size).toBeLessThan(1232); // But still under transaction limit
    });

    it('should handle instructions with large data payloads', () => {
      const message = createTransactionMessage('legacy');
      const messageWithPrerequisites = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('LargeDataTest1234567890123456789012345678'),
          lastValidBlockHeight: 100000n,
        },
        setTransactionMessageFeePayer(feePayer, message),
      );

      const largeDataInstruction: Instruction = {
        programId,
        accounts: [],
        data: new Uint8Array(500), // Large data payload
      };

      const messageWithInstruction = appendTransactionMessageInstruction(
        largeDataInstruction,
        messageWithPrerequisites,
      );

      const size = estimateTransactionMessageSize(messageWithInstruction);
      expect(size).toBeGreaterThan(500); // Should include the data size
    });

    it('should handle deeply nested instruction operations', () => {
      let message = createTransactionMessage('legacy');
      message = setTransactionMessageFeePayer(feePayer, message);
      message = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('NestedTest123456789012345678901234567890123'),
          lastValidBlockHeight: 100000n,
        },
        message,
      );

      // Add, prepend, and insert instructions in various orders
      for (let i = 0; i < 10; i++) {
        const instruction: Instruction = {
          programId,
          accounts: [],
          data: new Uint8Array([i]),
        };

        if (i % 3 === 0) {
          message = appendTransactionMessageInstruction(instruction, message);
        } else if (i % 3 === 1) {
          message = prependTransactionMessageInstruction(instruction, message);
        } else {
          const insertPos = Math.floor(message.instructions.length / 2);
          message = insertTransactionMessageInstruction(instruction, insertPos, message);
        }
      }

      expect(message.instructions).toHaveLength(10);
      expect(isCompileable(message)).toBe(true);
    });
  });

  describe('Boundary conditions', () => {
    it('should handle empty instruction data', () => {
      const instruction: Instruction = {
        programId,
        accounts: [],
        data: new Uint8Array(0),
      };

      const message = createTransactionMessage('legacy');
      const updated = appendTransactionMessageInstruction(instruction, message);

      expect(updated.instructions[0].data).toHaveLength(0);
      expect(() => validateInstruction(instruction)).not.toThrow();
    });

    it('should handle instructions with no accounts', () => {
      const instruction: Instruction = {
        programId,
        accounts: [],
        data: new Uint8Array([1, 2, 3]),
      };

      const message = createTransactionMessage('legacy');
      const updated = appendTransactionMessageInstruction(instruction, message);

      expect(updated.instructions[0].accounts).toHaveLength(0);
      expect(() => validateInstruction(instruction)).not.toThrow();
    });

    it('should handle very long base58 addresses', () => {
      // Addresses are always 44 characters in base58, but test the limit
      const validAddress = address('So11111111111111111111111111111111111111112');
      const instruction: Instruction = {
        programId: validAddress,
        accounts: [{ pubkey: validAddress, isSigner: true, isWritable: true }],
        data: new Uint8Array([1]),
      };

      const message = createTransactionMessage('legacy');
      const updated = appendTransactionMessageInstruction(instruction, message);

      expect(updated.instructions[0].programId).toBe(validAddress);
    });

    it('should handle bigint edge values for block height', () => {
      const message = createTransactionMessage('legacy');
      const messageWithFeePayer = setTransactionMessageFeePayer(feePayer, message);

      // Test with 0n
      const messageWithZero = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('ZeroHeight123456789012345678901234567890123'),
          lastValidBlockHeight: 0n,
        },
        messageWithFeePayer,
      );
      expect(messageWithZero.lastValidBlockHeight).toBe(0n);

      // Test with max safe bigint
      const maxBigInt = BigInt('18446744073709551615'); // u64::MAX
      const messageWithMax = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('MaxHeight1234567890123456789012345678901234'),
          lastValidBlockHeight: maxBigInt,
        },
        messageWithFeePayer,
      );
      expect(messageWithMax.lastValidBlockHeight).toBe(maxBigInt);
    });
  });

  describe('Immutability stress tests', () => {
    it('should maintain immutability through complex operations', () => {
      const message1 = createTransactionMessage('legacy');
      const message2 = setTransactionMessageFeePayer(feePayer, message1);
      const message3 = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('ImmutableTest123456789012345678901234567890'),
          lastValidBlockHeight: 100000n,
        },
        message2,
      );

      const instruction: Instruction = {
        programId,
        accounts: [{ pubkey: account1, isSigner: true, isWritable: true }],
        data: new Uint8Array([1, 2, 3]),
      };

      const message4 = appendTransactionMessageInstruction(instruction, message3);

      // Verify that the data is a copy, not a reference
      const originalData = new Uint8Array([1, 2, 3]);
      const testInstruction: Instruction = {
        programId,
        accounts: [{ pubkey: account1, isSigner: true, isWritable: true }],
        data: originalData,
      };
      const messageWithCopiedData = appendTransactionMessageInstruction(testInstruction, message3);

      // Modify the original data
      originalData[0] = 99;

      // The instruction in the message should not be affected
      expect(messageWithCopiedData.instructions[0].data[0]).toBe(1);
      expect(messageWithCopiedData.instructions[0].data[0]).not.toBe(99);

      // Try to modify accounts (should throw because frozen)
      expect(() => {
        (message4.instructions[0].accounts as any).push({
          pubkey: account2,
          isSigner: false,
          isWritable: false,
        });
      }).toThrow(); // Should throw because it's frozen

      // Try to modify the instructions array (should throw because frozen)
      expect(() => {
        (message4.instructions as any).push(instruction);
      }).toThrow(); // Should throw because it's frozen

      // Verify all intermediate messages remain unchanged
      expect(message1.feePayer).toBeUndefined();
      expect(message2.blockhash).toBeUndefined();
      expect(message3.instructions).toHaveLength(0);
    });

    it('should create independent copies when building similar messages', () => {
      const baseMessage = createTransactionMessage('legacy');
      const messageWithFeePayer = setTransactionMessageFeePayer(feePayer, baseMessage);
      const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('IndependentTest123456789012345678901234567'),
          lastValidBlockHeight: 100000n,
        },
        messageWithFeePayer,
      );

      const instruction1: Instruction = {
        programId,
        accounts: [],
        data: new Uint8Array([1]),
      };

      const instruction2: Instruction = {
        programId,
        accounts: [],
        data: new Uint8Array([2]),
      };

      // Create two different branches from the same base
      const branch1 = appendTransactionMessageInstruction(instruction1, messageWithLifetime);
      const branch2 = appendTransactionMessageInstruction(instruction2, messageWithLifetime);

      expect(branch1.instructions[0].data[0]).toBe(1);
      expect(branch2.instructions[0].data[0]).toBe(2);
      expect(branch1).not.toBe(branch2);
      expect(branch1.instructions).not.toBe(branch2.instructions);
    });
  });

  describe('Version-specific behaviors', () => {
    it('should handle version 0 specific features', () => {
      const message = createTransactionMessage(0);
      expect(message.version).toBe(0);

      const messageWithFeePayer = setTransactionMessageFeePayer(feePayer, message);
      const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('V0Test1234567890123456789012345678901234567'),
          lastValidBlockHeight: 100000n,
        },
        messageWithFeePayer,
      );

      // Add address lookup tables (v0 feature)
      const messageWithLookupTables = {
        ...messageWithLifetime,
        addressLookupTables: [
          {
            address: address('LookupTab1e11111111111111111111111111111111'),
            writableIndexes: [0, 1],
            readonlyIndexes: [2, 3, 4],
          },
        ],
      };

      const size = estimateTransactionMessageSize(messageWithLookupTables);
      expect(size).toBeGreaterThan(0);
    });

    it('should maintain version through all operations', () => {
      const v0Message = createTransactionMessage(0);
      const v0WithFeePayer = setTransactionMessageFeePayer(feePayer, v0Message);
      const v0WithLifetime = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('VersionTest1234567890123456789012345678901'),
          lastValidBlockHeight: 100000n,
        },
        v0WithFeePayer,
      );

      expect(v0Message.version).toBe(0);
      expect(v0WithFeePayer.version).toBe(0);
      expect(v0WithLifetime.version).toBe(0);

      const legacyMessage = createTransactionMessage('legacy');
      const legacyWithFeePayer = setTransactionMessageFeePayer(feePayer, legacyMessage);
      const legacyWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('LegacyTest123456789012345678901234567890123'),
          lastValidBlockHeight: 100000n,
        },
        legacyWithFeePayer,
      );

      expect(legacyMessage.version).toBe('legacy');
      expect(legacyWithFeePayer.version).toBe('legacy');
      expect(legacyWithLifetime.version).toBe('legacy');
    });
  });

  describe('Nonce-specific edge cases', () => {
    it('should handle switching between nonce and blockhash multiple times', () => {
      const message = createTransactionMessage('legacy');
      const messageWithFeePayer = setTransactionMessageFeePayer(feePayer, message);

      const blockhashInfo = {
        blockhash: blockhash('BlockhashA123456789012345678901234567890123'),
        lastValidBlockHeight: 1000n,
      };

      const nonceInfo: NonceInfo = {
        nonce: blockhash('NonceA123456789012345678901234567890123456'),
        nonceAccountAddress: address('NonceAccount1111111111111111111111111111111'),
        nonceAuthorityAddress: address('NonceAuthority11111111111111111111111111111'),
      };

      // Switch back and forth
      let current = messageWithFeePayer;
      for (let i = 0; i < 5; i++) {
        if (i % 2 === 0) {
          current = setTransactionMessageLifetimeUsingBlockhash(blockhashInfo, current);
          expect((current as any).nonceInfo).toBeUndefined();
          expect(current.lastValidBlockHeight).toBe(1000n);
        } else {
          current = setTransactionMessageLifetimeUsingNonce(nonceInfo, current);
          expect((current as any).nonceInfo).toEqual(nonceInfo);
          expect(current.lastValidBlockHeight).toBe(18446744073709551615n);
        }
      }
    });

    it('should handle nonce with maximum slot value', () => {
      const message = createTransactionMessage('legacy');
      const messageWithFeePayer = setTransactionMessageFeePayer(feePayer, message);

      // First set blockhash with maximum slot
      const messageWithMaxSlot = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('MaxSlotTest1234567890123456789012345678901'),
          lastValidBlockHeight: 1000n,
          slot: BigInt('18446744073709551615'), // u64::MAX
        },
        messageWithFeePayer,
      );

      expect((messageWithMaxSlot as any).slot).toBe(18446744073709551615n);

      // Then switch to nonce, slot should be removed
      const nonceInfo: NonceInfo = {
        nonce: blockhash('NonceAfterMaxSlot12345678901234567890123456'),
        nonceAccountAddress: address('NonceAccount1111111111111111111111111111111'),
        nonceAuthorityAddress: address('NonceAuthority11111111111111111111111111111'),
      };

      const messageWithNonce = setTransactionMessageLifetimeUsingNonce(
        nonceInfo,
        messageWithMaxSlot,
      );

      expect((messageWithNonce as any).slot).toBeUndefined();
      expect((messageWithNonce as any).nonceInfo).toEqual(nonceInfo);
    });
  });

  describe('Type safety compile-time checks', () => {
    it('should enforce proper type flow for complete messages', () => {
      const message = createTransactionMessage('legacy');

      // This should not be compileable yet
      expect(isCompileable(message)).toBe(false);

      const messageWithFeePayer = setTransactionMessageFeePayer(feePayer, message);
      expect(hasFeePayer(messageWithFeePayer)).toBe(true);
      expect(isCompileable(messageWithFeePayer)).toBe(false);

      const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('TypeSafetyTest123456789012345678901234567'),
          lastValidBlockHeight: 100000n,
        },
        messageWithFeePayer,
      );

      expect(hasLifetime(messageWithLifetime)).toBe(true);
      expect(isCompileable(messageWithLifetime)).toBe(true);

      // This should be assignable to CompileableTransactionMessage
      const _compileable: CompileableTransactionMessage = messageWithLifetime;
      expect(_compileable).toBeDefined();
    });

    it('should handle type guards correctly', () => {
      const message = createTransactionMessage('legacy');

      // Type guards should work at each stage
      expect(hasFeePayer(message)).toBe(false);
      expect(hasLifetime(message)).toBe(false);
      expect(isCompileable(message)).toBe(false);

      const withFeePayer = setTransactionMessageFeePayer(feePayer, message);
      expect(hasFeePayer(withFeePayer)).toBe(true);
      expect(hasLifetime(withFeePayer)).toBe(false);
      expect(isCompileable(withFeePayer)).toBe(false);

      const withLifetime = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('GuardTest1234567890123456789012345678901234'),
          lastValidBlockHeight: 100000n,
        },
        withFeePayer,
      );
      expect(hasFeePayer(withLifetime)).toBe(true);
      expect(hasLifetime(withLifetime)).toBe(true);
      expect(isCompileable(withLifetime)).toBe(true);
    });
  });
});
