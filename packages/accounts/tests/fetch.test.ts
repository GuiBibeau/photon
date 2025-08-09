import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAccount,
  getAccountRaw,
  getMultipleAccounts,
  getMultipleAccountsRaw,
} from '../src/fetch';
import { u64, struct, publicKey, u8 } from '@photon/codecs';
import { address } from '@photon/addresses';
import type { RpcClient } from '@photon/rpc';
import type { Address } from '@photon/addresses';

// Mock RPC client
const createMockRpc = () =>
  ({
    getAccountInfo: vi.fn(),
    getMultipleAccounts: vi.fn(),
  }) as unknown as RpcClient;

// Test codec for a simple token account structure
const tokenAccountCodec = struct({
  mint: publicKey,
  owner: publicKey,
  amount: u64,
  delegateOption: u8,
  delegate: publicKey,
  state: u8,
  isNativeOption: u8,
  isNative: u64,
  delegatedAmount: u64,
  closeAuthorityOption: u8,
  closeAuthority: publicKey,
});

describe('getAccount', () => {
  let mockRpc: RpcClient;
  const testAddress = address('11111111111111111111111111111111');

  beforeEach(() => {
    mockRpc = createMockRpc();
  });

  it('should fetch and decode an account successfully', async () => {
    // Create test data
    const testData = new Uint8Array(165); // Token account size
    testData.fill(0);

    // Set some test values
    testData[64] = 100; // amount (100 tokens at position 64)

    // Convert to base64
    const base64Data = btoa(String.fromCharCode(...testData));

    // Mock RPC response
    (mockRpc.getAccountInfo as any).mockResolvedValue({
      value: {
        data: base64Data,
        owner: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        lamports: 2039280n,
        executable: false,
        rentEpoch: 361n,
      },
      context: { slot: 100 },
    });

    // Fetch account
    const account = await getAccount(mockRpc, testAddress, tokenAccountCodec);

    expect(account).not.toBeNull();
    expect(account?.address).toBe(testAddress);
    expect(account?.info.lamports).toBe(2039280n);
    expect(account?.info.executable).toBe(false);
    expect(account?.info.size).toBe(165);
  });

  it('should return null for non-existent account', async () => {
    // Mock RPC response for non-existent account
    (mockRpc.getAccountInfo as any).mockResolvedValue({
      value: null,
      context: { slot: 100 },
    });

    const account = await getAccount(mockRpc, testAddress, tokenAccountCodec);

    expect(account).toBeNull();
  });

  it('should handle base64 array format', async () => {
    const testData = new Uint8Array(165);
    testData.fill(0);
    const base64Data = btoa(String.fromCharCode(...testData));

    // Mock RPC response with array format
    (mockRpc.getAccountInfo as any).mockResolvedValue({
      value: {
        data: [base64Data, 'base64'],
        owner: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        lamports: 2039280n,
        executable: false,
        rentEpoch: 361n,
      },
      context: { slot: 100 },
    });

    const account = await getAccount(mockRpc, testAddress, tokenAccountCodec);

    expect(account).not.toBeNull();
    expect(account?.info.size).toBe(165);
  });

  it('should pass commitment options to RPC', async () => {
    (mockRpc.getAccountInfo as any).mockResolvedValue({
      value: null,
      context: { slot: 100 },
    });

    await getAccount(mockRpc, testAddress, tokenAccountCodec, {
      commitment: 'finalized',
      minContextSlot: 50,
    });

    expect(mockRpc.getAccountInfo).toHaveBeenCalledWith(testAddress, {
      commitment: 'finalized',
      encoding: 'base64',
      minContextSlot: 50,
    });
  });

  it('should throw error for unsupported encoding', async () => {
    // Mock RPC response with unsupported encoding
    (mockRpc.getAccountInfo as any).mockResolvedValue({
      value: {
        data: ['some-data', 'unsupported-encoding'],
        owner: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        lamports: 2039280n,
        executable: false,
        rentEpoch: 361n,
      },
      context: { slot: 100 },
    });

    await expect(getAccount(mockRpc, testAddress, tokenAccountCodec)).rejects.toThrow(
      'Unsupported account data encoding',
    );
  });
});

describe('getAccountRaw', () => {
  let mockRpc: RpcClient;
  const testAddress = address('11111111111111111111111111111111');

  beforeEach(() => {
    mockRpc = createMockRpc();
  });

  it('should fetch account with raw bytes', async () => {
    const testData = new Uint8Array([1, 2, 3, 4, 5]);
    const base64Data = btoa(String.fromCharCode(...testData));

    (mockRpc.getAccountInfo as any).mockResolvedValue({
      value: {
        data: base64Data,
        owner: address('11111111111111111111111111111111'),
        lamports: 1000n,
        executable: false,
        rentEpoch: 361n,
      },
      context: { slot: 100 },
    });

    const account = await getAccountRaw(mockRpc, testAddress);

    expect(account).not.toBeNull();
    expect(account?.info.data).toBeInstanceOf(Uint8Array);
    expect(Array.from(account?.info.data ?? [])).toEqual([1, 2, 3, 4, 5]);
    expect(account?.info.size).toBe(5);
  });

  it('should return null for non-existent account', async () => {
    (mockRpc.getAccountInfo as any).mockResolvedValue({
      value: null,
      context: { slot: 100 },
    });

    const account = await getAccountRaw(mockRpc, testAddress);

    expect(account).toBeNull();
  });
});

describe('getMultipleAccounts', () => {
  let mockRpc: RpcClient;
  const testAddresses = [
    address('11111111111111111111111111111111'),
    address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    address('So11111111111111111111111111111111111111112'),
  ];

  beforeEach(() => {
    mockRpc = createMockRpc();
  });

  it('should fetch and decode multiple accounts', async () => {
    const testData1 = new Uint8Array(165);
    testData1.fill(1);
    const testData2 = new Uint8Array(165);
    testData2.fill(2);

    const base64Data1 = btoa(String.fromCharCode(...testData1));
    const base64Data2 = btoa(String.fromCharCode(...testData2));

    (mockRpc.getMultipleAccounts as any).mockResolvedValue({
      value: [
        {
          data: base64Data1,
          owner: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          lamports: 1000n,
          executable: false,
          rentEpoch: 361n,
        },
        null, // Second account doesn't exist
        {
          data: base64Data2,
          owner: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          lamports: 2000n,
          executable: false,
          rentEpoch: 361n,
        },
      ],
      context: { slot: 100 },
    });

    const accounts = await getMultipleAccounts(mockRpc, testAddresses, tokenAccountCodec);

    expect(accounts).toHaveLength(3);
    expect(accounts[0]).not.toBeNull();
    expect(accounts[0]?.address).toBe(testAddresses[0]);
    expect(accounts[0]?.info.lamports).toBe(1000n);

    expect(accounts[1]).toBeNull();

    expect(accounts[2]).not.toBeNull();
    expect(accounts[2]?.address).toBe(testAddresses[2]);
    expect(accounts[2]?.info.lamports).toBe(2000n);
  });

  it('should handle batching for large address lists', async () => {
    // Create 250 addresses
    const manyAddresses: Address[] = [];
    for (let i = 0; i < 250; i++) {
      manyAddresses.push(address('11111111111111111111111111111111'));
    }

    // Mock response for each batch
    (mockRpc.getMultipleAccounts as any).mockResolvedValue({
      value: new Array(100).fill(null),
      context: { slot: 100 },
    });

    const accounts = await getMultipleAccounts(mockRpc, manyAddresses, tokenAccountCodec, {
      batchSize: 100,
    });

    // Should make 3 RPC calls (100 + 100 + 50)
    expect(mockRpc.getMultipleAccounts).toHaveBeenCalledTimes(3);
    expect(accounts).toHaveLength(250);
  });

  it('should pass options to RPC calls', async () => {
    (mockRpc.getMultipleAccounts as any).mockResolvedValue({
      value: [null, null, null],
      context: { slot: 100 },
    });

    await getMultipleAccounts(mockRpc, testAddresses, tokenAccountCodec, {
      commitment: 'confirmed',
      minContextSlot: 75,
      batchSize: 10,
    });

    expect(mockRpc.getMultipleAccounts).toHaveBeenCalledWith(testAddresses, {
      commitment: 'confirmed',
      encoding: 'base64',
      minContextSlot: 75,
    });
  });
});

describe('getMultipleAccountsRaw', () => {
  let mockRpc: RpcClient;
  const testAddresses = [
    address('11111111111111111111111111111111'),
    address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  ];

  beforeEach(() => {
    mockRpc = createMockRpc();
  });

  it('should fetch multiple accounts with raw bytes', async () => {
    const testData1 = new Uint8Array([1, 2, 3]);
    const testData2 = new Uint8Array([4, 5, 6]);

    const base64Data1 = btoa(String.fromCharCode(...testData1));
    const base64Data2 = btoa(String.fromCharCode(...testData2));

    (mockRpc.getMultipleAccounts as any).mockResolvedValue({
      value: [
        {
          data: base64Data1,
          owner: address('11111111111111111111111111111111'),
          lamports: 1000n,
          executable: false,
          rentEpoch: 361n,
        },
        {
          data: base64Data2,
          owner: address('11111111111111111111111111111111'),
          lamports: 2000n,
          executable: true,
          rentEpoch: 362n,
        },
      ],
      context: { slot: 100 },
    });

    const accounts = await getMultipleAccountsRaw(mockRpc, testAddresses);

    expect(accounts).toHaveLength(2);
    expect(accounts[0]?.info.data).toBeInstanceOf(Uint8Array);
    expect(Array.from(accounts[0]?.info.data ?? [])).toEqual([1, 2, 3]);
    expect(accounts[0]?.info.size).toBe(3);

    expect(accounts[1]?.info.data).toBeInstanceOf(Uint8Array);
    expect(Array.from(accounts[1]?.info.data ?? [])).toEqual([4, 5, 6]);
    expect(accounts[1]?.info.executable).toBe(true);
  });

  it('should handle mixed null and existing accounts', async () => {
    const testData = new Uint8Array([7, 8, 9]);
    const base64Data = btoa(String.fromCharCode(...testData));

    (mockRpc.getMultipleAccounts as any).mockResolvedValue({
      value: [
        null,
        {
          data: base64Data,
          owner: address('11111111111111111111111111111111'),
          lamports: 3000n,
          executable: false,
          rentEpoch: 363n,
        },
      ],
      context: { slot: 100 },
    });

    const accounts = await getMultipleAccountsRaw(mockRpc, testAddresses);

    expect(accounts).toHaveLength(2);
    expect(accounts[0]).toBeNull();
    expect(accounts[1]).not.toBeNull();
    expect(Array.from(accounts[1]?.info.data ?? [])).toEqual([7, 8, 9]);
  });
});
