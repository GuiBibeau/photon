import { isAddress } from '@photon/addresses';

async function testAddresses() {
  console.log('\n📍 Testing Addresses Package\n');

  // Test known Solana addresses
  const systemProgram = '11111111111111111111111111111111';
  console.log(`System Program: ${systemProgram}`);
  console.log(`Is valid address? ${isAddress(systemProgram)}`);

  const tokenProgram = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  console.log(`\nToken Program: ${tokenProgram}`);
  console.log(`Is valid address? ${isAddress(tokenProgram)}`);

  const invalidAddress = 'not-a-valid-address';
  console.log(`\nInvalid address: ${invalidAddress}`);
  console.log(`Is valid address? ${isAddress(invalidAddress)}`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAddresses().catch(console.error);
}
