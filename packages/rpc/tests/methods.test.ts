/**
 * Tests for RPC method implementations.
 */

import { describe, it, expect } from 'vitest';
import { createMockTransport } from '../src/transport.js';
import {
  getAccountInfo,
  getMultipleAccounts,
  getBalance,
  getProgramAccounts,
  sendTransaction,
  simulateTransaction,
  getTransaction,
  getSignatureStatuses,
  getLatestBlockhash,
  getBlock,
  getBlockHeight,
  getMinimumBalanceForRentExemption,
  getSlot,
  getVersion,
} from '../src/methods/index.js';
import type { Transport } from '../src/transport.js';
import type { Address } from '@photon/addresses';

describe('RPC Method Implementations', () => {
  const mockAddress = '11111111111111111111111111111111' as Address;
  const mockAddress2 = '22222222222222222222222222222222' as Address;
  const mockSignature = 'mockSignature123';

  describe('Account Methods', () => {
    describe('getAccountInfo', () => {
      it('should fetch and parse account info', async () => {
        const mockResponse = {
          context: { slot: 123456 },
          value: {
            executable: false,
            owner: '11111111111111111111111111111111',
            lamports: '1000000000',
            data: ['', 'base64'],
            rentEpoch: '250',
          },
        };

        const transport = createMockTransport(new Map([['getAccountInfo', mockResponse]]));

        const result = await getAccountInfo(transport as Transport, mockAddress);

        expect(result).toEqual({
          context: { slot: 123456, apiVersion: undefined },
          value: {
            executable: false,
            owner: '11111111111111111111111111111111',
            lamports: 1000000000n,
            data: expect.any(Uint8Array),
            rentEpoch: 250n,
          },
        });
      });

      it('should handle null accounts', async () => {
        const mockResponse = {
          context: { slot: 123456 },
          value: null,
        };

        const transport = createMockTransport(new Map([['getAccountInfo', mockResponse]]));

        const result = await getAccountInfo(transport as Transport, mockAddress);

        expect(result.value).toBeNull();
      });

      it('should handle RPC errors', async () => {
        const transport = createMockTransport(
          new Map([['getAccountInfo', new Error('Account not found')]]),
        );

        await expect(getAccountInfo(transport as Transport, mockAddress)).rejects.toThrow(
          'Account not found',
        );
      });
    });

    describe('getMultipleAccounts', () => {
      it('should fetch and parse multiple accounts', async () => {
        const mockResponse = {
          context: { slot: 123456 },
          value: [
            {
              executable: false,
              owner: '11111111111111111111111111111111',
              lamports: '1000000000',
              data: ['', 'base64'],
              rentEpoch: '250',
            },
            null,
            {
              executable: true,
              owner: '22222222222222222222222222222222',
              lamports: '2000000000',
              data: ['', 'base64'],
              rentEpoch: '251',
            },
          ],
        };

        const transport = createMockTransport(new Map([['getMultipleAccounts', mockResponse]]));

        const result = await getMultipleAccounts(transport as Transport, [
          mockAddress,
          mockAddress2,
        ]);

        expect(result.value).toHaveLength(3);
        expect(result.value[0]).toBeTruthy();
        expect(result.value[1]).toBeNull();
        expect(result.value[2]).toBeTruthy();
        expect(result.value[0]?.lamports).toBe(1000000000n);
        expect(result.value[2]?.lamports).toBe(2000000000n);
      });
    });

    describe('getBalance', () => {
      it('should fetch and parse balance as bigint', async () => {
        const mockResponse = {
          context: { slot: 123456 },
          value: '1000000000',
        };

        const transport = createMockTransport(new Map([['getBalance', mockResponse]]));

        const result = await getBalance(transport as Transport, mockAddress);

        expect(result).toEqual({
          context: { slot: 123456, apiVersion: undefined },
          value: 1000000000n,
        });
      });

      it('should handle large balances', async () => {
        const largeBalance = '9007199254740992'; // Larger than MAX_SAFE_INTEGER
        const mockResponse = {
          context: { slot: 123456 },
          value: largeBalance,
        };

        const transport = createMockTransport(new Map([['getBalance', mockResponse]]));

        const result = await getBalance(transport as Transport, mockAddress);

        expect(result.value).toBe(BigInt(largeBalance));
      });
    });

    describe('getProgramAccounts', () => {
      it('should fetch and parse program accounts', async () => {
        const mockResponse = [
          {
            pubkey: '11111111111111111111111111111111',
            account: {
              executable: false,
              owner: '22222222222222222222222222222222',
              lamports: '1000000000',
              data: ['', 'base64'],
              rentEpoch: '250',
            },
          },
          {
            pubkey: '33333333333333333333333333333333',
            account: {
              executable: false,
              owner: '22222222222222222222222222222222',
              lamports: '2000000000',
              data: ['', 'base64'],
              rentEpoch: '251',
            },
          },
        ];

        const transport = createMockTransport(new Map([['getProgramAccounts', mockResponse]]));

        const result = await getProgramAccounts(transport as Transport, mockAddress);

        expect(result).toHaveLength(2);
        expect(result[0].pubkey).toBe('11111111111111111111111111111111');
        expect(result[0].account.lamports).toBe(1000000000n);
        expect(result[1].pubkey).toBe('33333333333333333333333333333333');
        expect(result[1].account.lamports).toBe(2000000000n);
      });
    });
  });

  describe('Transaction Methods', () => {
    describe('sendTransaction', () => {
      it('should send transaction and return signature', async () => {
        const mockResponse = 'transactionSignature123';
        const mockTransaction = 'base64EncodedTransaction';

        const transport = createMockTransport(new Map([['sendTransaction', mockResponse]]));

        const result = await sendTransaction(transport as Transport, mockTransaction);

        expect(result).toBe('transactionSignature123');
      });

      it('should handle send transaction errors', async () => {
        const transport = createMockTransport(
          new Map([['sendTransaction', new Error('Transaction failed')]]),
        );

        await expect(sendTransaction(transport as Transport, 'tx')).rejects.toThrow(
          'Transaction failed',
        );
      });
    });

    describe('simulateTransaction', () => {
      it('should simulate transaction and parse response', async () => {
        const mockResponse = {
          context: { slot: 123456 },
          value: {
            err: null,
            logs: ['Program log: Hello', 'Program log: World'],
            accounts: null,
            unitsConsumed: '5000',
            returnData: null,
          },
        };

        const transport = createMockTransport(new Map([['simulateTransaction', mockResponse]]));

        const result = await simulateTransaction(transport as Transport, 'mockTx');

        expect(result.value).toEqual({
          err: null,
          logs: ['Program log: Hello', 'Program log: World'],
          accounts: null,
          unitsConsumed: 5000n,
          returnData: null,
        });
      });

      it('should handle simulation errors', async () => {
        const mockResponse = {
          context: { slot: 123456 },
          value: {
            err: { InstructionError: [0, 'Custom'] },
            logs: ['Error log'],
            accounts: null,
            unitsConsumed: undefined,
            returnData: null,
          },
        };

        const transport = createMockTransport(new Map([['simulateTransaction', mockResponse]]));

        const result = await simulateTransaction(transport as Transport, 'mockTx');

        expect(result.value.err).toEqual({ InstructionError: [0, 'Custom'] });
        expect(result.value.logs).toEqual(['Error log']);
      });
    });

    describe('getTransaction', () => {
      it('should fetch and parse transaction', async () => {
        const mockResponse = {
          slot: 123456,
          transaction: {
            signatures: ['sig1'],
            message: {
              header: {},
              accountKeys: [],
              recentBlockhash: 'hash',
              instructions: [],
            },
          },
          meta: {
            fee: 5000,
            preBalances: [],
            postBalances: [],
          },
        };

        const transport = createMockTransport(new Map([['getTransaction', mockResponse]]));

        const result = await getTransaction(transport as Transport, mockSignature);

        expect(result).toEqual(mockResponse);
      });

      it('should handle null transaction', async () => {
        const transport = createMockTransport(new Map([['getTransaction', null]]));

        const result = await getTransaction(transport as Transport, mockSignature);

        expect(result).toBeNull();
      });
    });

    describe('getSignatureStatuses', () => {
      it('should fetch and parse signature statuses', async () => {
        const mockResponse = {
          context: { slot: 123456 },
          value: [
            {
              slot: 123456,
              confirmations: 10,
              err: null,
              confirmationStatus: 'confirmed',
            },
            null,
            {
              slot: 123457,
              confirmations: null,
              err: { InstructionError: [0, 'Custom'] },
              confirmationStatus: 'processed',
            },
          ],
        };

        const transport = createMockTransport(new Map([['getSignatureStatuses', mockResponse]]));

        const result = await getSignatureStatuses(transport as Transport, ['sig1', 'sig2', 'sig3']);

        expect(result.value).toHaveLength(3);
        expect(result.value[0]).toEqual({
          slot: 123456,
          confirmations: 10,
          err: null,
          confirmationStatus: 'confirmed',
        });
        expect(result.value[1]).toBeNull();
        expect(result.value[2]?.err).toEqual({ InstructionError: [0, 'Custom'] });
      });
    });
  });

  describe('Block Methods', () => {
    describe('getLatestBlockhash', () => {
      it('should fetch and parse latest blockhash', async () => {
        const mockResponse = {
          context: { slot: 123456 },
          value: {
            blockhash: 'blockHashString123',
            lastValidBlockHeight: '1000000',
          },
        };

        const transport = createMockTransport(new Map([['getLatestBlockhash', mockResponse]]));

        const result = await getLatestBlockhash(transport as Transport);

        expect(result).toEqual({
          context: { slot: 123456, apiVersion: undefined },
          value: {
            blockhash: 'blockHashString123',
            lastValidBlockHeight: 1000000n,
          },
        });
      });
    });

    describe('getBlock', () => {
      it('should fetch and parse block info', async () => {
        const mockResponse = {
          blockhash: 'blockHash123',
          previousBlockhash: 'prevHash123',
          parentSlot: 123455,
          blockHeight: '1000000',
          blockTime: 1234567890,
          transactions: [],
          rewards: [],
        };

        const transport = createMockTransport(new Map([['getBlock', mockResponse]]));

        const result = await getBlock(transport as Transport, 123456);

        expect(result).toEqual({
          blockhash: 'blockHash123',
          previousBlockhash: 'prevHash123',
          parentSlot: 123455,
          blockHeight: 1000000,
          blockTime: 1234567890,
          transactions: [],
          rewards: [],
        });
      });

      it('should handle null block', async () => {
        const transport = createMockTransport(new Map([['getBlock', null]]));

        const result = await getBlock(transport as Transport, 123456);

        expect(result).toBeNull();
      });
    });

    describe('getBlockHeight', () => {
      it('should fetch and parse block height', async () => {
        const mockResponse = 1000000;

        const transport = createMockTransport(new Map([['getBlockHeight', mockResponse]]));

        const result = await getBlockHeight(transport as Transport);

        expect(result).toBe(1000000);
      });

      it('should handle large block heights', async () => {
        const mockResponse = '9007199254740992'; // Larger than MAX_SAFE_INTEGER

        const transport = createMockTransport(new Map([['getBlockHeight', mockResponse]]));

        // This should convert to number (will lose precision but that's expected for slot numbers)
        const result = await getBlockHeight(transport as Transport);

        expect(result).toBe(9007199254740992);
      });
    });
  });

  describe('Utility Methods', () => {
    describe('getMinimumBalanceForRentExemption', () => {
      it('should fetch and parse rent exemption amount', async () => {
        const mockResponse = '890880';

        const transport = createMockTransport(
          new Map([['getMinimumBalanceForRentExemption', mockResponse]]),
        );

        const result = await getMinimumBalanceForRentExemption(transport as Transport, 165);

        expect(result).toBe(890880n);
      });

      it('should handle large amounts', async () => {
        const mockResponse = '9007199254740992';

        const transport = createMockTransport(
          new Map([['getMinimumBalanceForRentExemption', mockResponse]]),
        );

        const result = await getMinimumBalanceForRentExemption(transport as Transport, 100000);

        expect(result).toBe(BigInt('9007199254740992'));
      });
    });

    describe('getSlot', () => {
      it('should fetch and parse current slot', async () => {
        const mockResponse = 123456;

        const transport = createMockTransport(new Map([['getSlot', mockResponse]]));

        const result = await getSlot(transport as Transport);

        expect(result).toBe(123456);
      });
    });

    describe('getVersion', () => {
      it('should fetch and parse version info', async () => {
        const mockResponse = {
          'solana-core': '1.16.0',
          'feature-set': 123456789,
        };

        const transport = createMockTransport(new Map([['getVersion', mockResponse]]));

        const result = await getVersion(transport as Transport);

        expect(result).toEqual({
          'solana-core': '1.16.0',
          'feature-set': 123456789,
        });
      });
    });
  });
});
