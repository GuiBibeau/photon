import { describe, it, expect } from 'vitest';
import { address } from '@photon/addresses';
import { createTransactionMessage } from '../src/create';
import { setTransactionMessageFeePayer } from '../src/fee-payer';
import { setTransactionMessageLifetimeUsingBlockhash } from '../src/lifetime';
import { blockhash, hasFeePayer } from '../src/types';

describe('setTransactionMessageFeePayer', () => {
  const testAddress = address('11111111111111111111111111111112');
  const otherAddress = address('11111111111111111111111111111113');

  it('should set the fee payer on a new message', () => {
    const message = createTransactionMessage('legacy');
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);

    expect(messageWithFeePayer.feePayer).toBe(testAddress);
    expect(hasFeePayer(messageWithFeePayer)).toBe(true);
    expect(messageWithFeePayer.version).toBe('legacy');
    expect(messageWithFeePayer.instructions).toEqual([]);
  });

  it('should update the fee payer on a message that already has one', () => {
    const message = createTransactionMessage('legacy');
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
    const messageWithNewFeePayer = setTransactionMessageFeePayer(otherAddress, messageWithFeePayer);

    expect(messageWithNewFeePayer.feePayer).toBe(otherAddress);
    expect(messageWithFeePayer.feePayer).toBe(testAddress); // Original unchanged
  });

  it('should preserve lifetime information when setting fee payer', () => {
    const message = createTransactionMessage('legacy');
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
    const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: blockhash('GuestWiFi1234567890abcdefghijklmnopqrstuvwxy'),
        lastValidBlockHeight: 1000n,
      },
      messageWithFeePayer,
    );

    const updatedMessage = setTransactionMessageFeePayer(otherAddress, messageWithLifetime);

    expect(updatedMessage.feePayer).toBe(otherAddress);
    expect(updatedMessage.blockhash).toBe('GuestWiFi1234567890abcdefghijklmnopqrstuvwxy');
    expect(updatedMessage.lastValidBlockHeight).toBe(1000n);
  });

  it('should return a frozen message', () => {
    const message = createTransactionMessage('legacy');
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);

    expect(Object.isFrozen(messageWithFeePayer)).toBe(true);
  });

  it('should not modify the original message', () => {
    const message = createTransactionMessage('legacy');
    const originalMessage = { ...message };

    setTransactionMessageFeePayer(testAddress, message);

    expect(message).toEqual(originalMessage);
    expect(message.feePayer).toBeUndefined();
  });

  it('should work with version 0 transactions', () => {
    const message = createTransactionMessage(0);
    const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);

    expect(messageWithFeePayer.feePayer).toBe(testAddress);
    expect(messageWithFeePayer.version).toBe(0);
  });
});
