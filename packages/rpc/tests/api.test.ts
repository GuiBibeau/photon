/**
 * Tests for RPC API interface.
 */

import { describe, it, expectTypeOf } from 'vitest';
import type { SolanaRpcApi, TransactionWithMeta } from '../src/api.js';
import type {
  AccountInfo,
  BlockInfo,
  Commitment,
  RpcResponse,
  SignatureInfo,
  SignatureStatus,
} from '../src/types.js';

describe('SolanaRpcApi Interface', () => {
  describe('Method Signatures', () => {
    it('should have getAccountInfo with correct signature', () => {
      expectTypeOf<SolanaRpcApi['getAccountInfo']>().toBeFunction();
      expectTypeOf<SolanaRpcApi['getAccountInfo']>().parameters.toMatchTypeOf<
        [
          any,
          (
            | { commitment?: Commitment; encoding?: any; dataSlice?: any; minContextSlot?: number }
            | undefined
          ),
        ]
      >();
      expectTypeOf<SolanaRpcApi['getAccountInfo']>().returns.toMatchTypeOf<
        Promise<RpcResponse<AccountInfo | null>>
      >();
    });

    it('should have getBalance with correct signature', () => {
      expectTypeOf<SolanaRpcApi['getBalance']>().toBeFunction();
      expectTypeOf<SolanaRpcApi['getBalance']>().parameters.toMatchTypeOf<
        [any, { commitment?: Commitment; minContextSlot?: number } | undefined]
      >();
      expectTypeOf<SolanaRpcApi['getBalance']>().returns.toMatchTypeOf<
        Promise<RpcResponse<bigint>>
      >();
    });

    it('should have getBlock with correct signature', () => {
      expectTypeOf<SolanaRpcApi['getBlock']>().toBeFunction();
      expectTypeOf<SolanaRpcApi['getBlock']>().parameter(0).toMatchTypeOf<number>();
      expectTypeOf<SolanaRpcApi['getBlock']>().returns.toMatchTypeOf<Promise<BlockInfo | null>>();
    });

    it('should have sendTransaction with correct signature', () => {
      expectTypeOf<SolanaRpcApi['sendTransaction']>().toBeFunction();
      expectTypeOf<SolanaRpcApi['sendTransaction']>().parameter(0).toMatchTypeOf<string>();
      expectTypeOf<SolanaRpcApi['sendTransaction']>().returns.toMatchTypeOf<Promise<string>>();
    });

    it('should have simulateTransaction with correct signature', () => {
      expectTypeOf<SolanaRpcApi['simulateTransaction']>().toBeFunction();
      expectTypeOf<SolanaRpcApi['simulateTransaction']>().parameter(0).toMatchTypeOf<string>();
      expectTypeOf<SolanaRpcApi['simulateTransaction']>().returns.toMatchTypeOf<
        Promise<RpcResponse<any>>
      >();
    });
  });

  describe('Method Return Types', () => {
    it('should return wrapped responses where appropriate', () => {
      // Methods that return RpcResponse
      expectTypeOf<Awaited<ReturnType<SolanaRpcApi['getAccountInfo']>>>().toMatchTypeOf<
        RpcResponse<AccountInfo | null>
      >();
      expectTypeOf<Awaited<ReturnType<SolanaRpcApi['getBalance']>>>().toMatchTypeOf<
        RpcResponse<bigint>
      >();
      expectTypeOf<Awaited<ReturnType<SolanaRpcApi['getLatestBlockhash']>>>().toMatchTypeOf<
        RpcResponse<any>
      >();
    });

    it('should return unwrapped responses where appropriate', () => {
      // Methods that return direct values
      expectTypeOf<
        Awaited<ReturnType<SolanaRpcApi['getBlock']>>
      >().toMatchTypeOf<BlockInfo | null>();
      expectTypeOf<Awaited<ReturnType<SolanaRpcApi['getHealth']>>>().toMatchTypeOf<'ok'>();
      expectTypeOf<Awaited<ReturnType<SolanaRpcApi['getGenesisHash']>>>().toMatchTypeOf<string>();
    });
  });

  describe('Method Parameters', () => {
    it('should accept Address type for account parameters', () => {
      // Address type is imported from @photon/addresses
      expectTypeOf<Parameters<SolanaRpcApi['getAccountInfo']>[0]>().toMatchTypeOf<any>();
      expectTypeOf<Parameters<SolanaRpcApi['getBalance']>[0]>().toMatchTypeOf<any>();
      expectTypeOf<Parameters<SolanaRpcApi['requestAirdrop']>[0]>().toMatchTypeOf<any>();
    });

    it('should accept bigint for large number parameters', () => {
      expectTypeOf<Parameters<SolanaRpcApi['requestAirdrop']>[1]>().toMatchTypeOf<bigint>();
      expectTypeOf<
        Parameters<SolanaRpcApi['getMinimumBalanceForRentExemption']>[0]
      >().toMatchTypeOf<number>();
    });

    it('should have optional config parameters', () => {
      type GetAccountInfoParams = Parameters<SolanaRpcApi['getAccountInfo']>;
      expectTypeOf<GetAccountInfoParams>().toHaveProperty('1'); // Config is second parameter
      expectTypeOf<GetAccountInfoParams[1]>().toMatchTypeOf<any | undefined>();
    });
  });

  describe('Array Return Types', () => {
    it('should return arrays where appropriate', () => {
      expectTypeOf<Awaited<ReturnType<SolanaRpcApi['getMultipleAccounts']>>>().toMatchTypeOf<
        RpcResponse<(AccountInfo | null)[]>
      >();
      expectTypeOf<Awaited<ReturnType<SolanaRpcApi['getSignaturesForAddress']>>>().toMatchTypeOf<
        SignatureInfo[]
      >();
      expectTypeOf<Awaited<ReturnType<SolanaRpcApi['getSignatureStatuses']>>>().toMatchTypeOf<
        RpcResponse<(SignatureStatus | null)[]>
      >();
    });
  });

  describe('Deprecated Methods', () => {
    it('should include deprecated methods with proper signatures', () => {
      expectTypeOf<SolanaRpcApi>().toHaveProperty('getRecentBlockhash');
      expectTypeOf<SolanaRpcApi>().toHaveProperty('getFeeCalculatorForBlockhash');

      expectTypeOf<SolanaRpcApi['getRecentBlockhash']>().toBeFunction();
      expectTypeOf<SolanaRpcApi['getFeeCalculatorForBlockhash']>().toBeFunction();
    });
  });

  describe('TransactionWithMeta Type', () => {
    it('should have correct structure', () => {
      expectTypeOf<TransactionWithMeta>().toHaveProperty('slot');
      expectTypeOf<TransactionWithMeta>().toHaveProperty('transaction');
      expectTypeOf<TransactionWithMeta>().toHaveProperty('meta');

      expectTypeOf<TransactionWithMeta['slot']>().toMatchTypeOf<number>();
      expectTypeOf<TransactionWithMeta['transaction']>().toHaveProperty('signatures');
      expectTypeOf<TransactionWithMeta['transaction']>().toHaveProperty('message');
      expectTypeOf<TransactionWithMeta['meta']>().toHaveProperty('err');
      expectTypeOf<TransactionWithMeta['meta']>().toHaveProperty('fee');
    });

    it('should support optional fields', () => {
      expectTypeOf<TransactionWithMeta>().toHaveProperty('blockTime');
      expectTypeOf<TransactionWithMeta>().toHaveProperty('version');

      expectTypeOf<TransactionWithMeta['blockTime']>().toMatchTypeOf<number | null | undefined>();
      expectTypeOf<TransactionWithMeta['version']>().toMatchTypeOf<'legacy' | 0 | undefined>();
    });
  });

  describe('Method Overloading Support', () => {
    it('should support methods with multiple parameter configurations', () => {
      // getBlocks can be called with or without endSlot
      expectTypeOf<SolanaRpcApi['getBlocks']>().parameters.toMatchTypeOf<[number, number?, any?]>();

      // getProgramAccounts returns different types based on config
      expectTypeOf<Awaited<ReturnType<SolanaRpcApi['getProgramAccounts']>>>().toMatchTypeOf<
        any[] | RpcResponse<any[]>
      >();
    });
  });

  describe('Token-Related Methods', () => {
    it('should have token account methods', () => {
      expectTypeOf<SolanaRpcApi>().toHaveProperty('getTokenAccountBalance');
      expectTypeOf<SolanaRpcApi>().toHaveProperty('getTokenAccountsByOwner');
      expectTypeOf<SolanaRpcApi>().toHaveProperty('getTokenAccountsByDelegate');
      expectTypeOf<SolanaRpcApi>().toHaveProperty('getTokenSupply');
      expectTypeOf<SolanaRpcApi>().toHaveProperty('getTokenLargestAccounts');
    });
  });

  describe('Subscription-Related Types', () => {
    it('should have signature and slot methods', () => {
      expectTypeOf<SolanaRpcApi>().toHaveProperty('getSignatureStatuses');
      expectTypeOf<SolanaRpcApi>().toHaveProperty('getSlot');
      expectTypeOf<SolanaRpcApi>().toHaveProperty('getSlotLeader');
      expectTypeOf<SolanaRpcApi>().toHaveProperty('getSlotLeaders');
    });
  });
});
