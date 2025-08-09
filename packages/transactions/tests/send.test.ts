import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Transaction } from '../src/types.js';
import type { Address } from '@photon/addresses';
import type { Signature } from '@photon/crypto';
import type { CompileableTransactionMessage } from '@photon/transaction-messages';
import {
  sendTransaction,
  sendAndConfirmTransaction,
  confirmTransaction,
  type SendOptions,
  type ConfirmTransactionOptions,
  type RpcClient,
  type TransactionSignature,
  type SendTransactionConfig,
} from '../src/send.js';
import { serializeTransaction } from '../src/serialize.js';

// Mock the serialize module
vi.mock('../src/serialize.js', () => ({
  serializeTransaction: vi.fn(),
}));

describe('Transaction Send Helpers', () => {
  const mockSignature = 'mock-signature-123' as TransactionSignature;
  const mockAddress = 'mock-address' as Address;
  const mockSig = new Uint8Array(64) as Signature;

  const mockTransaction: Transaction = {
    message: {
      version: 'legacy',
      header: {
        numRequiredSignatures: 1,
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: 1,
      },
      accountKeys: [mockAddress],
      recentBlockhash: 'mock-blockhash',
      instructions: [],
    } as CompileableTransactionMessage,
    signatures: new Map([[mockAddress, mockSig]]),
  };

  const mockRpc: RpcClient = {
    sendTransaction: vi.fn(),
    getSignatureStatuses: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('sendTransaction', () => {
    it('should serialize and send a transaction', async () => {
      const serialized = new Uint8Array([1, 2, 3]);

      vi.mocked(serializeTransaction).mockReturnValue(serialized);
      // Base64 encoding is now done internally in sendTransaction
      vi.mocked(mockRpc.sendTransaction).mockResolvedValue(mockSignature);

      const result = await sendTransaction(mockTransaction, mockRpc);

      expect(serializeTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(mockRpc.sendTransaction).toHaveBeenCalled();
      expect(result).toBe(mockSignature);
    });

    it('should pass send options to RPC', async () => {
      const serialized = new Uint8Array([1, 2, 3]);
      const options: SendOptions = {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
        maxRetries: 3,
        minContextSlot: 100,
      };

      vi.mocked(serializeTransaction).mockReturnValue(serialized);
      // Base64 encoding is now done internally in sendTransaction
      vi.mocked(mockRpc.sendTransaction).mockResolvedValue(mockSignature);

      await sendTransaction(mockTransaction, mockRpc, options);

      const expectedRpcOptions: SendTransactionConfig = {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
        maxRetries: 3,
        minContextSlot: 100,
      };

      expect(mockRpc.sendTransaction).toHaveBeenCalledWith(expect.any(String), expectedRpcOptions);
    });

    it('should propagate errors from RPC', async () => {
      const serialized = new Uint8Array([1, 2, 3]);
      const error = new Error('RPC error');

      vi.mocked(serializeTransaction).mockReturnValue(serialized);
      // Base64 encoding is now done internally in sendTransaction
      vi.mocked(mockRpc.sendTransaction).mockRejectedValue(error);

      await expect(sendTransaction(mockTransaction, mockRpc)).rejects.toThrow('RPC error');
    });
  });

  describe('confirmTransaction', () => {
    it('should confirm a transaction with default options', async () => {
      const mockResponse = {
        value: [
          {
            slot: 100,
            confirmations: 10,
            err: null,
            confirmationStatus: 'confirmed' as const,
          },
        ],
      };

      vi.mocked(mockRpc.getSignatureStatuses).mockResolvedValue(mockResponse);

      await confirmTransaction(mockSignature, mockRpc);

      expect(mockRpc.getSignatureStatuses).toHaveBeenCalledWith([mockSignature]);
    });

    it('should poll until transaction is confirmed', async () => {
      const responses = [
        { value: [null] }, // Not found
        { value: [null] }, // Still not found
        {
          value: [
            {
              slot: 100,
              confirmations: 10,
              err: null,
              confirmationStatus: 'confirmed' as const,
            },
          ],
        }, // Found and confirmed
      ];

      let callCount = 0;
      vi.mocked(mockRpc.getSignatureStatuses).mockImplementation(() => {
        return Promise.resolve(responses[callCount++]);
      });

      const promise = confirmTransaction(mockSignature, mockRpc, {
        pollInterval: 100,
      });

      // Advance time for polling
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(100);

      await promise;

      expect(mockRpc.getSignatureStatuses).toHaveBeenCalledTimes(3);
    });

    it('should handle different commitment levels', async () => {
      const testCases = [
        {
          commitment: 'processed' as const,
          confirmationStatus: 'processed' as const,
          shouldConfirm: true,
        },
        {
          commitment: 'confirmed' as const,
          confirmationStatus: 'confirmed' as const,
          shouldConfirm: true,
        },
        {
          commitment: 'confirmed' as const,
          confirmationStatus: 'finalized' as const,
          shouldConfirm: true,
        },
        {
          commitment: 'finalized' as const,
          confirmationStatus: 'finalized' as const,
          shouldConfirm: true,
        },
        {
          commitment: 'finalized' as const,
          confirmationStatus: 'confirmed' as const,
          shouldConfirm: false,
        },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();

        const mockResponse = {
          value: [
            {
              slot: 100,
              confirmations: 10,
              err: null,
              confirmationStatus: testCase.confirmationStatus,
            },
          ],
        };

        vi.mocked(mockRpc.getSignatureStatuses).mockResolvedValue(mockResponse);

        if (testCase.shouldConfirm) {
          await confirmTransaction(mockSignature, mockRpc, {
            commitment: testCase.commitment,
          });
          expect(mockRpc.getSignatureStatuses).toHaveBeenCalledTimes(1);
        } else {
          // Should continue polling
          const promise = confirmTransaction(mockSignature, mockRpc, {
            commitment: testCase.commitment,
            timeout: 200,
            pollInterval: 50,
          });

          await vi.advanceTimersByTimeAsync(250);

          await expect(promise).rejects.toThrow(/timeout/);
        }
      }
    });

    it('should throw error if transaction failed', async () => {
      const mockResponse = {
        value: [
          {
            slot: 100,
            confirmations: 0,
            err: { InstructionError: [0, 'Custom'] },
            confirmationStatus: 'confirmed' as const,
          },
        ],
      };

      vi.mocked(mockRpc.getSignatureStatuses).mockResolvedValue(mockResponse);

      await expect(confirmTransaction(mockSignature, mockRpc)).rejects.toThrow(
        /Transaction failed/,
      );
    });

    it('should timeout if not confirmed within timeout', async () => {
      vi.mocked(mockRpc.getSignatureStatuses).mockResolvedValue({ value: [null] });

      const promise = confirmTransaction(mockSignature, mockRpc, {
        timeout: 1000,
        pollInterval: 100,
      });

      await vi.advanceTimersByTimeAsync(1100);

      await expect(promise).rejects.toThrow(/timeout/);
    });

    it('should handle network errors and continue polling', async () => {
      const responses = [
        new Error('fetch failed'), // Network error
        { value: [null] }, // Not found
        {
          value: [
            {
              slot: 100,
              confirmations: 10,
              err: null,
              confirmationStatus: 'confirmed' as const,
            },
          ],
        }, // Found and confirmed
      ];

      let callCount = 0;
      vi.mocked(mockRpc.getSignatureStatuses).mockImplementation(() => {
        const response = responses[callCount++];
        if (response instanceof Error) {
          return Promise.reject(response);
        }
        return Promise.resolve(response);
      });

      const promise = confirmTransaction(mockSignature, mockRpc, {
        pollInterval: 100,
      });

      // Advance time for polling
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(100);

      await promise;

      expect(mockRpc.getSignatureStatuses).toHaveBeenCalledTimes(3);
    });

    it('should rethrow non-network errors', async () => {
      const error = new Error('Some other error');
      vi.mocked(mockRpc.getSignatureStatuses).mockRejectedValue(error);

      await expect(confirmTransaction(mockSignature, mockRpc)).rejects.toThrow('Some other error');
    });
  });

  describe('sendAndConfirmTransaction', () => {
    it('should send and confirm a transaction', async () => {
      const serialized = new Uint8Array([1, 2, 3]);

      vi.mocked(serializeTransaction).mockReturnValue(serialized);
      // Base64 encoding is now done internally in sendTransaction
      vi.mocked(mockRpc.sendTransaction).mockResolvedValue(mockSignature);
      vi.mocked(mockRpc.getSignatureStatuses).mockResolvedValue({
        value: [
          {
            slot: 100,
            confirmations: 10,
            err: null,
            confirmationStatus: 'confirmed',
          },
        ],
      });

      const result = await sendAndConfirmTransaction(mockTransaction, mockRpc);

      expect(serializeTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(mockRpc.sendTransaction).toHaveBeenCalled();
      expect(mockRpc.getSignatureStatuses).toHaveBeenCalled();
      expect(result).toBe(mockSignature);
    });

    it('should pass separate options for send and confirm', async () => {
      const serialized = new Uint8Array([1, 2, 3]);
      const sendOptions: SendOptions = {
        skipPreflight: true,
        preflightCommitment: 'processed',
      };
      const confirmOptions: ConfirmTransactionOptions = {
        commitment: 'finalized',
        timeout: 60000,
      };

      vi.mocked(serializeTransaction).mockReturnValue(serialized);
      // Base64 encoding is now done internally in sendTransaction
      vi.mocked(mockRpc.sendTransaction).mockResolvedValue(mockSignature);
      vi.mocked(mockRpc.getSignatureStatuses).mockResolvedValue({
        value: [
          {
            slot: 100,
            confirmations: 10,
            err: null,
            confirmationStatus: 'finalized',
          },
        ],
      });

      await sendAndConfirmTransaction(mockTransaction, mockRpc, sendOptions, confirmOptions);

      expect(mockRpc.sendTransaction).toHaveBeenCalledWith(expect.any(String), {
        skipPreflight: true,
        preflightCommitment: 'processed',
      });
    });

    it('should propagate send errors', async () => {
      const error = new Error('Send failed');

      vi.mocked(serializeTransaction).mockReturnValue(new Uint8Array([1, 2, 3]));
      vi.mocked(mockRpc.sendTransaction).mockRejectedValue(error);

      await expect(sendAndConfirmTransaction(mockTransaction, mockRpc)).rejects.toThrow(
        'Send failed',
      );
    });

    it('should propagate confirmation errors', async () => {
      vi.mocked(serializeTransaction).mockReturnValue(new Uint8Array([1, 2, 3]));
      vi.mocked(mockRpc.sendTransaction).mockResolvedValue(mockSignature);
      vi.mocked(mockRpc.getSignatureStatuses).mockResolvedValue({
        value: [
          {
            slot: 100,
            confirmations: 0,
            err: { InstructionError: [0, 'Custom'] },
            confirmationStatus: 'confirmed',
          },
        ],
      });

      await expect(sendAndConfirmTransaction(mockTransaction, mockRpc)).rejects.toThrow(
        /Transaction failed/,
      );
    });
  });
});
