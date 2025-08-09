import { describe, it, expect } from 'vitest';
import { address } from '@photon/addresses';
import { createTransactionMessage } from '../src/create';
import { setTransactionMessageFeePayer } from '../src/fee-payer';
import {
  appendTransactionMessageInstruction,
  prependTransactionMessageInstruction,
  insertTransactionMessageInstruction,
  appendTransactionMessageInstructions,
  estimateTransactionMessageSize,
  validateInstruction,
  deduplicateAccounts,
  getOrderedAccounts,
  createInstructionData,
  createInstruction,
} from '../src/instructions';
import type { Instruction, AccountMeta } from '../src/types';

describe('Transaction Message Instructions', () => {
  const programId = address('11111111111111111111111111111112');
  const account1 = address('11111111111111111111111111111113');
  const account2 = address('11111111111111111111111111111114');

  const createTestInstruction = (data: number): Instruction => ({
    programId,
    accounts: [
      { pubkey: account1, isSigner: true, isWritable: true },
      { pubkey: account2, isSigner: false, isWritable: false },
    ],
    data: new Uint8Array([data]),
  });

  describe('appendTransactionMessageInstruction', () => {
    it('should append an instruction to an empty message', () => {
      const message = createTransactionMessage('legacy');
      const instruction = createTestInstruction(1);
      const updated = appendTransactionMessageInstruction(instruction, message);

      expect(updated.instructions).toHaveLength(1);
      expect(updated.instructions[0]).toEqual(instruction);
    });

    it('should append an instruction to the end of existing instructions', () => {
      const message = createTransactionMessage('legacy');
      const instruction1 = createTestInstruction(1);
      const instruction2 = createTestInstruction(2);

      let updated = appendTransactionMessageInstruction(instruction1, message);
      updated = appendTransactionMessageInstruction(instruction2, updated);

      expect(updated.instructions).toHaveLength(2);
      expect(updated.instructions[0].data[0]).toBe(1);
      expect(updated.instructions[1].data[0]).toBe(2);
    });

    it('should return a frozen message with frozen instructions', () => {
      const message = createTransactionMessage('legacy');
      const instruction = createTestInstruction(1);
      const updated = appendTransactionMessageInstruction(instruction, message);

      expect(Object.isFrozen(updated)).toBe(true);
      expect(Object.isFrozen(updated.instructions)).toBe(true);
      expect(Object.isFrozen(updated.instructions[0])).toBe(true);
      expect(Object.isFrozen(updated.instructions[0].accounts)).toBe(true);
    });

    it('should not modify the original message', () => {
      const message = createTransactionMessage('legacy');
      const originalInstructions = [...message.instructions];
      const instruction = createTestInstruction(1);

      appendTransactionMessageInstruction(instruction, message);

      expect(message.instructions).toEqual(originalInstructions);
    });
  });

  describe('prependTransactionMessageInstruction', () => {
    it('should prepend an instruction to an empty message', () => {
      const message = createTransactionMessage('legacy');
      const instruction = createTestInstruction(1);
      const updated = prependTransactionMessageInstruction(instruction, message);

      expect(updated.instructions).toHaveLength(1);
      expect(updated.instructions[0]).toEqual(instruction);
    });

    it('should prepend an instruction to the beginning of existing instructions', () => {
      const message = createTransactionMessage('legacy');
      const instruction1 = createTestInstruction(1);
      const instruction2 = createTestInstruction(2);

      let updated = appendTransactionMessageInstruction(instruction1, message);
      updated = prependTransactionMessageInstruction(instruction2, updated);

      expect(updated.instructions).toHaveLength(2);
      expect(updated.instructions[0].data[0]).toBe(2);
      expect(updated.instructions[1].data[0]).toBe(1);
    });
  });

  describe('insertTransactionMessageInstruction', () => {
    it('should insert at the beginning when index is 0', () => {
      const message = createTransactionMessage('legacy');
      const instruction1 = createTestInstruction(1);
      const instruction2 = createTestInstruction(2);

      let updated = appendTransactionMessageInstruction(instruction1, message);
      updated = insertTransactionMessageInstruction(instruction2, 0, updated);

      expect(updated.instructions).toHaveLength(2);
      expect(updated.instructions[0].data[0]).toBe(2);
      expect(updated.instructions[1].data[0]).toBe(1);
    });

    it('should insert at the end when index equals length', () => {
      const message = createTransactionMessage('legacy');
      const instruction1 = createTestInstruction(1);
      const instruction2 = createTestInstruction(2);

      let updated = appendTransactionMessageInstruction(instruction1, message);
      updated = insertTransactionMessageInstruction(instruction2, 1, updated);

      expect(updated.instructions).toHaveLength(2);
      expect(updated.instructions[0].data[0]).toBe(1);
      expect(updated.instructions[1].data[0]).toBe(2);
    });

    it('should insert in the middle of existing instructions', () => {
      const message = createTransactionMessage('legacy');
      const instruction1 = createTestInstruction(1);
      const instruction2 = createTestInstruction(2);
      const instruction3 = createTestInstruction(3);

      let updated = appendTransactionMessageInstruction(instruction1, message);
      updated = appendTransactionMessageInstruction(instruction3, updated);
      updated = insertTransactionMessageInstruction(instruction2, 1, updated);

      expect(updated.instructions).toHaveLength(3);
      expect(updated.instructions[0].data[0]).toBe(1);
      expect(updated.instructions[1].data[0]).toBe(2);
      expect(updated.instructions[2].data[0]).toBe(3);
    });

    it('should throw for negative index', () => {
      const message = createTransactionMessage('legacy');
      const instruction = createTestInstruction(1);

      expect(() => insertTransactionMessageInstruction(instruction, -1, message)).toThrow(
        'Index -1 is out of bounds',
      );
    });

    it('should throw for index greater than length', () => {
      const message = createTransactionMessage('legacy');
      const instruction = createTestInstruction(1);

      expect(() => insertTransactionMessageInstruction(instruction, 1, message)).toThrow(
        'Index 1 is out of bounds',
      );
    });
  });

  describe('appendTransactionMessageInstructions', () => {
    it('should append multiple instructions at once', () => {
      const message = createTransactionMessage('legacy');
      const instructions = [
        createTestInstruction(1),
        createTestInstruction(2),
        createTestInstruction(3),
      ];

      const updated = appendTransactionMessageInstructions(instructions, message);

      expect(updated.instructions).toHaveLength(3);
      expect(updated.instructions[0].data[0]).toBe(1);
      expect(updated.instructions[1].data[0]).toBe(2);
      expect(updated.instructions[2].data[0]).toBe(3);
    });

    it('should append to existing instructions', () => {
      const message = createTransactionMessage('legacy');
      const existing = createTestInstruction(0);
      const newInstructions = [createTestInstruction(1), createTestInstruction(2)];

      let updated = appendTransactionMessageInstruction(existing, message);
      updated = appendTransactionMessageInstructions(newInstructions, updated);

      expect(updated.instructions).toHaveLength(3);
      expect(updated.instructions[0].data[0]).toBe(0);
      expect(updated.instructions[1].data[0]).toBe(1);
      expect(updated.instructions[2].data[0]).toBe(2);
    });

    it('should handle empty array', () => {
      const message = createTransactionMessage('legacy');
      const updated = appendTransactionMessageInstructions([], message);

      expect(updated.instructions).toHaveLength(0);
      expect(updated.instructions).toEqual([]);
    });
  });

  describe('estimateTransactionMessageSize', () => {
    it('should estimate size of an empty message', () => {
      const message = createTransactionMessage('legacy');
      const size = estimateTransactionMessageSize(message);

      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(100); // Basic overhead
    });

    it('should increase size with instructions', () => {
      const message = createTransactionMessage('legacy');
      const instruction = createTestInstruction(1);
      const updated = appendTransactionMessageInstruction(instruction, message);

      const sizeEmpty = estimateTransactionMessageSize(message);
      const sizeWithInstruction = estimateTransactionMessageSize(updated);

      expect(sizeWithInstruction).toBeGreaterThan(sizeEmpty);
    });

    it('should account for unique accounts', () => {
      const message = createTransactionMessage('legacy');
      const manyAccounts = {
        programId,
        accounts: [
          { pubkey: address('11111111111111111111111111111115'), isSigner: true, isWritable: true },
          {
            pubkey: address('11111111111111111111111111111116'),
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: address('11111111111111111111111111111117'),
            isSigner: false,
            isWritable: false,
          },
        ],
        data: new Uint8Array([1, 2, 3]),
      };

      const updated = appendTransactionMessageInstruction(manyAccounts, message);
      const size = estimateTransactionMessageSize(updated);

      // Should account for 4 unique addresses (program + 3 accounts) * 32 bytes each
      expect(size).toBeGreaterThan(128);
    });

    it('should account for instruction data', () => {
      const message = createTransactionMessage('legacy');
      const smallData = {
        programId,
        accounts: [],
        data: new Uint8Array(10),
      };
      const largeData = {
        programId,
        accounts: [],
        data: new Uint8Array(100),
      };

      const messageSmall = appendTransactionMessageInstruction(smallData, message);
      const messageLarge = appendTransactionMessageInstruction(largeData, message);

      const sizeSmall = estimateTransactionMessageSize(messageSmall);
      const sizeLarge = estimateTransactionMessageSize(messageLarge);

      expect(sizeLarge - sizeSmall).toBeCloseTo(90, 0); // 100 - 10 = 90 bytes difference
    });

    it('should account for address lookup tables in v0 transactions', () => {
      const message = createTransactionMessage(0);
      const messageWithTable = {
        ...message,
        addressLookupTables: [
          {
            address: programId,
            writableIndexes: [0, 1, 2],
            readonlyIndexes: [3, 4],
          },
        ],
      };

      const sizeWithoutTable = estimateTransactionMessageSize(message);
      const sizeWithTable = estimateTransactionMessageSize(messageWithTable);

      expect(sizeWithTable).toBeGreaterThan(sizeWithoutTable);
    });
  });

  describe('Instruction immutability', () => {
    it('should create a copy of instruction data', () => {
      const message = createTransactionMessage('legacy');
      const originalData = new Uint8Array([1, 2, 3]);
      const instruction: Instruction = {
        programId,
        accounts: [],
        data: originalData,
      };

      const updated = appendTransactionMessageInstruction(instruction, message);

      // Modify the original data
      originalData[0] = 99;

      // The instruction in the message should not be affected
      expect(updated.instructions[0].data[0]).toBe(1);
    });

    it('should freeze instruction accounts array', () => {
      const message = createTransactionMessage('legacy');
      const instruction = createTestInstruction(1);
      const updated = appendTransactionMessageInstruction(instruction, message);

      expect(Object.isFrozen(updated.instructions[0].accounts)).toBe(true);
    });
  });

  describe('validateInstruction', () => {
    it('should validate a valid instruction', () => {
      const instruction = createTestInstruction(1);
      expect(() => validateInstruction(instruction)).not.toThrow();
    });

    it('should throw for missing program ID', () => {
      const instruction = { accounts: [], data: new Uint8Array() } as any;
      expect(() => validateInstruction(instruction)).toThrow('Instruction must have a program ID');
    });

    it('should throw for missing accounts array', () => {
      const instruction = { programId, data: new Uint8Array() } as any;
      expect(() => validateInstruction(instruction)).toThrow(
        'Instruction must have an accounts array',
      );
    });

    it('should throw for non-array accounts', () => {
      const instruction = { programId, accounts: 'not-an-array', data: new Uint8Array() } as any;
      expect(() => validateInstruction(instruction)).toThrow(
        'Instruction accounts must be an array',
      );
    });

    it('should throw for invalid account metadata', () => {
      const instruction = {
        programId,
        accounts: [{ pubkey: account1 }],
        data: new Uint8Array(),
      } as any;
      expect(() => validateInstruction(instruction)).toThrow(
        'Account at index 0 must have isSigner as a boolean',
      );
    });

    it('should throw for missing data', () => {
      const instruction = { programId, accounts: [] } as any;
      expect(() => validateInstruction(instruction)).toThrow('Instruction must have data');
    });

    it('should throw for non-Uint8Array data', () => {
      const instruction = { programId, accounts: [], data: [1, 2, 3] } as any;
      expect(() => validateInstruction(instruction)).toThrow(
        'Instruction data must be a Uint8Array',
      );
    });
  });

  describe('deduplicateAccounts', () => {
    it('should deduplicate accounts with combined flags', () => {
      const message = createTransactionMessage('legacy');
      const instruction1: Instruction = {
        programId,
        accounts: [
          { pubkey: account1, isSigner: true, isWritable: false },
          { pubkey: account2, isSigner: false, isWritable: true },
        ],
        data: new Uint8Array(),
      };
      const instruction2: Instruction = {
        programId: address('11111111111111111111111111111118'),
        accounts: [
          { pubkey: account1, isSigner: false, isWritable: true }, // account1 becomes writable
          { pubkey: account2, isSigner: true, isWritable: false }, // account2 becomes signer
        ],
        data: new Uint8Array(),
      };

      const updated = appendTransactionMessageInstructions([instruction1, instruction2], message);
      const accounts = deduplicateAccounts(updated);

      // Check combined flags
      expect(accounts.get(account1)).toEqual({ isSigner: true, isWritable: true });
      expect(accounts.get(account2)).toEqual({ isSigner: true, isWritable: true });
      expect(accounts.get(programId)).toEqual({ isSigner: false, isWritable: false });
    });

    it('should include fee payer as writable signer', () => {
      const feePayer = address('11111111111111111111111111111119');
      const message = setTransactionMessageFeePayer(feePayer, createTransactionMessage('legacy'));
      const accounts = deduplicateAccounts(message);

      expect(accounts.get(feePayer)).toEqual({ isSigner: true, isWritable: true });
    });
  });

  describe('getOrderedAccounts', () => {
    it('should order accounts correctly', () => {
      const feePayer = address('So11111111111111111111111111111111111111112');
      const writableSigner = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      const readonlySigner = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
      const writableNonSigner = address('Stake11111111111111111111111111111111111111');
      const readonlyNonSigner = address('Vote111111111111111111111111111111111111111');

      const message = setTransactionMessageFeePayer(feePayer, createTransactionMessage('legacy'));
      const instruction: Instruction = {
        programId: readonlyNonSigner,
        accounts: [
          { pubkey: writableSigner, isSigner: true, isWritable: true },
          { pubkey: readonlySigner, isSigner: true, isWritable: false },
          { pubkey: writableNonSigner, isSigner: false, isWritable: true },
        ],
        data: new Uint8Array(),
      };

      const updated = appendTransactionMessageInstruction(instruction, message);
      const ordered = getOrderedAccounts(updated);

      expect(ordered).toHaveLength(5);
      expect(ordered[0]).toEqual({ address: feePayer, isSigner: true, isWritable: true });
      expect(ordered[1]).toEqual({ address: writableSigner, isSigner: true, isWritable: true });
      expect(ordered[2]).toEqual({ address: readonlySigner, isSigner: true, isWritable: false });
      expect(ordered[3]).toEqual({
        address: writableNonSigner,
        isSigner: false,
        isWritable: true,
      });
      expect(ordered[4]).toEqual({
        address: readonlyNonSigner,
        isSigner: false,
        isWritable: false,
      });
    });
  });

  describe('createInstructionData', () => {
    it('should create data with discriminator only', () => {
      const discriminator = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const data = createInstructionData(discriminator);

      expect(data).toHaveLength(8);
      expect(data).toEqual(discriminator);
    });

    it('should combine discriminator and args', () => {
      const discriminator = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const args = new Uint8Array([9, 10, 11, 12]);
      const data = createInstructionData(discriminator, args);

      expect(data).toHaveLength(12);
      expect(data.slice(0, 8)).toEqual(discriminator);
      expect(data.slice(8)).toEqual(args);
    });
  });

  describe('createInstruction', () => {
    it('should create a valid instruction', () => {
      const accounts: AccountMeta[] = [
        { pubkey: account1, isSigner: true, isWritable: true },
        { pubkey: account2, isSigner: false, isWritable: false },
      ];
      const data = new Uint8Array([1, 2, 3]);
      const instruction = createInstruction(programId, accounts, data);

      expect(instruction.programId).toBe(programId);
      expect(instruction.accounts).toEqual(accounts);
      expect(instruction.data).toEqual(data);
      expect(Object.isFrozen(instruction)).toBe(true);
    });

    it('should validate the created instruction', () => {
      const accounts = [{ pubkey: account1 }] as any;
      expect(() => createInstruction(programId, accounts)).toThrow(
        'Account at index 0 must have isSigner as a boolean',
      );
    });

    it('should use default empty data if not provided', () => {
      const accounts: AccountMeta[] = [{ pubkey: account1, isSigner: true, isWritable: true }];
      const instruction = createInstruction(programId, accounts);

      expect(instruction.data).toEqual(new Uint8Array(0));
      expect(instruction.data).toHaveLength(0);
    });
  });
});
