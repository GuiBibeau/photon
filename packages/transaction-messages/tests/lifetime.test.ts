import { describe, it, expect } from 'vitest';
import { address } from '@photon/addresses';
import { createTransactionMessage } from '../src/create';
import { setTransactionMessageFeePayer } from '../src/fee-payer';
import {
  setTransactionMessageLifetimeUsingBlockhash,
  setTransactionMessageLifetimeUsingNonce,
} from '../src/lifetime';
import { blockhash, hasLifetime, isCompileable, type NonceInfo } from '../src/types';

describe('setTransactionMessageLifetimeUsingBlockhash', () => {
  const testAddress = address('11111111111111111111111111111112');
  const testBlockhash = blockhash('GuestWiFi1234567890abcdefghijklmnopqrstuvwxy');

  it('should set the blockhash and last valid block height', () => {
    const message = createTransactionMessage('legacy');
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
    const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: testBlockhash,
        lastValidBlockHeight: 1000n,
      },
      messageWithFeePayer,
    );

    expect(messageWithLifetime.blockhash).toBe(testBlockhash);
    expect(messageWithLifetime.lastValidBlockHeight).toBe(1000n);
    expect(hasLifetime(messageWithLifetime)).toBe(true);
    expect(isCompileable(messageWithLifetime)).toBe(true);
  });

  it('should update existing lifetime information', () => {
    const message = createTransactionMessage('legacy');
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
    const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: testBlockhash,
        lastValidBlockHeight: 1000n,
      },
      messageWithFeePayer,
    );

    const newBlockhash = blockhash('NewBlockhash1234567890abcdefghijklmnopqrstuvw');
    const updatedMessage = setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: newBlockhash,
        lastValidBlockHeight: 2000n,
      },
      messageWithLifetime,
    );

    expect(updatedMessage.blockhash).toBe(newBlockhash);
    expect(updatedMessage.lastValidBlockHeight).toBe(2000n);
    expect(messageWithLifetime.blockhash).toBe(testBlockhash); // Original unchanged
  });

  it('should preserve all other message properties', () => {
    const message = createTransactionMessage(0);
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
    const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: testBlockhash,
        lastValidBlockHeight: 1000n,
      },
      messageWithFeePayer,
    );

    expect(messageWithLifetime.version).toBe(0);
    expect(messageWithLifetime.feePayer).toBe(testAddress);
    expect(messageWithLifetime.instructions).toEqual([]);
  });

  it('should return a frozen message', () => {
    const message = createTransactionMessage('legacy');
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
    const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: testBlockhash,
        lastValidBlockHeight: 1000n,
      },
      messageWithFeePayer,
    );

    expect(Object.isFrozen(messageWithLifetime)).toBe(true);
  });

  it('should not modify the original message', () => {
    const message = createTransactionMessage('legacy');
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
    const originalMessage = { ...messageWithFeePayer };

    setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: testBlockhash,
        lastValidBlockHeight: 1000n,
      },
      messageWithFeePayer,
    );

    expect(messageWithFeePayer).toEqual(originalMessage);
    expect(messageWithFeePayer.blockhash).toBeUndefined();
  });

  it('should handle large block heights using bigint', () => {
    const message = createTransactionMessage('legacy');
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
    const largeBlockHeight = 9999999999999999999n;

    const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: testBlockhash,
        lastValidBlockHeight: largeBlockHeight,
      },
      messageWithFeePayer,
    );

    expect(messageWithLifetime.lastValidBlockHeight).toBe(largeBlockHeight);
    expect(typeof messageWithLifetime.lastValidBlockHeight).toBe('bigint');
  });

  it('should preserve slot field when provided', () => {
    const message = createTransactionMessage('legacy');
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
    const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: testBlockhash,
        lastValidBlockHeight: 1000n,
        slot: 12345n,
      },
      messageWithFeePayer,
    );

    expect(messageWithLifetime.blockhash).toBe(testBlockhash);
    expect(messageWithLifetime.lastValidBlockHeight).toBe(1000n);
    expect((messageWithLifetime as any).slot).toBe(12345n);
  });

  it('should not include slot field when not provided', () => {
    const message = createTransactionMessage('legacy');
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
    const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: testBlockhash,
        lastValidBlockHeight: 1000n,
      },
      messageWithFeePayer,
    );

    expect(messageWithLifetime.blockhash).toBe(testBlockhash);
    expect(messageWithLifetime.lastValidBlockHeight).toBe(1000n);
    expect((messageWithLifetime as any).slot).toBeUndefined();
  });

  it('should remove nonce info when setting blockhash lifetime', () => {
    const message = createTransactionMessage('legacy');
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);

    // First set a nonce lifetime
    const nonceInfo: NonceInfo = {
      nonce: blockhash('NonceValue123456789012345678901234567890123'),
      nonceAccountAddress: address('NonceAccount1111111111111111111111111111111'),
      nonceAuthorityAddress: address('NonceAuthority11111111111111111111111111111'),
    };
    const messageWithNonce = setTransactionMessageLifetimeUsingNonce(
      nonceInfo,
      messageWithFeePayer,
    );

    // Then set a blockhash lifetime
    const messageWithBlockhash = setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: testBlockhash,
        lastValidBlockHeight: 1000n,
      },
      messageWithNonce,
    );

    expect(messageWithBlockhash.blockhash).toBe(testBlockhash);
    expect(messageWithBlockhash.lastValidBlockHeight).toBe(1000n);
    expect((messageWithBlockhash as any).nonceInfo).toBeUndefined();
  });
});

describe('setTransactionMessageLifetimeUsingNonce', () => {
  const testAddress = address('11111111111111111111111111111112');
  const nonceValue = blockhash('NonceValue123456789012345678901234567890123');
  const nonceAccount = address('NonceAccount1111111111111111111111111111111');
  const nonceAuthority = address('NonceAuthority11111111111111111111111111111');

  it('should set nonce-based lifetime', () => {
    const message = createTransactionMessage('legacy');
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
    const nonceInfo: NonceInfo = {
      nonce: nonceValue,
      nonceAccountAddress: nonceAccount,
      nonceAuthorityAddress: nonceAuthority,
    };

    const messageWithLifetime = setTransactionMessageLifetimeUsingNonce(
      nonceInfo,
      messageWithFeePayer,
    );

    expect(messageWithLifetime.blockhash).toBe(nonceValue);
    expect(messageWithLifetime.lastValidBlockHeight).toBe(18446744073709551615n); // u64::MAX
    expect((messageWithLifetime as any).nonceInfo).toEqual(nonceInfo);
    expect(hasLifetime(messageWithLifetime)).toBe(true);
    expect(isCompileable(messageWithLifetime)).toBe(true);
  });

  it('should update existing nonce lifetime', () => {
    const message = createTransactionMessage('legacy');
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
    const firstNonceInfo: NonceInfo = {
      nonce: nonceValue,
      nonceAccountAddress: nonceAccount,
      nonceAuthorityAddress: nonceAuthority,
    };

    const messageWithFirstNonce = setTransactionMessageLifetimeUsingNonce(
      firstNonceInfo,
      messageWithFeePayer,
    );

    const newNonceValue = blockhash('NewNonce1234567890123456789012345678901234');
    const newNonceAccount = address('NewNonceAccount1111111111111111111111111111');
    const secondNonceInfo: NonceInfo = {
      nonce: newNonceValue,
      nonceAccountAddress: newNonceAccount,
      nonceAuthorityAddress: nonceAuthority,
    };

    const messageWithSecondNonce = setTransactionMessageLifetimeUsingNonce(
      secondNonceInfo,
      messageWithFirstNonce,
    );

    expect(messageWithSecondNonce.blockhash).toBe(newNonceValue);
    expect((messageWithSecondNonce as any).nonceInfo).toEqual(secondNonceInfo);
    expect(messageWithFirstNonce.blockhash).toBe(nonceValue); // Original unchanged
  });

  it('should preserve all other message properties when setting nonce', () => {
    const message = createTransactionMessage(0);
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
    const nonceInfo: NonceInfo = {
      nonce: nonceValue,
      nonceAccountAddress: nonceAccount,
      nonceAuthorityAddress: nonceAuthority,
    };

    const messageWithLifetime = setTransactionMessageLifetimeUsingNonce(
      nonceInfo,
      messageWithFeePayer,
    );

    expect(messageWithLifetime.version).toBe(0);
    expect(messageWithLifetime.feePayer).toBe(testAddress);
    expect(messageWithLifetime.instructions).toEqual([]);
  });

  it('should return a frozen message', () => {
    const message = createTransactionMessage('legacy');
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
    const nonceInfo: NonceInfo = {
      nonce: nonceValue,
      nonceAccountAddress: nonceAccount,
      nonceAuthorityAddress: nonceAuthority,
    };

    const messageWithLifetime = setTransactionMessageLifetimeUsingNonce(
      nonceInfo,
      messageWithFeePayer,
    );

    expect(Object.isFrozen(messageWithLifetime)).toBe(true);
    expect(Object.isFrozen((messageWithLifetime as any).nonceInfo)).toBe(true);
  });

  it('should not modify the original message', () => {
    const message = createTransactionMessage('legacy');
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
    const originalMessage = { ...messageWithFeePayer };
    const nonceInfo: NonceInfo = {
      nonce: nonceValue,
      nonceAccountAddress: nonceAccount,
      nonceAuthorityAddress: nonceAuthority,
    };

    setTransactionMessageLifetimeUsingNonce(nonceInfo, messageWithFeePayer);

    expect(messageWithFeePayer).toEqual(originalMessage);
    expect(messageWithFeePayer.blockhash).toBeUndefined();
    expect((messageWithFeePayer as any).nonceInfo).toBeUndefined();
  });

  it('should remove slot field when setting nonce lifetime', () => {
    const message = createTransactionMessage('legacy');
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);

    // First set a blockhash lifetime with slot
    const messageWithBlockhash = setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: blockhash('TestBlockhash1234567890123456789012345678'),
        lastValidBlockHeight: 1000n,
        slot: 12345n,
      },
      messageWithFeePayer,
    );

    // Then set a nonce lifetime
    const nonceInfo: NonceInfo = {
      nonce: nonceValue,
      nonceAccountAddress: nonceAccount,
      nonceAuthorityAddress: nonceAuthority,
    };
    const messageWithNonce = setTransactionMessageLifetimeUsingNonce(
      nonceInfo,
      messageWithBlockhash,
    );

    expect(messageWithNonce.blockhash).toBe(nonceValue);
    expect((messageWithNonce as any).nonceInfo).toEqual(nonceInfo);
    expect((messageWithNonce as any).slot).toBeUndefined();
  });

  it('should switch from blockhash to nonce lifetime', () => {
    const message = createTransactionMessage('legacy');
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);

    // First set a blockhash lifetime
    const testBlockhash = blockhash('GuestWiFi1234567890abcdefghijklmnopqrstuvwxy');
    const messageWithBlockhash = setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: testBlockhash,
        lastValidBlockHeight: 1000n,
      },
      messageWithFeePayer,
    );

    expect(messageWithBlockhash.lastValidBlockHeight).toBe(1000n);

    // Then set a nonce lifetime
    const nonceInfo: NonceInfo = {
      nonce: nonceValue,
      nonceAccountAddress: nonceAccount,
      nonceAuthorityAddress: nonceAuthority,
    };
    const messageWithNonce = setTransactionMessageLifetimeUsingNonce(
      nonceInfo,
      messageWithBlockhash,
    );

    expect(messageWithNonce.blockhash).toBe(nonceValue);
    expect(messageWithNonce.lastValidBlockHeight).toBe(18446744073709551615n);
    expect((messageWithNonce as any).nonceInfo).toEqual(nonceInfo);
  });
});
