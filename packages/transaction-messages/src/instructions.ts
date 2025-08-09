/**
 * Instruction management utilities for transaction messages.
 */

import type { Address } from '@photon/addresses';
import type { AccountMeta, Instruction, TransactionMessage } from './types.js';

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

/**
 * Validate an instruction for correctness.
 *
 * @param instruction - The instruction to validate
 * @throws If the instruction is invalid
 */
export function validateInstruction(instruction: Instruction): void {
  if (!instruction.programId) {
    throw new Error('Instruction must have a program ID');
  }

  if (!instruction.accounts) {
    throw new Error('Instruction must have an accounts array');
  }

  if (!Array.isArray(instruction.accounts)) {
    throw new Error('Instruction accounts must be an array');
  }

  for (let i = 0; i < instruction.accounts.length; i++) {
    const account = instruction.accounts[i];
    if (!account.pubkey) {
      throw new Error(`Account at index ${i} must have a pubkey`);
    }
    if (typeof account.isSigner !== 'boolean') {
      throw new Error(`Account at index ${i} must have isSigner as a boolean`);
    }
    if (typeof account.isWritable !== 'boolean') {
      throw new Error(`Account at index ${i} must have isWritable as a boolean`);
    }
  }

  if (!instruction.data) {
    throw new Error('Instruction must have data');
  }

  if (!(instruction.data instanceof Uint8Array)) {
    throw new Error('Instruction data must be a Uint8Array');
  }
}

/**
 * Deduplicate accounts across all instructions in a transaction message.
 * Returns a map of unique accounts with their combined access flags.
 *
 * @param message - The transaction message to analyze
 * @returns Map of addresses to their combined account metadata
 */
export function deduplicateAccounts(
  message: TransactionMessage,
): Map<Address, { isSigner: boolean; isWritable: boolean }> {
  const accountMap = new Map<Address, { isSigner: boolean; isWritable: boolean }>();

  // Add fee payer if present (always writable and signer)
  if (message.feePayer) {
    accountMap.set(message.feePayer, { isSigner: true, isWritable: true });
  }

  // Process all instructions
  for (const instruction of message.instructions) {
    // Add program ID (readonly, non-signer by default)
    if (!accountMap.has(instruction.programId)) {
      accountMap.set(instruction.programId, { isSigner: false, isWritable: false });
    }

    // Process instruction accounts
    for (const account of instruction.accounts) {
      const existing = accountMap.get(account.pubkey);
      if (existing) {
        // Combine flags: if any usage requires signer/writable, the account is signer/writable
        existing.isSigner = existing.isSigner || account.isSigner;
        existing.isWritable = existing.isWritable || account.isWritable;
      } else {
        accountMap.set(account.pubkey, {
          isSigner: account.isSigner,
          isWritable: account.isWritable,
        });
      }
    }
  }

  return accountMap;
}

/**
 * Get all unique accounts from a transaction message in proper order.
 * Order: fee payer, writable signers, readonly signers, writable non-signers, readonly non-signers
 *
 * @param message - The transaction message to analyze
 * @returns Ordered array of unique accounts with their metadata
 */
export function getOrderedAccounts(
  message: TransactionMessage,
): Array<{ address: Address; isSigner: boolean; isWritable: boolean }> {
  const accounts = deduplicateAccounts(message);
  const result: Array<{ address: Address; isSigner: boolean; isWritable: boolean }> = [];

  // Remove fee payer from the map to handle it separately
  const feePayer = message.feePayer;
  if (feePayer) {
    accounts.delete(feePayer);
    result.push({ address: feePayer, isSigner: true, isWritable: true });
  }

  // Categorize remaining accounts
  const writableSigners: Address[] = [];
  const readonlySigners: Address[] = [];
  const writableNonSigners: Address[] = [];
  const readonlyNonSigners: Address[] = [];

  for (const [address, meta] of accounts) {
    if (meta.isSigner && meta.isWritable) {
      writableSigners.push(address);
    } else if (meta.isSigner && !meta.isWritable) {
      readonlySigners.push(address);
    } else if (!meta.isSigner && meta.isWritable) {
      writableNonSigners.push(address);
    } else {
      readonlyNonSigners.push(address);
    }
  }

  // Add accounts in proper order
  for (const address of writableSigners) {
    result.push({ address, isSigner: true, isWritable: true });
  }
  for (const address of readonlySigners) {
    result.push({ address, isSigner: true, isWritable: false });
  }
  for (const address of writableNonSigners) {
    result.push({ address, isSigner: false, isWritable: true });
  }
  for (const address of readonlyNonSigners) {
    result.push({ address, isSigner: false, isWritable: false });
  }

  return result;
}

/**
 * Create instruction data from a discriminator and encoded arguments.
 * This is a common pattern for Solana programs.
 *
 * @param discriminator - The instruction discriminator (usually 8 bytes)
 * @param args - Optional encoded arguments
 * @returns Combined instruction data
 */
export function createInstructionData(discriminator: Uint8Array, args?: Uint8Array): Uint8Array {
  if (!args || args.length === 0) {
    return new Uint8Array(discriminator);
  }

  const data = new Uint8Array(discriminator.length + args.length);
  data.set(discriminator);
  data.set(args, discriminator.length);
  return data;
}

/**
 * Create an instruction with validated inputs.
 *
 * @param programId - The program to invoke
 * @param accounts - The accounts to pass to the program
 * @param data - The instruction data
 * @returns A validated instruction
 */
export function createInstruction(
  programId: Address,
  accounts: ReadonlyArray<AccountMeta>,
  data: Uint8Array = new Uint8Array(0),
): Instruction {
  const instruction: Instruction = {
    programId,
    accounts: Object.freeze([...accounts]),
    data: new Uint8Array(data),
  };

  validateInstruction(instruction);
  return Object.freeze(instruction);
}
