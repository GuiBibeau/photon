/**
 * @photon/codecs - Binary serialization codecs for Photon SDK
 *
 * This package provides a composable, type-safe interface for encoding and
 * decoding binary data, forming the foundation for all binary serialization
 * in the Photon SDK.
 */

// Core codec interfaces and types
export type { Codec, FixedSizeCodec, VariableSizeCodec } from './codec.js';

export { isFixedSizeCodec, isVariableSizeCodec, getCodecSize } from './codec.js';

// Composition utilities
export { mapCodec, wrapCodec, constantCodec } from './composition.js';

// Error handling
export {
  CodecError,
  InsufficientBytesError,
  InvalidDataError,
  assertSufficientBytes,
  assertValidOffset,
} from './errors.js';

// Primitive codecs
export {
  // Numeric
  u8,
  u16,
  u32,
  u64,
  i8,
  i16,
  i32,
  i64,
  // Bytes
  fixedBytes,
  bytes,
  bytesWithCustomSize,
  publicKey,
  // String
  string,
  stringWithCustomSize,
  fixedString,
  // Boolean
  boolean,
} from './primitives/index.js';

// Composite codecs
export {
  // Struct codec for object composition
  struct,
  // Array codecs for collections
  array,
  vec,
  set,
  // Option codec for optional values
  option,
  nullable,
  some,
  none,
  isSome,
  isNone,
  unwrap,
  unwrapOr,
  // Enum codec for tagged unions
  enumCodec,
  simpleEnum,
  enumVariant,
  // Lazy codec for deferred resolution
  lazy,
  lazyFixed,
  lazyVariable,
  memoize,
} from './composites/index.js';

// Export composite codec types
export type {
  // Struct types
  StructFields,
  InferStructType,
  // Option types
  Option,
  Some,
  None,
  // Enum types
  EnumVariants,
  VariantNames,
  EnumVariant,
  EnumType,
  // Lazy types
  LazyCodecFactory,
} from './composites/index.js';
