import { describe, it, expect } from 'vitest';
import { createTransactionMessage } from '../src/create';

describe('createTransactionMessage', () => {
  it('should create a legacy transaction message', () => {
    const message = createTransactionMessage('legacy');

    expect(message.version).toBe('legacy');
    expect(message.instructions).toEqual([]);
    expect(message.feePayer).toBeUndefined();
    expect(message.blockhash).toBeUndefined();
    expect(message.lastValidBlockHeight).toBeUndefined();
    expect(message.addressLookupTables).toBeUndefined();
  });

  it('should create a version 0 transaction message', () => {
    const message = createTransactionMessage(0);

    expect(message.version).toBe(0);
    expect(message.instructions).toEqual([]);
    expect(message.feePayer).toBeUndefined();
    expect(message.blockhash).toBeUndefined();
    expect(message.lastValidBlockHeight).toBeUndefined();
    expect(message.addressLookupTables).toBeUndefined();
  });

  it('should create a frozen message', () => {
    const message = createTransactionMessage('legacy');

    expect(Object.isFrozen(message)).toBe(true);
    expect(Object.isFrozen(message.instructions)).toBe(true);

    // Attempting to modify should throw in strict mode or be ignored
    expect(() => {
      // @ts-expect-error - Testing immutability
      message.version = 0;
    }).toThrow();
  });

  it('should have an empty instructions array that is frozen', () => {
    const message = createTransactionMessage('legacy');

    expect(Array.isArray(message.instructions)).toBe(true);
    expect(message.instructions.length).toBe(0);
    expect(Object.isFrozen(message.instructions)).toBe(true);
  });
});
