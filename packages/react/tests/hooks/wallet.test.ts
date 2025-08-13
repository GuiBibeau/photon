import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useWallet, type UseWalletResult, type AvailableWallet } from '../../src/hooks/wallet';
import { WalletProvider } from '../../src/providers';
import type { Address } from '@photon/addresses';
import type { DetectedWallet, WalletProvider as WalletProviderInterface } from '../../src/types';
import { WalletReadyState } from '../../src/types';

// Mock the detector module
vi.mock('../../src/wallet/detector', () => ({
  detectWallets: vi.fn().mockResolvedValue([]),
  detectMobilePlatform: vi.fn().mockReturnValue({
    platform: 'desktop',
    inWalletBrowser: false,
    capabilities: null,
  }),
}));

// Mock the connection module
vi.mock('../../src/wallet/connection', () => ({
  WalletConnectionManager: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    getWallet: vi.fn(),
    getWallets: vi.fn().mockReturnValue([]),
    registerWallet: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    autoConnect: vi.fn(),
  })),
  createWalletConnectionManager: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    getWallet: vi.fn(),
    getWallets: vi.fn().mockReturnValue([]),
    registerWallet: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    autoConnect: vi.fn(),
  })),
}));

describe('useWallet hook', () => {
  const mockPublicKey = '11111111111111111111111111111111' as Address;

  const createMockWallet = (name: string, isInstalled = true): DetectedWallet => ({
    provider: {
      name,
      publicKey: null,
      connected: false,
      connecting: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signTransaction: vi.fn(),
      signAllTransactions: vi.fn(),
      signMessage: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as WalletProviderInterface,
    metadata: {
      name,
      icon: `https://example.com/${name}.svg`,
      url: `https://${name}.app`,
      readyState: isInstalled ? WalletReadyState.Installed : WalletReadyState.NotDetected,
      isInstalled,
      isMobile: false,
    },
    detectionMethod: 'window-injection',
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(WalletProvider, { autoConnect: false }, children);

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should return initial state when not connected', () => {
      const { result } = renderHook(() => useWallet(), { wrapper });

      expect(result.current.connected).toBe(false);
      expect(result.current.connecting).toBe(false);
      expect(result.current.publicKey).toBe(null);
      expect(result.current.wallet).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.availableWallets).toEqual([]);
    });

    it('should detect platform correctly', () => {
      const { result } = renderHook(() => useWallet(), { wrapper });

      expect(result.current.isMobile).toBe(false);
      expect(result.current.platform).toBe('desktop');
    });
  });

  describe('Wallet Detection', () => {
    it('should process detected wallets into available wallets', async () => {
      const mockWallets = [
        createMockWallet('Phantom', true),
        createMockWallet('Solflare', true),
        createMockWallet('Backpack', false),
      ];

      const { detectWallets } = await import('../../src/wallet/detector');
      vi.mocked(detectWallets).mockResolvedValue(mockWallets);

      const { result, rerender } = renderHook(() => useWallet(), { wrapper });

      // Wait for wallet detection
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      rerender();

      const availableWallets = result.current.availableWallets;
      expect(availableWallets).toHaveLength(3);

      // Check Phantom wallet
      const phantom = availableWallets.find((w) => w.name === 'Phantom');
      expect(phantom).toBeDefined();
      expect(phantom?.isInstalled).toBe(true);
      expect(phantom?.isCurrentPlatform).toBe(true);

      // Check Backpack wallet (not installed)
      const backpack = availableWallets.find((w) => w.name === 'Backpack');
      expect(backpack).toBeDefined();
      expect(backpack?.isInstalled).toBe(false);
      expect(backpack?.isCurrentPlatform).toBe(false);
    });

    it('should refresh wallets on demand', async () => {
      const { detectWallets } = await import('../../src/wallet/detector');
      const mockWallets = [createMockWallet('Phantom', true)];
      vi.mocked(detectWallets).mockResolvedValue(mockWallets);

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.refreshWallets();
      });

      expect(detectWallets).toHaveBeenCalled();
    });
  });

  describe('Wallet Selection', () => {
    it('should select a wallet', async () => {
      const mockWallets = [createMockWallet('Phantom', true)];
      const { detectWallets } = await import('../../src/wallet/detector');
      vi.mocked(detectWallets).mockResolvedValue(mockWallets);

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      act(() => {
        result.current.select('Phantom');
      });

      // The wallet selection should be handled by the context
      expect(result.current.error).toBe(null);
    });
  });

  describe('Connection Management', () => {
    it('should connect to a wallet', async () => {
      const mockWallets = [createMockWallet('Phantom', true)];
      const { detectWallets } = await import('../../src/wallet/detector');
      vi.mocked(detectWallets).mockResolvedValue(mockWallets);

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Mock successful connection
      const { createWalletConnectionManager } = await import('../../src/wallet/connection');
      const mockManager = vi.mocked(createWalletConnectionManager).mock.results[0]?.value;
      vi.mocked(mockManager.connect).mockResolvedValue(undefined);

      await act(async () => {
        await result.current.connect('Phantom');
      });

      expect(mockManager.connect).toHaveBeenCalledWith('Phantom', undefined);
    });

    it('should disconnect from a wallet', async () => {
      const { result } = renderHook(() => useWallet(), { wrapper });

      const { createWalletConnectionManager } = await import('../../src/wallet/connection');
      const mockManager = vi.mocked(createWalletConnectionManager).mock.results[0]?.value;
      vi.mocked(mockManager.disconnect).mockResolvedValue(undefined);

      await act(async () => {
        await result.current.disconnect();
      });

      expect(mockManager.disconnect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const mockWallets = [createMockWallet('Phantom', true)];
      const { detectWallets } = await import('../../src/wallet/detector');
      vi.mocked(detectWallets).mockResolvedValue(mockWallets);

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const { createWalletConnectionManager } = await import('../../src/wallet/connection');
      const mockManager = vi.mocked(createWalletConnectionManager).mock.results[0]?.value;
      const connectionError = new Error('User rejected connection');
      vi.mocked(mockManager.connect).mockRejectedValue(connectionError);

      await expect(
        act(async () => {
          await result.current.connect('Phantom');
        }),
      ).rejects.toThrow('User rejected connection');

      expect(result.current.error).toEqual(connectionError);
    });
  });

  describe('Auto-connect', () => {
    it('should auto-connect to saved wallet', async () => {
      // Set up saved wallet in localStorage
      localStorage.setItem('photon_wallet_name', 'Phantom');
      localStorage.setItem('photon_wallet_timestamp', Date.now().toString());

      const mockWallets = [createMockWallet('Phantom', true)];
      const { detectWallets } = await import('../../src/wallet/detector');
      vi.mocked(detectWallets).mockResolvedValue(mockWallets);

      const { result } = renderHook(() => useWallet(), {
        wrapper: ({ children }) =>
          React.createElement(WalletProvider, { autoConnect: true }, children),
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      await act(async () => {
        await result.current.autoConnect();
      });

      // Should attempt to connect with onlyIfTrusted
      const { createWalletConnectionManager } = await import('../../src/wallet/connection');
      const mockManager = vi.mocked(createWalletConnectionManager).mock.results[0]?.value;
      expect(mockManager.connect).toHaveBeenCalledWith('Phantom', { onlyIfTrusted: true });
    });

    it('should not auto-connect to expired saved wallet', async () => {
      // Set up expired saved wallet in localStorage
      const expiredTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      localStorage.setItem('photon_wallet_name', 'Phantom');
      localStorage.setItem('photon_wallet_timestamp', expiredTimestamp.toString());

      const mockWallets = [createMockWallet('Phantom', true)];
      const { detectWallets } = await import('../../src/wallet/detector');
      vi.mocked(detectWallets).mockResolvedValue(mockWallets);

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await act(async () => {
        await result.current.autoConnect();
      });

      // Should not attempt to connect
      const { createWalletConnectionManager } = await import('../../src/wallet/connection');
      const mockManager = vi.mocked(createWalletConnectionManager).mock.results[0]?.value;
      expect(mockManager.connect).not.toHaveBeenCalled();
    });

    it('should save wallet selection on successful connection', async () => {
      const mockWallets = [createMockWallet('Phantom', true)];
      const { detectWallets } = await import('../../src/wallet/detector');
      vi.mocked(detectWallets).mockResolvedValue(mockWallets);

      const { rerender } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Simulate successful connection
      const { createWalletConnectionManager } = await import('../../src/wallet/connection');
      const mockManager = vi.mocked(createWalletConnectionManager).mock.results[0]?.value;

      // Trigger connection event
      act(() => {
        const connectHandler = vi
          .mocked(mockManager.on)
          .mock.calls.find((call) => call[0] === 'connect')?.[1];
        if (connectHandler) {
          connectHandler({ wallet: 'Phantom', publicKey: mockPublicKey });
        }
      });

      rerender();

      // Check localStorage
      expect(localStorage.getItem('photon_wallet_name')).toBe('Phantom');
      expect(localStorage.getItem('photon_wallet_timestamp')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should clear error', async () => {
      const { result } = renderHook(() => useWallet(), { wrapper });

      // Set an error
      const { createWalletConnectionManager } = await import('../../src/wallet/connection');
      const mockManager = vi.mocked(createWalletConnectionManager).mock.results[0]?.value;
      const connectionError = new Error('Test error');
      vi.mocked(mockManager.connect).mockRejectedValue(connectionError);

      await expect(
        act(async () => {
          await result.current.connect('NonExistent');
        }),
      ).rejects.toThrow();

      expect(result.current.error).toBeTruthy();

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('Platform Detection', () => {
    it('should detect mobile platform', async () => {
      const { detectMobilePlatform } = await import('../../src/wallet/detector');
      vi.mocked(detectMobilePlatform).mockReturnValue({
        platform: 'ios',
        inWalletBrowser: false,
        capabilities: {
          noLocalWebSocket: true,
          noMWA: true,
          backgroundDrops: true,
          requiresUniversalLinks: false,
        },
      });

      const { result } = renderHook(() => useWallet(), { wrapper });

      expect(result.current.isMobile).toBe(true);
      expect(result.current.platform).toBe('ios');
    });

    it('should filter wallets based on platform', async () => {
      const { detectMobilePlatform } = await import('../../src/wallet/detector');
      vi.mocked(detectMobilePlatform).mockReturnValue({
        platform: 'ios',
        inWalletBrowser: false,
        capabilities: {
          noLocalWebSocket: true,
          noMWA: true,
          backgroundDrops: true,
          requiresUniversalLinks: false,
        },
      });

      const mockWallets = [
        createMockWallet('Phantom', true), // Desktop wallet
        {
          ...createMockWallet('PhantomMobile', false),
          metadata: {
            ...createMockWallet('PhantomMobile', false).metadata,
            isMobile: true,
          },
        },
      ];

      const { detectWallets } = await import('../../src/wallet/detector');
      vi.mocked(detectWallets).mockResolvedValue(mockWallets);

      const { result, rerender } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      rerender();

      const availableWallets = result.current.availableWallets;

      // On mobile, only mobile wallets should be marked as current platform
      const phantomDesktop = availableWallets.find((w) => w.name === 'Phantom');
      expect(phantomDesktop?.isCurrentPlatform).toBe(false);

      const phantomMobile = availableWallets.find((w) => w.name === 'PhantomMobile');
      expect(phantomMobile?.isCurrentPlatform).toBe(true);
    });
  });

  describe('TypeScript Support', () => {
    it('should have correct type for hook result', () => {
      const { result } = renderHook(() => useWallet(), { wrapper });
      const hookResult: UseWalletResult = result.current;

      // Type checks
      expect(hookResult).toHaveProperty('connected');
      expect(hookResult).toHaveProperty('connecting');
      expect(hookResult).toHaveProperty('publicKey');
      expect(hookResult).toHaveProperty('wallet');
      expect(hookResult).toHaveProperty('error');
      expect(hookResult).toHaveProperty('availableWallets');
      expect(hookResult).toHaveProperty('connect');
      expect(hookResult).toHaveProperty('disconnect');
      expect(hookResult).toHaveProperty('select');
      expect(hookResult).toHaveProperty('autoConnect');
    });

    it('should have correct type for available wallets', () => {
      const { result } = renderHook(() => useWallet(), { wrapper });
      const availableWallets: AvailableWallet[] = result.current.availableWallets;

      expect(Array.isArray(availableWallets)).toBe(true);
    });
  });
});
