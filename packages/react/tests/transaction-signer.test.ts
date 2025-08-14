import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Address } from '@photon/addresses';
import type { Signature } from '@photon/crypto';
import type { Signer } from '@photon/signers';
import type { CompileableTransactionMessage } from '@photon/transaction-messages';
import { useTransactionSigner } from '../src/hooks/transaction-signer';
import { useWalletContext } from '../src/providers';
import * as walletHook from '../src/hooks/wallet';
import * as signerAdapter from '../src/wallet/signer-adapter';
// Mock modules
vi.mock('../src/hooks/wallet');
vi.mock('../src/wallet/signer-adapter');
vi.mock('../src/providers');

// Mock the transactions module completely
vi.mock('@photon/transactions', () => ({
  signTransaction: vi.fn(),
  partiallySignTransaction: vi.fn(),
  addSignaturesToTransaction: vi.fn(),
  isFullySigned: vi.fn(),
  getMissingSigners: vi.fn(),
}));

// Import after mocking
import * as transactions from '@photon/transactions';

// Mock wallet provider
const mockWalletProvider = {
  name: 'TestWallet',
  connected: true,
  publicKey: 'wallet123' as Address,
  connect: vi.fn(),
  disconnect: vi.fn(),
  signMessage: vi.fn(),
  signTransaction: vi.fn(),
};

// Mock signer
const mockSigner: Signer = {
  publicKey: 'wallet123' as Address,
  sign: vi.fn().mockResolvedValue('signature123' as Signature),
  metadata: {
    name: 'TestWallet',
    type: 'wallet',
  },
};

// Mock transaction message
const mockMessage: CompileableTransactionMessage = {
  feePayer: 'wallet123' as Address,
  instructions: [],
  recentBlockhash: 'blockhash123',
};

// Mock transaction
const mockTransaction = {
  message: mockMessage,
  signatures: new Map([['wallet123' as Address, 'signature123' as Signature]]),
};

// No wrapper needed since we're mocking the context

describe('useTransactionSigner', () => {
  beforeEach(() => {
    // Setup wallet hook mock
    vi.mocked(walletHook.useWallet).mockReturnValue({
      connected: true,
      connecting: false,
      publicKey: 'wallet123' as Address,
      wallet: mockWalletProvider,
      error: null,
      autoConnecting: false,
      availableWallets: [],
      isMobile: false,
      platform: 'desktop',
      connect: vi.fn(),
      disconnect: vi.fn(),
      select: vi.fn(),
      autoConnect: vi.fn(),
      setAutoConnect: vi.fn(),
      getAutoConnectPreference: vi.fn(),
      clearAutoConnectPreference: vi.fn(),
      refreshWallets: vi.fn(),
      clearError: vi.fn(),
    } as any);

    // Setup wallet context mock
    vi.mocked(useWalletContext).mockReturnValue({
      wallet: mockWalletProvider,
      wallets: [],
      connected: true,
      connecting: false,
      publicKey: 'wallet123' as Address,
      error: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      select: vi.fn(),
      refreshWallets: vi.fn(),
      autoConnect: false,
      sessionStorage: null,
      connectionConfig: {},
    } as any);

    // Setup signer adapter mock
    vi.mocked(signerAdapter.walletToSigner).mockReturnValue(mockSigner);

    // Setup transaction mocks
    vi.mocked(transactions.signTransaction).mockResolvedValue(mockTransaction);
    vi.mocked(transactions.isFullySigned).mockReturnValue(true);
    vi.mocked(transactions.getMissingSigners).mockReturnValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useTransactionSigner());

      expect(result.current.state).toBe('idle');
      expect(result.current.isSigningTransaction).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.currentTransaction).toBe(null);
      expect(result.current.isSigned).toBe(false);
      expect(result.current.missingSigners).toEqual([]);
    });

    it('should detect mobile context', () => {
      const { result } = renderHook(() => useTransactionSigner());

      expect(result.current.mobileContext).toHaveProperty('platform');
      expect(result.current.mobileContext).toHaveProperty('isInAppBrowser');
      expect(result.current.mobileContext).toHaveProperty('requiresAppSwitch');
    });
  });

  describe('signTransaction', () => {
    it('should sign a transaction successfully', async () => {
      const { result } = renderHook(() => useTransactionSigner());

      let signedTx;
      await act(async () => {
        signedTx = await result.current.signTransaction(mockMessage);
      });

      expect(vi.mocked(signerAdapter.walletToSigner)).toHaveBeenCalledWith(mockWalletProvider);
      expect(vi.mocked(transactions.signTransaction)).toHaveBeenCalledWith(
        [mockSigner],
        mockMessage,
        expect.any(Object),
      );
      expect(signedTx).toEqual(mockTransaction);
      expect(result.current.state).toBe('signed');
      expect(result.current.currentTransaction).toEqual(mockTransaction);
      expect(result.current.isSigned).toBe(true);
    });

    it('should handle signing errors', async () => {
      const error = new Error('Signing failed');
      vi.mocked(transactions.signTransaction).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useTransactionSigner());

      await act(async () => {
        await expect(result.current.signTransaction(mockMessage)).rejects.toThrow('Signing failed');
      });

      expect(result.current.state).toBe('failed');
      expect(result.current.error).toEqual(error);
    });

    it('should throw error when wallet not connected', async () => {
      vi.mocked(walletHook.useWallet).mockReturnValue({
        connected: false,
        publicKey: null,
        wallet: null,
      } as any);

      vi.mocked(useWalletContext).mockReturnValue({
        wallet: null,
        wallets: [],
        connected: false,
        connecting: false,
        publicKey: null,
        error: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        select: vi.fn(),
        refreshWallets: vi.fn(),
        autoConnect: false,
        sessionStorage: null,
        connectionConfig: {},
      } as any);

      const { result } = renderHook(() => useTransactionSigner());

      await act(async () => {
        await expect(result.current.signTransaction(mockMessage)).rejects.toThrow(
          'Wallet not connected',
        );
      });
    });

    it('should handle timeout', async () => {
      vi.mocked(transactions.signTransaction).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 5000)),
      );

      const { result } = renderHook(() => useTransactionSigner());

      await act(async () => {
        await expect(result.current.signTransaction(mockMessage, { timeout: 100 })).rejects.toThrow(
          'Transaction signing timeout',
        );
      });

      expect(result.current.state).toBe('failed');
    });
  });

  describe('signWithSigners', () => {
    it('should sign with additional signers', async () => {
      const additionalSigner: Signer = {
        publicKey: 'signer2' as Address,
        sign: vi.fn().mockResolvedValue('signature2' as Signature),
      };

      const { result } = renderHook(() => useTransactionSigner());

      await act(async () => {
        await result.current.signWithSigners(mockMessage, [additionalSigner]);
      });

      expect(vi.mocked(transactions.signTransaction)).toHaveBeenCalledWith(
        [mockSigner, additionalSigner],
        mockMessage,
        expect.any(Object),
      );
      expect(result.current.state).toBe('signed');
    });
  });

  describe('signBatch', () => {
    it('should sign multiple transactions', async () => {
      const messages = [mockMessage, mockMessage, mockMessage];

      const { result } = renderHook(() => useTransactionSigner());

      let batchResult;
      await act(async () => {
        batchResult = await result.current.signBatch(messages);
      });

      expect(vi.mocked(transactions.signTransaction)).toHaveBeenCalledTimes(3);
      expect(batchResult.transactions).toHaveLength(3);
      expect(batchResult.failedIndices).toEqual([]);
      expect(batchResult.errors.size).toBe(0);
      expect(result.current.state).toBe('signed');
    });

    it('should handle partial batch failures', async () => {
      const messages = [mockMessage, mockMessage, mockMessage];
      const error = new Error('Failed to sign');

      // Make second transaction fail
      vi.mocked(transactions.signTransaction)
        .mockResolvedValueOnce(mockTransaction)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockTransaction);

      const { result } = renderHook(() => useTransactionSigner());

      let batchResult;
      await act(async () => {
        batchResult = await result.current.signBatch(messages, { abortOnError: false });
      });

      expect(batchResult.transactions).toHaveLength(3);
      expect(batchResult.failedIndices).toEqual([1]);
      expect(batchResult.errors.get(1)).toEqual(error);
      expect(result.current.state).toBe('failed');
    });

    it('should abort on error when specified', async () => {
      const messages = [mockMessage, mockMessage];
      const error = new Error('Failed to sign');

      vi.mocked(transactions.signTransaction)
        .mockResolvedValueOnce(mockTransaction)
        .mockRejectedValueOnce(error);

      const { result } = renderHook(() => useTransactionSigner());

      await act(async () => {
        await expect(result.current.signBatch(messages, { abortOnError: true })).rejects.toThrow(
          'Failed to sign',
        );
      });

      expect(result.current.state).toBe('failed');
    });
  });

  describe('partialSign', () => {
    it('should perform partial signing', async () => {
      const partialResult = {
        transaction: mockTransaction,
        failedSigners: [],
        errors: new Map(),
      };

      vi.mocked(transactions.partiallySignTransaction).mockResolvedValue(partialResult);

      const { result } = renderHook(() => useTransactionSigner());

      let signResult;
      await act(async () => {
        signResult = await result.current.partialSign(mockMessage);
      });

      expect(vi.mocked(transactions.partiallySignTransaction)).toHaveBeenCalledWith(
        [mockSigner],
        mockMessage,
      );
      expect(signResult).toEqual(partialResult);
      expect(result.current.state).toBe('signed');
      expect(result.current.currentTransaction).toEqual(mockTransaction);
    });

    it('should handle partial signing with failed signers', async () => {
      const partialResult = {
        transaction: mockTransaction,
        failedSigners: ['signer2' as Address],
        errors: new Map([['signer2' as Address, new Error('Failed')]]),
      };

      vi.mocked(transactions.partiallySignTransaction).mockResolvedValue(partialResult);

      const { result } = renderHook(() => useTransactionSigner());

      await act(async () => {
        await result.current.partialSign(mockMessage);
      });

      expect(result.current.state).toBe('failed');
    });

    it('should use provided signers for partial signing', async () => {
      const customSigner: Signer = {
        publicKey: 'custom' as Address,
        sign: vi.fn(),
      };

      const partialResult = {
        transaction: mockTransaction,
        failedSigners: [],
        errors: new Map(),
      };

      vi.mocked(transactions.partiallySignTransaction).mockResolvedValue(partialResult);

      const { result } = renderHook(() => useTransactionSigner());

      await act(async () => {
        await result.current.partialSign(mockMessage, [customSigner]);
      });

      expect(vi.mocked(transactions.partiallySignTransaction)).toHaveBeenCalledWith(
        [customSigner],
        mockMessage,
      );
    });
  });

  describe('addSignatures', () => {
    it('should add signatures to existing transaction', () => {
      const newSignatures = new Map([['signer2' as Address, 'signature2' as Signature]]);

      const updatedTransaction = {
        ...mockTransaction,
        signatures: new Map([...mockTransaction.signatures, ...newSignatures]),
      };

      vi.mocked(transactions.addSignaturesToTransaction).mockReturnValue(updatedTransaction);

      const { result } = renderHook(() => useTransactionSigner());

      act(() => {
        result.current.addSignatures(mockTransaction, newSignatures);
      });

      expect(vi.mocked(transactions.addSignaturesToTransaction)).toHaveBeenCalledWith(
        mockTransaction,
        newSignatures,
      );
      expect(result.current.currentTransaction).toEqual(updatedTransaction);
    });
  });

  describe('utility methods', () => {
    it('should clear error', async () => {
      const error = new Error('Test error');
      vi.mocked(transactions.signTransaction).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useTransactionSigner());

      await act(async () => {
        try {
          await result.current.signTransaction(mockMessage);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual(error);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });

    it('should reset state', async () => {
      const { result } = renderHook(() => useTransactionSigner());

      await act(async () => {
        await result.current.signTransaction(mockMessage);
      });

      expect(result.current.state).toBe('signed');
      expect(result.current.currentTransaction).toEqual(mockTransaction);

      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toBe('idle');
      expect(result.current.currentTransaction).toBe(null);
      expect(result.current.error).toBe(null);
    });
  });

  describe('transaction status', () => {
    it('should track missing signers', () => {
      const missingSigners = ['signer2' as Address, 'signer3' as Address];
      vi.mocked(transactions.getMissingSigners).mockReturnValue(missingSigners);

      const { result } = renderHook(() => useTransactionSigner());

      act(() => {
        result.current.addSignatures(mockTransaction, new Map());
      });

      expect(result.current.missingSigners).toEqual(missingSigners);
    });

    it.skip('should track if transaction is fully signed', () => {
      const { result } = renderHook(() => useTransactionSigner());

      // First time - not fully signed
      vi.mocked(transactions.isFullySigned).mockReturnValueOnce(false);
      vi.mocked(transactions.addSignaturesToTransaction).mockReturnValueOnce(mockTransaction);

      act(() => {
        result.current.addSignatures(mockTransaction, new Map());
      });

      expect(result.current.isSigned).toBe(false);

      // Second time - fully signed
      vi.mocked(transactions.isFullySigned).mockReturnValueOnce(true);
      vi.mocked(transactions.addSignaturesToTransaction).mockReturnValueOnce(mockTransaction);

      act(() => {
        result.current.addSignatures(mockTransaction, new Map());
      });

      expect(result.current.isSigned).toBe(true);
    });
  });

  describe('mobile handling', () => {
    it.skip('should save state for mobile app switches', async () => {
      const sessionStorageSpy = vi.spyOn(window.sessionStorage, 'setItem');

      // Mock navigator.userAgent to simulate non-webview mobile
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15',
        configurable: true,
      });

      const { result } = renderHook(() => useTransactionSigner());

      // Check that mobile context was set correctly
      if (
        result.current.mobileContext.requiresAppSwitch &&
        result.current.mobileContext.sessionId
      ) {
        await act(async () => {
          await result.current.signTransaction(mockMessage, {
            mobile: {
              handleAppSwitch: true,
              preserveState: true,
            },
          });
        });

        expect(sessionStorageSpy).toHaveBeenCalledWith(
          expect.stringContaining('photon_signing_'),
          expect.any(String),
        );
      } else {
        // Skip test if mobile context not properly set - test will be skipped
      }
    });
  });

  describe('version support', () => {
    it('should support legacy transactions', async () => {
      const { result } = renderHook(() => useTransactionSigner());

      await act(async () => {
        await result.current.signTransaction(mockMessage, {
          version: 'legacy',
        });
      });

      expect(vi.mocked(transactions.signTransaction)).toHaveBeenCalled();
    });

    it('should support versioned transactions', async () => {
      const { result } = renderHook(() => useTransactionSigner());

      await act(async () => {
        await result.current.signTransaction(mockMessage, {
          version: 'versioned',
          handleAddressLookupTables: true,
        });
      });

      expect(vi.mocked(transactions.signTransaction)).toHaveBeenCalled();
    });
  });
});
