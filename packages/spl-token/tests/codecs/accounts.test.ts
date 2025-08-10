import { describe, it, expect } from 'vitest';
import {
  tokenAccountCodec,
  mintAccountCodec,
  multisigCodec,
  detectAccountType,
  isToken2022Account,
  AccountTypeDiscriminator,
  ACCOUNT_SIZE,
} from '../../src/codecs/accounts';
import { AccountState } from '../../src/types';
import type { TokenAccount, MintAccount, Multisig } from '../../src/types';

describe('Account Codecs', () => {
  describe('tokenAccountCodec', () => {
    it('should encode and decode basic token account', () => {
      const account: TokenAccount = {
        mint: new Uint8Array(32).fill(1),
        owner: new Uint8Array(32).fill(2),
        amount: 1000000n,
        state: AccountState.Initialized,
        isNative: false,
      };

      const encoded = tokenAccountCodec.encode(account);
      expect(encoded.length).toBe(ACCOUNT_SIZE.TOKEN);

      const [decoded, bytesRead] = tokenAccountCodec.decode(encoded);
      expect(bytesRead).toBe(ACCOUNT_SIZE.TOKEN);
      expect(decoded.mint).toEqual(account.mint);
      expect(decoded.owner).toEqual(account.owner);
      expect(decoded.amount).toBe(account.amount);
      expect(decoded.state).toBe(account.state);
      expect(decoded.isNative).toBe(account.isNative);
    });

    it('should encode and decode token account with delegate', () => {
      const delegate = new Uint8Array(32).fill(3);
      const account: TokenAccount = {
        mint: new Uint8Array(32).fill(1),
        owner: new Uint8Array(32).fill(2),
        amount: 5000000n,
        delegate,
        delegatedAmount: 100000n,
        state: AccountState.Initialized,
        isNative: false,
      };

      const encoded = tokenAccountCodec.encode(account);
      const [decoded] = tokenAccountCodec.decode(encoded);

      expect(decoded.delegate).toEqual(delegate);
      expect(decoded.delegatedAmount).toBe(100000n);
    });

    it('should encode and decode token account with close authority', () => {
      const closeAuthority = new Uint8Array(32).fill(4);
      const account: TokenAccount = {
        mint: new Uint8Array(32).fill(1),
        owner: new Uint8Array(32).fill(2),
        amount: 0n,
        closeAuthority,
        state: AccountState.Initialized,
        isNative: false,
      };

      const encoded = tokenAccountCodec.encode(account);
      const [decoded] = tokenAccountCodec.decode(encoded);

      expect(decoded.closeAuthority).toEqual(closeAuthority);
    });

    it('should encode and decode native token account', () => {
      const account: TokenAccount = {
        mint: new Uint8Array(32).fill(0), // Native mint
        owner: new Uint8Array(32).fill(2),
        amount: 1000000000n, // 1 SOL
        state: AccountState.Initialized,
        isNative: true,
      };

      const encoded = tokenAccountCodec.encode(account);
      const [decoded] = tokenAccountCodec.decode(encoded);

      expect(decoded.isNative).toBe(true);
      expect(decoded.amount).toBe(1000000000n);
    });

    it('should handle frozen account state', () => {
      const account: TokenAccount = {
        mint: new Uint8Array(32).fill(1),
        owner: new Uint8Array(32).fill(2),
        amount: 100n,
        state: AccountState.Frozen,
        isNative: false,
      };

      const encoded = tokenAccountCodec.encode(account);
      const [decoded] = tokenAccountCodec.decode(encoded);

      expect(decoded.state).toBe(AccountState.Frozen);
    });

    it('should calculate size for basic token account', () => {
      const account: TokenAccount = {
        mint: new Uint8Array(32),
        owner: new Uint8Array(32),
        amount: 0n,
        state: AccountState.Initialized,
        isNative: false,
      };

      expect(tokenAccountCodec.size(account)).toBe(ACCOUNT_SIZE.TOKEN);
    });

    it('should throw error for insufficient bytes', () => {
      const shortBuffer = new Uint8Array(100); // Less than 165 bytes

      expect(() => tokenAccountCodec.decode(shortBuffer)).toThrow(
        'Token account requires at least',
      );
    });

    it('should decode account with offset', () => {
      const padding = new Uint8Array(10).fill(0xff);
      const account: TokenAccount = {
        mint: new Uint8Array(32).fill(1),
        owner: new Uint8Array(32).fill(2),
        amount: 999n,
        state: AccountState.Initialized,
        isNative: false,
      };

      const encoded = tokenAccountCodec.encode(account);
      const buffer = new Uint8Array(padding.length + encoded.length);
      buffer.set(padding);
      buffer.set(encoded, padding.length);

      const [decoded, bytesRead] = tokenAccountCodec.decode(buffer, padding.length);
      expect(bytesRead).toBe(ACCOUNT_SIZE.TOKEN);
      expect(decoded.amount).toBe(999n);
    });
  });

  describe('mintAccountCodec', () => {
    it('should encode and decode basic mint account', () => {
      const mint: MintAccount = {
        supply: 1000000000n,
        decimals: 9,
        isInitialized: true,
      };

      const encoded = mintAccountCodec.encode(mint);
      expect(encoded.length).toBe(ACCOUNT_SIZE.MINT);

      const [decoded, bytesRead] = mintAccountCodec.decode(encoded);
      expect(bytesRead).toBe(ACCOUNT_SIZE.MINT);
      expect(decoded.supply).toBe(mint.supply);
      expect(decoded.decimals).toBe(mint.decimals);
      expect(decoded.isInitialized).toBe(mint.isInitialized);
      expect(decoded.mintAuthority).toBeUndefined();
      expect(decoded.freezeAuthority).toBeUndefined();
    });

    it('should encode and decode mint with authorities', () => {
      const mintAuthority = new Uint8Array(32).fill(5);
      const freezeAuthority = new Uint8Array(32).fill(6);

      const mint: MintAccount = {
        supply: 5000000n,
        decimals: 6,
        isInitialized: true,
        mintAuthority,
        freezeAuthority,
      };

      const encoded = mintAccountCodec.encode(mint);
      const [decoded] = mintAccountCodec.decode(encoded);

      expect(decoded.mintAuthority).toEqual(mintAuthority);
      expect(decoded.freezeAuthority).toEqual(freezeAuthority);
    });

    it('should encode and decode mint with only mint authority', () => {
      const mintAuthority = new Uint8Array(32).fill(7);

      const mint: MintAccount = {
        supply: 0n,
        decimals: 0,
        isInitialized: true,
        mintAuthority,
      };

      const encoded = mintAccountCodec.encode(mint);
      const [decoded] = mintAccountCodec.decode(encoded);

      expect(decoded.mintAuthority).toEqual(mintAuthority);
      expect(decoded.freezeAuthority).toBeUndefined();
    });

    it('should handle uninitialized mint', () => {
      const mint: MintAccount = {
        supply: 0n,
        decimals: 0,
        isInitialized: false,
      };

      const encoded = mintAccountCodec.encode(mint);
      const [decoded] = mintAccountCodec.decode(encoded);

      expect(decoded.isInitialized).toBe(false);
      expect(decoded.supply).toBe(0n);
    });

    it('should handle max supply', () => {
      const mint: MintAccount = {
        supply: 18446744073709551615n, // Max u64
        decimals: 18,
        isInitialized: true,
      };

      const encoded = mintAccountCodec.encode(mint);
      const [decoded] = mintAccountCodec.decode(encoded);

      expect(decoded.supply).toBe(18446744073709551615n);
      expect(decoded.decimals).toBe(18);
    });

    it('should calculate size for basic mint account', () => {
      const mint: MintAccount = {
        supply: 0n,
        decimals: 9,
        isInitialized: true,
      };

      expect(mintAccountCodec.size(mint)).toBe(ACCOUNT_SIZE.MINT);
    });

    it('should throw error for insufficient bytes', () => {
      const shortBuffer = new Uint8Array(50); // Less than 82 bytes

      expect(() => mintAccountCodec.decode(shortBuffer)).toThrow('Mint account requires at least');
    });
  });

  describe('multisigCodec', () => {
    it('should encode and decode basic multisig', () => {
      const signer1 = new Uint8Array(32).fill(1);
      const signer2 = new Uint8Array(32).fill(2);
      const signer3 = new Uint8Array(32).fill(3);

      const multisig: Multisig = {
        m: 2, // 2 of 3
        n: 3,
        isInitialized: true,
        signers: [signer1, signer2, signer3],
      };

      const encoded = multisigCodec.encode(multisig);
      expect(encoded.length).toBe(ACCOUNT_SIZE.MULTISIG);

      const [decoded, bytesRead] = multisigCodec.decode(encoded);
      expect(bytesRead).toBe(ACCOUNT_SIZE.MULTISIG);
      expect(decoded.m).toBe(2);
      expect(decoded.n).toBe(3);
      expect(decoded.isInitialized).toBe(true);
      expect(decoded.signers[0]).toEqual(signer1);
      expect(decoded.signers[1]).toEqual(signer2);
      expect(decoded.signers[2]).toEqual(signer3);
    });

    it('should handle partial signers', () => {
      const signer1 = new Uint8Array(32).fill(10);
      const signer2 = new Uint8Array(32).fill(20);

      const multisig: Multisig = {
        m: 1,
        n: 2,
        isInitialized: true,
        signers: [signer1, signer2], // Only 2 signers, rest are undefined
      };

      const encoded = multisigCodec.encode(multisig);
      const [decoded] = multisigCodec.decode(encoded);

      expect(decoded.signers[0]).toEqual(signer1);
      expect(decoded.signers[1]).toEqual(signer2);
      expect(decoded.signers[2]).toBeUndefined();
      expect(decoded.signers.length).toBe(11); // Always 11 slots
    });

    it('should handle uninitialized multisig', () => {
      const multisig: Multisig = {
        m: 0,
        n: 0,
        isInitialized: false,
        signers: [],
      };

      const encoded = multisigCodec.encode(multisig);
      const [decoded] = multisigCodec.decode(encoded);

      expect(decoded.isInitialized).toBe(false);
      expect(decoded.m).toBe(0);
      expect(decoded.n).toBe(0);
    });

    it('should handle max signers (11)', () => {
      const signers = Array.from({ length: 11 }, (_, i) => new Uint8Array(32).fill(i + 1));

      const multisig: Multisig = {
        m: 6,
        n: 11,
        isInitialized: true,
        signers,
      };

      const encoded = multisigCodec.encode(multisig);
      const [decoded] = multisigCodec.decode(encoded);

      expect(decoded.n).toBe(11);
      expect(decoded.m).toBe(6);
      for (let i = 0; i < 11; i++) {
        expect(decoded.signers[i]).toEqual(signers[i]);
      }
    });

    it('should detect empty signers as undefined', () => {
      const signer1 = new Uint8Array(32).fill(5);
      const emptySigner = new Uint8Array(32).fill(0);
      const signer3 = new Uint8Array(32).fill(7);

      const multisig: Multisig = {
        m: 2,
        n: 2, // Only 2 valid signers
        isInitialized: true,
        signers: [signer1, undefined, signer3],
      };

      const encoded = multisigCodec.encode(multisig);
      // Manually set the second signer to all zeros
      encoded.set(emptySigner, 3 + 32);

      const [decoded] = multisigCodec.decode(encoded);

      expect(decoded.signers[0]).toEqual(signer1);
      expect(decoded.signers[1]).toBeUndefined(); // Empty detected as undefined
      expect(decoded.signers[2]).toEqual(signer3);
    });

    it('should have fixed size', () => {
      expect(multisigCodec.size).toBe(ACCOUNT_SIZE.MULTISIG);
    });

    it('should throw error for insufficient bytes', () => {
      const shortBuffer = new Uint8Array(300); // Less than 355 bytes

      expect(() => multisigCodec.decode(shortBuffer)).toThrow('Multisig account requires');
    });
  });

  describe('detectAccountType', () => {
    it('should detect mint account', () => {
      const mint: MintAccount = {
        supply: 1000n,
        decimals: 9,
        isInitialized: true,
      };

      const encoded = mintAccountCodec.encode(mint);
      const type = detectAccountType(encoded);

      expect(type).toBe(AccountTypeDiscriminator.Mint);
    });

    it('should detect token account', () => {
      const account: TokenAccount = {
        mint: new Uint8Array(32),
        owner: new Uint8Array(32),
        amount: 0n,
        state: AccountState.Initialized,
        isNative: false,
      };

      const encoded = tokenAccountCodec.encode(account);
      const type = detectAccountType(encoded);

      expect(type).toBe(AccountTypeDiscriminator.Account);
    });

    it('should detect multisig account', () => {
      const multisig: Multisig = {
        m: 2,
        n: 3,
        isInitialized: true,
        signers: [],
      };

      const encoded = multisigCodec.encode(multisig);
      const type = detectAccountType(encoded);

      expect(type).toBe(AccountTypeDiscriminator.Multisig);
    });

    it('should return null for empty buffer', () => {
      const type = detectAccountType(new Uint8Array(0));
      expect(type).toBeNull();
    });

    it('should return Uninitialized for unknown size', () => {
      const buffer = new Uint8Array(50); // Not matching any known size
      const type = detectAccountType(buffer);
      expect(type).toBe(AccountTypeDiscriminator.Uninitialized);
    });

    it('should detect with offset', () => {
      const padding = new Uint8Array(20).fill(0xff);
      const mint: MintAccount = {
        supply: 0n,
        decimals: 6,
        isInitialized: true,
      };

      const encoded = mintAccountCodec.encode(mint);
      const buffer = new Uint8Array(padding.length + encoded.length);
      buffer.set(padding);
      buffer.set(encoded, padding.length);

      const type = detectAccountType(buffer, padding.length);
      expect(type).toBe(AccountTypeDiscriminator.Mint);
    });
  });

  describe('isToken2022Account', () => {
    it('should detect legacy mint (exact size)', () => {
      const buffer = new Uint8Array(ACCOUNT_SIZE.MINT);
      const result = isToken2022Account(buffer, AccountTypeDiscriminator.Mint);
      expect(result).toBe(false);
    });

    it('should detect Token-2022 mint (larger size)', () => {
      const buffer = new Uint8Array(ACCOUNT_SIZE.MINT + 100); // With extensions
      const result = isToken2022Account(buffer, AccountTypeDiscriminator.Mint);
      expect(result).toBe(true);
    });

    it('should detect legacy token account (exact size)', () => {
      const buffer = new Uint8Array(ACCOUNT_SIZE.TOKEN);
      const result = isToken2022Account(buffer, AccountTypeDiscriminator.Account);
      expect(result).toBe(false);
    });

    it('should detect Token-2022 token account (larger size)', () => {
      const buffer = new Uint8Array(ACCOUNT_SIZE.TOKEN + 50); // With extensions
      const result = isToken2022Account(buffer, AccountTypeDiscriminator.Account);
      expect(result).toBe(true);
    });

    it('should return false for multisig (no extensions)', () => {
      const buffer = new Uint8Array(ACCOUNT_SIZE.MULTISIG);
      const result = isToken2022Account(buffer, AccountTypeDiscriminator.Multisig);
      expect(result).toBe(false);
    });

    it('should return false for uninitialized', () => {
      const buffer = new Uint8Array(100);
      const result = isToken2022Account(buffer, AccountTypeDiscriminator.Uninitialized);
      expect(result).toBe(false);
    });
  });
});
