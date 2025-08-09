import { describe, it, expect } from 'vitest';
import { address } from '@photon/addresses';
import {
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructions,
  prependTransactionMessageInstruction,
  estimateTransactionMessageSize,
  blockhash,
  isCompileable,
  type Instruction,
  type CompileableTransactionMessage,
} from '../src/index';

describe('Transaction Message Builder Integration', () => {
  const feePayer = address('11111111111111111111111111111112');
  const systemProgram = address('11111111111111111111111111111113');
  const tokenProgram = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  const recipient = address('11111111111111111111111111111114');

  const createTransferInstruction = (amount: number): Instruction => ({
    programId: systemProgram,
    accounts: [
      { pubkey: feePayer, isSigner: true, isWritable: true },
      { pubkey: recipient, isSigner: false, isWritable: true },
    ],
    data: new Uint8Array([
      2,
      0,
      0,
      0,
      ...new Uint8Array(new BigUint64Array([BigInt(amount)]).buffer),
    ]),
  });

  describe('Complete transaction building flow', () => {
    it('should build a legacy transaction message step by step', () => {
      // Step 1: Create empty message
      const message = createTransactionMessage('legacy');
      expect(message.version).toBe('legacy');
      expect(isCompileable(message)).toBe(false);

      // Step 2: Set fee payer
      const messageWithFeePayer = setTransactionMessageFeePayer(feePayer, message);
      expect(messageWithFeePayer.feePayer).toBe(feePayer);
      expect(isCompileable(messageWithFeePayer)).toBe(false);

      // Step 3: Set lifetime
      const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('RecentBlockhash1234567890abcdefghijklmnopqrs'),
          lastValidBlockHeight: 150000000n,
        },
        messageWithFeePayer,
      );
      expect(messageWithLifetime.blockhash).toBe('RecentBlockhash1234567890abcdefghijklmnopqrs');
      expect(isCompileable(messageWithLifetime)).toBe(true);

      // Step 4: Add instructions
      const transferInstruction = createTransferInstruction(1000000);
      const completeMessage = appendTransactionMessageInstruction(
        transferInstruction,
        messageWithLifetime,
      );

      // Verify final message
      expect(completeMessage.version).toBe('legacy');
      expect(completeMessage.feePayer).toBe(feePayer);
      expect(completeMessage.blockhash).toBe('RecentBlockhash1234567890abcdefghijklmnopqrs');
      expect(completeMessage.lastValidBlockHeight).toBe(150000000n);
      expect(completeMessage.instructions).toHaveLength(1);
      expect(completeMessage.instructions[0].programId).toBe(systemProgram);

      // Type should be CompileableTransactionMessage
      const _compileable: CompileableTransactionMessage = completeMessage;
      expect(isCompileable(completeMessage)).toBe(true);
    });

    it('should build a version 0 transaction with multiple instructions', () => {
      // Build complete message in chain
      const message = createTransactionMessage(0);

      const completeMessage = appendTransactionMessageInstructions(
        [createTransferInstruction(1000000), createTransferInstruction(2000000)],
        setTransactionMessageLifetimeUsingBlockhash(
          {
            blockhash: blockhash('VersionZeroBlockhash1234567890abcdefghijklm'),
            lastValidBlockHeight: 200000000n,
          },
          setTransactionMessageFeePayer(feePayer, message),
        ),
      );

      expect(completeMessage.version).toBe(0);
      expect(completeMessage.instructions).toHaveLength(2);
      expect(isCompileable(completeMessage)).toBe(true);
    });

    it('should support instruction ordering operations', () => {
      const message = createTransactionMessage('legacy');
      const messageWithPrerequisites = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('OrderingTestBlockhash123456789012345678901'),
          lastValidBlockHeight: 100000n,
        },
        setTransactionMessageFeePayer(feePayer, message),
      );

      // Create different types of instructions
      const setupInstruction: Instruction = {
        programId: systemProgram,
        accounts: [],
        data: new Uint8Array([0]), // Setup
      };

      const mainInstruction: Instruction = {
        programId: tokenProgram,
        accounts: [{ pubkey: recipient, isSigner: false, isWritable: true }],
        data: new Uint8Array([1]), // Main operation
      };

      const cleanupInstruction: Instruction = {
        programId: systemProgram,
        accounts: [],
        data: new Uint8Array([2]), // Cleanup
      };

      // Build message with specific instruction order
      let finalMessage = messageWithPrerequisites;

      // Add main instruction first
      finalMessage = appendTransactionMessageInstruction(mainInstruction, finalMessage);

      // Prepend setup instruction (should go before main)
      finalMessage = prependTransactionMessageInstruction(setupInstruction, finalMessage);

      // Append cleanup instruction (should go after main)
      finalMessage = appendTransactionMessageInstruction(cleanupInstruction, finalMessage);

      // Verify order
      expect(finalMessage.instructions).toHaveLength(3);
      expect(finalMessage.instructions[0].data[0]).toBe(0); // Setup
      expect(finalMessage.instructions[1].data[0]).toBe(1); // Main
      expect(finalMessage.instructions[2].data[0]).toBe(2); // Cleanup
    });
  });

  describe('Size estimation', () => {
    it('should estimate transaction size for planning', () => {
      const message = createTransactionMessage('legacy');
      const completeMessage = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('SizeTestBlockhash12345678901234567890123456'),
          lastValidBlockHeight: 100000n,
        },
        setTransactionMessageFeePayer(feePayer, message),
      );

      // Empty transaction
      const emptySize = estimateTransactionMessageSize(completeMessage);
      expect(emptySize).toBeGreaterThan(0);

      // Add one instruction
      const withOneInstruction = appendTransactionMessageInstruction(
        createTransferInstruction(1000000),
        completeMessage,
      );
      const oneInstructionSize = estimateTransactionMessageSize(withOneInstruction);
      expect(oneInstructionSize).toBeGreaterThan(emptySize);

      // Add multiple instructions
      const withManyInstructions = appendTransactionMessageInstructions(
        Array(10)
          .fill(null)
          .map((_, i) => createTransferInstruction(i * 1000)),
        completeMessage,
      );
      const manyInstructionsSize = estimateTransactionMessageSize(withManyInstructions);
      expect(manyInstructionsSize).toBeGreaterThan(oneInstructionSize);

      // Should be under transaction size limit (1232 bytes)
      expect(manyInstructionsSize).toBeLessThan(1232);
    });

    it('should account for v0 transaction features', () => {
      const message = createTransactionMessage(0);
      const baseMessage = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('V0SizeTestBlockhash1234567890123456789012345'),
          lastValidBlockHeight: 100000n,
        },
        setTransactionMessageFeePayer(feePayer, message),
      );

      const withoutLookupTables = estimateTransactionMessageSize(baseMessage);

      // Add lookup tables
      const withLookupTables = {
        ...baseMessage,
        addressLookupTables: [
          {
            address: address('11111111111111111111111111111118'),
            writableIndexes: [0, 1, 2, 3, 4],
            readonlyIndexes: [5, 6, 7, 8, 9, 10],
          },
        ],
      };

      const withLookupTablesSize = estimateTransactionMessageSize(withLookupTables);
      expect(withLookupTablesSize).toBeGreaterThan(withoutLookupTables);
    });
  });

  describe('Immutability guarantees', () => {
    it('should maintain immutability throughout the building process', () => {
      const message1 = createTransactionMessage('legacy');
      const message2 = setTransactionMessageFeePayer(feePayer, message1);
      const message3 = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('ImmutableBlockhash123456789012345678901234'),
          lastValidBlockHeight: 100000n,
        },
        message2,
      );
      const message4 = appendTransactionMessageInstruction(
        createTransferInstruction(1000000),
        message3,
      );

      // Each step should create a new object
      expect(message1).not.toBe(message2);
      expect(message2).not.toBe(message3);
      expect(message3).not.toBe(message4);

      // Original messages should be unchanged
      expect(message1.feePayer).toBeUndefined();
      expect(message2.blockhash).toBeUndefined();
      expect(message3.instructions).toHaveLength(0);

      // All should be frozen
      expect(Object.isFrozen(message1)).toBe(true);
      expect(Object.isFrozen(message2)).toBe(true);
      expect(Object.isFrozen(message3)).toBe(true);
      expect(Object.isFrozen(message4)).toBe(true);
    });

    it('should not share instruction references between messages', () => {
      const instruction = createTransferInstruction(1000000);
      const message = createTransactionMessage('legacy');
      const messageWithPrerequisites = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('NoShareBlockhash1234567890123456789012345678'),
          lastValidBlockHeight: 100000n,
        },
        setTransactionMessageFeePayer(feePayer, message),
      );

      const message1 = appendTransactionMessageInstruction(instruction, messageWithPrerequisites);
      const message2 = appendTransactionMessageInstruction(instruction, messageWithPrerequisites);

      // Both messages should have the instruction
      expect(message1.instructions).toHaveLength(1);
      expect(message2.instructions).toHaveLength(1);

      // But they should not share the same array reference
      expect(message1.instructions).not.toBe(message2.instructions);
      expect(message1.instructions[0]).not.toBe(message2.instructions[0]);
    });
  });

  describe('Type safety', () => {
    it('should enforce fee payer requirement at type level', () => {
      const message = createTransactionMessage('legacy');

      // This test verifies that TypeScript would prevent calling setTransactionMessageLifetimeUsingBlockhash
      // without a fee payer. At runtime, if TypeScript checks are bypassed, the function would still work
      // but return an object without proper type guarantees.

      // @ts-expect-error - Testing that lifetime requires fee payer at type level
      const invalidMessage = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('TestBlockhash'),
          lastValidBlockHeight: 100000n,
        },
        message as any, // Bypassing TypeScript to test runtime behavior
      );

      // The function works at runtime but the type system prevents this in normal usage
      expect(invalidMessage.blockhash).toBe('TestBlockhash');
      expect(invalidMessage.lastValidBlockHeight).toBe(100000n);
      expect(invalidMessage.feePayer).toBeUndefined(); // No fee payer set

      // This demonstrates why the type system is important - it prevents invalid states
      expect(isCompileable(invalidMessage as any)).toBe(false);
    });
  });
});
