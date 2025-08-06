/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createSolanaRpc, type RpcClient } from '../src/index';
import { address } from '@photon/addresses';

describe('RPC Connection & Basic Queries - Devnet Integration', () => {
  let rpc: RpcClient;
  const DEVNET_ENDPOINT = 'https://api.devnet.solana.com';
  const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';

  beforeAll(() => {
    // Create RPC client
    rpc = createSolanaRpc(DEVNET_ENDPOINT);
  });

  it('should connect to devnet and fetch latest blockhash', async () => {
    const result = await rpc.getLatestBlockhash();

    expect(result).toBeDefined();
    expect(result.value).toBeDefined();
    expect(result.value.blockhash).toBeDefined();
    expect(typeof result.value.blockhash).toBe('string');
    // Blockhash should be a base58 string of appropriate length
    expect(result.value.blockhash.length).toBeGreaterThan(40);
    expect(result.value.blockhash.length).toBeLessThan(50);
    expect(result.value.lastValidBlockHeight).toBeDefined();
    expect(typeof result.value.lastValidBlockHeight).toBe('number');
    expect(result.value.lastValidBlockHeight).toBeGreaterThan(0);
  }, 10000); // 10 second timeout

  it('should get current slot number', async () => {
    const slot = await rpc.getSlot();

    expect(slot).toBeDefined();
    expect(typeof slot).toBe('number');
    expect(slot).toBeGreaterThan(0);
    // Devnet slots should be in the millions
    expect(slot).toBeGreaterThan(1000000);
  }, 10000);

  it('should get cluster version', async () => {
    const version = await rpc.getVersion();

    expect(version).toBeDefined();
    expect(version['solana-core']).toBeDefined();
    expect(typeof version['solana-core']).toBe('string');
    // Version should be in semver format (e.g., "1.17.5")
    expect(version['solana-core']).toMatch(/^\d+\.\d+\.\d+/);
    expect(version['feature-set']).toBeDefined();
  }, 10000);

  it('should get balance of System Program', async () => {
    const systemProgramAddress = address(SYSTEM_PROGRAM_ID);
    const result = await rpc.getBalance(systemProgramAddress);

    expect(result).toBeDefined();
    expect(result.value).toBeDefined();
    expect(typeof result.value).toBe('number');
    // System Program should have a balance (typically 1 lamport on devnet)
    expect(result.value).toBeGreaterThanOrEqual(1);
  }, 10000);

  it('should get minimum balance for rent exemption', async () => {
    const minBalance = await rpc.getMinimumBalanceForRentExemption(0);

    expect(minBalance).toBeDefined();
    expect(typeof minBalance).toBe('number');
    // For 0 bytes, rent exemption should be 890880 lamports
    expect(minBalance).toBe(890880);

    // Test with different data sizes
    const minBalance128 = await rpc.getMinimumBalanceForRentExemption(128);
    expect(minBalance128).toBeGreaterThan(minBalance);

    const minBalance256 = await rpc.getMinimumBalanceForRentExemption(256);
    expect(minBalance256).toBeGreaterThan(minBalance128);
  }, 10000);

  it('should handle multiple RPC calls in parallel', async () => {
    // Test that we can make multiple concurrent requests
    const [slot, blockhash, version] = await Promise.all([
      rpc.getSlot(),
      rpc.getLatestBlockhash(),
      rpc.getVersion(),
    ]);

    expect(slot).toBeDefined();
    expect(blockhash).toBeDefined();
    expect(version).toBeDefined();
  }, 10000);

  it('should get block height', async () => {
    const blockHeight = await rpc.getBlockHeight();

    expect(blockHeight).toBeDefined();
    expect(typeof blockHeight).toBe('number');
    expect(blockHeight).toBeGreaterThan(0);
    // Should be less than or equal to the slot number
    const slot = await rpc.getSlot();
    // Block height should be less than or equal to slot
    expect(blockHeight).toBeLessThanOrEqual(slot);
  }, 10000);

  it('should get health status', async () => {
    const health = await rpc.getHealth();

    expect(health).toBeDefined();
    expect(health).toBe('ok');
  }, 10000);

  it('should fetch supply information', async () => {
    const supply = await rpc.getSupply();

    expect(supply).toBeDefined();
    expect(supply.value).toBeDefined();
    expect(supply.value.total).toBeDefined();
    expect(typeof supply.value.total).toBe('number');
    expect(supply.value.total).toBeGreaterThan(0);
    expect(supply.value.circulating).toBeDefined();
    expect(typeof supply.value.circulating).toBe('number');
    expect(supply.value.nonCirculating).toBeDefined();
    expect(typeof supply.value.nonCirculating).toBe('number');
  }, 10000);

  it('should handle commitment levels', async () => {
    // Test different commitment levels
    const processedSlot = await rpc.getSlot({ commitment: 'processed' });
    const confirmedSlot = await rpc.getSlot({ commitment: 'confirmed' });
    const finalizedSlot = await rpc.getSlot({ commitment: 'finalized' });

    expect(processedSlot).toBeDefined();
    expect(confirmedSlot).toBeDefined();
    expect(finalizedSlot).toBeDefined();

    // Processed should typically be >= confirmed >= finalized
    // But due to network timing, we allow small differences
    expect(Math.abs(processedSlot - confirmedSlot)).toBeLessThanOrEqual(5);
    expect(confirmedSlot).toBeGreaterThanOrEqual(finalizedSlot);
  }, 10000);
});
