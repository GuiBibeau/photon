import { describe, it, expect, vi } from 'vitest';
import {
  lazy,
  lazyFixed,
  lazyVariable,
  memoize,
  struct,
  vec,
  option,
  some,
  none,
  isSome,
  isNone,
  u32,
  u16,
  string,
  isFixedSizeCodec,
  isVariableSizeCodec,
} from '../../src/index.js';
import type { Option } from '../../src/index.js';

describe('Lazy Codec', () => {
  describe('lazy() codec', () => {
    it('should resolve codec on first use', () => {
      const factory = vi.fn(() => u32);
      const lazyCodec = lazy(factory);

      // Factory should not be called yet
      expect(factory).not.toHaveBeenCalled();

      // First encode should trigger resolution
      const encoded = lazyCodec.encode(42);
      expect(factory).toHaveBeenCalledOnce();

      // Subsequent operations should not call factory again
      const [decoded] = lazyCodec.decode(encoded);
      expect(factory).toHaveBeenCalledOnce();
      expect(decoded).toBe(42);

      // Size access should not call factory again
      expect(lazyCodec.size).toBe(4);
      expect(factory).toHaveBeenCalledOnce();
    });

    it('should work with fixed-size codecs', () => {
      const lazyU32 = lazy(() => u32);

      const value = 123456;
      const encoded = lazyU32.encode(value);
      const [decoded, bytesRead] = lazyU32.decode(encoded);

      expect(decoded).toBe(value);
      expect(bytesRead).toBe(4);
      expect(encoded.length).toBe(4);
      expect(typeof lazyU32.size).toBe('number');
      expect(lazyU32.size).toBe(4);
    });

    it('should work with variable-size codecs', () => {
      const lazyString = lazy(() => string);

      const value = 'Hello, lazy world!';
      const encoded = lazyString.encode(value);
      const [decoded] = lazyString.decode(encoded);

      expect(decoded).toBe(value);
      expect(typeof lazyString.size).toBe('function');
      if (typeof lazyString.size === 'function') {
        expect(lazyString.size(value)).toBe(4 + value.length);
      }
    });

    it('should enable recursive data structures', () => {
      interface TreeNode {
        value: number;
        children: TreeNode[];
      }

      const treeNodeCodec = lazy<TreeNode>(() =>
        struct({
          value: u32,
          children: vec(treeNodeCodec), // Self-reference
        }),
      );

      const tree: TreeNode = {
        value: 1,
        children: [
          {
            value: 2,
            children: [
              { value: 4, children: [] },
              { value: 5, children: [] },
            ],
          },
          {
            value: 3,
            children: [{ value: 6, children: [] }],
          },
        ],
      };

      const encoded = treeNodeCodec.encode(tree);
      const [decoded] = treeNodeCodec.decode(encoded);

      expect(decoded).toEqual(tree);
    });

    it('should handle forward references', () => {
      interface Person {
        name: string;
        age: number;
        spouse: Option<Person>;
      }

      const personCodec = lazy<Person>(() =>
        struct({
          name: string,
          age: u32,
          spouse: option(personCodec), // Forward reference
        }),
      );

      const alice: Person = {
        name: 'Alice',
        age: 30,
        spouse: some({
          name: 'Bob',
          age: 32,
          spouse: none(), // Circular reference termination
        }),
      };

      const encoded = personCodec.encode(alice);
      const [decoded] = personCodec.decode(encoded);

      expect(decoded.name).toBe('Alice');
      expect(decoded.age).toBe(30);
      if (isSome(decoded.spouse)) {
        expect(decoded.spouse.value.name).toBe('Bob');
        expect(decoded.spouse.value.age).toBe(32);
        expect(isNone(decoded.spouse.value.spouse)).toBe(true);
      }
    });

    it('should handle deeply nested recursive structures', () => {
      interface LinkedList {
        value: number;
        next: Option<LinkedList>;
      }

      const linkedListCodec = lazy<LinkedList>(() =>
        struct({
          value: u32,
          next: option(linkedListCodec),
        }),
      );

      // Create a linked list: 1 -> 2 -> 3 -> none
      const list: LinkedList = {
        value: 1,
        next: some({
          value: 2,
          next: some({
            value: 3,
            next: none(),
          }),
        }),
      };

      const encoded = linkedListCodec.encode(list);
      const [decoded] = linkedListCodec.decode(encoded);

      // Traverse and verify
      let current: Option<LinkedList> = some(decoded);
      const values: number[] = [];
      while (isSome(current)) {
        values.push(current.value.value);
        current = current.value.next;
      }

      expect(values).toEqual([1, 2, 3]);
    });
  });

  describe('lazyFixed() codec', () => {
    it('should enforce fixed-size codec at runtime', () => {
      const validFactory = () => struct({ x: u32, y: u32 });
      const invalidFactory = () => string; // Variable-size

      const validLazy = lazyFixed(validFactory);
      const invalidLazy = lazyFixed(invalidFactory as any);

      // Valid codec should work
      expect(validLazy.encode({ x: 1, y: 2 })).toBeInstanceOf(Uint8Array);
      expect(validLazy.size).toBe(8);

      // Invalid codec should throw on first use
      expect(() => invalidLazy.encode('test')).toThrow(/must return a fixed-size codec/);
    });

    it('should provide better type inference for fixed-size codecs', () => {
      const pointCodec = lazyFixed(() =>
        struct({
          x: u32,
          y: u32,
        }),
      );

      // TypeScript should know this is FixedSizeCodec
      expect(isFixedSizeCodec(pointCodec)).toBe(true);
      expect(typeof pointCodec.size).toBe('number');
      expect(pointCodec.size).toBe(8);
    });

    it('should cache the resolved codec', () => {
      const factory = vi.fn(() => u16);
      const lazyCodec = lazyFixed(factory);

      lazyCodec.encode(42);
      lazyCodec.encode(43);
      expect(lazyCodec.size).toBe(2);

      expect(factory).toHaveBeenCalledOnce();
    });
  });

  describe('lazyVariable() codec', () => {
    it('should enforce variable-size codec at runtime', () => {
      const validFactory = () => string;
      const invalidFactory = () => u32; // Fixed-size

      const validLazy = lazyVariable(validFactory);
      const invalidLazy = lazyVariable(invalidFactory as any);

      // Valid codec should work
      expect(validLazy.encode('test')).toBeInstanceOf(Uint8Array);
      expect(validLazy.size('test')).toBe(8);

      // Invalid codec should throw on first use
      expect(() => invalidLazy.encode(42)).toThrow(/must return a variable-size codec/);
    });

    it('should provide better type inference for variable-size codecs', () => {
      const listCodec = lazyVariable(() => vec(u32));

      // TypeScript should know this is VariableSizeCodec
      expect(isVariableSizeCodec(listCodec)).toBe(true);
      expect(typeof listCodec.size).toBe('function');
    });

    it('should cache the resolved codec', () => {
      const factory = vi.fn(() => vec(u32));
      const lazyCodec = lazyVariable(factory);

      lazyCodec.encode([1, 2, 3]);
      lazyCodec.size([4, 5, 6]);

      expect(factory).toHaveBeenCalledOnce();
    });
  });

  describe('memoize() utility', () => {
    it('should cache codec instances for identical parameters', () => {
      const factory = vi.fn((_size: number) =>
        struct({
          data: vec(u32),
          padding: u32, // Dummy field that depends on size parameter
        }),
      );

      const memoizedFactory = memoize(factory);

      const codec1 = memoizedFactory(5);
      const codec2 = memoizedFactory(5); // Same parameter
      const codec3 = memoizedFactory(10); // Different parameter

      expect(codec1).toBe(codec2); // Same instance
      expect(codec1).not.toBe(codec3); // Different instance

      expect(factory).toHaveBeenCalledTimes(2); // Only called for unique parameters
    });

    it('should work with complex parameter objects', () => {
      interface Config {
        version: number;
        features: string[];
      }

      const factory = vi.fn((_config: Config) =>
        struct({
          version: u32,
          data: vec(string),
        }),
      );

      const memoizedFactory = memoize(factory);

      const config1 = { version: 1, features: ['a', 'b'] };
      const config2 = { version: 1, features: ['a', 'b'] }; // Same content
      const config3 = { version: 2, features: ['a', 'b'] }; // Different version

      const codec1 = memoizedFactory(config1);
      const codec2 = memoizedFactory(config2);
      const codec3 = memoizedFactory(config3);

      expect(codec1).toBe(codec2); // Same content, same instance
      expect(codec1).not.toBe(codec3); // Different content, different instance

      expect(factory).toHaveBeenCalledTimes(2);
    });

    it('should handle primitive parameter types', () => {
      const factory = vi.fn((_size: number) =>
        struct({
          value: u32,
        }),
      );

      const memoizedFactory = memoize(factory);

      const codec1 = memoizedFactory(4);
      const codec2 = memoizedFactory(4);
      const codec3 = memoizedFactory(8);

      expect(codec1).toBe(codec2);
      expect(codec1).not.toBe(codec3);
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it('should work with actual codec usage', () => {
      const memoizedVec = memoize((elementSize: number) => vec(elementSize === 4 ? u32 : u16));

      const vec32a = memoizedVec(4);
      const vec32b = memoizedVec(4);
      const vec16 = memoizedVec(2);

      expect(vec32a).toBe(vec32b);

      // Test actual encoding/decoding
      const data32 = [1000, 2000, 3000];
      const data16 = [100, 200, 300];

      const encoded32 = vec32a.encode(data32);
      const encoded16 = vec16.encode(data16);

      const [decoded32] = vec32a.decode(encoded32);
      const [decoded16] = vec16.decode(encoded16);

      expect(decoded32).toEqual(data32);
      expect(decoded16).toEqual(data16);
    });
  });

  describe('Error handling', () => {
    it('should propagate errors from factory functions', () => {
      const errorFactory = () => {
        throw new Error('Factory error');
      };

      const lazyCodec = lazy(errorFactory);

      expect(() => lazyCodec.encode(42)).toThrow('Factory error');
    });

    it('should propagate errors from resolved codecs', () => {
      const lazyU8 = lazy(() => u32); // Wrong codec for the data

      // This should work
      lazyU8.encode(42);

      // This should throw because 256 > u8 max (but we're using u32, so it should work)
      // Let's use actual u8 codec
      const lazyU8Real = lazy(() => ({
        encode: (value: number) => {
          if (value > 255) {
            throw new Error('Value too large for u8');
          }
          return new Uint8Array([value]);
        },
        decode: (bytes: Uint8Array, offset = 0) => [bytes[offset], 1] as const,
        size: 1,
      }));

      expect(() => lazyU8Real.encode(256)).toThrow('Value too large for u8');
    });
  });

  describe('Performance', () => {
    it('should not impact performance after resolution', () => {
      const lazyCodec = lazy(() => u32);

      // Force resolution
      lazyCodec.encode(1);

      // Now test performance (this is more about ensuring no obvious performance issues)
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        lazyCodec.encode(i);
      }
      const end = performance.now();

      // This is a basic performance smoke test
      expect(end - start).toBeLessThan(100); // Should be very fast
    });
  });
});
