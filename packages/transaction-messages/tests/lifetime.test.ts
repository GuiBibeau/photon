import { describe, it, expect } from 'vitest';
import { address } from '@photon/addresses';
import { createTransactionMessage } from '../src/create';
import { setTransactionMessageFeePayer } from '../src/fee-payer';
import { setTransactionMessageLifetimeUsingBlockhash } from '../src/lifetime';
import { blockhash, hasLifetime, isCompileable } from '../src/types';

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
});
