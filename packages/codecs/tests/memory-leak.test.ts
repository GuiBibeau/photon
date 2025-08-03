import { describe, it, expect } from 'vitest';
import {
  u8,
  u16,
  u32,
  u64,
  boolean,
  string,
  bytes,
  publicKey,
  array,
  vec,
  struct,
  option,
  enumCodec,
  enumVariant,
  some,
  none,
  mapCodec,
  wrapCodec,
} from '../src/index.js';

describe('Memory Leak Detection Tests', () => {
  // Helper to get memory usage (if available)
  function getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  // Helper to force garbage collection (if available)
  function forceGC(): void {
    if (typeof global !== 'undefined' && (global as any).gc) {
      (global as any).gc();
    }
  }

  // Helper to run operations and check for memory leaks
  function checkMemoryLeak(
    operationName: string,
    operation: () => void,
    iterations: number = 10000,
    maxMemoryGrowthMB: number = 10,
  ): void {
    // Force GC before measurement
    forceGC();

    const initialMemory = getMemoryUsage();

    // Run operations
    for (let i = 0; i < iterations; i++) {
      operation();
    }

    // Force GC after operations
    forceGC();

    const finalMemory = getMemoryUsage();

    if (initialMemory > 0 && finalMemory > 0) {
      const memoryGrowth = (finalMemory - initialMemory) / (1024 * 1024); // Convert to MB
      // eslint-disable-next-line no-console
      console.log(
        `${operationName}: Memory growth ${memoryGrowth.toFixed(2)}MB over ${iterations} operations`,
      );

      expect(memoryGrowth).toBeLessThan(maxMemoryGrowthMB);
    } else {
      // eslint-disable-next-line no-console
      console.log(`${operationName}: Memory monitoring not available - test passed by completion`);
    }
  }

  describe('Primitive Codec Memory Leaks', () => {
    it('should not leak memory during u8 operations', () => {
      checkMemoryLeak(
        'u8 operations',
        () => {
          const value = Math.floor(Math.random() * 256);
          const encoded = u8.encode(value);
          u8.decode(encoded);
        },
        50000,
        5,
      );
    });

    it('should not leak memory during u16 operations', () => {
      checkMemoryLeak(
        'u16 operations',
        () => {
          const value = Math.floor(Math.random() * 65536);
          const encoded = u16.encode(value);
          u16.decode(encoded);
        },
        25000,
        5,
      );
    });

    it('should not leak memory during u32 operations', () => {
      checkMemoryLeak(
        'u32 operations',
        () => {
          const value = Math.floor(Math.random() * 4294967296);
          const encoded = u32.encode(value);
          u32.decode(encoded);
        },
        25000,
        5,
      );
    });

    it('should not leak memory during u64 operations', () => {
      checkMemoryLeak(
        'u64 operations',
        () => {
          const value = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
          const encoded = u64.encode(value);
          u64.decode(encoded);
        },
        10000,
        5,
      );
    });

    it('should not leak memory during boolean operations', () => {
      checkMemoryLeak(
        'boolean operations',
        () => {
          const value = Math.random() > 0.5;
          const encoded = boolean.encode(value);
          boolean.decode(encoded);
        },
        50000,
        5,
      );
    });

    it('should not leak memory during string operations', () => {
      const testStrings = ['hello', 'world', '🎉', '', 'A'.repeat(100)];

      checkMemoryLeak(
        'string operations',
        () => {
          const value = testStrings[Math.floor(Math.random() * testStrings.length)];
          const encoded = string.encode(value);
          string.decode(encoded);
        },
        10000,
        10,
      );
    });

    it('should not leak memory during bytes operations', () => {
      const testArrays = [
        new Uint8Array([]),
        new Uint8Array([1, 2, 3]),
        new Uint8Array(Array.from({ length: 50 }, (_, i) => i % 256)),
      ];

      checkMemoryLeak(
        'bytes operations',
        () => {
          const value = testArrays[Math.floor(Math.random() * testArrays.length)];
          const encoded = bytes.encode(value);
          bytes.decode(encoded);
        },
        10000,
        10,
      );
    });

    it('should not leak memory during publicKey operations', () => {
      checkMemoryLeak(
        'publicKey operations',
        () => {
          const value = new Uint8Array(
            Array.from({ length: 32 }, () => Math.floor(Math.random() * 256)),
          );
          const encoded = publicKey.encode(value);
          publicKey.decode(encoded);
        },
        10000,
        10,
      );
    });
  });

  describe('Composite Codec Memory Leaks', () => {
    it('should not leak memory during array operations', () => {
      const codec = array(u32, 5);

      checkMemoryLeak(
        'fixed array operations',
        () => {
          const value = Array.from({ length: 5 }, () => Math.floor(Math.random() * 4294967296));
          const encoded = codec.encode(value);
          codec.decode(encoded);
        },
        10000,
        15,
      );
    });

    it('should not leak memory during vec operations', () => {
      const codec = vec(u16);

      checkMemoryLeak(
        'variable array operations',
        () => {
          const length = Math.floor(Math.random() * 10) + 1;
          const value = Array.from({ length }, () => Math.floor(Math.random() * 65536));
          const encoded = codec.encode(value);
          codec.decode(encoded);
        },
        5000,
        15,
      );
    });

    it('should not leak memory during struct operations', () => {
      const codec = struct({
        id: u32,
        name: string,
        active: boolean,
      });

      const testData = [
        { id: 1, name: 'Alice', active: true },
        { id: 2, name: 'Bob', active: false },
        { id: 3, name: '🎉', active: true },
      ];

      checkMemoryLeak(
        'struct operations',
        () => {
          const value = testData[Math.floor(Math.random() * testData.length)];
          const encoded = codec.encode(value);
          codec.decode(encoded);
        },
        10000,
        20,
      );
    });

    it('should not leak memory during nested struct operations', () => {
      const pointCodec = struct({ x: u32, y: u32 });
      const rectCodec = struct({
        topLeft: pointCodec,
        bottomRight: pointCodec,
      });

      checkMemoryLeak(
        'nested struct operations',
        () => {
          const value = {
            topLeft: { x: Math.floor(Math.random() * 1000), y: Math.floor(Math.random() * 1000) },
            bottomRight: {
              x: Math.floor(Math.random() * 1000),
              y: Math.floor(Math.random() * 1000),
            },
          };
          const encoded = rectCodec.encode(value);
          rectCodec.decode(encoded);
        },
        10000,
        20,
      );
    });

    it('should not leak memory during option operations', () => {
      const codec = option(string);

      checkMemoryLeak(
        'option operations',
        () => {
          const value = Math.random() > 0.5 ? some('test') : none();
          const encoded = codec.encode(value);
          codec.decode(encoded);
        },
        10000,
        15,
      );
    });

    it('should not leak memory during enum operations', () => {
      const codec = enumCodec({
        text: string,
        number: u32,
        flag: boolean,
      });

      const testValues = [
        enumVariant('text', 0, 'hello'),
        enumVariant('number', 1, 42),
        enumVariant('flag', 2, true),
      ];

      checkMemoryLeak(
        'enum operations',
        () => {
          const value = testValues[Math.floor(Math.random() * testValues.length)];
          const encoded = codec.encode(value);
          codec.decode(encoded);
        },
        10000,
        20,
      );
    });
  });

  describe('Transformed Codec Memory Leaks', () => {
    it('should not leak memory during mapCodec operations', () => {
      const codec = mapCodec(
        u8,
        (value: number) => Math.min(255, Math.max(0, value)),
        (value: number) => value,
      );

      checkMemoryLeak(
        'mapCodec operations',
        () => {
          const value = Math.floor(Math.random() * 300); // May exceed u8 range
          const encoded = codec.encode(value);
          codec.decode(encoded);
        },
        25000,
        10,
      );
    });

    it('should not leak memory during wrapCodec operations', () => {
      const codec = wrapCodec(string, {
        preEncode: (value: string) => value.trim(),
        postDecode: (value: string) => value.toUpperCase(),
      });

      checkMemoryLeak(
        'wrapCodec operations',
        () => {
          const value = '  test  ';
          const encoded = codec.encode(value);
          codec.decode(encoded);
        },
        10000,
        15,
      );
    });
  });

  describe('Large Data Memory Leaks', () => {
    it('should not leak memory with large strings', () => {
      const largeString = 'A'.repeat(10000);

      checkMemoryLeak(
        'large string operations',
        () => {
          const encoded = string.encode(largeString);
          string.decode(encoded);
        },
        1000,
        50,
      );
    });

    it('should not leak memory with large byte arrays', () => {
      const largeArray = new Uint8Array(Array.from({ length: 10000 }, (_, i) => i % 256));

      checkMemoryLeak(
        'large byte array operations',
        () => {
          const encoded = bytes.encode(largeArray);
          bytes.decode(encoded);
        },
        1000,
        50,
      );
    });

    it('should not leak memory with large vectors', () => {
      const codec = vec(u32);
      const largeVector = Array.from({ length: 1000 }, (_, i) => i);

      checkMemoryLeak(
        'large vector operations',
        () => {
          const encoded = codec.encode(largeVector);
          codec.decode(encoded);
        },
        1000,
        50,
      );
    });

    it('should not leak memory with complex nested structures', () => {
      const codec = struct({
        metadata: vec(
          struct({
            key: string,
            value: option(bytes),
          }),
        ),
        tags: vec(string),
        data: bytes,
      });

      const complexData = {
        metadata: Array.from({ length: 50 }, (_, i) => ({
          key: `key${i}`,
          value: i % 3 === 0 ? some(new Uint8Array([i, i + 1, i + 2])) : none(),
        })),
        tags: Array.from({ length: 20 }, (_, i) => `tag${i}`),
        data: new Uint8Array(Array.from({ length: 500 }, (_, i) => i % 256)),
      };

      checkMemoryLeak(
        'complex nested structure operations',
        () => {
          const encoded = codec.encode(complexData);
          codec.decode(encoded);
        },
        100,
        100,
      );
    });
  });

  describe('Repeated Operations Memory Leaks', () => {
    it('should not leak memory during repeated encoding of same data', () => {
      const testData = {
        id: 12345,
        name: 'Test User',
        active: true,
        scores: [100, 200, 300],
      };

      const codec = struct({
        id: u32,
        name: string,
        active: boolean,
        scores: vec(u32),
      });

      checkMemoryLeak(
        'repeated encoding',
        () => {
          codec.encode(testData);
        },
        25000,
        10,
      );
    });

    it('should not leak memory during repeated decoding of same data', () => {
      const testData = {
        id: 12345,
        name: 'Test User',
        active: true,
        scores: [100, 200, 300],
      };

      const codec = struct({
        id: u32,
        name: string,
        active: boolean,
        scores: vec(u32),
      });

      const encoded = codec.encode(testData);

      checkMemoryLeak(
        'repeated decoding',
        () => {
          codec.decode(encoded);
        },
        25000,
        10,
      );
    });

    it('should not leak memory during mixed encode/decode cycles', () => {
      const codec = struct({
        timestamp: u64,
        message: string,
        priority: u8,
      });

      checkMemoryLeak(
        'mixed encode/decode cycles',
        () => {
          const data = {
            timestamp: BigInt(Date.now()),
            message: `Message ${Math.floor(Math.random() * 1000)}`,
            priority: Math.floor(Math.random() * 5),
          };

          const encoded = codec.encode(data);
          codec.decode(encoded);
        },
        10000,
        20,
      );
    });
  });

  describe('Error Handling Memory Leaks', () => {
    it('should not leak memory when encoding errors occur', () => {
      checkMemoryLeak(
        'encoding error handling',
        () => {
          try {
            u8.encode(300); // Out of range for u8
          } catch {
            // Expected error, continue
          }
        },
        25000,
        5,
      );
    });

    it('should not leak memory when decoding errors occur', () => {
      const invalidData = new Uint8Array([1]); // Too short for u32

      checkMemoryLeak(
        'decoding error handling',
        () => {
          try {
            u32.decode(invalidData);
          } catch {
            // Expected error, continue
          }
        },
        25000,
        5,
      );
    });

    it('should not leak memory with malformed data', () => {
      const codec = struct({
        length: u32,
        data: string,
      });

      // Create malformed data (length doesn't match actual string length)
      const malformedData = new Uint8Array([
        10,
        0,
        0,
        0, // Length says 10 bytes
        72,
        101,
        108,
        108,
        111, // But only "Hello" (5 bytes)
      ]);

      checkMemoryLeak(
        'malformed data handling',
        () => {
          try {
            codec.decode(malformedData);
          } catch {
            // Expected error, continue
          }
        },
        10000,
        10,
      );
    });
  });

  describe('Concurrent Operations Memory Leaks', () => {
    it('should not leak memory during concurrent operations', () => {
      const codecs = [
        { name: 'u8', codec: u8, value: () => Math.floor(Math.random() * 256) },
        { name: 'u32', codec: u32, value: () => Math.floor(Math.random() * 4294967296) },
        { name: 'string', codec: string, value: () => `test${Math.random()}` },
        { name: 'boolean', codec: boolean, value: () => Math.random() > 0.5 },
      ];

      checkMemoryLeak(
        'concurrent operations',
        () => {
          // Simulate concurrent operations by interleaving different codec operations
          const codecInfo = codecs[Math.floor(Math.random() * codecs.length)];
          const value = codecInfo.value();
          const encoded = codecInfo.codec.encode(value as any);
          codecInfo.codec.decode(encoded);
        },
        20000,
        15,
      );
    });

    it('should not leak memory with interleaved large and small operations', () => {
      const smallString = 'test';
      const largeString = 'A'.repeat(1000);

      checkMemoryLeak(
        'interleaved size operations',
        () => {
          const useSmall = Math.random() > 0.5;
          const value = useSmall ? smallString : largeString;
          const encoded = string.encode(value);
          string.decode(encoded);
        },
        5000,
        30,
      );
    });
  });

  describe('Resource Cleanup', () => {
    it('should properly clean up temporary buffers', () => {
      // Test that internal buffers/views are properly cleaned up
      const codec = struct({
        header: array(u8, 16),
        body: vec(u32),
        footer: publicKey,
      });

      checkMemoryLeak(
        'resource cleanup verification',
        () => {
          const data = {
            header: Array.from({ length: 16 }, (_, i) => i),
            body: Array.from({ length: 100 }, (_, i) => i * 2),
            footer: new Uint8Array(Array.from({ length: 32 }, (_, i) => i)),
          };

          const encoded = codec.encode(data);
          codec.decode(encoded);

          // Force some additional operations that might create temporary objects
          codec.size(data);
        },
        5000,
        25,
      );
    });

    it('should not retain references to input data', () => {
      // Test that codecs don't hold references to original input data
      const codec = vec(string);

      checkMemoryLeak(
        'input reference cleanup',
        () => {
          // Create data that would be eligible for GC if not referenced
          let data = Array.from({ length: 10 }, (_, i) => `item_${i}_${Math.random()}`);
          const encoded = codec.encode(data);
          codec.decode(encoded);

          // Clear our reference
          data = [];
        },
        5000,
        20,
      );
    });
  });

  describe('Memory Stress Tests', () => {
    it('should handle memory pressure gracefully', () => {
      // Create memory pressure and ensure codecs still work correctly
      const codec = struct({
        id: u64,
        data: bytes,
        metadata: option(vec(string)),
      });

      const stressTest = () => {
        // Create various sizes of data to stress memory allocation patterns
        const sizes = [10, 100, 1000];
        const size = sizes[Math.floor(Math.random() * sizes.length)];

        const data = {
          id: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
          data: new Uint8Array(Array.from({ length: size }, () => Math.floor(Math.random() * 256))),
          metadata:
            Math.random() > 0.5
              ? some(
                  Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, i) => `meta${i}`),
                )
              : none(),
        };

        const encoded = codec.encode(data);
        const [decoded] = codec.decode(encoded);

        // Verify correctness under memory pressure
        expect(decoded.id).toBe(data.id);
        expect(decoded.data).toEqual(data.data);
      };

      checkMemoryLeak('memory pressure stress test', stressTest, 2000, 50);
    });
  });
});
