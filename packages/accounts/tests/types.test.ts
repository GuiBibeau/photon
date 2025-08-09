import { describe, it, expectTypeOf } from 'vitest';
import type {
  AccountInfo,
  Account,
  GetAccountOptions,
  GetMultipleAccountsOptions,
  GetAccountResult,
  GetMultipleAccountsResult,
} from '../src/types';
import type { Address } from '@photon/addresses';

describe('Type definitions', () => {
  it('should have correct AccountInfo structure', () => {
    type TestAccountData = {
      mint: Address;
      owner: Address;
      amount: bigint;
    };

    expectTypeOf<AccountInfo<TestAccountData>>().toMatchTypeOf<{
      owner: Address;
      lamports: bigint;
      data: TestAccountData;
      executable: boolean;
      rentEpoch: bigint;
      size: number;
    }>();

    // Default type should be Uint8Array
    expectTypeOf<AccountInfo>().toMatchTypeOf<{
      owner: Address;
      lamports: bigint;
      data: Uint8Array;
      executable: boolean;
      rentEpoch: bigint;
      size: number;
    }>();
  });

  it('should have correct Account structure', () => {
    type TestData = { value: number };

    expectTypeOf<Account<TestData>>().toMatchTypeOf<{
      address: Address;
      info: AccountInfo<TestData>;
    }>();

    // Default type should be Uint8Array
    expectTypeOf<Account>().toMatchTypeOf<{
      address: Address;
      info: AccountInfo<Uint8Array>;
    }>();
  });

  it('should have correct GetAccountOptions structure', () => {
    expectTypeOf<GetAccountOptions>().toMatchTypeOf<{
      commitment?: 'processed' | 'confirmed' | 'finalized';
      minContextSlot?: number;
    }>();
  });

  it('should have correct GetMultipleAccountsOptions structure', () => {
    expectTypeOf<GetMultipleAccountsOptions>().toMatchTypeOf<{
      commitment?: 'processed' | 'confirmed' | 'finalized';
      minContextSlot?: number;
      batchSize?: number;
    }>();
  });

  it('should have correct GetAccountResult type', () => {
    type TestData = { test: string };

    // Result can be Account or null
    expectTypeOf<GetAccountResult<TestData>>().toEqualTypeOf<Account<TestData> | null>();

    // Default should use Uint8Array
    expectTypeOf<GetAccountResult>().toEqualTypeOf<Account<Uint8Array> | null>();
  });

  it('should have correct GetMultipleAccountsResult type', () => {
    type TestData = { test: boolean };

    // Result is array of Account or null
    expectTypeOf<GetMultipleAccountsResult<TestData>>().toEqualTypeOf<
      Array<Account<TestData> | null>
    >();

    // Default should use Uint8Array
    expectTypeOf<GetMultipleAccountsResult>().toEqualTypeOf<Array<Account<Uint8Array> | null>>();
  });
});
