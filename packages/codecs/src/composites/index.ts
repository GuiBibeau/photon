/**
 * Composite codec implementations for complex data structures.
 *
 * This module provides utilities for composing primitive codecs into
 * complex data structures like structs, arrays, options, enums, and more.
 */

// Struct codec for object composition
export { struct } from './struct.js';
export type { StructFields, InferStructType } from './struct.js';

// Array codecs for collections
export { array, vec, set } from './array.js';

// Option codec for optional values
export { option, nullable, some, none, isSome, isNone, unwrap, unwrapOr } from './option.js';
export type { Option, Some, None } from './option.js';

// Enum codec for tagged unions
export { enumCodec, simpleEnum, enumVariant } from './enum.js';
export type { EnumVariants, VariantNames, EnumVariant, EnumType } from './enum.js';

// Lazy codec for deferred resolution
export { lazy, lazyFixed, lazyVariable, memoize } from './lazy.js';
export type { LazyCodecFactory } from './lazy.js';
