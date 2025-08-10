import { createSolanaRpc } from '@photon/rpc';
import type { Address } from '@photon/addresses';

async function testRpc(endpoint = 'http://127.0.0.1:8899') {
  console.log(`\n🌐 Testing RPC Package (${endpoint})\n`);

  try {
    const rpc = createSolanaRpc(endpoint);

    // Get node health
    const health = await rpc.getHealth();
    console.log('Node health:', health);

    // Get version info
    const version = await rpc.getVersion();
    console.log('Solana version:', version['solana-core']);

    // Get current slot
    const slot = await rpc.getSlot();
    console.log('Current slot:', slot);

    // Get block height
    const blockHeight = await rpc.getBlockHeight();
    console.log('Block height:', blockHeight);

    // Get supply info
    const supply = await rpc.getSupply();
    console.log('Total supply (SOL):', supply.value.total / 1_000_000_000);

    // Check system program balance
    const systemProgram = '11111111111111111111111111111111' as Address;
    const balance = await rpc.getBalance(systemProgram);
    console.log('System program balance:', balance.value, 'lamports');
  } catch (error) {
    console.error('RPC Error:', error instanceof Error ? error.message : String(error));
    console.log('\nMake sure Solana test validator is running:');
    console.log('  cd packages/sandbox');
    console.log('  pnpm validator');
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const endpoint = process.env.RPC_ENDPOINT || 'http://127.0.0.1:8899';
  testRpc(endpoint).catch(console.error);
}
