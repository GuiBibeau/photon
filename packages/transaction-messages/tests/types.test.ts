import { describe, it, expect } from 'vitest';
import { address } from '@photon/addresses';
import { createTransactionMessage } from '../src/create';
import { setTransactionMessageFeePayer } from '../src/fee-payer';
import { setTransactionMessageLifetimeUsingBlockhash } from '../src/lifetime';
import {
  blockhash,
  hasFeePayer,
  hasLifetime,
  isCompileable,
  type TransactionMessage,
  type TransactionMessageWithFeePayer,
  type TransactionMessageWithLifetime,
  type CompileableTransactionMessage,
} from '../src/types';

describe('Type utilities', () => {
  const testAddress = address('11111111111111111111111111111112');
  const testBlockhash = blockhash('GuestWiFi1234567890abcdefghijklmnopqrstuvwxy');

  describe('blockhash', () => {
    it('should create a branded blockhash type', () => {
      const hash = blockhash('TestBlockhash123456789012345678901234567890');
      expect(hash).toBe('TestBlockhash123456789012345678901234567890');
      expect(typeof hash).toBe('string');
    });
  });

  describe('hasFeePayer', () => {
    it('should return false for a message without fee payer', () => {
      const message = createTransactionMessage('legacy');
      expect(hasFeePayer(message)).toBe(false);
    });

    it('should return true for a message with fee payer', () => {
      const message = createTransactionMessage('legacy');
      const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
      expect(hasFeePayer(messageWithFeePayer)).toBe(true);
    });

    it('should act as a type guard', () => {
      const message: TransactionMessage = createTransactionMessage('legacy');

      if (hasFeePayer(message)) {
        // TypeScript should know message has feePayer here
        const _feePayer: typeof message.feePayer = testAddress; // This should compile
        expect(message.feePayer).toBeDefined();
      } else {
        expect(message.feePayer).toBeUndefined();
      }
    });
  });

  describe('hasLifetime', () => {
    it('should return false for a message without lifetime', () => {
      const message = createTransactionMessage('legacy');
      expect(hasLifetime(message)).toBe(false);
    });

    it('should return false for a message with only fee payer', () => {
      const message = createTransactionMessage('legacy');
      const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
      expect(hasLifetime(messageWithFeePayer)).toBe(false);
    });

    it('should return true for a message with fee payer and lifetime', () => {
      const message = createTransactionMessage('legacy');
      const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
      const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: testBlockhash,
          lastValidBlockHeight: 1000n,
        },
        messageWithFeePayer,
      );
      expect(hasLifetime(messageWithLifetime)).toBe(true);
    });

    it('should act as a type guard', () => {
      const message = createTransactionMessage('legacy');
      const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
      const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: testBlockhash,
          lastValidBlockHeight: 1000n,
        },
        messageWithFeePayer,
      );

      if (hasLifetime(messageWithLifetime)) {
        // TypeScript should know message has blockhash and lastValidBlockHeight
        const _blockhash: typeof messageWithLifetime.blockhash = testBlockhash;
        const _height: typeof messageWithLifetime.lastValidBlockHeight = 1000n;
        expect(messageWithLifetime.blockhash).toBeDefined();
        expect(messageWithLifetime.lastValidBlockHeight).toBeDefined();
      }
    });
  });

  describe('isCompileable', () => {
    it('should return false for an empty message', () => {
      const message = createTransactionMessage('legacy');
      expect(isCompileable(message)).toBe(false);
    });

    it('should return false for a message with only fee payer', () => {
      const message = createTransactionMessage('legacy');
      const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
      expect(isCompileable(messageWithFeePayer)).toBe(false);
    });

    it('should return true for a complete message', () => {
      const message = createTransactionMessage('legacy');
      const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
      const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: testBlockhash,
          lastValidBlockHeight: 1000n,
        },
        messageWithFeePayer,
      );
      expect(isCompileable(messageWithLifetime)).toBe(true);
    });

    it('should be equivalent to hasLifetime', () => {
      const message = createTransactionMessage('legacy');
      expect(isCompileable(message)).toBe(hasLifetime(message));

      const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
      expect(isCompileable(messageWithFeePayer)).toBe(hasLifetime(messageWithFeePayer));

      const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: testBlockhash,
          lastValidBlockHeight: 1000n,
        },
        messageWithFeePayer,
      );
      expect(isCompileable(messageWithLifetime)).toBe(hasLifetime(messageWithLifetime));
    });

    it('should act as a type guard for CompileableTransactionMessage', () => {
      const message = createTransactionMessage('legacy');
      const messageWithFeePayer = setTransactionMessageFeePayer(testAddress, message);
      const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: testBlockhash,
          lastValidBlockHeight: 1000n,
        },
        messageWithFeePayer,
      );

      if (isCompileable(messageWithLifetime)) {
        // TypeScript should know this is a CompileableTransactionMessage
        const compileable: CompileableTransactionMessage = messageWithLifetime;
        expect(compileable.feePayer).toBeDefined();
        expect(compileable.blockhash).toBeDefined();
        expect(compileable.lastValidBlockHeight).toBeDefined();
      }
    });
  });

  describe('Type evolution', () => {
    it('should properly refine types through the builder chain', () => {
      // Start with base message
      const baseMessage: TransactionMessage = createTransactionMessage('legacy');
      expect(hasFeePayer(baseMessage)).toBe(false);
      expect(hasLifetime(baseMessage)).toBe(false);
      expect(isCompileable(baseMessage)).toBe(false);

      // Add fee payer
      const withFeePayer: TransactionMessageWithFeePayer = setTransactionMessageFeePayer(
        testAddress,
        baseMessage,
      );
      expect(hasFeePayer(withFeePayer)).toBe(true);
      expect(hasLifetime(withFeePayer)).toBe(false);
      expect(isCompileable(withFeePayer)).toBe(false);

      // Add lifetime
      const withLifetime: TransactionMessageWithLifetime =
        setTransactionMessageLifetimeUsingBlockhash(
          {
            blockhash: testBlockhash,
            lastValidBlockHeight: 1000n,
          },
          withFeePayer,
        );
      expect(hasFeePayer(withLifetime)).toBe(true);
      expect(hasLifetime(withLifetime)).toBe(true);
      expect(isCompileable(withLifetime)).toBe(true);

      // Verify it's compileable
      const compileable: CompileableTransactionMessage = withLifetime;
      expect(compileable.feePayer).toBe(testAddress);
      expect(compileable.blockhash).toBe(testBlockhash);
      expect(compileable.lastValidBlockHeight).toBe(1000n);
    });
  });
});
