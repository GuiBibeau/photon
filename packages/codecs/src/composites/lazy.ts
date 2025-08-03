/**
 * Lazy codec implementation for deferred codec resolution.
 *
 * Enables creating codecs that are resolved at runtime, which is useful
 * for recursive data structures and forward references.
 */

import type { Codec, FixedSizeCodec, VariableSizeCodec } from '../codec.js';
import { isFixedSizeCodec } from '../codec.js';

/**
 * A function that returns a codec when called.
 * This allows for deferred resolution of codecs.
 */
export type LazyCodecFactory<T> = () => Codec<T>;

/**
 * Create a lazy codec that resolves its inner codec on first use.
 *
 * This is useful for recursive data structures where a codec needs to
 * reference itself, or for forward references where the codec is not
 * yet defined when the lazy codec is created.
 *
 * The inner codec is resolved once on first use and cached for subsequent
 * operations.
 *
 * @template T The type being encoded/decoded
 * @param factory Function that returns the inner codec
 * @returns A codec that lazily resolves its implementation
 *
 * @example
 * ```typescript
 * // Recursive data structure
 * interface TreeNode {
 *   value: number;
 *   children: TreeNode[];
 * }
 *
 * const treeNodeCodec: Codec<TreeNode> = lazy(() =>
 *   struct({
 *     value: u32,
 *     children: vec(treeNodeCodec), // Self-reference
 *   })
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Forward reference
 * const personCodec = lazy(() => struct({
 *   name: string,
 *   age: u32,
 *   spouse: option(personCodec), // Forward reference
 * }));
 * ```
 */
export function lazy<T>(factory: LazyCodecFactory<T>): Codec<T> {
  let resolvedCodec: Codec<T> | null = null;

  function resolve(): Codec<T> {
    if (resolvedCodec === null) {
      resolvedCodec = factory();
    }
    return resolvedCodec;
  }

  return {
    encode(value: T): Uint8Array {
      return resolve().encode(value);
    },

    decode(bytes: Uint8Array, offset = 0): readonly [T, number] {
      return resolve().decode(bytes, offset);
    },

    get size(): number | ((value: T) => number) {
      const codec = resolve();
      return codec.size;
    },
  };
}

/**
 * Create a lazy fixed-size codec.
 *
 * This is a type-safe version of the lazy codec for cases where you know
 * the resolved codec will be fixed-size. This provides better type inference
 * and compile-time guarantees.
 *
 * @template T The type being encoded/decoded
 * @param factory Function that returns a fixed-size codec
 * @returns A fixed-size codec that lazily resolves its implementation
 *
 * @example
 * ```typescript
 * const pointCodec = lazyFixed(() => struct({
 *   x: u32,
 *   y: u32,
 * }));
 * ```
 */
export function lazyFixed<T>(factory: () => FixedSizeCodec<T>): FixedSizeCodec<T> {
  let resolvedCodec: FixedSizeCodec<T> | null = null;

  function resolve(): FixedSizeCodec<T> {
    if (resolvedCodec === null) {
      const codec = factory();
      if (!isFixedSizeCodec(codec)) {
        throw new Error('lazyFixed factory must return a fixed-size codec');
      }
      resolvedCodec = codec;
    }
    return resolvedCodec;
  }

  return {
    encode(value: T): Uint8Array {
      return resolve().encode(value);
    },

    decode(bytes: Uint8Array, offset = 0): readonly [T, number] {
      return resolve().decode(bytes, offset);
    },

    get size(): number {
      return resolve().size;
    },
  };
}

/**
 * Create a lazy variable-size codec.
 *
 * This is a type-safe version of the lazy codec for cases where you know
 * the resolved codec will be variable-size. This provides better type inference
 * and compile-time guarantees.
 *
 * @template T The type being encoded/decoded
 * @param factory Function that returns a variable-size codec
 * @returns A variable-size codec that lazily resolves its implementation
 *
 * @example
 * ```typescript
 * const listCodec = lazyVariable(() => vec(string));
 * ```
 */
export function lazyVariable<T>(factory: () => VariableSizeCodec<T>): VariableSizeCodec<T> {
  let resolvedCodec: VariableSizeCodec<T> | null = null;

  function resolve(): VariableSizeCodec<T> {
    if (resolvedCodec === null) {
      const codec = factory();
      if (isFixedSizeCodec(codec)) {
        throw new Error('lazyVariable factory must return a variable-size codec');
      }
      resolvedCodec = codec;
    }
    return resolvedCodec;
  }

  return {
    encode(value: T): Uint8Array {
      return resolve().encode(value);
    },

    decode(bytes: Uint8Array, offset = 0): readonly [T, number] {
      return resolve().decode(bytes, offset);
    },

    size(value: T): number {
      return resolve().size(value);
    },
  };
}

/**
 * Create a memoized codec factory that caches codec instances.
 *
 * This is useful when you have parameterized codec factories that might
 * be called multiple times with the same parameters. The memoization
 * ensures that the same codec instance is returned for identical parameters.
 *
 * @template P The parameter type
 * @template T The codec type
 * @param factory Function that creates a codec from parameters
 * @returns A memoized version of the factory
 *
 * @example
 * ```typescript
 * const memoizedArray = memoize((size: number) => array(u32, size));
 *
 * const array5a = memoizedArray(5); // Creates new codec
 * const array5b = memoizedArray(5); // Returns cached codec
 * console.log(array5a === array5b); // true
 * ```
 */
export function memoize<P, T>(factory: (params: P) => Codec<T>): (params: P) => Codec<T> {
  const cache = new Map<string, Codec<T>>();

  return (params: P): Codec<T> => {
    const key = JSON.stringify(params);

    if (cache.has(key)) {
      const cachedCodec = cache.get(key);
      if (cachedCodec) {
        return cachedCodec;
      }
    }

    const codec = factory(params);
    cache.set(key, codec);
    return codec;
  };
}
