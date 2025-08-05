/**
 * Tests for RPC client factory.
 */

import { describe, it, expect } from 'vitest';
import type { Address } from '@photon/addresses';
import { createSolanaRpcFromTransport, createBatch } from '../src/client.js';
import { createMockTransport } from '../src/transport.js';
import type { Transport, JsonRpcRequest, JsonRpcResponse } from '../src/transport.js';

describe('RPC Client Factory', () => {
  describe('createSolanaRpcFromTransport', () => {
    it('should create a client with a transport', async () => {
      const mockAddress = 'So11111111111111111111111111111111111111112' as Address;
      const mockBalance = 1000000000n;

      const responses = new Map([['getBalance', mockBalance]]);

      const transport = createMockTransport(responses);
      const client = createSolanaRpcFromTransport(transport);

      const balance = await client.getBalance(mockAddress);
      expect(balance).toBe(mockBalance);
    });

    it('should handle RPC errors properly', async () => {
      const mockAddress = 'So11111111111111111111111111111111111111112' as Address;
      const responses = new Map([['getBalance', new Error('Account not found')]]);

      const transport = createMockTransport(responses);
      const client = createSolanaRpcFromTransport(transport);

      await expect(client.getBalance(mockAddress)).rejects.toThrow(
        'RPC Error -32000: Account not found',
      );
    });

    it('should apply request ID middleware', async () => {
      let capturedRequest: JsonRpcRequest | undefined;

      const customTransport: Transport = async (request) => {
        capturedRequest = request;
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: 1000000000n,
        } as JsonRpcResponse;
      };

      const client = createSolanaRpcFromTransport(customTransport, {
        generateId: () => 'test-id-123',
      });

      const mockAddress = 'So11111111111111111111111111111111111111112' as Address;
      await client.getBalance(mockAddress);

      expect(capturedRequest?.id).toBe('test-id-123');
    });

    it('should apply default commitment middleware', async () => {
      let capturedRequest: JsonRpcRequest | undefined;

      const customTransport: Transport = async (request) => {
        capturedRequest = request;
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: 1000000000n,
        } as JsonRpcResponse;
      };

      const client = createSolanaRpcFromTransport(customTransport, {
        commitment: 'finalized',
      });

      const mockAddress = 'So11111111111111111111111111111111111111112' as Address;
      await client.getBalance(mockAddress, { minContextSlot: 100 });

      // Check that commitment was added to the config
      const params = capturedRequest?.params as unknown[];
      expect(params?.[1]).toEqual({
        minContextSlot: 100,
        commitment: 'finalized',
      });
    });

    it('should support custom middleware', async () => {
      let middlewareExecuted = false;

      const customMiddleware = (next: Transport): Transport => {
        return async (request) => {
          middlewareExecuted = true;
          return next(request);
        };
      };

      const responses = new Map([['getBalance', 1000000000n]]);

      const transport = createMockTransport(responses);
      const client = createSolanaRpcFromTransport(transport, {
        middleware: [customMiddleware],
      });

      const mockAddress = 'So11111111111111111111111111111111111111112' as Address;
      await client.getBalance(mockAddress);

      expect(middlewareExecuted).toBe(true);
    });

    it('should handle retry middleware', async () => {
      let attemptCount = 0;

      const customTransport: Transport = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network error');
        }
        return {
          jsonrpc: '2.0',
          id: 1,
          result: 1000000000n,
        } as JsonRpcResponse;
      };

      const client = createSolanaRpcFromTransport(customTransport, {
        retry: {
          maxAttempts: 3,
          initialDelay: 10,
        },
      });

      const mockAddress = 'So11111111111111111111111111111111111111112' as Address;
      const balance = await client.getBalance(mockAddress);

      expect(balance).toBe(1000000000n);
      expect(attemptCount).toBe(3);
    });

    it('should handle timeout middleware', async () => {
      const customTransport: Transport = async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return {
          jsonrpc: '2.0',
          id: 1,
          result: 1000000000n,
        } as JsonRpcResponse;
      };

      const client = createSolanaRpcFromTransport(customTransport, {
        timeout: 50,
      });

      const mockAddress = 'So11111111111111111111111111111111111111112' as Address;
      await expect(client.getBalance(mockAddress)).rejects.toThrow('Request timeout after 50ms');
    });

    it('should support method proxy for all RPC methods', async () => {
      const responses = new Map([
        ['getBalance', 1000000000n],
        ['getBlockHeight', 123456],
        ['getSlot', 234567],
      ]);

      const transport = createMockTransport(responses);
      const client = createSolanaRpcFromTransport(transport);

      // Test that methods exist and are callable
      expect(typeof client.getBalance).toBe('function');
      expect(typeof client.getBlockHeight).toBe('function');
      expect(typeof client.getSlot).toBe('function');

      // Test actual calls
      const mockAddress = 'So11111111111111111111111111111111111111112' as Address;
      const balance = await client.getBalance(mockAddress);
      const blockHeight = await client.getBlockHeight();
      const slot = await client.getSlot();

      expect(balance).toBe(1000000000n);
      expect(blockHeight).toBe(123456);
      expect(slot).toBe(234567);
    });
  });

  describe('createBatch', () => {
    it('should batch multiple requests', async () => {
      const responses = new Map([
        ['getBalance', 1000000000n],
        ['getBlockHeight', 123456],
        ['getSlot', 234567],
      ]);

      const transport = createMockTransport(responses);
      const client = createSolanaRpcFromTransport(transport);
      const batch = createBatch(client);

      const mockAddress = 'So11111111111111111111111111111111111111112' as Address;

      // Queue up batch requests
      const balancePromise = batch.getBalance(mockAddress);
      const blockHeightPromise = batch.getBlockHeight();
      const slotPromise = batch.getSlot();

      // Execute the batch
      await batch.execute();

      // Check results
      const [balance, blockHeight, slot] = await Promise.all([
        balancePromise,
        blockHeightPromise,
        slotPromise,
      ]);

      expect(balance).toBe(1000000000n);
      expect(blockHeight).toBe(123456);
      expect(slot).toBe(234567);
    });

    it('should handle errors in batch requests', async () => {
      const responses = new Map([
        ['getBalance', 1000000000n],
        ['getBlockHeight', new Error('Block not found')],
        ['getSlot', 234567],
      ]);

      const transport = createMockTransport(responses);
      const client = createSolanaRpcFromTransport(transport);
      const batch = createBatch(client);

      const mockAddress = 'So11111111111111111111111111111111111111112' as Address;

      // Queue up batch requests
      const balancePromise = batch.getBalance(mockAddress);
      const blockHeightPromise = batch.getBlockHeight();
      const slotPromise = batch.getSlot();

      // Execute the batch
      await batch.execute();

      // Check results
      const balance = await balancePromise;
      await expect(blockHeightPromise).rejects.toThrow('RPC Error -32000: Block not found');
      const slot = await slotPromise;

      expect(balance).toBe(1000000000n);
      expect(slot).toBe(234567);
    });
  });
});
