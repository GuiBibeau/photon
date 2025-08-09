/**
 * Instruction management utilities for transaction messages.
 */

import type { Instruction, TransactionMessage } from './types.js';

/**
 * Deep freeze an instruction to ensure immutability.
 */
function freezeInstruction(instruction: Instruction): Instruction {
  return Object.freeze({
    ...instruction,
    accounts: Object.freeze([...instruction.accounts]),
    data: new Uint8Array(instruction.data), // Create a new copy
  });
}

/**
 * Append an instruction to the end of the transaction message.
 *
 * @param instruction - The instruction to append
 * @param message - The transaction message to update
 * @returns A new frozen transaction message with the instruction appended
 */
export function appendTransactionMessageInstruction<T extends TransactionMessage>(
  instruction: Instruction,
  message: T,
): T {
  const frozenInstruction = freezeInstruction(instruction);
  const newInstructions = Object.freeze([...message.instructions, frozenInstruction]);

  return Object.freeze({
    ...message,
    instructions: newInstructions,
  }) as T;
}

/**
 * Prepend an instruction to the beginning of the transaction message.
 *
 * @param instruction - The instruction to prepend
 * @param message - The transaction message to update
 * @returns A new frozen transaction message with the instruction prepended
 */
export function prependTransactionMessageInstruction<T extends TransactionMessage>(
  instruction: Instruction,
  message: T,
): T {
  const frozenInstruction = freezeInstruction(instruction);
  const newInstructions = Object.freeze([frozenInstruction, ...message.instructions]);

  return Object.freeze({
    ...message,
    instructions: newInstructions,
  }) as T;
}

/**
 * Insert an instruction at a specific index in the transaction message.
 *
 * @param instruction - The instruction to insert
 * @param index - The position to insert at (0 = beginning)
 * @param message - The transaction message to update
 * @returns A new frozen transaction message with the instruction inserted
 * @throws If index is out of bounds
 */
export function insertTransactionMessageInstruction<T extends TransactionMessage>(
  instruction: Instruction,
  index: number,
  message: T,
): T {
  if (index < 0 || index > message.instructions.length) {
    throw new Error(
      `Index ${index} is out of bounds. Must be between 0 and ${message.instructions.length}`,
    );
  }

  const frozenInstruction = freezeInstruction(instruction);
  const newInstructions = [
    ...message.instructions.slice(0, index),
    frozenInstruction,
    ...message.instructions.slice(index),
  ];

  return Object.freeze({
    ...message,
    instructions: Object.freeze(newInstructions),
  }) as T;
}

/**
 * Append multiple instructions to the transaction message.
 *
 * @param instructions - The instructions to append
 * @param message - The transaction message to update
 * @returns A new frozen transaction message with all instructions appended
 */
export function appendTransactionMessageInstructions<T extends TransactionMessage>(
  instructions: ReadonlyArray<Instruction>,
  message: T,
): T {
  const frozenInstructions = instructions.map(freezeInstruction);
  const newInstructions = Object.freeze([...message.instructions, ...frozenInstructions]);

  return Object.freeze({
    ...message,
    instructions: newInstructions,
  }) as T;
}

/**
 * Get the estimated size of a transaction message in bytes.
 * This is an approximate calculation for planning purposes.
 *
 * @param message - The transaction message to estimate
 * @returns Estimated size in bytes
 */
export function estimateTransactionMessageSize(message: TransactionMessage): number {
  // Base overhead for transaction structure
  let size = 1 + 32 + 4 + 1 + 1 + 1; // version + blockhash + lastValidBlockHeight + header bytes

  // Count unique accounts
  const uniqueAccounts = new Set<string>();
  if (message.feePayer) {
    uniqueAccounts.add(message.feePayer);
  }

  for (const instruction of message.instructions) {
    uniqueAccounts.add(instruction.programId);
    for (const account of instruction.accounts) {
      uniqueAccounts.add(account.pubkey);
    }
  }

  // Account addresses (32 bytes each)
  size += uniqueAccounts.size * 32;

  // Instructions
  for (const instruction of message.instructions) {
    size += 1; // program ID index
    size += 1; // accounts length
    size += instruction.accounts.length; // account indices
    size += 4; // data length
    size += instruction.data.length; // data
  }

  // Address lookup tables for v0 transactions
  if (message.version === 0 && message.addressLookupTables) {
    size += 1; // lookup tables count
    for (const table of message.addressLookupTables) {
      size += 32; // table address
      size += 1; // writable indexes count
      size += table.writableIndexes.length;
      size += 1; // readonly indexes count
      size += table.readonlyIndexes.length;
    }
  }

  return size;
}
