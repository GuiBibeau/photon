/**
 * Associated Token Account (ATA) utilities
 */

import {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS,
  SYSTEM_PROGRAM_ADDRESS,
  type Address,
} from '@photon/addresses';
import {
  createInstruction,
  type AccountMeta,
  type Instruction,
} from '@photon/transaction-messages';

/**
 * Derive the associated token account address for a wallet and mint
 *
 * @param mint - The token mint address
 * @param owner - The wallet address that owns the ATA
 * @param tokenProgramId - The token program ID (default: TOKEN_PROGRAM_ADDRESS)
 * @returns The associated token account address
 */
export async function getAssociatedTokenAddress(
  mint: Address,
  owner: Address,
  tokenProgramId: Address = TOKEN_PROGRAM_ADDRESS,
): Promise<Address> {
  // Import getAddressBytes to convert addresses to bytes
  const { getAddressBytes } = await import('@photon/addresses');
  const { findProgramAddressSync } = await import('@photon/addresses/pda');

  // The correct seed order is: wallet, token_program, mint
  // These must be EXACTLY in this order for the derivation to work
  const seeds = [getAddressBytes(owner), getAddressBytes(tokenProgramId), getAddressBytes(mint)];

  // ATAs use findProgramAddressSync to find the valid off-curve address
  // We only return the address, not the bump (bump is implicit/hidden)
  const [address] = await findProgramAddressSync(seeds, ASSOCIATED_TOKEN_PROGRAM_ADDRESS);

  return address;
}

/**
 * Create an instruction to create an associated token account
 *
 * @param payer - The account paying for the new account
 * @param associatedToken - The associated token account address (derived from getAssociatedTokenAddress)
 * @param owner - The wallet that will own the ATA
 * @param mint - The token mint
 * @param tokenProgramId - The token program ID (default: TOKEN_PROGRAM_ADDRESS)
 * @returns The instruction to create an associated token account
 */
export function createAssociatedTokenAccountInstruction(
  payer: Address,
  associatedToken: Address,
  owner: Address,
  mint: Address,
  tokenProgramId: Address = TOKEN_PROGRAM_ADDRESS,
): Instruction {
  const accounts: AccountMeta[] = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedToken, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: SYSTEM_PROGRAM_ADDRESS, isSigner: false, isWritable: false },
    { pubkey: tokenProgramId, isSigner: false, isWritable: false },
  ];

  // No data needed for this instruction
  return createInstruction(ASSOCIATED_TOKEN_PROGRAM_ADDRESS, accounts, new Uint8Array(0));
}

/**
 * Create an idempotent instruction to create an associated token account
 * This instruction will not fail if the account already exists
 *
 * @param payer - The account paying for the new account
 * @param associatedToken - The associated token account address
 * @param owner - The wallet that will own the ATA
 * @param mint - The token mint
 * @param tokenProgramId - The token program ID (default: TOKEN_PROGRAM_ADDRESS)
 * @returns The instruction to create an associated token account idempotently
 */
export function createAssociatedTokenAccountIdempotentInstruction(
  payer: Address,
  associatedToken: Address,
  owner: Address,
  mint: Address,
  tokenProgramId: Address = TOKEN_PROGRAM_ADDRESS,
): Instruction {
  const accounts: AccountMeta[] = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedToken, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: SYSTEM_PROGRAM_ADDRESS, isSigner: false, isWritable: false },
    { pubkey: tokenProgramId, isSigner: false, isWritable: false },
  ];

  // Idempotent instruction uses discriminator 1
  return createInstruction(ASSOCIATED_TOKEN_PROGRAM_ADDRESS, accounts, new Uint8Array([1]));
}

/**
 * Check if a given token program ID is valid
 *
 * @param programId - The program ID to check
 * @returns True if the program ID is a valid token program
 */
export function isValidTokenProgram(programId: Address): boolean {
  return programId === TOKEN_PROGRAM_ADDRESS || programId === TOKEN_2022_PROGRAM_ADDRESS;
}

/**
 * Get the token program ID for a given mint
 * This would typically require fetching the mint account to determine the owner program
 * For now, we'll default to the standard token program
 *
 * @param mint - The token mint address
 * @returns The token program ID
 */
export function getTokenProgramForMint(_mint: Address): Address {
  // In a real implementation, this would fetch the mint account
  // and return the owner program. For now, default to TOKEN_PROGRAM_ADDRESS
  return TOKEN_PROGRAM_ADDRESS;
}
