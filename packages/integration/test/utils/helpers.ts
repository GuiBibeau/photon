/**
 * Test helper utilities
 */
import { createSolanaRpc, type RpcClient } from '@photon/rpc';
import type { Address } from '@photon/addresses';
import type { Signer } from '@photon/signers';
import { generateCryptoKeySigner } from '@photon/signers';
import { getValidatorUrl } from './validator.js';

/**
 * Create a test RPC client with default settings
 */
export function createTestRpc(): RpcClient {
  return createSolanaRpc(getValidatorUrl(), {
    commitment: 'confirmed',
  });
}

/**
 * Wait for a transaction signature to be confirmed
 */
export async function waitForConfirmation(
  rpc: RpcClient,
  signature: string,
  options: {
    timeout?: number;
    pollInterval?: number;
    commitment?: 'processed' | 'confirmed' | 'finalized';
  } = {},
): Promise<void> {
  const { timeout = 30000, pollInterval = 1000, commitment = 'confirmed' } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const statuses = await rpc.getSignatureStatuses([signature]);
    const status = statuses.value?.[0];

    if (status?.confirmationStatus === commitment || status?.confirmationStatus === 'finalized') {
      return;
    }

    if (status?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
    }

    await sleep(pollInterval);
  }

  throw new Error(`Transaction confirmation timeout after ${timeout}ms`);
}

/**
 * Get account balance with retries
 */
export async function getBalance(
  rpc: RpcClient,
  address: Address,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    commitment?: 'processed' | 'confirmed' | 'finalized';
  } = {},
): Promise<bigint> {
  const { maxRetries = 3, retryDelay = 500, commitment = 'confirmed' } = options;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await rpc.getBalance(address, { commitment });
      return result.value;
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      await sleep(retryDelay);
    }
  }

  throw new Error('Failed to get balance after retries');
}

/**
 * Fund an account via airdrop
 */
export async function fundAccount(
  rpc: RpcClient,
  address: Address,
  lamports: bigint,
  options: {
    skipConfirmation?: boolean;
  } = {},
): Promise<string> {
  const signature = await rpc.requestAirdrop(address, lamports);

  if (!options.skipConfirmation) {
    await waitForConfirmation(rpc, signature);
  }

  return signature;
}

/**
 * Generate a test signer with metadata
 */
export async function createTestSigner(name: string): Promise<Signer> {
  return generateCryptoKeySigner({ metadata: { name } });
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format lamports as SOL
 */
export function lamportsToSol(lamports: bigint | number): string {
  const value = typeof lamports === 'bigint' ? lamports : BigInt(lamports);
  const sol = Number(value) / 1_000_000_000;
  return `${sol} SOL`;
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * 1_000_000_000));
}

/**
 * Assert account balance
 */
export async function assertBalance(
  rpc: RpcClient,
  address: Address,
  expectedLamports: bigint,
  options: {
    tolerance?: bigint;
    message?: string;
  } = {},
): Promise<void> {
  const { tolerance = 0n, message } = options;
  const balance = await getBalance(rpc, address);

  const diff = balance > expectedLamports ? balance - expectedLamports : expectedLamports - balance;

  if (diff > tolerance) {
    const msg = message || `Balance mismatch: expected ${expectedLamports}, got ${balance}`;
    throw new Error(msg);
  }
}

/**
 * Create multiple test signers
 */
export async function createTestSigners(count: number): Promise<Signer[]> {
  const signers: Signer[] = [];
  for (let i = 0; i < count; i++) {
    signers.push(await createTestSigner(`test-signer-${i}`));
  }
  return signers;
}
