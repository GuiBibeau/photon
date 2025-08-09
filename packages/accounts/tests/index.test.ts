/**
 * Tests for the main index exports.
 */

import { describe, it, expect } from 'vitest';
import * as accountsExports from '../src/index.js';

describe('Index exports', () => {
  it('should export all fetching functions', () => {
    expect(accountsExports.getAccount).toBeDefined();
    expect(accountsExports.getAccountRaw).toBeDefined();
    expect(accountsExports.getMultipleAccounts).toBeDefined();
    expect(accountsExports.getMultipleAccountsRaw).toBeDefined();
    expect(typeof accountsExports.getAccount).toBe('function');
    expect(typeof accountsExports.getAccountRaw).toBe('function');
    expect(typeof accountsExports.getMultipleAccounts).toBe('function');
    expect(typeof accountsExports.getMultipleAccountsRaw).toBe('function');
  });

  it('should export all decoding utilities', () => {
    expect(accountsExports.decodeAccountData).toBeDefined();
    expect(accountsExports.tryDecodeAccountData).toBeDefined();
    expect(accountsExports.partialDecodeAccountData).toBeDefined();
    expect(accountsExports.transformAccountInfo).toBeDefined();
    expect(accountsExports.validateAccountDataSize).toBeDefined();
    expect(accountsExports.validateMinAccountDataSize).toBeDefined();
    expect(typeof accountsExports.decodeAccountData).toBe('function');
    expect(typeof accountsExports.tryDecodeAccountData).toBe('function');
    expect(typeof accountsExports.partialDecodeAccountData).toBe('function');
    expect(typeof accountsExports.transformAccountInfo).toBe('function');
    expect(typeof accountsExports.validateAccountDataSize).toBe('function');
    expect(typeof accountsExports.validateMinAccountDataSize).toBe('function');
  });

  it('should export common account utilities', () => {
    expect(accountsExports.AccountType).toBeDefined();
    expect(accountsExports.systemAccountCodec).toBeDefined();
    expect(accountsExports.tokenAccountCodec).toBeDefined();
    expect(accountsExports.tokenMintCodec).toBeDefined();
    expect(accountsExports.multisigAccountCodec).toBeDefined();
    expect(accountsExports.detectAccountType).toBeDefined();
    expect(accountsExports.getCodecForAccountType).toBeDefined();
    expect(accountsExports.autoDecodeAccount).toBeDefined();
    expect(accountsExports.isValidAccountData).toBeDefined();
    expect(typeof accountsExports.detectAccountType).toBe('function');
    expect(typeof accountsExports.getCodecForAccountType).toBe('function');
    expect(typeof accountsExports.autoDecodeAccount).toBe('function');
    expect(typeof accountsExports.isValidAccountData).toBe('function');
  });

  it('should export AccountType enum with correct values', () => {
    expect(accountsExports.AccountType.System).toBe('system');
    expect(accountsExports.AccountType.TokenAccount).toBe('token-account');
    expect(accountsExports.AccountType.TokenMint).toBe('token-mint');
    expect(accountsExports.AccountType.Multisig).toBe('multisig');
    expect(accountsExports.AccountType.Unknown).toBe('unknown');
  });

  it('should have a complete set of exports', () => {
    // Check that we have the expected number of exports
    const exportedKeys = Object.keys(accountsExports);

    // These are the expected exports based on index.ts
    const expectedExports = [
      // Fetching functions
      'getAccount',
      'getAccountRaw',
      'getMultipleAccounts',
      'getMultipleAccountsRaw',
      // Decoding utilities
      'decodeAccountData',
      'tryDecodeAccountData',
      'partialDecodeAccountData',
      'transformAccountInfo',
      'validateAccountDataSize',
      'validateMinAccountDataSize',
      // Common account types and utilities
      'AccountType',
      'systemAccountCodec',
      'tokenAccountCodec',
      'tokenMintCodec',
      'multisigAccountCodec',
      'detectAccountType',
      'getCodecForAccountType',
      'autoDecodeAccount',
      'isValidAccountData',
    ];

    expectedExports.forEach((exportName) => {
      expect(exportedKeys).toContain(exportName);
    });
  });
});
