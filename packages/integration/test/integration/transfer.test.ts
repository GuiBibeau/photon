/**
 * Integration tests for SOL transfers
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { address } from '@photon/addresses';
import { u32, u64 } from '@photon/codecs/primitives/numeric';
import {
  appendTransactionMessageInstruction,
  createInstruction,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  blockhash as brandBlockhash,
  type AccountMeta,
} from '@photon/transaction-messages';
import { signTransaction, sendAndConfirmTransaction } from '@photon/transactions';
import { startValidator, stopValidator } from '../utils/validator.js';
import {
  createTestRpc,
  createTestSigner,
  getBalance,
  fundAccount,
  lamportsToSol,
  solToLamports,
} from '../utils/helpers.js';
import type { Signer } from '@photon/signers';
import type { RpcClient } from '@photon/rpc';

// System Program ID for transfers
const SYSTEM_PROGRAM_ID = address('11111111111111111111111111111111');

describe('SOL Transfer Integration Tests', () => {
  let rpc: RpcClient;
  let alice: Signer;
  let bob: Signer;
  let charlie: Signer;

  beforeAll(async () => {
    // Start validator with clean ledger
    await startValidator({ resetLedger: true, quiet: true });

    // Create test RPC client
    rpc = createTestRpc();

    // Create test signers
    alice = await createTestSigner('alice');
    bob = await createTestSigner('bob');
    charlie = await createTestSigner('charlie');

    // Fund alice with 10 SOL for testing
    console.log('Funding test accounts...');
    await fundAccount(rpc, alice.publicKey, solToLamports(10));
  }, 30000);

  afterAll(async () => {
    await stopValidator();
  });

  it('should transfer SOL between accounts', async () => {
    // Get initial balances
    const aliceBalanceBefore = await getBalance(rpc, alice.publicKey);
    const bobBalanceBefore = await getBalance(rpc, bob.publicKey);

    console.log(`Alice balance before: ${lamportsToSol(aliceBalanceBefore)}`);
    console.log(`Bob balance before: ${lamportsToSol(bobBalanceBefore)}`);

    // Build transfer instruction (1 SOL)
    const transferAmount = solToLamports(1);
    const instructionData = new Uint8Array([
      ...u32.encode(2), // Transfer instruction
      ...u64.encode(transferAmount),
    ]);

    const accounts: AccountMeta[] = [
      { pubkey: alice.publicKey, isSigner: true, isWritable: true },
      { pubkey: bob.publicKey, isSigner: false, isWritable: true },
    ];

    // Get recent blockhash
    const { value: blockInfo } = await rpc.getLatestBlockhash();

    // Build transaction message
    let message = createTransactionMessage('legacy');
    message = setTransactionMessageFeePayer(alice.publicKey, message);
    message = setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: brandBlockhash(blockInfo.blockhash),
        lastValidBlockHeight: blockInfo.lastValidBlockHeight,
      },
      message,
    );
    message = appendTransactionMessageInstruction(
      createInstruction(SYSTEM_PROGRAM_ID, accounts, instructionData),
      message,
    );

    // Sign and send transaction
    const transaction = await signTransaction([alice], message);
    const signature = await sendAndConfirmTransaction(transaction, {
      sendTransaction: (encoded: string) => {
        return rpc.sendTransaction(encoded, {
          encoding: 'base58',
          skipPreflight: true,
          preflightCommitment: 'processed',
        });
      },
      getSignatureStatuses: (sigs: string[]) => rpc.getSignatureStatuses(sigs),
    });

    console.log(`Transfer transaction: ${signature}`);

    // Wait a bit for balances to update
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check final balances
    const aliceBalanceAfter = await getBalance(rpc, alice.publicKey);
    const bobBalanceAfter = await getBalance(rpc, bob.publicKey);

    console.log(`Alice balance after: ${lamportsToSol(aliceBalanceAfter)}`);
    console.log(`Bob balance after: ${lamportsToSol(bobBalanceAfter)}`);

    // Verify transfer
    expect(Number(bobBalanceAfter - bobBalanceBefore)).toBe(Number(transferAmount));
    // Alice should have paid transfer amount plus fees (at least equal to transfer amount)
    expect(Number(aliceBalanceBefore - aliceBalanceAfter)).toBeGreaterThanOrEqual(
      Number(transferAmount),
    );
  });

  it('should handle multiple transfers', async () => {
    // Fund alice if needed
    const aliceBalance = await getBalance(rpc, alice.publicKey);
    if (aliceBalance < solToLamports(2)) {
      await fundAccount(rpc, alice.publicKey, solToLamports(5));
    }

    // Transfer 0.5 SOL to Bob
    await transferSol(alice, bob.publicKey, 0.5);

    // Transfer 0.3 SOL to Charlie
    await transferSol(alice, charlie.publicKey, 0.3);

    // Verify balances
    const bobBalance = await getBalance(rpc, bob.publicKey);
    const charlieBalance = await getBalance(rpc, charlie.publicKey);

    expect(bobBalance).toBeGreaterThan(0n);
    expect(charlieBalance).toBeGreaterThan(0n);
  });

  it('should fail when sender has insufficient funds', async () => {
    // Charlie has minimal balance
    const charlieBalance = await getBalance(rpc, charlie.publicKey);

    // Try to send more than Charlie has (add 1 SOL to current balance)
    const transferAmountSol = Number(charlieBalance) / 1_000_000_000 + 1;

    await expect(transferSol(charlie, bob.publicKey, transferAmountSol)).rejects.toThrow();
  });

  // Helper function to transfer SOL
  async function transferSol(
    from: Signer,
    toAddress: Address | string,
    amountSol: number,
  ): Promise<string> {
    const transferAmount = solToLamports(amountSol);
    const instructionData = new Uint8Array([...u32.encode(2), ...u64.encode(transferAmount)]);

    const accounts: AccountMeta[] = [
      { pubkey: from.publicKey, isSigner: true, isWritable: true },
      { pubkey: toAddress as Address, isSigner: false, isWritable: true },
    ];

    const { value: blockInfo } = await rpc.getLatestBlockhash();

    let message = createTransactionMessage('legacy');
    message = setTransactionMessageFeePayer(from.publicKey, message);
    message = setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: brandBlockhash(blockInfo.blockhash),
        lastValidBlockHeight: blockInfo.lastValidBlockHeight,
      },
      message,
    );
    message = appendTransactionMessageInstruction(
      createInstruction(SYSTEM_PROGRAM_ID, accounts, instructionData),
      message,
    );

    const transaction = await signTransaction([from], message);
    return await sendAndConfirmTransaction(transaction, {
      sendTransaction: (encoded: string) => {
        return rpc.sendTransaction(encoded, {
          encoding: 'base58',
          skipPreflight: true,
          preflightCommitment: 'processed',
        });
      },
      getSignatureStatuses: (sigs: string[]) => rpc.getSignatureStatuses(sigs),
    });
  }
});
