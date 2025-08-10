/**
 * Generate deterministic test accounts for testing
 * Run this script to regenerate accounts.json
 */
import { writeFile } from 'fs/promises';
import { join } from 'path';
// Imports removed - not currently used
import type { Address } from '@photon/addresses';

interface TestAccount {
  name: string;
  seed: string;
  publicKey: Address;
  privateKey: string; // Base58 encoded for test use
  lamports: number;
}

/**
 * Generate a deterministic keypair from a seed string
 */
async function generateTestAccount(
  name: string,
  seedString: string,
  lamports: number,
): Promise<TestAccount> {
  // Seed handling will be implemented when generateKeyPairFromSeed is available
  // const encoder = new TextEncoder();
  // const seedBytes = encoder.encode(seedString.padEnd(32, '0')).slice(0, 32);

  // For now, since seed-based generation isn't implemented,
  // we'll store pre-generated accounts
  // In the future, this will use generateKeyPairFromSeed

  // Temporary: Use a fixed keypair for each account
  // These will be replaced with deterministic generation
  const accounts: Record<string, { publicKey: string; privateKey: string }> = {
    alice: {
      publicKey: 'ALiCE11111111111111111111111111111111111111',
      privateKey: 'ALICE_PRIVATE_KEY_PLACEHOLDER',
    },
    bob: {
      publicKey: 'BoB1111111111111111111111111111111111111111',
      privateKey: 'BOB_PRIVATE_KEY_PLACEHOLDER',
    },
    charlie: {
      publicKey: 'CHARLiE111111111111111111111111111111111111',
      privateKey: 'CHARLIE_PRIVATE_KEY_PLACEHOLDER',
    },
    dave: {
      publicKey: 'DAVE11111111111111111111111111111111111111',
      privateKey: 'DAVE_PRIVATE_KEY_PLACEHOLDER',
    },
    eve: {
      publicKey: 'EVE111111111111111111111111111111111111111',
      privateKey: 'EVE_PRIVATE_KEY_PLACEHOLDER',
    },
  };

  const account = accounts[name] || {
    publicKey: name.toUpperCase().padEnd(44, '1'),
    privateKey: `${name.toUpperCase()}_PRIVATE_KEY`,
  };

  return {
    name,
    seed: seedString,
    publicKey: account.publicKey as Address,
    privateKey: account.privateKey,
    lamports,
  };
}

/**
 * Generate all test accounts
 */
async function generateAccounts(): Promise<Record<string, TestAccount>> {
  const accounts: TestAccount[] = [
    await generateTestAccount('alice', 'alice_test_seed_000000000000000', 10_000_000_000), // 10 SOL
    await generateTestAccount('bob', 'bob_test_seed_00000000000000000', 5_000_000_000), // 5 SOL
    await generateTestAccount('charlie', 'charlie_test_seed_00000000000', 1_000_000_000), // 1 SOL
    await generateTestAccount('dave', 'dave_test_seed_0000000000000000', 100_000_000), // 0.1 SOL
    await generateTestAccount('eve', 'eve_test_seed_00000000000000000', 10_000_000), // 0.01 SOL
  ];

  const accountMap: Record<string, TestAccount> = {};
  for (const account of accounts) {
    accountMap[account.name] = account;
  }

  return accountMap;
}

/**
 * Main function to generate and save accounts
 */
async function main() {
  console.log('Generating test accounts...');
  const accounts = await generateAccounts();

  const outputPath = join(__dirname, 'accounts.json');
  await writeFile(outputPath, JSON.stringify(accounts, null, 2));

  console.log(`Generated ${Object.keys(accounts).length} test accounts`);
  console.log(`Saved to ${outputPath}`);

  // Print account summary
  console.log('\nAccount Summary:');
  for (const [name, account] of Object.entries(accounts)) {
    const sol = account.lamports / 1_000_000_000;
    console.log(`  ${name.padEnd(10)} ${account.publicKey} (${sol} SOL)`);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
