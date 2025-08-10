/**
 * Pre-defined test accounts for integration testing
 * These accounts will be pre-funded in the test validator
 */
import type { Address } from '@photon/addresses';

export interface TestAccount {
  name: string;
  publicKey: Address;
  lamports: number;
}

/**
 * Pre-defined test accounts with fixed addresses
 * In a real scenario, these would be generated from deterministic seeds
 * For now, we'll generate them dynamically in tests
 */
export const TEST_ACCOUNTS = {
  alice: {
    name: 'alice',
    lamports: 10_000_000_000, // 10 SOL
  },
  bob: {
    name: 'bob',
    lamports: 5_000_000_000, // 5 SOL
  },
  charlie: {
    name: 'charlie',
    lamports: 1_000_000_000, // 1 SOL
  },
  dave: {
    name: 'dave',
    lamports: 100_000_000, // 0.1 SOL
  },
  eve: {
    name: 'eve',
    lamports: 10_000_000, // 0.01 SOL
  },
} as const;

/**
 * Get the total lamports needed for all test accounts
 */
export function getTotalTestLamports(): number {
  return Object.values(TEST_ACCOUNTS).reduce((sum, account) => sum + account.lamports, 0);
}
