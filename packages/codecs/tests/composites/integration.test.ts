import { describe, it, expect } from 'vitest';
import {
  struct,
  array,
  vec,
  option,
  enumCodec,
  enumVariant,
  some,
  none,
  lazy,
  u8,
  u16,
  u32,
  u64,
  string,
  boolean,
  fixedBytes,
  bytes,
  publicKey,
} from '../../src/index.js';
import type { Option } from '../../src/index.js';

describe('Composite Codecs Integration', () => {
  describe('Token Account Structure', () => {
    // Real-world example: Solana Token Account
    const tokenAccountCodec = struct({
      mint: publicKey, // 32 bytes
      owner: publicKey, // 32 bytes
      amount: u64, // 8 bytes
      delegate: option(publicKey), // 1 + 32 bytes (optional)
      state: u8, // 1 byte
      isNative: option(u64), // 1 + 8 bytes (optional)
      delegatedAmount: u64, // 8 bytes
      closeAuthority: option(publicKey), // 1 + 32 bytes (optional)
    });

    it('should encode and decode a complete token account', () => {
      const account = {
        mint: new Uint8Array(32).fill(0x01),
        owner: new Uint8Array(32).fill(0x02),
        amount: 1000000n,
        delegate: some(new Uint8Array(32).fill(0x03)),
        state: 1,
        isNative: none(),
        delegatedAmount: 500000n,
        closeAuthority: some(new Uint8Array(32).fill(0x04)),
      };

      const encoded = tokenAccountCodec.encode(account);
      const [decoded] = tokenAccountCodec.decode(encoded);

      expect(decoded).toEqual(account);
    });

    it('should handle minimal token account (all optionals as None)', () => {
      const account = {
        mint: new Uint8Array(32).fill(0xaa),
        owner: new Uint8Array(32).fill(0xbb),
        amount: 0n,
        delegate: none(),
        state: 0,
        isNative: none(),
        delegatedAmount: 0n,
        closeAuthority: none(),
      };

      const encoded = tokenAccountCodec.encode(account);
      const [decoded] = tokenAccountCodec.decode(encoded);

      expect(decoded).toEqual(account);
    });
  });

  describe('Transaction Message Structure', () => {
    // Complex nested structure
    const instructionCodec = struct({
      programId: publicKey,
      accounts: vec(
        struct({
          pubkey: publicKey,
          isSigner: boolean,
          isWritable: boolean,
        }),
      ),
      data: bytes,
    });

    const transactionMessageCodec = struct({
      numRequiredSignatures: u8,
      numReadonlySignedAccounts: u8,
      numReadonlyUnsignedAccounts: u8,
      accountKeys: vec(publicKey),
      recentBlockhash: fixedBytes(32),
      instructions: vec(instructionCodec),
    });

    it('should handle complex nested structures', () => {
      const message = {
        numRequiredSignatures: 2,
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: 1,
        accountKeys: [
          new Uint8Array(32).fill(0x01), // Fee payer
          new Uint8Array(32).fill(0x02), // Signer 2
          new Uint8Array(32).fill(0x03), // Program
        ],
        recentBlockhash: new Uint8Array(32).fill(0xaa),
        instructions: [
          {
            programId: new Uint8Array(32).fill(0x03),
            accounts: [
              {
                pubkey: new Uint8Array(32).fill(0x01),
                isSigner: true,
                isWritable: true,
              },
              {
                pubkey: new Uint8Array(32).fill(0x02),
                isSigner: true,
                isWritable: false,
              },
            ],
            data: new Uint8Array([1, 2, 3, 4]),
          },
        ],
      };

      const encoded = transactionMessageCodec.encode(message);
      const [decoded] = transactionMessageCodec.decode(encoded);

      expect(decoded).toEqual(message);
    });
  });

  describe('Event Log System', () => {
    // Example of using enums for event types
    const eventCodec = enumCodec({
      transfer: struct({
        from: publicKey,
        to: publicKey,
        amount: u64,
      }),
      mint: struct({
        to: publicKey,
        amount: u64,
      }),
      burn: struct({
        from: publicKey,
        amount: u64,
      }),
      approval: struct({
        owner: publicKey,
        spender: publicKey,
        amount: u64,
      }),
    });

    const logEntryCodec = struct({
      timestamp: u64,
      blockNumber: u64,
      event: eventCodec,
      signature: fixedBytes(64),
    });

    it('should handle different event types', () => {
      const transferEvent = {
        timestamp: 1634567890n,
        blockNumber: 123456n,
        event: enumVariant('transfer', 0, {
          from: new Uint8Array(32).fill(0x01),
          to: new Uint8Array(32).fill(0x02),
          amount: 1000000n,
        }),
        signature: new Uint8Array(64).fill(0xff),
      };

      const mintEvent = {
        timestamp: 1634567891n,
        blockNumber: 123457n,
        event: enumVariant('mint', 1, {
          to: new Uint8Array(32).fill(0x03),
          amount: 500000n,
        }),
        signature: new Uint8Array(64).fill(0xee),
      };

      for (const logEntry of [transferEvent, mintEvent]) {
        const encoded = logEntryCodec.encode(logEntry);
        const [decoded] = logEntryCodec.decode(encoded);

        expect(decoded).toEqual(logEntry);
      }
    });
  });

  describe('Recursive Data Structures', () => {
    // Binary tree example
    interface TreeNode {
      value: number;
      left: Option<TreeNode>;
      right: Option<TreeNode>;
    }

    const treeNodeCodec = lazy<TreeNode>(() =>
      struct({
        value: u32,
        left: option(treeNodeCodec),
        right: option(treeNodeCodec),
      }),
    );

    it('should handle recursive binary tree', () => {
      const tree: TreeNode = {
        value: 10,
        left: some({
          value: 5,
          left: some({
            value: 3,
            left: none(),
            right: none(),
          }),
          right: some({
            value: 7,
            left: none(),
            right: none(),
          }),
        }),
        right: some({
          value: 15,
          left: none(),
          right: some({
            value: 20,
            left: none(),
            right: none(),
          }),
        }),
      };

      const encoded = treeNodeCodec.encode(tree);
      const [decoded] = treeNodeCodec.decode(encoded);

      expect(decoded).toEqual(tree);
    });

    // JSON-like structure
    interface JsonValue {
      type: 'null' | 'boolean' | 'number' | 'string' | 'array' | 'object';
      data: any;
    }

    const jsonValueCodec = lazy<JsonValue>(() =>
      enumCodec({
        null: struct({}),
        boolean,
        number: u64,
        string,
        array: vec(jsonValueCodec),
        object: vec(
          struct({
            key: string,
            value: jsonValueCodec,
          }),
        ),
      }),
    );

    it('should handle JSON-like recursive structures', () => {
      // Representing: {"name": "John", "age": 30, "hobbies": ["coding", "gaming"]}
      const jsonObject: JsonValue = enumVariant('object', 5, [
        {
          key: 'name',
          value: enumVariant('string', 3, 'John'),
        },
        {
          key: 'age',
          value: enumVariant('number', 2, 30n),
        },
        {
          key: 'hobbies',
          value: enumVariant('array', 4, [
            enumVariant('string', 3, 'coding'),
            enumVariant('string', 3, 'gaming'),
          ]),
        },
      ]);

      const encoded = jsonValueCodec.encode(jsonObject);
      const [decoded] = jsonValueCodec.decode(encoded);

      expect(decoded).toEqual(jsonObject);
    });
  });

  describe('Protocol Message System', () => {
    // Example of a network protocol with versioning
    const protocolMessageCodec = struct({
      version: u8,
      messageType: u8,
      flags: u16,
      payload: bytes,
      checksum: u32,
    });

    const handshakePayloadCodec = struct({
      clientVersion: string,
      supportedFeatures: vec(string),
      publicKey: option(publicKey),
    });

    const dataPayloadCodec = struct({
      sequenceNumber: u64,
      data: bytes,
      metadata: option(
        struct({
          timestamp: u64,
          priority: u8,
          tags: vec(string),
        }),
      ),
    });

    it('should handle protocol messages with different payload types', () => {
      // Handshake message
      const handshakePayload = {
        clientVersion: 'client-v1.0.0',
        supportedFeatures: ['encryption', 'compression'],
        publicKey: some(new Uint8Array(32).fill(0x42)),
      };

      const handshakeMessage = {
        version: 1,
        messageType: 1, // Handshake
        flags: 0,
        payload: handshakePayloadCodec.encode(handshakePayload),
        checksum: 0x12345678,
      };

      // Data message
      const dataPayload = {
        sequenceNumber: 1234n,
        data: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
        metadata: some({
          timestamp: 1634567890n,
          priority: 1,
          tags: ['important', 'urgent'],
        }),
      };

      const dataMessage = {
        version: 1,
        messageType: 2, // Data
        flags: 1,
        payload: dataPayloadCodec.encode(dataPayload),
        checksum: 0x87654321,
      };

      for (const message of [handshakeMessage, dataMessage]) {
        const encoded = protocolMessageCodec.encode(message);
        const [decoded] = protocolMessageCodec.decode(encoded);

        expect(decoded).toEqual(message);
      }
    });
  });

  describe('Performance with Complex Structures', () => {
    const complexCodec = struct({
      header: struct({
        version: u32,
        flags: array(u8, 16),
        timestamp: u64,
      }),
      body: vec(
        struct({
          id: u32,
          name: string,
          data: option(bytes),
          metadata: vec(
            struct({
              key: string,
              value: string,
            }),
          ),
        }),
      ),
      signature: fixedBytes(64),
    });

    it('should handle large complex structures efficiently', () => {
      // Create a complex structure with multiple nested levels
      const largeData = {
        header: {
          version: 1,
          flags: Array.from({ length: 16 }, (_, i) => i),
          timestamp: 1634567890n,
        },
        body: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          data: i % 3 === 0 ? some(new Uint8Array([i, i + 1, i + 2])) : none(),
          metadata: [
            { key: 'type', value: 'test' },
            { key: 'index', value: i.toString() },
          ],
        })),
        signature: new Uint8Array(64).fill(0xaa),
      };

      const start = performance.now();
      const encoded = complexCodec.encode(largeData);
      const [decoded] = complexCodec.decode(encoded);
      const end = performance.now();

      expect(decoded).toEqual(largeData);
      expect(end - start).toBeLessThan(100); // Should be reasonably fast
      expect(encoded.length).toBeGreaterThan(1000); // Should be substantial
    });
  });

  describe('Error Propagation in Complex Structures', () => {
    const nestedCodec = struct({
      outer: struct({
        inner: struct({
          value: u8, // Will fail for values > 255
        }),
      }),
    });

    it('should propagate encoding errors from deeply nested structures', () => {
      const invalidData = {
        outer: {
          inner: {
            value: 256, // Invalid for u8
          },
        },
      };

      expect(() => nestedCodec.encode(invalidData)).toThrow();
    });

    it('should propagate decoding errors from deeply nested structures', () => {
      // Create data that will fail during inner decoding
      const invalidBytes = new Uint8Array([]); // Not enough bytes for the structure

      expect(() => nestedCodec.decode(invalidBytes)).toThrow();
    });
  });

  describe('Size Calculations', () => {
    const mixedCodec = struct({
      fixed: struct({
        a: u32,
        b: u16,
      }),
      variable: struct({
        text: string,
        list: vec(u32),
      }),
      optional: option(string),
    });

    it('should calculate sizes correctly for complex mixed structures', () => {
      const data1 = {
        fixed: { a: 1, b: 2 },
        variable: { text: 'hello', list: [1, 2, 3] },
        optional: some('world'),
      };

      const data2 = {
        fixed: { a: 1, b: 2 },
        variable: { text: 'hi', list: [1] },
        optional: none(),
      };

      for (const data of [data1, data2]) {
        const calculatedSize = mixedCodec.size(data);
        const encoded = mixedCodec.encode(data);

        expect(encoded.length).toBe(calculatedSize);
      }
    });
  });
});
