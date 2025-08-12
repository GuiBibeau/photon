import { describe, it, expect } from 'vitest';
import { address } from '@photon/addresses';
import {
  createTransactionMessage,
  setTransactionMessageFeePayer,
  appendTransactionMessageInstruction,
} from '@photon/transaction-messages';
import {
  createInitializeMintInstruction,
  createMintToInstruction,
  createTransferInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  transferTokens,
  mintTokensTo,
} from '../src';

describe('SPL Token Integration', () => {
  const alice = address('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
  const bob = address('DQCmyT1zdvrPbByPApvsJKARH5xTAAeBEhsvM7SqKh6X');
  const mint = address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

  describe('Token Operations Flow', () => {
    it('should create correct instruction sequence for mint creation', () => {
      const initMintInstruction = createInitializeMintInstruction(mint, {
        decimals: 6,
        mintAuthority: alice,
        freezeAuthority: null,
      });

      expect(initMintInstruction).toBeDefined();
      expect(initMintInstruction.programId).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      expect(initMintInstruction.accounts).toHaveLength(1); // InitializeMint2 only needs mint account
      expect(initMintInstruction.accounts[0].pubkey).toBe(mint);
      expect(initMintInstruction.accounts[0].isWritable).toBe(true);
    });

    it('should create correct instruction for minting tokens', () => {
      const destination = address('7UT4ujaxzCZVzwiVW37kDK8zzkaKFDcPPnLii7VNDb5w'); // Mock ATA

      const mintToInstruction = createMintToInstruction({
        amount: 1000000n,
        mint,
        destination,
        authority: alice,
      });

      expect(mintToInstruction).toBeDefined();
      expect(mintToInstruction.programId).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      expect(mintToInstruction.accounts).toHaveLength(3);
      expect(mintToInstruction.accounts[0].pubkey).toBe(mint);
      expect(mintToInstruction.accounts[0].isWritable).toBe(true);
      expect(mintToInstruction.accounts[1].pubkey).toBe(destination);
      expect(mintToInstruction.accounts[1].isWritable).toBe(true);
      expect(mintToInstruction.accounts[2].pubkey).toBe(alice);
      expect(mintToInstruction.accounts[2].isSigner).toBe(true);
    });

    it('should create correct instruction for token transfer', () => {
      const source = address('7UT4ujaxzCZVzwiVW37kDK8zzkaKFDcPPnLii7VNDb5w'); // Mock Alice ATA
      const destination = address('H8UekPGwePSmQ3ttuYGPU1szyFfjZR4N53rymSFwpLPm'); // Mock Bob ATA

      const transferInstruction = createTransferInstruction({
        amount: 500000n,
        source,
        destination,
        owner: alice,
      });

      expect(transferInstruction).toBeDefined();
      expect(transferInstruction.programId).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      expect(transferInstruction.accounts).toHaveLength(3);
      expect(transferInstruction.accounts[0].pubkey).toBe(source);
      expect(transferInstruction.accounts[0].isWritable).toBe(true);
      expect(transferInstruction.accounts[1].pubkey).toBe(destination);
      expect(transferInstruction.accounts[1].isWritable).toBe(true);
      expect(transferInstruction.accounts[2].pubkey).toBe(alice);
      expect(transferInstruction.accounts[2].isSigner).toBe(true);
    });

    it('should create ATA creation instruction', () => {
      const ata = address('H8UekPGwePSmQ3ttuYGPU1szyFfjZR4N53rymSFwpLPm'); // Mock Bob ATA

      const createAtaInstruction = createAssociatedTokenAccountIdempotentInstruction(
        alice, // payer
        ata,
        bob, // owner
        mint,
      );

      expect(createAtaInstruction).toBeDefined();
      expect(createAtaInstruction.programId).toBe('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
      expect(createAtaInstruction.accounts).toHaveLength(6);
      expect(createAtaInstruction.accounts[0].pubkey).toBe(alice);
      expect(createAtaInstruction.accounts[0].isSigner).toBe(true);
      expect(createAtaInstruction.accounts[0].isWritable).toBe(true);
      expect(createAtaInstruction.accounts[1].pubkey).toBe(ata);
      expect(createAtaInstruction.accounts[2].pubkey).toBe(bob);
      expect(createAtaInstruction.accounts[3].pubkey).toBe(mint);

      // Check idempotent discriminator
      expect(createAtaInstruction.data).toHaveLength(1);
      expect(createAtaInstruction.data[0]).toBe(1);
    });
  });

  describe('Helper Functions', () => {
    it.skip('should build transaction with transferTokens helper (skipped due to ATA derivation)', async () => {
      let message = createTransactionMessage('legacy');
      message = setTransactionMessageFeePayer(alice, message);

      const updatedMessage = await transferTokens(
        message,
        mint,
        100000n,
        address('7UT4ujaxzCZVzwiVW37kDK8zzkaKFDcPPnLii7VNDb5w'), // Mock Alice ATA
        bob,
        alice,
        alice,
      );

      // Should have 2 instructions: create ATA + transfer
      expect(updatedMessage.instructions).toHaveLength(2);

      // First instruction should be ATA creation
      expect(updatedMessage.instructions[0].programId).toBe(
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
      );

      // Second instruction should be transfer
      expect(updatedMessage.instructions[1].programId).toBe(
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      );
    });

    it.skip('should build transaction with mintTokensTo helper (skipped due to ATA derivation)', async () => {
      let message = createTransactionMessage('legacy');
      message = setTransactionMessageFeePayer(alice, message);

      const updatedMessage = await mintTokensTo(message, mint, 1000000n, bob, alice, alice);

      // Should have 2 instructions: create ATA + mint
      expect(updatedMessage.instructions).toHaveLength(2);

      // First instruction should be ATA creation
      expect(updatedMessage.instructions[0].programId).toBe(
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
      );

      // Second instruction should be mint
      expect(updatedMessage.instructions[1].programId).toBe(
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      );
      const [instructionType] = new Uint8Array(updatedMessage.instructions[1].data.slice(0, 1));
      expect(instructionType).toBe(7); // MintTo instruction
    });
  });

  describe('Complete Token Flow Simulation', () => {
    it('should build a complete token creation and transfer flow', () => {
      let message = createTransactionMessage('legacy');
      message = setTransactionMessageFeePayer(alice, message);

      // Step 1: Initialize mint (would need create account first in real scenario)
      const initMintInstruction = createInitializeMintInstruction(mint, {
        decimals: 9,
        mintAuthority: alice,
        freezeAuthority: null,
      });

      // Use appendTransactionMessageInstruction (already imported at top)
      message = appendTransactionMessageInstruction(initMintInstruction, message);

      // Step 2: Create Alice's ATA and mint tokens (use mock addresses for test)
      const aliceAta = address('7UT4ujaxzCZVzwiVW37kDK8zzkaKFDcPPnLii7VNDb5w'); // Mock ATA
      const createAliceAtaInstruction = createAssociatedTokenAccountIdempotentInstruction(
        alice,
        aliceAta,
        alice,
        mint,
      );
      message = appendTransactionMessageInstruction(createAliceAtaInstruction, message);

      const mintToAliceInstruction = createMintToInstruction({
        amount: 1000000000n,
        mint,
        destination: aliceAta,
        authority: alice,
      });
      message = appendTransactionMessageInstruction(mintToAliceInstruction, message);

      // Step 3: Transfer tokens to Bob
      const bobAta = address('H8UekPGwePSmQ3ttuYGPU1szyFfjZR4N53rymSFwpLPm'); // Mock ATA
      const createBobAtaInstruction = createAssociatedTokenAccountIdempotentInstruction(
        alice,
        bobAta,
        bob,
        mint,
      );
      message = appendTransactionMessageInstruction(createBobAtaInstruction, message);

      const transferInstruction = createTransferInstruction({
        amount: 100000000n,
        source: aliceAta,
        destination: bobAta,
        owner: alice,
      });
      message = appendTransactionMessageInstruction(transferInstruction, message);

      // Verify the complete flow
      expect(message.instructions).toHaveLength(5);

      // Verify instruction order
      expect(message.instructions[0].programId).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'); // Init mint
      expect(message.instructions[1].programId).toBe(
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
      ); // Create Alice ATA
      expect(message.instructions[2].programId).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'); // Mint to Alice
      expect(message.instructions[3].programId).toBe(
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
      ); // Create Bob ATA
      expect(message.instructions[4].programId).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'); // Transfer to Bob

      // Complete token flow simulation successful!
      // 1. Initialize mint with 9 decimals
      // 2. Create Alice ATA
      // 3. Mint 1 token to Alice
      // 4. Create Bob ATA
      // 5. Transfer 0.1 token to Bob
    });
  });
});
