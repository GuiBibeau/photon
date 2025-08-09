import type { Address } from '@photon/addresses';
import type { Signature } from '@photon/crypto';
import type { Signer } from '@photon/signers';
import type { CompileableTransactionMessage } from '@photon/transaction-messages';
import { hasFeePayer, hasLifetime, isCompileable } from '@photon/transaction-messages';
import type { Transaction, SignTransactionOptions, PartialSignResult } from './types.js';
import { compileTransaction } from './compile.js';

/**
 * Signs a transaction message with the provided signers
 *
 * @param signers - Array of signers to sign the transaction
 * @param message - The transaction message to sign
 * @param options - Optional signing configuration
 * @returns A promise that resolves to the signed transaction
 * @throws Error if prerequisites are not met or signing fails
 */
export async function signTransaction(
  signers: ReadonlyArray<Signer>,
  message: CompileableTransactionMessage,
  options: SignTransactionOptions = {},
): Promise<Transaction> {
  // Validate prerequisites
  validatePrerequisites(message, signers);

  // Compile the transaction to get message bytes and signer list
  const compiled = compileTransaction(message);

  // Create a map to store signatures
  const signatures = new Map<Address, Signature | null>();

  // Initialize all required signatures as null
  for (const pubkey of compiled.signerPubkeys) {
    signatures.set(pubkey, null);
  }

  // Create a map of signers by public key for quick lookup
  const signerMap = new Map<Address, Signer>();
  for (const signer of signers) {
    signerMap.set(signer.publicKey, signer);
  }

  // Check that we have all required signers
  const missingSigners: Address[] = [];
  for (const pubkey of compiled.signerPubkeys) {
    if (!signerMap.has(pubkey)) {
      missingSigners.push(pubkey);
    }
  }

  if (missingSigners.length > 0 && options.abortOnError !== false) {
    throw new Error(`Missing required signers: ${missingSigners.join(', ')}`);
  }

  // Sign with all available signers in parallel
  const signingPromises: Promise<void>[] = [];
  const errors = new Map<Address, Error>();

  for (const pubkey of compiled.signerPubkeys) {
    const signer = signerMap.get(pubkey);
    if (!signer) {
      continue;
    }

    const signingPromise = signer
      .sign(compiled.messageBytes)
      .then((signature) => {
        signatures.set(pubkey, signature);
      })
      .catch((error) => {
        errors.set(pubkey, error as Error);
        if (options.abortOnError !== false) {
          throw error;
        }
      });

    signingPromises.push(signingPromise);
  }

  // Wait for all signatures
  if (options.abortOnError !== false) {
    await Promise.all(signingPromises);
  } else {
    await Promise.allSettled(signingPromises);
  }

  // Create the transaction with collected signatures
  const transaction: Transaction = {
    message,
    signatures: new Map(signatures),
  };

  // Optionally verify signatures
  if (options.verifySignatures) {
    // TODO: Implement signature verification using crypto module
    // This would verify each signature against the message bytes
  }

  return transaction;
}

/**
 * Partially signs a transaction with available signers
 * Does not throw if some signers are missing or fail
 *
 * @param signers - Array of available signers
 * @param message - The transaction message to sign
 * @returns Result with partial signatures and error information
 */
export async function partiallySignTransaction(
  signers: ReadonlyArray<Signer>,
  message: CompileableTransactionMessage,
): Promise<PartialSignResult> {
  // Validate basic prerequisites (but don't require all signers)
  if (!hasFeePayer(message)) {
    throw new Error('Transaction message must have a fee payer');
  }
  if (!hasLifetime(message)) {
    throw new Error('Transaction message must have a lifetime (blockhash)');
  }

  // Compile the transaction
  const compiled = compileTransaction(message);

  // Create maps for signatures and errors
  const signatures = new Map<Address, Signature | null>();
  const errors = new Map<Address, Error>();
  const failedSigners: Address[] = [];

  // Initialize all required signatures as null
  for (const pubkey of compiled.signerPubkeys) {
    signatures.set(pubkey, null);
  }

  // Create signer map
  const signerMap = new Map<Address, Signer>();
  for (const signer of signers) {
    signerMap.set(signer.publicKey, signer);
  }

  // Identify missing signers
  for (const pubkey of compiled.signerPubkeys) {
    if (!signerMap.has(pubkey)) {
      failedSigners.push(pubkey);
    }
  }

  // Sign with available signers
  const signingPromises = compiled.signerPubkeys
    .filter((pubkey) => signerMap.has(pubkey))
    .map(async (pubkey) => {
      const signer = signerMap.get(pubkey);
      if (!signer) {
        return; // Type guard, should never happen due to filter
      }
      try {
        const signature = await signer.sign(compiled.messageBytes);
        signatures.set(pubkey, signature);
      } catch (error) {
        errors.set(pubkey, error as Error);
        failedSigners.push(pubkey);
      }
    });

  // Wait for all signing attempts to complete
  await Promise.allSettled(signingPromises);

  // Create the transaction with whatever signatures we collected
  const transaction: Transaction = {
    message,
    signatures: new Map(signatures),
  };

  return {
    transaction,
    failedSigners,
    errors,
  };
}

/**
 * Adds signatures to an existing transaction
 * Useful for multi-step signing workflows
 *
 * @param transaction - The transaction to add signatures to
 * @param newSignatures - Map of public keys to signatures to add
 * @returns A new transaction with the added signatures
 */
export function addSignaturesToTransaction(
  transaction: Transaction,
  newSignatures: ReadonlyMap<Address, Signature>,
): Transaction {
  // Create a new signatures map with existing signatures
  const updatedSignatures = new Map(transaction.signatures);

  // Add new signatures
  for (const [pubkey, signature] of newSignatures) {
    updatedSignatures.set(pubkey, signature);
  }

  // Return new transaction with updated signatures
  return {
    message: transaction.message,
    signatures: updatedSignatures,
  };
}

/**
 * Validates that a transaction has all required signatures
 *
 * @param transaction - The transaction to validate
 * @returns true if all required signatures are present
 */
export function isFullySigned(transaction: Transaction): boolean {
  const compiled = compileTransaction(transaction.message);

  for (const pubkey of compiled.signerPubkeys) {
    const signature = transaction.signatures.get(pubkey);
    if (!signature) {
      return false;
    }
  }

  return true;
}

/**
 * Gets the list of missing signers for a transaction
 *
 * @param transaction - The transaction to check
 * @returns Array of public keys that still need to sign
 */
export function getMissingSigners(transaction: Transaction): Address[] {
  const compiled = compileTransaction(transaction.message);
  const missing: Address[] = [];

  for (const pubkey of compiled.signerPubkeys) {
    const signature = transaction.signatures.get(pubkey);
    if (!signature) {
      missing.push(pubkey);
    }
  }

  return missing;
}

/**
 * Validates prerequisites for transaction signing
 */
function validatePrerequisites(
  message: CompileableTransactionMessage,
  signers: ReadonlyArray<Signer>,
): void {
  // Check that message is compileable
  if (!isCompileable(message)) {
    if (!hasFeePayer(message)) {
      throw new Error('Transaction message must have a fee payer');
    }
    if (!hasLifetime(message)) {
      throw new Error('Transaction message must have a lifetime (blockhash)');
    }
    throw new Error('Transaction message is not compileable');
  }

  // Check that fee payer is among signers
  const feePayerSigner = signers.find((s) => s.publicKey === message.feePayer);
  if (!feePayerSigner) {
    throw new Error(`Fee payer ${message.feePayer} must be among the provided signers`);
  }

  // Validate signers array
  if (signers.length === 0) {
    throw new Error('At least one signer must be provided');
  }
}
