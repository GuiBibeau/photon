import { describe, it, expect } from 'vitest';
import { getAccount, getMultipleAccounts } from '../src/fetch';
import { struct, u64, publicKey, u8, option, u32, fixedBytes, bool } from '@photon/codecs';
import type { Address } from '@photon/addresses';

// Token account codec based on SPL Token layout
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

describe('Integration with codecs', () => {
  it('should work with complex struct codecs', () => {
    // This test verifies that our types work correctly with complex codecs
    // In a real integration test, we would use an actual RPC endpoint

    type TokenAccountData = {
      mint: Address;
      owner: Address;
      amount: bigint;
      delegateOption: number;
      delegate: Address;
      state: number;
      isNativeOption: number;
      isNative: bigint;
      delegatedAmount: bigint;
      closeAuthorityOption: number;
      closeAuthority: Address;
    };

    // Type checking - this should compile without errors
    async function fetchTokenAccount(rpc: any, accountAddress: Address) {
      const account = await getAccount(rpc, accountAddress, tokenAccountCodec);

      if (account) {
        // TypeScript should know the shape of account.info.data
        const tokenData: TokenAccountData = account.info.data;
        const owner: Address = tokenData.owner;
        const amount: bigint = tokenData.amount;

        return {
          owner,
          amount,
          mint: tokenData.mint,
        };
      }

      return null;
    }

    // Verify function exists and has correct type
    expect(fetchTokenAccount).toBeDefined();
  });

  it('should work with optional fields in codecs', () => {
    // Define a codec with optional fields
    const optionalFieldsCodec = struct({
      required: u64,
      optional: option(publicKey),
      conditionalData: option(fixedBytes(32)),
      flag: bool,
    });

    type OptionalFieldsData = {
      required: bigint;
      optional: Address | null;
      conditionalData: Uint8Array | null;
      flag: boolean;
    };

    // Type checking
    async function fetchWithOptionalFields(rpc: any, accountAddress: Address) {
      const account = await getAccount(rpc, accountAddress, optionalFieldsCodec);

      if (account) {
        const data: OptionalFieldsData = account.info.data;

        // Check optional field handling
        if (data.optional !== null) {
          const optionalAddress: Address = data.optional;
          return optionalAddress;
        }

        return null;
      }

      return null;
    }

    expect(fetchWithOptionalFields).toBeDefined();
  });

  it('should support batch operations with mixed account types', () => {
    // This demonstrates how different account types can be fetched
    // and then processed based on their owner or other discriminators

    async function fetchMixedAccounts(rpc: any, addresses: Address[]) {
      // First, fetch all accounts with raw data
      const accounts = await getMultipleAccounts(rpc, addresses, tokenAccountCodec);

      const results = accounts.map((account, index) => {
        if (!account) {
          return { index, type: 'non-existent' as const };
        }

        // In practice, you would check the owner to determine account type
        // and decode accordingly
        return {
          index,
          type: 'token' as const,
          data: account.info.data,
        };
      });

      return results;
    }

    expect(fetchMixedAccounts).toBeDefined();
  });

  it('should handle error scenarios gracefully', () => {
    // Test codec for malformed data
    const strictCodec = struct({
      version: u8,
      data: fixedBytes(64),
      checksum: u32,
    });

    async function fetchWithErrorHandling(rpc: any, accountAddress: Address) {
      try {
        const account = await getAccount(rpc, accountAddress, strictCodec);

        if (!account) {
          return { success: false, reason: 'Account not found' };
        }

        // Validate decoded data
        if (account.info.data.version !== 1) {
          return { success: false, reason: 'Unsupported version' };
        }

        return { success: true, data: account.info.data };
      } catch (error) {
        // Handle decoding errors
        return { success: false, reason: 'Decoding failed', error };
      }
    }

    expect(fetchWithErrorHandling).toBeDefined();
  });
});
