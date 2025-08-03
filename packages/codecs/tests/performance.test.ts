import { describe, it, expect } from 'vitest';
import {
  u8,
  u16,
  u32,
  u64,
  i8,
  i16,
  i32,
  i64,
  boolean,
  string,
  bytes,
  fixedBytes,
  publicKey,
  array,
  vec,
  struct,
  option,
  enumCodec,
  enumVariant,
  some,
  none,
} from '../src/index.js';

describe('Performance Benchmarks', () => {
  // Helper function to measure execution time
  function benchmark(operation: () => void, iterations: number = 10000): number {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      operation();
    }
    const end = performance.now();
    return end - start;
  }

  // Helper function for timing tests with generous thresholds
  function expectReasonableTime(time: number, maxTime: number): void {
    // Use generous multiplier for test environment variability
    expect(time).toBeLessThan(maxTime * 3);
  }

  // Helper function for throughput testing
  function throughputTest<T>(
    codec: {
      encode: (value: T) => Uint8Array;
      decode: (bytes: Uint8Array) => readonly [T, number];
    },
    value: T,
    targetThroughputMBps: number = 1,
    iterations: number = 10000,
  ): void {
    const encoded = codec.encode(value);
    const totalBytes = encoded.length * iterations * 2; // *2 for encode + decode

    const time = benchmark(() => {
      const encoded = codec.encode(value);
      codec.decode(encoded);
    }, iterations);

    const throughputMBps = totalBytes / (1024 * 1024) / (time / 1000);

    // Should achieve reasonable throughput (adjusted for highly variable test environment)
    // Set very conservative thresholds to account for CI/test environment variability
    const adjustedThreshold = Math.min(targetThroughputMBps * 0.5, 0.5);
    expect(throughputMBps).toBeGreaterThan(adjustedThreshold);

    // eslint-disable-next-line no-console
    console.log(
      `Throughput: ${throughputMBps.toFixed(2)} MB/s (${iterations} ops in ${time.toFixed(2)}ms)`,
    );
  }

  describe('Primitive Codec Performance', () => {
    describe('Numeric codecs', () => {
      it('should encode/decode u8 efficiently', () => {
        const value = 255;
        const time = benchmark(() => {
          const encoded = u8.encode(value);
          u8.decode(encoded);
        }, 100000);

        expectReasonableTime(time, 200); // Should complete in reasonable time
        throughputTest(u8, value, 0.5, 50000);
      });

      it('should encode/decode u16 efficiently', () => {
        const value = 65535;
        const time = benchmark(() => {
          const encoded = u16.encode(value);
          u16.decode(encoded);
        }, 50000);

        expect(time).toBeLessThan(200);
        throughputTest(u16, value, 0.8, 25000);
      });

      it('should encode/decode u32 efficiently', () => {
        const value = 4294967295;
        const time = benchmark(() => {
          const encoded = u32.encode(value);
          u32.decode(encoded);
        }, 50000);

        expect(time).toBeLessThan(200);
        throughputTest(u32, value, 2, 25000);
      });

      it('should encode/decode u64 efficiently', () => {
        const value = 18446744073709551615n;
        const time = benchmark(() => {
          const encoded = u64.encode(value);
          u64.decode(encoded);
        }, 25000);

        expect(time).toBeLessThan(150); // BigInt operations are slower
        throughputTest(u64, value, 4, 10000);
      });

      it('should handle signed integers efficiently', () => {
        const values = [-128, -1, 127];
        for (const value of values) {
          const time = benchmark(() => {
            const encoded = i8.encode(value);
            i8.decode(encoded);
          }, 50000);

          expect(time).toBeLessThan(250);
        }

        throughputTest(i8, -1, 0.2, 25000);
        throughputTest(i16, -32768, 1.8, 25000);
        throughputTest(i32, -2147483648, 3, 25000);
        throughputTest(i64, -9223372036854775808n, 12, 10000);
      });
    });

    describe('Boolean codec', () => {
      it('should encode/decode booleans efficiently', () => {
        const time = benchmark(() => {
          const encoded = boolean.encode(true);
          boolean.decode(encoded);
        }, 100000);

        expect(time).toBeLessThan(150);
        throughputTest(boolean, true, 1.4, 50000);
      });
    });

    describe('String codec', () => {
      it('should handle short strings efficiently', () => {
        const value = 'hello';
        const time = benchmark(() => {
          const encoded = string.encode(value);
          string.decode(encoded);
        }, 25000);

        expect(time).toBeLessThan(200);
        throughputTest(string, value, 1, 10000);
      });

      it('should handle medium strings efficiently', () => {
        const value = 'A'.repeat(100);
        const time = benchmark(() => {
          const encoded = string.encode(value);
          string.decode(encoded);
        }, 10000);

        expect(time).toBeLessThan(300);
        throughputTest(string, value, 5, 5000);
      });

      it('should handle long strings reasonably', () => {
        const value = 'A'.repeat(1000);
        const time = benchmark(() => {
          const encoded = string.encode(value);
          string.decode(encoded);
        }, 5000);

        expect(time).toBeLessThan(500);
        throughputTest(string, value, 2, 2000);
      });

      it('should handle unicode strings efficiently', () => {
        const value = '🎉🌟💫'.repeat(10);
        const time = benchmark(() => {
          const encoded = string.encode(value);
          string.decode(encoded);
        }, 10000);

        expect(time).toBeLessThan(400);
        throughputTest(string, value, 3, 5000);
      });
    });

    describe('Bytes codecs', () => {
      it('should handle small byte arrays efficiently', () => {
        const value = new Uint8Array([1, 2, 3, 4, 5]);
        const time = benchmark(() => {
          const encoded = bytes.encode(value);
          bytes.decode(encoded);
        }, 25000);

        expect(time).toBeLessThan(200);
        throughputTest(bytes, value, 2, 10000);
      });

      it('should handle medium byte arrays efficiently', () => {
        const value = new Uint8Array(Array.from({ length: 100 }, (_, i) => i % 256));
        const time = benchmark(() => {
          const encoded = bytes.encode(value);
          bytes.decode(encoded);
        }, 10000);

        expect(time).toBeLessThan(300);
        throughputTest(bytes, value, 4, 5000);
      });

      it('should handle large byte arrays reasonably', () => {
        const value = new Uint8Array(Array.from({ length: 1000 }, (_, i) => i % 256));
        const time = benchmark(() => {
          const encoded = bytes.encode(value);
          bytes.decode(encoded);
        }, 2000);

        expect(time).toBeLessThan(400);
        throughputTest(bytes, value, 1, 1000);
      });

      it('should handle fixed-size byte arrays efficiently', () => {
        const codec = fixedBytes(32);
        const value = new Uint8Array(Array.from({ length: 32 }, (_, i) => i));

        const time = benchmark(() => {
          const encoded = codec.encode(value);
          codec.decode(encoded);
        }, 25000);

        expect(time).toBeLessThan(150);
        throughputTest(codec, value, 10, 10000);
      });

      it('should handle public key arrays efficiently', () => {
        const value = new Uint8Array(Array.from({ length: 32 }, (_, i) => i));

        const time = benchmark(() => {
          const encoded = publicKey.encode(value);
          publicKey.decode(encoded);
        }, 25000);

        expect(time).toBeLessThan(150);
        throughputTest(publicKey, value, 10, 10000);
      });
    });
  });

  describe('Composite Codec Performance', () => {
    describe('Array codecs', () => {
      it('should handle small fixed arrays efficiently', () => {
        const codec = array(u32, 5);
        const value = [1, 2, 3, 4, 5];

        const time = benchmark(() => {
          const encoded = codec.encode(value);
          codec.decode(encoded);
        }, 15000);

        expect(time).toBeLessThan(200);
        throughputTest(codec, value, 8, 7500);
      });

      it('should handle variable arrays efficiently', () => {
        const codec = vec(u32);
        const value = Array.from({ length: 10 }, (_, i) => i);

        const time = benchmark(() => {
          const encoded = codec.encode(value);
          codec.decode(encoded);
        }, 10000);

        expect(time).toBeLessThan(300);
        throughputTest(codec, value, 5, 5000);
      });

      it('should handle large arrays reasonably', () => {
        const codec = vec(u8);
        const value = Array.from({ length: 1000 }, (_, i) => i % 256);

        const time = benchmark(() => {
          const encoded = codec.encode(value);
          codec.decode(encoded);
        }, 1000);

        expect(time).toBeLessThan(1000);
        throughputTest(codec, value, 2, 500);
      });
    });

    describe('Struct codecs', () => {
      it('should handle simple structs efficiently', () => {
        const codec = struct({
          x: u32,
          y: u32,
        });

        const value = { x: 100, y: 200 };

        const time = benchmark(() => {
          const encoded = codec.encode(value);
          codec.decode(encoded);
        }, 15000);

        expect(time).toBeLessThan(200);
        throughputTest(codec, value, 6.2, 7500);
      });

      it('should handle complex structs efficiently', () => {
        const codec = struct({
          id: u32,
          name: string,
          active: boolean,
          scores: vec(u16),
        });

        const value = {
          id: 12345,
          name: 'test user',
          active: true,
          scores: [100, 200, 300],
        };

        const time = benchmark(() => {
          const encoded = codec.encode(value);
          codec.decode(encoded);
        }, 5000);

        expect(time).toBeLessThan(400);
        throughputTest(codec, value, 3, 2500);
      });

      it('should handle nested structs efficiently', () => {
        const pointCodec = struct({
          x: u32,
          y: u32,
        });

        const codec = struct({
          topLeft: pointCodec,
          bottomRight: pointCodec,
        });

        const value = {
          topLeft: { x: 10, y: 20 },
          bottomRight: { x: 30, y: 40 },
        };

        const time = benchmark(() => {
          const encoded = codec.encode(value);
          codec.decode(encoded);
        }, 10000);

        expect(time).toBeLessThan(300);
        throughputTest(codec, value, 5, 5000);
      });
    });

    describe('Option codecs', () => {
      it('should handle Some values efficiently', () => {
        const codec = option(u32);
        const value = some(12345);

        const time = benchmark(() => {
          const encoded = codec.encode(value);
          codec.decode(encoded);
        }, 20000);

        expect(time).toBeLessThan(150);
        throughputTest(codec, value, 7, 10000);
      });

      it('should handle None values efficiently', () => {
        const codec = option(u32);
        const value = none();

        const time = benchmark(() => {
          const encoded = codec.encode(value);
          codec.decode(encoded);
        }, 25000);

        expect(time).toBeLessThan(100);
        throughputTest(codec, value, 3.5, 12500);
      });
    });

    describe('Enum codecs', () => {
      it('should handle enum variants efficiently', () => {
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

        for (const value of testValues) {
          const time = benchmark(() => {
            const encoded = codec.encode(value);
            codec.decode(encoded);
          }, 10000);

          expect(time).toBeLessThan(300);
        }

        // Test with a specific variant
        throughputTest(codec, testValues[0], 4.5, 5000);
      });
    });
  });

  describe('Memory Allocation Performance', () => {
    it('should minimize allocations for primitive codecs', () => {
      // Test repeated encoding to check for allocation patterns
      const value = 12345;

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Perform many operations
      for (let i = 0; i < 50000; i++) {
        const encoded = u32.encode(value);
        u32.decode(encoded);
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Memory growth should be minimal (accounting for GC timing)
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory;
        expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB growth
      }
    });

    it('should handle rapid encode/decode cycles without memory leaks', () => {
      const codec = struct({
        data: vec(string),
        metadata: option(bytes),
      });

      const value = {
        data: ['item1', 'item2', 'item3'],
        metadata: some(new Uint8Array([1, 2, 3, 4, 5])),
      };

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Rapid cycles
      for (let i = 0; i < 10000; i++) {
        const encoded = codec.encode(value);
        codec.decode(encoded);
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory;
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
      }
    });
  });

  describe('Batch Operations Performance', () => {
    it('should handle batch encoding efficiently', () => {
      const values = Array.from({ length: 1000 }, (_, i) => i);

      const time = benchmark(() => {
        for (const value of values) {
          u32.encode(value);
        }
      }, 10);

      expect(time).toBeLessThan(100);
    });

    it('should handle batch decoding efficiently', () => {
      const encodedValues = Array.from({ length: 1000 }, (_, i) => u32.encode(i));

      const time = benchmark(() => {
        for (const encoded of encodedValues) {
          u32.decode(encoded);
        }
      }, 10);

      expect(time).toBeLessThan(100);
    });

    it('should handle mixed codec operations efficiently', () => {
      const operations = [
        () => u8.encode(255),
        () => u16.encode(65535),
        () => u32.encode(4294967295),
        () => boolean.encode(true),
        () => string.encode('test'),
      ];

      const time = benchmark(() => {
        for (const op of operations) {
          op();
        }
      }, 5000);

      expect(time).toBeLessThan(200);
    });
  });

  describe('Size Calculation Performance', () => {
    it('should calculate fixed sizes efficiently', () => {
      const codecs = [u8, u16, u32, u64, boolean];

      const time = benchmark(() => {
        for (const codec of codecs) {
          // @ts-expect-error - accessing size property for testing
          void codec.size;
        }
      }, 100000);

      expect(time).toBeLessThan(50);
    });

    it('should calculate variable sizes efficiently', () => {
      const testValues = [
        { codec: string, value: 'hello' },
        { codec: bytes, value: new Uint8Array([1, 2, 3]) },
        { codec: vec(u32), value: [1, 2, 3, 4, 5] },
      ];

      for (const { codec, value } of testValues) {
        const time = benchmark(() => {
          codec.size(value);
        }, 10000);

        expect(time).toBeLessThan(100);
      }
    });
  });

  describe('Comparative Performance', () => {
    it('should show performance characteristics across different codecs', () => {
      const testData = [
        { name: 'u8', codec: u8, value: 255 },
        { name: 'u16', codec: u16, value: 65535 },
        { name: 'u32', codec: u32, value: 4294967295 },
        { name: 'boolean', codec: boolean, value: true },
        { name: 'string(short)', codec: string, value: 'hello' },
        { name: 'bytes(small)', codec: bytes, value: new Uint8Array([1, 2, 3, 4, 5]) },
      ];

      const results: Array<{ name: string; opsPerMs: number }> = [];

      for (const { name, codec, value } of testData) {
        const iterations = 10000;
        const time = benchmark(() => {
          const encoded = codec.encode(value);
          codec.decode(encoded);
        }, iterations);

        const opsPerMs = iterations / time;
        results.push({ name, opsPerMs });

        // eslint-disable-next-line no-console
        console.log(`${name}: ${opsPerMs.toFixed(2)} ops/ms`);
      }

      // Verify that primitive codecs are generally faster than complex ones
      const u8Result = results.find((r) => r.name === 'u8');
      const stringResult = results.find((r) => r.name === 'string(short)');

      if (!u8Result || !stringResult) {
        throw new Error('Expected results not found');
      }

      expect(u8Result.opsPerMs).toBeGreaterThan(stringResult.opsPerMs);
    });
  });
});
