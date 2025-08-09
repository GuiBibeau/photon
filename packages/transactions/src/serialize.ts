/**
 * Transaction serialization to wire format for both legacy and versioned transactions.
 */

import type { Address } from '@photon/addresses';
import { getAddressBytes } from '@photon/addresses';
import type {
  CompileableTransactionMessage,
  AccountMeta,
  Instruction,
} from '@photon/transaction-messages';

// Local type definition to avoid import issues
type AddressLookupTableLocal = {
  address: Address;
  writableIndexes: ReadonlyArray<number>;
  readonlyIndexes: ReadonlyArray<number>;
};
import { compactU16 } from '@photon/codecs/primitives/compact-u16';
import { encodeBase58, decodeBase58 } from '@photon/codecs/primitives/base58';
import type { Transaction } from './types.js';

/**
 * Compiled account key information
 */
interface CompiledAccountKeys {
  /** All unique account keys in order */
  accountKeys: Address[];
  /** Number of signer accounts */
  numSigners: number;
  /** Number of read-only signer accounts */
  numReadonlySigners: number;
  /** Number of read-only non-signer accounts */
  numReadonlyNonSigners: number;
}

/**
 * Compiled instruction with account indices
 */
interface CompiledInstruction {
  /** Program ID index in account keys array */
  programIdIndex: number;
  /** Account indices for instruction accounts */
  accountIndices: number[];
  /** Instruction data */
  data: Uint8Array;
}

/**
 * Compiles account keys from a transaction message
 */
function compileAccountKeys(message: CompileableTransactionMessage): CompiledAccountKeys {
  const accountKeys: Address[] = [];
  const accountMetas = new Map<Address, AccountMeta>();

  // Add fee payer as first account (always signer and writable)
  accountKeys.push(message.feePayer);
  accountMetas.set(message.feePayer, {
    pubkey: message.feePayer,
    isSigner: true,
    isWritable: true,
  });

  // Collect all unique accounts from instructions
  for (const instruction of message.instructions) {
    // Process instruction accounts
    for (const account of instruction.accounts) {
      const existing = accountMetas.get(account.pubkey);
      if (existing) {
        // Merge flags (OR operation)
        accountMetas.set(account.pubkey, {
          pubkey: account.pubkey,
          isSigner: existing.isSigner || account.isSigner,
          isWritable: existing.isWritable || account.isWritable,
        });
      } else {
        accountMetas.set(account.pubkey, account);
        if (account.pubkey !== message.feePayer) {
          accountKeys.push(account.pubkey);
        }
      }
    }

    // Add program ID if not already present
    if (!accountMetas.has(instruction.programId)) {
      accountMetas.set(instruction.programId, {
        pubkey: instruction.programId,
        isSigner: false,
        isWritable: false,
      });
      accountKeys.push(instruction.programId);
    }
  }

  // Sort accounts according to Solana's rules:
  // 1. Fee payer (already first)
  // 2. Other signers (writable, then read-only)
  // 3. Non-signers (writable, then read-only)
  const sortedAccounts = accountKeys.slice(1).sort((a, b) => {
    const aMeta = accountMetas.get(a);
    const bMeta = accountMetas.get(b);
    if (!aMeta || !bMeta) {
      throw new Error('Account metadata not found');
    }

    // Signers before non-signers
    if (aMeta.isSigner !== bMeta.isSigner) {
      return aMeta.isSigner ? -1 : 1;
    }

    // Within same signer group, writable before read-only
    if (aMeta.isWritable !== bMeta.isWritable) {
      return aMeta.isWritable ? -1 : 1;
    }

    // Finally, sort by address for deterministic ordering
    return a.localeCompare(b);
  });

  // Rebuild final account keys array
  const finalAccountKeys = [message.feePayer, ...sortedAccounts];

  // Count different account types
  let numSigners = 0;
  let numReadonlySigners = 0;
  let numReadonlyNonSigners = 0;

  for (const key of finalAccountKeys) {
    const meta = accountMetas.get(key);
    if (!meta) {
      throw new Error(`Account metadata not found for ${key}`);
    }
    if (meta.isSigner) {
      numSigners++;
      if (!meta.isWritable) {
        numReadonlySigners++;
      }
    } else if (!meta.isWritable) {
      numReadonlyNonSigners++;
    }
  }

  return {
    accountKeys: finalAccountKeys,
    numSigners,
    numReadonlySigners,
    numReadonlyNonSigners,
  };
}

/**
 * Compiles instructions with account indices
 */
function compileInstructions(
  instructions: readonly Instruction[],
  accountKeys: Address[],
): CompiledInstruction[] {
  const accountKeyMap = new Map(accountKeys.map((key, index) => [key, index]));

  return instructions.map((instruction) => {
    const programIdIndex = accountKeyMap.get(instruction.programId);
    if (programIdIndex === undefined) {
      throw new Error(`Program ID ${instruction.programId} not found in account keys`);
    }

    const accountIndices = instruction.accounts.map((account) => {
      const index = accountKeyMap.get(account.pubkey);
      if (index === undefined) {
        throw new Error(`Account ${account.pubkey} not found in account keys`);
      }
      return index;
    });

    return {
      programIdIndex,
      accountIndices,
      data: instruction.data,
    };
  });
}

/**
 * Serializes a legacy transaction message
 */
function serializeLegacyMessage(message: CompileableTransactionMessage): Uint8Array {
  const { accountKeys, numSigners, numReadonlySigners, numReadonlyNonSigners } =
    compileAccountKeys(message);
  const compiledInstructions = compileInstructions(message.instructions, accountKeys);

  // Calculate message size
  let messageSize = 0;
  messageSize += 1 + 1 + 1 + 1; // Header (4 bytes)
  messageSize += compactU16.size(accountKeys.length);
  messageSize += accountKeys.length * 32; // Each pubkey is 32 bytes
  messageSize += 32; // Blockhash
  messageSize += compactU16.size(compiledInstructions.length);

  for (const instruction of compiledInstructions) {
    messageSize += 1; // Program ID index
    messageSize += compactU16.size(instruction.accountIndices.length);
    messageSize += instruction.accountIndices.length;
    messageSize += compactU16.size(instruction.data.length);
    messageSize += instruction.data.length;
  }

  // Allocate buffer and create writer
  const buffer = new Uint8Array(messageSize);
  let offset = 0;

  // Write header
  buffer[offset++] = numSigners;
  buffer[offset++] = numReadonlySigners;
  buffer[offset++] = numSigners - numReadonlySigners; // numWritableSigners
  buffer[offset++] = numReadonlyNonSigners;

  // Write account keys
  const accountKeysLengthBytes = compactU16.encode(accountKeys.length);
  buffer.set(accountKeysLengthBytes, offset);
  offset += accountKeysLengthBytes.length;

  for (const accountKey of accountKeys) {
    const keyBytes = getAddressBytes(accountKey);
    buffer.set(keyBytes, offset);
    offset += 32;
  }

  // Write blockhash
  const blockhashBytes = decodeBase58(message.blockhash);
  buffer.set(blockhashBytes, offset);
  offset += 32;

  // Write instructions
  const instructionsLengthBytes = compactU16.encode(compiledInstructions.length);
  buffer.set(instructionsLengthBytes, offset);
  offset += instructionsLengthBytes.length;

  for (const instruction of compiledInstructions) {
    // Program ID index
    buffer[offset++] = instruction.programIdIndex;

    // Account indices
    const accountIndicesLengthBytes = compactU16.encode(instruction.accountIndices.length);
    buffer.set(accountIndicesLengthBytes, offset);
    offset += accountIndicesLengthBytes.length;

    for (const accountIndex of instruction.accountIndices) {
      buffer[offset++] = accountIndex;
    }

    // Instruction data
    const dataLengthBytes = compactU16.encode(instruction.data.length);
    buffer.set(dataLengthBytes, offset);
    offset += dataLengthBytes.length;

    buffer.set(instruction.data, offset);
    offset += instruction.data.length;
  }

  return buffer;
}

/**
 * Serializes a versioned (v0) transaction message
 */
function serializeVersionedMessage(message: CompileableTransactionMessage): Uint8Array {
  const { accountKeys, numSigners, numReadonlySigners, numReadonlyNonSigners } =
    compileAccountKeys(message);
  const compiledInstructions = compileInstructions(message.instructions, accountKeys);

  // Calculate message size
  let messageSize = 0;
  messageSize += 1; // Version prefix (0x80 for v0)
  messageSize += 1 + 1 + 1 + 1; // Header (4 bytes)
  messageSize += compactU16.size(accountKeys.length);
  messageSize += accountKeys.length * 32; // Each pubkey is 32 bytes
  messageSize += 32; // Blockhash
  messageSize += compactU16.size(compiledInstructions.length);

  for (const instruction of compiledInstructions) {
    messageSize += 1; // Program ID index
    messageSize += compactU16.size(instruction.accountIndices.length);
    messageSize += instruction.accountIndices.length;
    messageSize += compactU16.size(instruction.data.length);
    messageSize += instruction.data.length;
  }

  // Address lookup tables
  const lookupTables = (message.addressLookupTables || []) as AddressLookupTableLocal[];
  messageSize += compactU16.size(lookupTables.length);
  for (const table of lookupTables) {
    messageSize += 32; // Table address
    messageSize += compactU16.size(table.writableIndexes.length);
    messageSize += table.writableIndexes.length;
    messageSize += compactU16.size(table.readonlyIndexes.length);
    messageSize += table.readonlyIndexes.length;
  }

  // Allocate buffer and create writer
  const buffer = new Uint8Array(messageSize);
  let offset = 0;

  // Write version prefix (0x80 | version)
  buffer[offset++] = 0x80 | 0; // Version 0

  // Write header
  buffer[offset++] = numSigners;
  buffer[offset++] = numReadonlySigners;
  buffer[offset++] = numSigners - numReadonlySigners; // numWritableSigners
  buffer[offset++] = numReadonlyNonSigners;

  // Write account keys
  const accountKeysLengthBytes = compactU16.encode(accountKeys.length);
  buffer.set(accountKeysLengthBytes, offset);
  offset += accountKeysLengthBytes.length;

  for (const accountKey of accountKeys) {
    const keyBytes = getAddressBytes(accountKey);
    buffer.set(keyBytes, offset);
    offset += 32;
  }

  // Write blockhash
  const blockhashBytes = decodeBase58(message.blockhash);
  buffer.set(blockhashBytes, offset);
  offset += 32;

  // Write instructions
  const instructionsLengthBytes = compactU16.encode(compiledInstructions.length);
  buffer.set(instructionsLengthBytes, offset);
  offset += instructionsLengthBytes.length;

  for (const instruction of compiledInstructions) {
    // Program ID index
    buffer[offset++] = instruction.programIdIndex;

    // Account indices
    const accountIndicesLengthBytes = compactU16.encode(instruction.accountIndices.length);
    buffer.set(accountIndicesLengthBytes, offset);
    offset += accountIndicesLengthBytes.length;

    for (const accountIndex of instruction.accountIndices) {
      buffer[offset++] = accountIndex;
    }

    // Instruction data
    const dataLengthBytes = compactU16.encode(instruction.data.length);
    buffer.set(dataLengthBytes, offset);
    offset += dataLengthBytes.length;

    buffer.set(instruction.data, offset);
    offset += instruction.data.length;
  }

  // Write address lookup tables
  const lookupTablesLengthBytes = compactU16.encode(lookupTables.length);
  buffer.set(lookupTablesLengthBytes, offset);
  offset += lookupTablesLengthBytes.length;

  for (const table of lookupTables) {
    // Table address
    const tableAddressBytes = getAddressBytes(table.address);
    buffer.set(tableAddressBytes, offset);
    offset += 32;

    // Writable indexes
    const writableIndexesLengthBytes = compactU16.encode(table.writableIndexes.length);
    buffer.set(writableIndexesLengthBytes, offset);
    offset += writableIndexesLengthBytes.length;

    for (const index of table.writableIndexes) {
      buffer[offset++] = index;
    }

    // Readonly indexes
    const readonlyIndexesLengthBytes = compactU16.encode(table.readonlyIndexes.length);
    buffer.set(readonlyIndexesLengthBytes, offset);
    offset += readonlyIndexesLengthBytes.length;

    for (const index of table.readonlyIndexes) {
      buffer[offset++] = index;
    }
  }

  return buffer;
}

/**
 * Serializes a transaction message to wire format
 */
export function serializeMessage(message: CompileableTransactionMessage): Uint8Array {
  if (message.version === 'legacy') {
    return serializeLegacyMessage(message);
  } else if (message.version === 0) {
    return serializeVersionedMessage(message);
  } else {
    throw new Error(`Unsupported transaction version: ${message.version}`);
  }
}

/**
 * Serializes a complete transaction with signatures
 */
export function serializeTransaction(transaction: Transaction): Uint8Array {
  const messageBytes = serializeMessage(transaction.message);
  const { accountKeys, numSigners } = compileAccountKeys(transaction.message);

  // Calculate total size
  const signatureSize = 64;
  const signaturesSize = compactU16.size(numSigners) + numSigners * signatureSize;
  const totalSize = signaturesSize + messageBytes.length;

  // Allocate buffer
  const buffer = new Uint8Array(totalSize);
  let offset = 0;

  // Write signature count
  const signatureCountBytes = compactU16.encode(numSigners);
  buffer.set(signatureCountBytes, offset);
  offset += signatureCountBytes.length;

  // Write signatures in order of account keys
  for (let i = 0; i < numSigners; i++) {
    const accountKey = accountKeys[i];
    if (!accountKey) {
      throw new Error(`Account key not found at index ${i}`);
    }
    const signature = transaction.signatures.get(accountKey) ?? null;

    if (signature) {
      // Signature is already a Uint8Array with branded type
      buffer.set(signature, offset);
    } else {
      // Fill with zeros for missing signatures
      buffer.fill(0, offset, offset + signatureSize);
    }
    offset += signatureSize;
  }

  // Write message
  buffer.set(messageBytes, offset);

  return buffer;
}

/**
 * Estimates the size of a serialized transaction
 */
export function estimateTransactionSize(message: CompileableTransactionMessage): number {
  const { numSigners } = compileAccountKeys(message);
  const messageBytes = serializeMessage(message);

  // Signatures section size
  const signatureSize = 64;
  const signaturesSize = compactU16.size(numSigners) + numSigners * signatureSize;

  return signaturesSize + messageBytes.length;
}

/**
 * Maximum transaction size in bytes
 */
export const MAX_TRANSACTION_SIZE = 1232;

/**
 * Checks if a transaction would exceed the maximum size
 */
export function isTransactionSizeValid(message: CompileableTransactionMessage): boolean {
  return estimateTransactionSize(message) <= MAX_TRANSACTION_SIZE;
}

/**
 * Encodes a transaction to base64 for RPC submission
 */
export function encodeTransactionBase64(transaction: Transaction): string {
  const bytes = serializeTransaction(transaction);
  // Convert to base64 using browser-compatible method
  if (typeof btoa !== 'undefined') {
    // Browser environment
    return btoa(String.fromCharCode(...bytes));
  } else if (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as Record<string, unknown>).Buffer !== 'undefined'
  ) {
    // Node.js environment
    const BufferClass = (globalThis as Record<string, unknown>).Buffer as {
      from(data: Uint8Array): { toString(encoding: string): string };
    };
    return BufferClass.from(bytes).toString('base64');
  } else {
    // Fallback: manual base64 encoding
    const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;

    while (i < bytes.length) {
      const a = bytes[i++] ?? 0;
      const b = i < bytes.length ? (bytes[i++] ?? 0) : 0;
      const c = i < bytes.length ? (bytes[i++] ?? 0) : 0;

      const bitmap = (a << 16) | (b << 8) | c;

      result += base64chars.charAt((bitmap >> 18) & 63);
      result += base64chars.charAt((bitmap >> 12) & 63);
      result += i - 2 < bytes.length ? base64chars.charAt((bitmap >> 6) & 63) : '=';
      result += i - 1 < bytes.length ? base64chars.charAt(bitmap & 63) : '=';
    }

    return result;
  }
}

/**
 * Encodes a transaction to base58
 */
export function encodeTransactionBase58(transaction: Transaction): string {
  const bytes = serializeTransaction(transaction);
  return encodeBase58(bytes);
}
