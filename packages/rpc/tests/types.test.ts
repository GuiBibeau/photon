/**
 * Tests for RPC type definitions.
 */

import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  AccountInfo,
  BlockInfo,
  Commitment,
  Encoding,
  RpcResponse,
  SignatureStatus,
  TransactionError,
  TransactionVersion,
} from '../src/types.js';

describe('RPC Type Definitions', () => {
  describe('Commitment Levels', () => {
    it('should have correct commitment values', () => {
      const commitments: Commitment[] = ['processed', 'confirmed', 'finalized'];

      expect(commitments).toHaveLength(3);
      expectTypeOf<Commitment>().toMatchTypeOf<'processed' | 'confirmed' | 'finalized'>();
    });
  });

  describe('Encoding Types', () => {
    it('should have correct encoding values', () => {
      const encodings: Encoding[] = ['base58', 'base64', 'base64+zstd', 'jsonParsed'];

      expect(encodings).toHaveLength(4);
      expectTypeOf<Encoding>().toMatchTypeOf<'base58' | 'base64' | 'base64+zstd' | 'jsonParsed'>();
    });
  });

  describe('TransactionVersion', () => {
    it('should support legacy and versioned transactions', () => {
      const versions: TransactionVersion[] = ['legacy', 0];

      expect(versions).toHaveLength(2);
      expectTypeOf<TransactionVersion>().toMatchTypeOf<'legacy' | 0>();
    });
  });

  describe('AccountInfo Type', () => {
    it('should have correct structure', () => {
      expectTypeOf<AccountInfo>().toHaveProperty('lamports');
      expectTypeOf<AccountInfo>().toHaveProperty('owner');
      expectTypeOf<AccountInfo>().toHaveProperty('data');
      expectTypeOf<AccountInfo>().toHaveProperty('executable');
      expectTypeOf<AccountInfo>().toHaveProperty('rentEpoch');

      expectTypeOf<AccountInfo['lamports']>().toMatchTypeOf<bigint>();
      expectTypeOf<AccountInfo['executable']>().toMatchTypeOf<boolean>();
    });

    it('should support generic data types', () => {
      type StringData = AccountInfo<string>;
      type BufferData = AccountInfo<Buffer>;
      type ParsedData = AccountInfo<{ program: string; parsed: unknown; space: number }>;

      expectTypeOf<StringData['data']>().toMatchTypeOf<string>();
      expectTypeOf<BufferData['data']>().toMatchTypeOf<Buffer>();
      expectTypeOf<ParsedData['data']>().toHaveProperty('parsed');
    });
  });

  describe('RpcResponse Type', () => {
    it('should wrap values with context', () => {
      type TestResponse = RpcResponse<string>;

      expectTypeOf<TestResponse>().toHaveProperty('context');
      expectTypeOf<TestResponse>().toHaveProperty('value');
      expectTypeOf<TestResponse['context']>().toHaveProperty('slot');
      expectTypeOf<TestResponse['context']['slot']>().toMatchTypeOf<number>();
      expectTypeOf<TestResponse['value']>().toMatchTypeOf<string>();
    });

    it('should support various value types', () => {
      type NumberResponse = RpcResponse<number>;
      type BooleanResponse = RpcResponse<boolean>;
      type ComplexResponse = RpcResponse<{ foo: string; bar: number }>;

      expectTypeOf<NumberResponse['value']>().toMatchTypeOf<number>();
      expectTypeOf<BooleanResponse['value']>().toMatchTypeOf<boolean>();
      expectTypeOf<ComplexResponse['value']>().toHaveProperty('foo');
      expectTypeOf<ComplexResponse['value']>().toHaveProperty('bar');
    });
  });

  describe('TransactionError Type', () => {
    it('should support string and structured errors', () => {
      const stringError: TransactionError = 'Custom error message';
      const instructionError: TransactionError = {
        InstructionError: [0, 'InvalidArgument'],
      };
      const insufficientFundsError: TransactionError = {
        InsufficientFundsForRent: { account_index: 5 },
      };

      expect(typeof stringError).toBe('string');
      expect(instructionError).toHaveProperty('InstructionError');
      expect(insufficientFundsError).toHaveProperty('InsufficientFundsForRent');
    });
  });

  describe('SignatureStatus Type', () => {
    it('should have correct structure', () => {
      expectTypeOf<SignatureStatus>().toHaveProperty('slot');
      expectTypeOf<SignatureStatus>().toHaveProperty('confirmations');
      expectTypeOf<SignatureStatus>().toHaveProperty('err');

      expectTypeOf<SignatureStatus['slot']>().toMatchTypeOf<number>();
      expectTypeOf<SignatureStatus['confirmations']>().toMatchTypeOf<number | null>();
      expectTypeOf<SignatureStatus['err']>().toMatchTypeOf<TransactionError | null>();
    });
  });

  describe('BlockInfo Type', () => {
    it('should have correct structure', () => {
      expectTypeOf<BlockInfo>().toHaveProperty('blockhash');
      expectTypeOf<BlockInfo>().toHaveProperty('previousBlockhash');
      expectTypeOf<BlockInfo>().toHaveProperty('parentSlot');
      expectTypeOf<BlockInfo>().toHaveProperty('transactions');

      expectTypeOf<BlockInfo['blockhash']>().toMatchTypeOf<string>();
      expectTypeOf<BlockInfo['parentSlot']>().toMatchTypeOf<number>();
      expectTypeOf<BlockInfo['transactions']>().toMatchTypeOf<Array<any>>();
    });
  });

  describe('Configuration Types', () => {
    it('should have optional commitment in configs', () => {
      type Config = { commitment?: Commitment; minContextSlot?: number };

      expectTypeOf<Config['commitment']>().toMatchTypeOf<Commitment | undefined>();
      expectTypeOf<Config['minContextSlot']>().toMatchTypeOf<number | undefined>();
    });
  });

  describe('BigInt Usage', () => {
    it('should use bigint for large numbers', () => {
      expectTypeOf<AccountInfo['lamports']>().toMatchTypeOf<bigint>();
      expectTypeOf<AccountInfo['rentEpoch']>().toMatchTypeOf<bigint>();

      // These should use bigint for amounts that can exceed JavaScript's safe integer range
      type Supply = { total: bigint; circulating: bigint; nonCirculating: bigint };
      expectTypeOf<Supply['total']>().toMatchTypeOf<bigint>();
    });
  });

  describe('Complex Nested Types', () => {
    it('should properly type nested structures', () => {
      type TransactionMeta = {
        err: TransactionError | null;
        fee: bigint;
        preBalances: bigint[];
        postBalances: bigint[];
        innerInstructions?: Array<{
          index: number;
          instructions: Array<{
            programIdIndex: number;
            accounts: number[];
            data: string;
          }>;
        }>;
      };

      expectTypeOf<TransactionMeta>().toHaveProperty('err');
      expectTypeOf<TransactionMeta>().toHaveProperty('fee');
      expectTypeOf<TransactionMeta['fee']>().toMatchTypeOf<bigint>();
      expectTypeOf<TransactionMeta['preBalances']>().toMatchTypeOf<bigint[]>();
    });
  });
});
