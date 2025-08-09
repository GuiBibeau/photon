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

  it('should handle direct string base64 data format', async () => {
    const testData = new Uint8Array(165);
    testData.fill(0);
    testData[64] = 50; // amount
    const base64Data = btoa(String.fromCharCode(...testData));

    // Mock RPC response with direct string format (not array)
    (mockRpc.getAccountInfo as any).mockResolvedValue({
      value: {
        data: base64Data, // Direct string format
        owner: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        lamports: 3039280n,
        executable: false,
        rentEpoch: 362n,
      },
      context: { slot: 100 },
    });

    const account = await getAccount(mockRpc, testAddress, tokenAccountCodec);

    expect(account).not.toBeNull();
    expect(account?.info.size).toBe(165);
  });

  it('should throw error for unexpected data format', async () => {
    // Mock RPC response with invalid data format
    (mockRpc.getAccountInfo as any).mockResolvedValue({
      value: {
        data: 12345, // Invalid format - number
        owner: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        lamports: 4039280n,
        executable: false,
        rentEpoch: 363n,
      },
      context: { slot: 100 },
    });

    await expect(getAccount(mockRpc, testAddress, tokenAccountCodec)).rejects.toThrow(
      'Unexpected account data format',
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

  it('should handle string data format', async () => {
    const testData = new Uint8Array([15, 16, 17, 18, 19]);
    const base64Data = btoa(String.fromCharCode(...testData));

    (mockRpc.getAccountInfo as any).mockResolvedValue({
      value: {
        data: base64Data, // Direct string format
        owner: address('11111111111111111111111111111111'),
        lamports: 1500n,
        executable: true,
        rentEpoch: 362n,
      },
      context: { slot: 100 },
    });

    const account = await getAccountRaw(mockRpc, testAddress);

    expect(account).not.toBeNull();
    expect(account?.info.data).toBeInstanceOf(Uint8Array);
    expect(Array.from(account?.info.data ?? [])).toEqual([15, 16, 17, 18, 19]);
    expect(account?.info.executable).toBe(true);
  });

  it('should throw error for unsupported encoding in array format', async () => {
    (mockRpc.getAccountInfo as any).mockResolvedValue({
      value: {
        data: ['some-data', 'jsonParsed'],
        owner: address('11111111111111111111111111111111'),
        lamports: 2000n,
        executable: false,
        rentEpoch: 363n,
      },
      context: { slot: 100 },
    });

    await expect(getAccountRaw(mockRpc, testAddress)).rejects.toThrow(
      'Unsupported account data encoding: jsonParsed',
    );
  });

  it('should throw error for unexpected data format', async () => {
    (mockRpc.getAccountInfo as any).mockResolvedValue({
      value: {
        data: 12345, // Invalid format - number
        owner: address('11111111111111111111111111111111'),
        lamports: 2500n,
        executable: false,
        rentEpoch: 364n,
      },
      context: { slot: 100 },
    });

    await expect(getAccountRaw(mockRpc, testAddress)).rejects.toThrow(
      'Unexpected account data format',
    );
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

  it('should handle direct string base64 data format', async () => {
    const testData = new Uint8Array(165);
    testData.fill(3);
    const base64Data = btoa(String.fromCharCode(...testData));

    (mockRpc.getMultipleAccounts as any).mockResolvedValue({
      value: [
        {
          data: base64Data, // Direct string format
          owner: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          lamports: 3000n,
          executable: false,
          rentEpoch: 362n,
        },
        null,
        {
          data: base64Data,
          owner: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          lamports: 4000n,
          executable: false,
          rentEpoch: 363n,
        },
      ],
      context: { slot: 100 },
    });

    const accounts = await getMultipleAccounts(mockRpc, testAddresses, tokenAccountCodec);

    expect(accounts).toHaveLength(3);
    expect(accounts[0]).not.toBeNull();
    expect(accounts[0]?.info.size).toBe(165);
    expect(accounts[1]).toBeNull();
    expect(accounts[2]).not.toBeNull();
    expect(accounts[2]?.info.size).toBe(165);
  });

  it('should throw error for unexpected data format', async () => {
    (mockRpc.getMultipleAccounts as any).mockResolvedValue({
      value: [
        {
          data: { invalid: 'object' }, // Invalid format
          owner: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          lamports: 5000n,
          executable: false,
          rentEpoch: 364n,
        },
      ],
      context: { slot: 100 },
    });

    await expect(
      getMultipleAccounts(mockRpc, [testAddresses[0]], tokenAccountCodec),
    ).rejects.toThrow('Unexpected account data format');
  });

  it('should throw error for unsupported encoding in array format', async () => {
    (mockRpc.getMultipleAccounts as any).mockResolvedValue({
      value: [
        {
          data: ['some-data', 'hex'], // Unsupported encoding
          owner: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          lamports: 6000n,
          executable: false,
          rentEpoch: 365n,
        },
      ],
      context: { slot: 100 },
    });

    await expect(
      getMultipleAccounts(mockRpc, [testAddresses[0]], tokenAccountCodec),
    ).rejects.toThrow('Unsupported account data encoding: hex');
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

  it('should handle base64 string data format', async () => {
    const testData = new Uint8Array([10, 11, 12, 13]);
    const base64Data = btoa(String.fromCharCode(...testData));

    (mockRpc.getMultipleAccounts as any).mockResolvedValue({
      value: [
        {
          data: base64Data, // String format instead of array
          owner: address('11111111111111111111111111111111'),
          lamports: 4000n,
          executable: false,
          rentEpoch: 364n,
        },
        null,
      ],
      context: { slot: 100 },
    });

    const accounts = await getMultipleAccountsRaw(mockRpc, testAddresses);

    expect(accounts).toHaveLength(2);
    expect(accounts[0]).not.toBeNull();
    expect(Array.from(accounts[0]?.info.data ?? [])).toEqual([10, 11, 12, 13]);
    expect(accounts[1]).toBeNull();
  });

  it('should throw error for unsupported encoding in array format', async () => {
    (mockRpc.getMultipleAccounts as any).mockResolvedValue({
      value: [
        {
          data: ['some-data', 'unsupported-encoding'],
          owner: address('11111111111111111111111111111111'),
          lamports: 5000n,
          executable: false,
          rentEpoch: 365n,
        },
      ],
      context: { slot: 100 },
    });

    await expect(getMultipleAccountsRaw(mockRpc, [testAddresses[0]])).rejects.toThrow(
      'Unsupported account data encoding: unsupported-encoding',
    );
  });

  it('should throw error for unexpected data format', async () => {
    (mockRpc.getMultipleAccounts as any).mockResolvedValue({
      value: [
        {
          data: { unexpected: 'object' }, // Invalid format
          owner: address('11111111111111111111111111111111'),
          lamports: 6000n,
          executable: false,
          rentEpoch: 366n,
        },
      ],
      context: { slot: 100 },
    });

    await expect(getMultipleAccountsRaw(mockRpc, [testAddresses[0]])).rejects.toThrow(
      'Unexpected account data format',
    );
  });

  it('should handle options with only commitment set', async () => {
    const testData = new Uint8Array([20, 21, 22]);
    const base64Data = btoa(String.fromCharCode(...testData));

    (mockRpc.getMultipleAccounts as any).mockResolvedValue({
      value: [
        {
          data: base64Data,
          owner: address('11111111111111111111111111111111'),
          lamports: 7000n,
          executable: false,
          rentEpoch: 367n,
        },
      ],
      context: { slot: 100 },
    });

    const accounts = await getMultipleAccountsRaw(mockRpc, [testAddresses[0]], {
      commitment: 'finalized',
      // Note: minContextSlot is intentionally not set to test the undefined branch
    });

    expect(accounts).toHaveLength(1);
    expect(accounts[0]).not.toBeNull();
    expect(mockRpc.getMultipleAccounts).toHaveBeenCalledWith([testAddresses[0]], {
      encoding: 'base64',
      commitment: 'finalized',
    });
  });

  it('should handle options with only minContextSlot set', async () => {
    const testData = new Uint8Array([23, 24, 25]);
    const base64Data = btoa(String.fromCharCode(...testData));

    (mockRpc.getMultipleAccounts as any).mockResolvedValue({
      value: [
        {
          data: base64Data,
          owner: address('11111111111111111111111111111111'),
          lamports: 8000n,
          executable: false,
          rentEpoch: 368n,
        },
      ],
      context: { slot: 100 },
    });

    const accounts = await getMultipleAccountsRaw(mockRpc, [testAddresses[0]], {
      minContextSlot: 99,
      // Note: commitment is intentionally not set
    });

    expect(accounts).toHaveLength(1);
    expect(accounts[0]).not.toBeNull();
    expect(mockRpc.getMultipleAccounts).toHaveBeenCalledWith([testAddresses[0]], {
      encoding: 'base64',
      minContextSlot: 99,
    });
  });

  it('should handle options with no commitment or minContextSlot', async () => {
    const testData = new Uint8Array([26, 27, 28]);
    const base64Data = btoa(String.fromCharCode(...testData));

    (mockRpc.getMultipleAccounts as any).mockResolvedValue({
      value: [
        {
          data: base64Data,
          owner: address('11111111111111111111111111111111'),
          lamports: 9000n,
          executable: false,
          rentEpoch: 369n,
        },
      ],
      context: { slot: 100 },
    });

    const accounts = await getMultipleAccountsRaw(mockRpc, [testAddresses[0]], {
      batchSize: 50, // Only set batchSize
    });

    expect(accounts).toHaveLength(1);
    expect(accounts[0]).not.toBeNull();
    expect(mockRpc.getMultipleAccounts).toHaveBeenCalledWith([testAddresses[0]], {
      encoding: 'base64',
    });
  });
});
