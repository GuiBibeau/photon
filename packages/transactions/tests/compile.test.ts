import { describe, it, expect } from 'vitest';
import type { Address } from '@photon/addresses';
import type { CompileableTransactionMessage } from '@photon/transaction-messages';
import { compileTransaction } from '../src/compile.js';

// Mock helpers - use valid base58 addresses
const mockAddresses = {
  alice: '11111111111111111111111111111111' as Address,
  bob: '22222222222222222222222222222222' as Address,
  charlie: '33333333333333333333333333333333' as Address,
  dave: '44444444444444444444444444444444' as Address,
  program1: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address,
  program2: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' as Address,
  'token-program': 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address,
};
const mockAddress = (id: keyof typeof mockAddresses): Address => mockAddresses[id];

describe('compileTransaction', () => {
  it('should compile a simple transaction message', () => {
    const message: CompileableTransactionMessage = {
      version: 'legacy',
      feePayer: mockAddress('alice'),
      blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
      lastValidBlockHeight: 1000n,
      instructions: [
        {
          programId: mockAddress('program1'),
          accounts: [
            {
              pubkey: mockAddress('bob'),
              isSigner: false,
              isWritable: true,
            },
          ],
          data: new Uint8Array([1, 2, 3]),
        },
      ],
    } as CompileableTransactionMessage;

    const compiled = compileTransaction(message);

    expect(compiled.message).toBe(message);
    expect(compiled.messageBytes instanceof Uint8Array).toBe(true);
    expect(compiled.messageBytes.length).toBeGreaterThan(0);
    expect(compiled.signerPubkeys).toContain(mockAddress('alice'));
    expect(compiled.signerPubkeys.length).toBe(1); // Only fee payer is signer
  });

  it('should include fee payer as first signer', () => {
    const message: CompileableTransactionMessage = {
      version: 'legacy',
      feePayer: mockAddress('alice'),
      blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
      lastValidBlockHeight: 1000n,
      instructions: [],
    } as CompileableTransactionMessage;

    const compiled = compileTransaction(message);

    expect(compiled.signerPubkeys[0]).toBe(mockAddress('alice'));
  });

  it('should collect all unique signers', () => {
    const message: CompileableTransactionMessage = {
      version: 'legacy',
      feePayer: mockAddress('alice'),
      blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
      lastValidBlockHeight: 1000n,
      instructions: [
        {
          programId: mockAddress('program1'),
          accounts: [
            {
              pubkey: mockAddress('bob'),
              isSigner: true,
              isWritable: false,
            },
            {
              pubkey: mockAddress('charlie'),
              isSigner: true,
              isWritable: true,
            },
          ],
          data: new Uint8Array([1]),
        },
        {
          programId: mockAddress('program2'),
          accounts: [
            {
              pubkey: mockAddress('bob'), // Duplicate
              isSigner: true,
              isWritable: false,
            },
            {
              pubkey: mockAddress('dave'),
              isSigner: true,
              isWritable: false,
            },
          ],
          data: new Uint8Array([2]),
        },
      ],
    } as CompileableTransactionMessage;

    const compiled = compileTransaction(message);

    expect(compiled.signerPubkeys).toContain(mockAddress('alice'));
    expect(compiled.signerPubkeys).toContain(mockAddress('bob'));
    expect(compiled.signerPubkeys).toContain(mockAddress('charlie'));
    expect(compiled.signerPubkeys).toContain(mockAddress('dave'));
    expect(compiled.signerPubkeys.length).toBe(4); // No duplicates
  });

  it('should merge account flags correctly', () => {
    const message: CompileableTransactionMessage = {
      version: 'legacy',
      feePayer: mockAddress('alice'),
      blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
      lastValidBlockHeight: 1000n,
      instructions: [
        {
          programId: mockAddress('program1'),
          accounts: [
            {
              pubkey: mockAddress('bob'),
              isSigner: false,
              isWritable: false,
            },
          ],
          data: new Uint8Array([1]),
        },
        {
          programId: mockAddress('program2'),
          accounts: [
            {
              pubkey: mockAddress('bob'), // Same account
              isSigner: true, // Now needs to sign
              isWritable: true, // Now needs write access
            },
          ],
          data: new Uint8Array([2]),
        },
      ],
    } as CompileableTransactionMessage;

    const compiled = compileTransaction(message);

    // Bob should be included as a signer since one instruction requires it
    expect(compiled.signerPubkeys).toContain(mockAddress('bob'));
  });

  it('should include program IDs in accounts', () => {
    const message: CompileableTransactionMessage = {
      version: 'legacy',
      feePayer: mockAddress('alice'),
      blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
      lastValidBlockHeight: 1000n,
      instructions: [
        {
          programId: mockAddress('program1'),
          accounts: [],
          data: new Uint8Array([1]),
        },
        {
          programId: mockAddress('program2'),
          accounts: [],
          data: new Uint8Array([2]),
        },
      ],
    } as CompileableTransactionMessage;

    const compiled = compileTransaction(message);

    // Program IDs should not be in signers list (they don't sign)
    expect(compiled.signerPubkeys).not.toContain(mockAddress('program1'));
    expect(compiled.signerPubkeys).not.toContain(mockAddress('program2'));
  });

  it('should handle versioned transactions', () => {
    const message: CompileableTransactionMessage = {
      version: 0,
      feePayer: mockAddress('alice'),
      blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
      lastValidBlockHeight: 1000n,
      instructions: [],
      addressLookupTables: [], // V0 transactions can have lookup tables
    } as CompileableTransactionMessage;

    const compiled = compileTransaction(message);

    expect(compiled.message.version).toBe(0);
    expect(compiled.messageBytes instanceof Uint8Array).toBe(true);
  });

  it('should create deterministic message bytes', () => {
    const message: CompileableTransactionMessage = {
      version: 'legacy',
      feePayer: mockAddress('alice'),
      blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
      lastValidBlockHeight: 1000n,
      instructions: [
        {
          programId: mockAddress('program1'),
          accounts: [
            {
              pubkey: mockAddress('bob'),
              isSigner: true,
              isWritable: false,
            },
          ],
          data: new Uint8Array([1, 2, 3]),
        },
      ],
    } as CompileableTransactionMessage;

    const compiled1 = compileTransaction(message);
    const compiled2 = compileTransaction(message);

    // Same message should produce same bytes
    expect(compiled1.messageBytes).toEqual(compiled2.messageBytes);
  });

  it('should handle empty instructions', () => {
    const message: CompileableTransactionMessage = {
      version: 'legacy',
      feePayer: mockAddress('alice'),
      blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
      lastValidBlockHeight: 1000n,
      instructions: [],
    } as CompileableTransactionMessage;

    const compiled = compileTransaction(message);

    expect(compiled.signerPubkeys).toEqual([mockAddress('alice')]);
    expect(compiled.messageBytes instanceof Uint8Array).toBe(true);
  });

  it('should handle accounts that are both signers in some instructions and not in others', () => {
    const message: CompileableTransactionMessage = {
      version: 'legacy',
      feePayer: mockAddress('alice'),
      blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
      lastValidBlockHeight: 1000n,
      instructions: [
        {
          programId: mockAddress('token-program'),
          accounts: [
            {
              pubkey: mockAddress('alice'), // Fee payer as regular account
              isSigner: false, // Not signing in this instruction
              isWritable: true,
            },
            {
              pubkey: mockAddress('bob'),
              isSigner: false,
              isWritable: true,
            },
          ],
          data: new Uint8Array([1]),
        },
      ],
    } as CompileableTransactionMessage;

    const compiled = compileTransaction(message);

    // Alice should still be a signer because she's the fee payer
    expect(compiled.signerPubkeys).toContain(mockAddress('alice'));
    expect(compiled.signerPubkeys.length).toBe(1);
  });
});
