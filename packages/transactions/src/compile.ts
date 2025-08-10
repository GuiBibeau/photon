import type { Address } from '@photon/addresses';
import type { CompileableTransactionMessage, AccountMeta } from '@photon/transaction-messages';
import { serializeMessage } from './serialize.js';

/**
 * Compiled transaction ready for signing
 */
export interface CompiledTransaction {
  /**
   * The serialized message bytes to be signed
   */
  readonly messageBytes: Uint8Array;

  /**
   * Ordered list of public keys that need to sign
   */
  readonly signerPubkeys: ReadonlyArray<Address>;

  /**
   * The original transaction message
   */
  readonly message: CompileableTransactionMessage;
}

/**
 * Compiles a transaction message into bytes for signing
 * This is a simplified version - full implementation would handle
 * versioned transactions, address lookup tables, etc.
 */
export function compileTransaction(message: CompileableTransactionMessage): CompiledTransaction {
  // Extract all unique accounts from instructions
  const accountKeys = new Map<Address, AccountMeta>();

  // Add fee payer as first account (always signer and writable)
  accountKeys.set(message.feePayer, {
    pubkey: message.feePayer,
    isSigner: true,
    isWritable: true,
  });

  // Collect accounts from all instructions
  for (const instruction of message.instructions) {
    // Add program ID (not signer, not writable by default)
    if (!accountKeys.has(instruction.programId)) {
      accountKeys.set(instruction.programId, {
        pubkey: instruction.programId,
        isSigner: false,
        isWritable: false,
      });
    }

    // Add instruction accounts
    for (const account of instruction.accounts) {
      const existing = accountKeys.get(account.pubkey);
      if (existing) {
        // Merge flags (OR operation - if any requires signing/writing, include it)
        accountKeys.set(account.pubkey, {
          pubkey: account.pubkey,
          isSigner: existing.isSigner || account.isSigner,
          isWritable: existing.isWritable || account.isWritable,
        });
      } else {
        accountKeys.set(account.pubkey, account);
      }
    }
  }

  // Sort accounts: signers first, then writable, then read-only
  const sortedAccounts = Array.from(accountKeys.values()).sort((a, b) => {
    if (a.isSigner !== b.isSigner) {
      return a.isSigner ? -1 : 1;
    }
    if (a.isWritable !== b.isWritable) {
      return a.isWritable ? -1 : 1;
    }
    return 0;
  });

  // Extract signer pubkeys
  const signerPubkeys = sortedAccounts
    .filter((account) => account.isSigner)
    .map((account) => account.pubkey);

  // For now, create a simple message representation
  // In a real implementation, this would serialize according to the Solana wire format
  const messageBytes = createMessageBytes(message, sortedAccounts);

  return {
    messageBytes,
    signerPubkeys,
    message,
  };
}

/**
 * Creates the message bytes for signing
 * This is a simplified placeholder - real implementation would follow
 * Solana's exact wire format
 */
function createMessageBytes(
  message: CompileableTransactionMessage,
  _accounts: AccountMeta[], // unused but kept for compatibility
): Uint8Array {
  // Use the actual Solana message serialization
  return serializeMessage(message);
}
