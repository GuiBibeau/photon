import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Address } from '@photon/addresses';
import type { RpcClient } from '@photon/rpc';
import { useBalance, useMultipleBalances } from '../../src/hooks/balance';

// Mock the RPC client
const mockRpc = {
  getBalance: vi.fn(),
} as unknown as RpcClient;

// Test address
const testAddress = 'So11111111111111111111111111111111111111112' as Address;
const testAddress2 = 'So11111111111111111111111111111111111111113' as Address;

// Mock the useWalletContext hook
vi.mock('../../src/providers', () => ({
  useWalletContext: vi.fn(),
  WalletProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Import the mocked hook
import { useWalletContext } from '../../src/providers';

// Helper to set up mock context
function setupMockContext(props: {
  publicKey?: Address;
  rpcEndpoint?: string;
  commitment?: 'processed' | 'confirmed' | 'finalized';
}) {
  (useWalletContext as any).mockReturnValue({
    wallets: [],
    wallet: null,
    publicKey: props.publicKey || null,
    connected: !!props.publicKey,
    connecting: false,
    disconnecting: false,
    autoConnect: false,
    error: null,
    rpc: mockRpc,
    rpcEndpoint: props.rpcEndpoint || 'https://api.mainnet-beta.solana.com',
    commitment: props.commitment || 'confirmed',
    select: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    refreshWallets: vi.fn(),
  });
}

describe('useBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return null balance when no address is provided and wallet not connected', () => {
    setupMockContext({});
    const { result } = renderHook(() => useBalance());

    expect(result.current.balance).toBeNull();
    expect(result.current.lamports).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdate).toBeNull();
  });

  it('should fetch balance for connected wallet', async () => {
    const mockBalance = 1500000000n; // 1.5 SOL in lamports
    mockRpc.getBalance.mockResolvedValue({ value: mockBalance });

    setupMockContext({ publicKey: testAddress });
    const { result } = renderHook(() => useBalance());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for balance to be fetched
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.balance).toBe(1.5);
    expect(result.current.lamports).toBe(mockBalance);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdate).toBeInstanceOf(Date);
    expect(mockRpc.getBalance).toHaveBeenCalledWith(testAddress, { commitment: 'confirmed' });
  });

  it('should fetch balance for specific address', async () => {
    const mockBalance = 2500000000n; // 2.5 SOL
    mockRpc.getBalance.mockResolvedValue({ value: mockBalance });

    setupMockContext({});
    const { result } = renderHook(() => useBalance(testAddress));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.balance).toBe(2.5);
    expect(result.current.lamports).toBe(mockBalance);
    expect(mockRpc.getBalance).toHaveBeenCalledWith(testAddress, { commitment: 'confirmed' });
  });

  it('should handle RPC errors gracefully', async () => {
    const mockError = new Error('RPC request failed');
    mockRpc.getBalance.mockRejectedValue(mockError);

    setupMockContext({ publicKey: testAddress });
    const { result } = renderHook(() => useBalance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.balance).toBeNull();
    expect(result.current.lamports).toBeNull();
    expect(result.current.error).toEqual(mockError);
  });

  it('should refetch balance when refetch is called', async () => {
    const mockBalance1 = 1000000000n; // 1 SOL
    const mockBalance2 = 2000000000n; // 2 SOL
    mockRpc.getBalance.mockResolvedValueOnce({ value: mockBalance1 });

    setupMockContext({ publicKey: testAddress });
    const { result } = renderHook(() => useBalance());

    await waitFor(() => {
      expect(result.current.balance).toBe(1);
    });

    // Update mock for second call
    mockRpc.getBalance.mockResolvedValueOnce({ value: mockBalance2 });

    // Call refetch
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.balance).toBe(2);
    });

    expect(mockRpc.getBalance).toHaveBeenCalledTimes(2);
  });

  it('should auto-refresh at specified interval', async () => {
    const mockBalance1 = 1000000000n;
    const mockBalance2 = 2000000000n;
    mockRpc.getBalance
      .mockResolvedValueOnce({ value: mockBalance1 })
      .mockResolvedValueOnce({ value: mockBalance2 });

    setupMockContext({ publicKey: testAddress });
    const { result } = renderHook(() => useBalance(undefined, { refreshInterval: 5000 }));

    await waitFor(() => {
      expect(result.current.balance).toBe(1);
    });

    // Advance time by 5 seconds
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(result.current.balance).toBe(2);
    });

    expect(mockRpc.getBalance).toHaveBeenCalledTimes(2);
  });

  it('should clear interval on unmount', async () => {
    const mockBalance = 1000000000n;
    mockRpc.getBalance.mockResolvedValue({ value: mockBalance });

    setupMockContext({ publicKey: testAddress });
    const { result, unmount } = renderHook(() => useBalance(undefined, { refreshInterval: 5000 }));

    await waitFor(() => {
      expect(result.current.balance).toBe(1);
    });

    unmount();

    // Advance time and verify no additional calls
    vi.advanceTimersByTime(10000);

    // Should still only have been called once
    expect(mockRpc.getBalance).toHaveBeenCalledTimes(1);
  });

  it('should reset state when address changes', async () => {
    const mockBalance1 = 1000000000n;
    const mockBalance2 = 2000000000n;
    mockRpc.getBalance
      .mockResolvedValueOnce({ value: mockBalance1 })
      .mockResolvedValueOnce({ value: mockBalance2 });

    setupMockContext({});
    const { result, rerender } = renderHook(
      ({ address }: { address?: Address }) => useBalance(address),
      {
        initialProps: { address: testAddress },
      },
    );

    await waitFor(() => {
      expect(result.current.balance).toBe(1);
    });

    // Change address
    rerender({ address: testAddress2 });

    // State should reset immediately
    expect(result.current.balance).toBeNull();
    expect(result.current.lamports).toBeNull();
    expect(result.current.lastUpdate).toBeNull();

    await waitFor(() => {
      expect(result.current.balance).toBe(2);
    });

    expect(mockRpc.getBalance).toHaveBeenCalledWith(testAddress, { commitment: 'confirmed' });
    expect(mockRpc.getBalance).toHaveBeenCalledWith(testAddress2, { commitment: 'confirmed' });
  });

  it('should use custom commitment level', async () => {
    const mockBalance = 1000000000n;
    mockRpc.getBalance.mockResolvedValue({ value: mockBalance });

    setupMockContext({ publicKey: testAddress });
    const { result } = renderHook(() => useBalance(undefined, { commitment: 'finalized' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockRpc.getBalance).toHaveBeenCalledWith(testAddress, { commitment: 'finalized' });
  });

  it('should handle zero balance correctly', async () => {
    mockRpc.getBalance.mockResolvedValue({ value: 0n });

    setupMockContext({ publicKey: testAddress });
    const { result } = renderHook(() => useBalance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.balance).toBe(0);
    expect(result.current.lamports).toBe(0n);
  });

  it('should handle large balances correctly', async () => {
    const mockBalance = 123456789012345678n; // Large amount in lamports
    mockRpc.getBalance.mockResolvedValue({ value: mockBalance });

    setupMockContext({ publicKey: testAddress });
    const { result } = renderHook(() => useBalance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should convert correctly to SOL (rounded to 9 decimal places)
    // Using parseFloat to avoid ESLint precision error
    const expectedBalance = parseFloat('123456789.012345678');
    expect(result.current.balance).toBeCloseTo(expectedBalance, 9);
    expect(result.current.lamports).toBe(mockBalance);
  });
});

describe('useMultipleBalances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should fetch balances for multiple addresses', async () => {
    const addresses = [testAddress, testAddress2];
    const mockBalance1 = 1000000000n; // 1 SOL
    const mockBalance2 = 2000000000n; // 2 SOL

    mockRpc.getBalance
      .mockResolvedValueOnce({ value: mockBalance1 })
      .mockResolvedValueOnce({ value: mockBalance2 });

    setupMockContext({});
    const { result } = renderHook(() => useMultipleBalances(addresses));

    await waitFor(() => {
      expect(result.current.size).toBe(2);
    });

    expect(result.current.get(testAddress)).toEqual({
      balance: 1,
      lamports: mockBalance1,
    });
    expect(result.current.get(testAddress2)).toEqual({
      balance: 2,
      lamports: mockBalance2,
    });
  });

  it('should handle empty address array', async () => {
    setupMockContext({});
    const { result } = renderHook(() => useMultipleBalances([]));

    expect(result.current.size).toBe(0);
    expect(mockRpc.getBalance).not.toHaveBeenCalled();
  });

  it('should handle errors for individual addresses', async () => {
    const addresses = [testAddress, testAddress2];
    const mockBalance1 = 1000000000n;

    mockRpc.getBalance
      .mockResolvedValueOnce({ value: mockBalance1 })
      .mockRejectedValueOnce(new Error('Failed to fetch'));

    setupMockContext({});
    const { result } = renderHook(() => useMultipleBalances(addresses));

    await waitFor(() => {
      expect(result.current.size).toBe(2);
    });

    expect(result.current.get(testAddress)).toEqual({
      balance: 1,
      lamports: mockBalance1,
    });
    // Failed address should default to 0
    expect(result.current.get(testAddress2)).toEqual({
      balance: 0,
      lamports: 0n,
    });
  });

  it('should auto-refresh multiple balances at interval', async () => {
    const addresses = [testAddress];
    const mockBalance1 = 1000000000n;
    const mockBalance2 = 2000000000n;

    mockRpc.getBalance
      .mockResolvedValueOnce({ value: mockBalance1 })
      .mockResolvedValueOnce({ value: mockBalance2 });

    setupMockContext({});
    const { result } = renderHook(() => useMultipleBalances(addresses, { refreshInterval: 5000 }));

    await waitFor(() => {
      expect(result.current.get(testAddress)?.balance).toBe(1);
    });

    // Advance time
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(result.current.get(testAddress)?.balance).toBe(2);
    });

    expect(mockRpc.getBalance).toHaveBeenCalledTimes(2);
  });

  it('should use custom commitment level for multiple balances', async () => {
    const addresses = [testAddress];
    mockRpc.getBalance.mockResolvedValue({ value: 1000000000n });

    setupMockContext({});
    const { result } = renderHook(() =>
      useMultipleBalances(addresses, { commitment: 'processed' }),
    );

    await waitFor(() => {
      expect(result.current.size).toBe(1);
    });

    expect(mockRpc.getBalance).toHaveBeenCalledWith(testAddress, { commitment: 'processed' });
  });
});
