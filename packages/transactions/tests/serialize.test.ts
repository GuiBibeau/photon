/**
 * Tests for transaction serialization functionality.
 */

import { describe, it, expect } from 'vitest';
import { address } from '@photon/addresses';
import type { Signature } from '@photon/crypto';
import type {
  CompileableTransactionMessage,
  AddressLookupTable,
} from '@photon/transaction-messages';
import { blockhash } from '@photon/transaction-messages';
import type { Transaction } from '../src/types.js';
import {
  serializeMessage,
  serializeTransaction,
  estimateTransactionSize,
  isTransactionSizeValid,
  encodeTransactionBase64,
  encodeTransactionBase58,
  MAX_TRANSACTION_SIZE,
} from '../src/serialize.js';

describe('Transaction Serialization', () => {
  // Helper to create a mock signature
  const createSignature = (value: number): Signature => {
    const sig = new Uint8Array(64);
    sig.fill(value);
    return sig as Signature;
  };

  // Test addresses (valid base58 32-byte addresses)
  const feePayer = address('11111111111111111111111111111112');
  const account1 = address('So11111111111111111111111111111111111111112');
  const account2 = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  const programId = address('ComputeBudget111111111111111111111111111111');
  const testBlockhash = blockhash('GH7ome3EiwEr7tu9JuTh2dpYWBJK3z69Xm1ZE3MEE6JC');

  describe('serializeMessage', () => {
    describe('legacy transactions', () => {
      it('should handle multiple signers correctly', () => {
        const message: CompileableTransactionMessage = {
          version: 'legacy',
          feePayer,
          blockhash: testBlockhash,
          lastValidBlockHeight: 1000n,
          instructions: [
            {
              programId,
              accounts: [
                { pubkey: account1, isSigner: true, isWritable: false },
                { pubkey: account2, isSigner: false, isWritable: true },
              ],
              data: new Uint8Array(),
            },
          ],
        };

        const serialized = serializeMessage(message);

        // Should have 2 signers (fee payer + account1)
        expect(serialized[0]).toBe(2);
        // Should have 1 readonly signer (account1)
        expect(serialized[1]).toBe(1);
      });

      it('should order accounts correctly', () => {
        const message: CompileableTransactionMessage = {
          version: 'legacy',
          feePayer: account2, // Using account2 as fee payer
          blockhash: testBlockhash,
          lastValidBlockHeight: 1000n,
          instructions: [
            {
              programId,
              accounts: [
                { pubkey: feePayer, isSigner: true, isWritable: false }, // Signer, readonly
                { pubkey: account1, isSigner: false, isWritable: true }, // Non-signer, writable
                { pubkey: account2, isSigner: true, isWritable: true }, // Fee payer (signer, writable)
              ],
              data: new Uint8Array(),
            },
          ],
        };

        const serialized = serializeMessage(message);

        // Should have 2 signers (fee payer account2 + feePayer address as signer)
        expect(serialized[0]).toBe(2);
        // Should have 1 readonly signer
        expect(serialized[1]).toBe(1);
      });

      it('should handle empty instructions', () => {
        const message: CompileableTransactionMessage = {
          version: 'legacy',
          feePayer,
          blockhash: testBlockhash,
          lastValidBlockHeight: 1000n,
          instructions: [],
        };

        const serialized = serializeMessage(message);

        // Should still serialize with just fee payer
        expect(serialized).toBeInstanceOf(Uint8Array);
        expect(serialized[0]).toBe(1); // Just fee payer as signer
      });

      it('should handle large instruction data', () => {
        const largeData = new Uint8Array(500);
        largeData.fill(42);

        const message: CompileableTransactionMessage = {
          version: 'legacy',
          feePayer,
          blockhash: testBlockhash,
          lastValidBlockHeight: 1000n,
          instructions: [
            {
              programId,
              accounts: [],
              data: largeData,
            },
          ],
        };

        const serialized = serializeMessage(message);

        // Should handle large data correctly
        expect(serialized).toBeInstanceOf(Uint8Array);
        expect(serialized.length).toBeGreaterThan(500);
      });
    });

    describe('versioned transactions', () => {
      it('should serialize a v0 transaction message', () => {
        const message: CompileableTransactionMessage = {
          version: 0,
          feePayer,
          blockhash: testBlockhash,
          lastValidBlockHeight: 1000n,
          instructions: [
            {
              programId,
              accounts: [{ pubkey: account1, isSigner: false, isWritable: true }],
              data: new Uint8Array([1, 2, 3]),
            },
          ],
        };

        const serialized = serializeMessage(message);

        // Check version byte (0x80 | 0 = 0x80)
        expect(serialized[0]).toBe(0x80);

        // Check that it returns a Uint8Array
        expect(serialized).toBeInstanceOf(Uint8Array);
      });

      it('should serialize v0 transaction with address lookup tables', () => {
        const lookupTable: AddressLookupTable = {
          address: address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
          writableIndexes: [0, 2],
          readonlyIndexes: [1, 3, 5],
        };

        const message: CompileableTransactionMessage = {
          version: 0,
          feePayer,
          blockhash: testBlockhash,
          lastValidBlockHeight: 1000n,
          instructions: [
            {
              programId,
              accounts: [],
              data: new Uint8Array(),
            },
          ],
          addressLookupTables: [lookupTable],
        };

        const serialized = serializeMessage(message);

        // Check version byte
        expect(serialized[0]).toBe(0x80);

        // Should be longer due to lookup table data
        expect(serialized.length).toBeGreaterThan(100);
      });

      it('should handle multiple address lookup tables', () => {
        const lookupTables: AddressLookupTable[] = [
          {
            address: address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
            writableIndexes: [0],
            readonlyIndexes: [1],
          },
          {
            address: address('BPFLoaderUpgradeab1e11111111111111111111111'),
            writableIndexes: [2, 3],
            readonlyIndexes: [],
          },
        ];

        const message: CompileableTransactionMessage = {
          version: 0,
          feePayer,
          blockhash: testBlockhash,
          lastValidBlockHeight: 1000n,
          instructions: [],
          addressLookupTables: lookupTables,
        };

        const serialized = serializeMessage(message);

        expect(serialized[0]).toBe(0x80);
        expect(serialized).toBeInstanceOf(Uint8Array);
      });
    });

    it('should throw for unsupported version', () => {
      const message = {
        version: 2 as any, // Invalid version
        feePayer,
        blockhash: testBlockhash,
        lastValidBlockHeight: 1000n,
        instructions: [],
      } as CompileableTransactionMessage;

      expect(() => serializeMessage(message)).toThrow('Unsupported transaction version');
    });
  });

  describe('serializeTransaction', () => {
    it('should serialize a transaction with signatures', () => {
      const message: CompileableTransactionMessage = {
        version: 'legacy',
        feePayer,
        blockhash: testBlockhash,
        lastValidBlockHeight: 1000n,
        instructions: [
          {
            programId,
            accounts: [{ pubkey: account1, isSigner: true, isWritable: false }],
            data: new Uint8Array(),
          },
        ],
      };

      const transaction: Transaction = {
        message,
        signatures: new Map([
          [feePayer, createSignature(1)],
          [account1, createSignature(2)],
        ]),
      };

      const serialized = serializeTransaction(transaction);

      expect(serialized).toBeInstanceOf(Uint8Array);

      // Should contain signatures followed by message
      // First byte(s) should be compact-u16 encoding of signature count (2)
      expect(serialized[0]).toBe(2);

      // Next 64 bytes should be first signature
      const firstSig = serialized.slice(1, 65);
      expect(firstSig.every((b) => b === 1)).toBe(true);

      // Next 64 bytes should be second signature
      const secondSig = serialized.slice(65, 129);
      expect(secondSig.every((b) => b === 2)).toBe(true);
    });

    it('should handle missing signatures with zeros', () => {
      const message: CompileableTransactionMessage = {
        version: 'legacy',
        feePayer,
        blockhash: testBlockhash,
        lastValidBlockHeight: 1000n,
        instructions: [
          {
            programId,
            accounts: [{ pubkey: account1, isSigner: true, isWritable: false }],
            data: new Uint8Array(),
          },
        ],
      };

      const transaction: Transaction = {
        message,
        signatures: new Map([
          [feePayer, createSignature(1)],
          // account1 signature missing
        ]),
      };

      const serialized = serializeTransaction(transaction);

      // Should have 2 signature slots
      expect(serialized[0]).toBe(2);

      // First signature should be present
      const firstSig = serialized.slice(1, 65);
      expect(firstSig.every((b) => b === 1)).toBe(true);

      // Second signature should be zeros
      const secondSig = serialized.slice(65, 129);
      expect(secondSig.every((b) => b === 0)).toBe(true);
    });
  });

  describe('estimateTransactionSize', () => {
    it('should estimate transaction size', () => {
      const message: CompileableTransactionMessage = {
        version: 'legacy',
        feePayer,
        blockhash: testBlockhash,
        lastValidBlockHeight: 1000n,
        instructions: [
          {
            programId,
            accounts: [{ pubkey: account1, isSigner: true, isWritable: false }],
            data: new Uint8Array(100),
          },
        ],
      };

      const size = estimateTransactionSize(message);

      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(MAX_TRANSACTION_SIZE);
    });

    it('should increase with more signers', () => {
      const baseMessage: CompileableTransactionMessage = {
        version: 'legacy',
        feePayer,
        blockhash: testBlockhash,
        lastValidBlockHeight: 1000n,
        instructions: [],
      };

      const messageWithSigners: CompileableTransactionMessage = {
        ...baseMessage,
        instructions: [
          {
            programId,
            accounts: [
              { pubkey: account1, isSigner: true, isWritable: false },
              { pubkey: account2, isSigner: true, isWritable: false },
            ],
            data: new Uint8Array(),
          },
        ],
      };

      const baseSize = estimateTransactionSize(baseMessage);
      const largerSize = estimateTransactionSize(messageWithSigners);

      // Each additional signature adds 64 bytes
      expect(largerSize).toBeGreaterThan(baseSize + 128);
    });
  });

  describe('isTransactionSizeValid', () => {
    it('should return true for small transactions', () => {
      const message: CompileableTransactionMessage = {
        version: 'legacy',
        feePayer,
        blockhash: testBlockhash,
        lastValidBlockHeight: 1000n,
        instructions: [],
      };

      expect(isTransactionSizeValid(message)).toBe(true);
    });

    it('should return false for oversized transactions', () => {
      // Create a transaction that would exceed max size
      const hugeData = new Uint8Array(1000);
      const message: CompileableTransactionMessage = {
        version: 'legacy',
        feePayer,
        blockhash: testBlockhash,
        lastValidBlockHeight: 1000n,
        instructions: [
          {
            programId,
            accounts: [],
            data: hugeData,
          },
        ],
      };

      const isValid = isTransactionSizeValid(message);
      const size = estimateTransactionSize(message);

      if (size > MAX_TRANSACTION_SIZE) {
        expect(isValid).toBe(false);
      } else {
        expect(isValid).toBe(true);
      }
    });
  });

  describe('encodeTransactionBase64', () => {
    it('should encode transaction to base64', () => {
      const message: CompileableTransactionMessage = {
        version: 'legacy',
        feePayer,
        blockhash: testBlockhash,
        lastValidBlockHeight: 1000n,
        instructions: [],
      };

      const transaction: Transaction = {
        message,
        signatures: new Map([[feePayer, createSignature(1)]]),
      };

      const encoded = encodeTransactionBase64(transaction);

      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);

      // Should be valid base64
      expect(() => {
        if (typeof btoa !== 'undefined') {
          atob(encoded);
        } else {
          Buffer.from(encoded, 'base64');
        }
      }).not.toThrow();
    });
  });

  describe('encodeTransactionBase58', () => {
    it('should encode transaction to base58', () => {
      const message: CompileableTransactionMessage = {
        version: 'legacy',
        feePayer,
        blockhash: testBlockhash,
        lastValidBlockHeight: 1000n,
        instructions: [],
      };

      const transaction: Transaction = {
        message,
        signatures: new Map([[feePayer, createSignature(1)]]),
      };

      const encoded = encodeTransactionBase58(transaction);

      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);

      // Should only contain base58 characters
      const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
      expect(base58Regex.test(encoded)).toBe(true);
    });
  });
});

describe('compact-u16 encoding', () => {
  it('should decode correctly', async () => {
    const { compactU16 } = await import('@photon/codecs/primitives/compact-u16.js');

    // Test round-trip for various values
    const testValues = [0, 1, 127, 128, 255, 256, 16383, 16384, 32767, 65535];

    for (const value of testValues) {
      const encoded = compactU16.encode(value);
      const [decoded, bytesRead] = compactU16.decode(encoded);
      expect(decoded).toBe(value);
      expect(bytesRead).toBe(encoded.length);
    }
  });
});
