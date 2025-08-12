/**
 * High-level helper functions for common SPL Token operations
 */

import { type Address } from '@photon/addresses';
import {
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructions,
  type TransactionMessage,
  type Instruction,
} from '@photon/transaction-messages';
import {
  createInitializeMintInstruction,
  createInitializeAccountInstruction,
  createMintToInstruction,
  createTransferInstruction,
  createBurnInstruction,
  createApproveInstruction,
  createCloseAccountInstruction,
} from './instructions.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
} from './ata.js';
import type { InitializeMintConfig, TokenAmount } from './types.js';

/**
 * Create a new token mint with all necessary instructions
 *
 * @param message - The transaction message to append to
 * @param mint - The mint account address (must be a new account)
 * @param config - Mint configuration
 * @returns Updated transaction message with mint creation instructions
 */
export function createMint<T extends TransactionMessage>(
  message: T,
  mint: Address,
  config: InitializeMintConfig,
): T {
  // Note: In a real implementation, we'd also need to create the mint account
  // using System Program's createAccount instruction first
  const instruction = createInitializeMintInstruction(mint, config);
  return appendTransactionMessageInstruction(instruction, message);
}

/**
 * Create or get an associated token account and optionally fund it
 *
 * @param message - The transaction message to append to
 * @param mint - The token mint
 * @param owner - The owner of the token account
 * @param payer - The payer for account creation
 * @returns Object with updated message and the ATA address
 */
export async function getOrCreateAssociatedTokenAccount<T extends TransactionMessage>(
  message: T,
  mint: Address,
  owner: Address,
  payer: Address,
): Promise<{ message: T; address: Address }> {
  const ataAddress = await getAssociatedTokenAddress(mint, owner);

  // Create ATA instruction (idempotent - won't fail if exists)
  const createAtaInstruction = createAssociatedTokenAccountIdempotentInstruction(
    payer,
    ataAddress,
    owner,
    mint,
  );

  const updatedMessage = appendTransactionMessageInstruction(createAtaInstruction, message);

  return {
    message: updatedMessage,
    address: ataAddress,
  };
}

/**
 * Transfer tokens between accounts, creating destination ATA if needed
 *
 * @param message - The transaction message to append to
 * @param mint - The token mint
 * @param amount - Amount to transfer
 * @param source - Source token account
 * @param destinationOwner - Owner of the destination account
 * @param sourceOwner - Owner of the source account
 * @param payer - Payer for ATA creation if needed
 * @returns Updated transaction message
 */
export async function transferTokens<T extends TransactionMessage>(
  message: T,
  mint: Address,
  amount: TokenAmount,
  source: Address,
  destinationOwner: Address,
  sourceOwner: Address,
  payer: Address,
): Promise<T> {
  // Get or create destination ATA
  const destinationAta = await getAssociatedTokenAddress(mint, destinationOwner);

  const instructions: Instruction[] = [
    // Create destination ATA if it doesn't exist (idempotent)
    createAssociatedTokenAccountIdempotentInstruction(
      payer,
      destinationAta,
      destinationOwner,
      mint,
    ),
    // Transfer tokens
    createTransferInstruction({
      amount,
      source,
      destination: destinationAta,
      owner: sourceOwner,
    }),
  ];

  return appendTransactionMessageInstructions(instructions, message);
}

/**
 * Mint tokens to an account, creating it if needed
 *
 * @param message - The transaction message to append to
 * @param mint - The token mint
 * @param amount - Amount to mint
 * @param destinationOwner - Owner of the destination account
 * @param mintAuthority - The mint authority
 * @param payer - Payer for ATA creation if needed
 * @returns Updated transaction message
 */
export async function mintTokensTo<T extends TransactionMessage>(
  message: T,
  mint: Address,
  amount: TokenAmount,
  destinationOwner: Address,
  mintAuthority: Address,
  payer: Address,
): Promise<T> {
  // Get or create destination ATA
  const destinationAta = await getAssociatedTokenAddress(mint, destinationOwner);

  const instructions: Instruction[] = [
    // Create destination ATA if it doesn't exist (idempotent)
    createAssociatedTokenAccountIdempotentInstruction(
      payer,
      destinationAta,
      destinationOwner,
      mint,
    ),
    // Mint tokens
    createMintToInstruction({
      amount,
      mint,
      destination: destinationAta,
      authority: mintAuthority,
    }),
  ];

  return appendTransactionMessageInstructions(instructions, message);
}

/**
 * Burn tokens from an account
 *
 * @param message - The transaction message to append to
 * @param mint - The token mint
 * @param amount - Amount to burn
 * @param tokenAccount - The token account to burn from
 * @param owner - Owner of the token account
 * @returns Updated transaction message
 */
export function burnTokens<T extends TransactionMessage>(
  message: T,
  mint: Address,
  amount: TokenAmount,
  tokenAccount: Address,
  owner: Address,
): T {
  const instruction = createBurnInstruction({
    amount,
    account: tokenAccount,
    mint,
    owner,
  });

  return appendTransactionMessageInstruction(instruction, message);
}

/**
 * Approve a delegate to transfer tokens
 *
 * @param message - The transaction message to append to
 * @param amount - Amount to approve
 * @param tokenAccount - The token account
 * @param delegate - The delegate to approve
 * @param owner - Owner of the token account
 * @returns Updated transaction message
 */
export function approveDelegate<T extends TransactionMessage>(
  message: T,
  amount: TokenAmount,
  tokenAccount: Address,
  delegate: Address,
  owner: Address,
): T {
  const instruction = createApproveInstruction({
    amount,
    account: tokenAccount,
    delegate,
    owner,
  });

  return appendTransactionMessageInstruction(instruction, message);
}

/**
 * Close a token account and recover the rent
 *
 * @param message - The transaction message to append to
 * @param tokenAccount - The token account to close
 * @param destination - Account to receive the recovered SOL
 * @param owner - Owner of the token account
 * @returns Updated transaction message
 */
export function closeTokenAccount<T extends TransactionMessage>(
  message: T,
  tokenAccount: Address,
  destination: Address,
  owner: Address,
): T {
  const instruction = createCloseAccountInstruction(tokenAccount, destination, owner);

  return appendTransactionMessageInstruction(instruction, message);
}

/**
 * Create a token account for a specific mint
 *
 * @param message - The transaction message to append to
 * @param account - The token account address (must be a new account)
 * @param mint - The token mint
 * @param owner - The owner of the token account
 * @returns Updated transaction message
 */
export function createTokenAccount<T extends TransactionMessage>(
  message: T,
  account: Address,
  mint: Address,
  owner: Address,
): T {
  // Note: In a real implementation, we'd also need to create the account
  // using System Program's createAccount instruction first
  const instruction = createInitializeAccountInstruction(account, mint, owner);
  return appendTransactionMessageInstruction(instruction, message);
}
