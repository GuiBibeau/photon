# @photon/codecs

Type-safe binary serialization for Solana. Composable codecs for encoding/decoding data structures.

## Installation

```bash
npm install @photon/codecs
```

## First create a codec

```typescript
import { u8, u32, string, struct } from '@photon/codecs';

// Define a codec for your data structure
const personCodec = struct({
  age: u8,
  id: u32,
  name: string
});

// Encode to bytes
const bytes = personCodec.encode({ 
  age: 25, 
  id: 12345, 
  name: 'Alice' 
});

// Decode from bytes
const [person, bytesRead] = personCodec.decode(bytes);
console.log(person); // { age: 25, id: 12345, name: 'Alice' }
```

## Core Concepts

### Codec Interface

All codecs implement a common interface:

```typescript
interface Codec<T> {
  encode(value: T): Uint8Array;
  decode(bytes: Uint8Array, offset?: number): readonly [T, number];
  size: number | ((value: T) => number);
}
```

### Fixed vs Variable Size

Codecs can be fixed-size or variable-size:

```typescript
import { isFixedSizeCodec, getCodecSize } from '@photon/codecs';

const u32Codec = u32;           // Fixed size: 4 bytes
const stringCodec = string;     // Variable size

console.log(isFixedSizeCodec(u32Codec));     // true
console.log(isFixedSizeCodec(stringCodec));  // false

// Get size
console.log(getCodecSize(u32Codec));         // 4
console.log(getCodecSize(stringCodec, 'hi')); // 6 (4 bytes length + 2 chars)
```

## Primitive Codecs

### Numbers

```typescript
import { u8, u16, u32, u64, i8, i16, i32, i64 } from '@photon/codecs';

// Unsigned integers
const age = u8.encode(25);           // 1 byte
const year = u16.encode(2024);       // 2 bytes  
const timestamp = u32.encode(Date.now() / 1000); // 4 bytes
const amount = u64.encode(1000000n); // 8 bytes (BigInt)

// Signed integers
const temperature = i8.encode(-10);  // 1 byte
const altitude = i16.encode(-500);   // 2 bytes
```

### Strings

```typescript
import { string, fixedString, stringWithCustomSize } from '@photon/codecs';

// Variable-length string (u32 length prefix)
const nameCodec = string;
const nameBytes = nameCodec.encode('Alice');

// Fixed-length string (no length prefix)
const tickerCodec = fixedString(4);
const ticker = tickerCodec.encode('USDC'); // Exactly 4 bytes

// Custom length prefix (u8 instead of u32)
const shortStringCodec = stringWithCustomSize(u8);
const short = shortStringCodec.encode('Hi'); // 1 byte length + 2 bytes
```

### Bytes

```typescript
import { bytes, fixedBytes, publicKey } from '@photon/codecs';

// Variable-length bytes
const dataCodec = bytes;
const data = dataCodec.encode(new Uint8Array([1, 2, 3]));

// Fixed-length bytes
const hashCodec = fixedBytes(32);
const hash = hashCodec.encode(new Uint8Array(32));

// Public key (32 bytes)
const pubkeyCodec = publicKey;
const pubkey = pubkeyCodec.encode(keypairBytes);
```

### Boolean

```typescript
import { boolean } from '@photon/codecs';

const boolCodec = boolean;
const trueByte = boolCodec.encode(true);   // [0x01]
const falseByte = boolCodec.encode(false); // [0x00]
```

### Base58

```typescript
import { base58, base58String, encodeBase58, decodeBase58 } from '@photon/codecs';

// Base58 codec (bytes <-> base58)
const addressCodec = base58;
const addressBytes = addressCodec.encode('11111111111111111111111111111112');

// Standalone functions
const encoded = encodeBase58(new Uint8Array([1, 2, 3]));
const decoded = decodeBase58('Ldp');

// Validation
import { isBase58 } from '@photon/codecs';
console.log(isBase58('valid58string')); // true
```

## Composite Codecs

### Structs

```typescript
import { struct, u8, u32, string, boolean } from '@photon/codecs';

const accountCodec = struct({
  version: u8,
  owner: publicKey,
  balance: u64,
  name: string,
  isActive: boolean
});

const account = {
  version: 1,
  owner: ownerPubkey,
  balance: 1000000n,
  name: 'Main Account',
  isActive: true
};

const bytes = accountCodec.encode(account);
const [decoded, bytesRead] = accountCodec.decode(bytes);
```

### Arrays

```typescript
import { array, vec, set, u8, u32 } from '@photon/codecs';

// Fixed-size array
const fixedArray = array(u8, 10);
const tenBytes = fixedArray.encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

// Variable-size array (with u32 length prefix)
const dynamicArray = vec(u32);
const numbers = dynamicArray.encode([100, 200, 300]);

// Set (unique values only)
const uniqueIds = set(u32);
const ids = uniqueIds.encode([1, 2, 3, 1]); // Duplicates removed
```

### Options (Nullable values)

```typescript
import { option, some, none, isSome, isNone } from '@photon/codecs';

const optionalU32 = option(u32);

// Encode Some value
const someBytes = optionalU32.encode(some(42));

// Encode None value
const noneBytes = optionalU32.encode(none());

// Decode and check
const [value, _] = optionalU32.decode(someBytes);
if (isSome(value)) {
  console.log(value.value); // 42
}

// Alternative: nullable codec (null instead of Option type)
import { nullable } from '@photon/codecs';
const nullableString = nullable(string);
const nullBytes = nullableString.encode(null);
```

### Enums (Tagged Unions)

```typescript
import { enumCodec, u8, u32, string, struct } from '@photon/codecs';

// Define enum variants
const messageCodec = enumCodec({
  ping: struct({ timestamp: u32 }),
  pong: struct({ timestamp: u32 }),
  text: struct({ content: string }),
  close: struct({})
});

// Encode different variants
const ping = messageCodec.encode({ 
  type: 'ping', 
  data: { timestamp: Date.now() } 
});

const text = messageCodec.encode({ 
  type: 'text', 
  data: { content: 'Hello' } 
});

// Decode with type discrimination
const [message, _] = messageCodec.decode(ping);
switch (message.type) {
  case 'ping':
    console.log('Ping at', message.data.timestamp);
    break;
  case 'text':
    console.log('Message:', message.data.content);
    break;
}
```

### Lazy Codecs (Recursive structures)

```typescript
import { lazy, struct, option, string, vec } from '@photon/codecs';

// Recursive tree structure
type TreeNode = {
  value: string;
  children: TreeNode[];
};

const treeCodec: Codec<TreeNode> = lazy(() => 
  struct({
    value: string,
    children: vec(treeCodec) // Self-reference
  })
);

const tree: TreeNode = {
  value: 'root',
  children: [
    { value: 'child1', children: [] },
    { value: 'child2', children: [
      { value: 'grandchild', children: [] }
    ]}
  ]
};

const bytes = treeCodec.encode(tree);
```

## Codec Composition

### Mapping Values

```typescript
import { mapCodec, u32 } from '@photon/codecs';

// Transform between types
const dateCodec = mapCodec(
  u32,
  (timestamp: number) => new Date(timestamp * 1000),
  (date: Date) => Math.floor(date.getTime() / 1000)
);

const bytes = dateCodec.encode(new Date());
const [date, _] = dateCodec.decode(bytes);
```

### Wrapping Codecs

```typescript
import { wrapCodec, string } from '@photon/codecs';

// Add validation or transformation
const emailCodec = wrapCodec(
  string,
  {
    encode: (email: string) => {
      if (!email.includes('@')) {
        throw new Error('Invalid email');
      }
      return email.toLowerCase();
    },
    decode: (value: string) => value
  }
);
```

### Constant Values

```typescript
import { constantCodec, u8 } from '@photon/codecs';

// Always encode/decode the same value
const versionCodec = constantCodec(u8, 1);
const bytes = versionCodec.encode(); // Always encodes 1
const [version, _] = versionCodec.decode(bytes); // Always decodes to 1
```

## Error Handling

```typescript
import { 
  CodecError, 
  InsufficientBytesError, 
  InvalidDataError,
  assertSufficientBytes 
} from '@photon/codecs';

try {
  const [value, bytesRead] = codec.decode(bytes);
} catch (error) {
  if (error instanceof InsufficientBytesError) {
    console.log('Not enough bytes:', error.needed, 'needed');
  } else if (error instanceof InvalidDataError) {
    console.log('Invalid data format:', error.message);
  }
}

// Manual validation
assertSufficientBytes(bytes, offset, 32); // Throws if not enough bytes
```

## Advanced Patterns

### Custom Codec

```typescript
import type { Codec } from '@photon/codecs';

function createCustomCodec<T>(): Codec<T> {
  return {
    encode(value: T): Uint8Array {
      // Custom encoding logic
      return new Uint8Array();
    },
    
    decode(bytes: Uint8Array, offset = 0): readonly [T, number] {
      // Custom decoding logic
      return [value, bytesConsumed];
    },
    
    size: 4 // or (value: T) => number for variable size
  };
}
```

### Solana Account Codec

```typescript
const accountCodec = struct({
  lamports: u64,
  owner: publicKey,
  executable: boolean,
  rentEpoch: u64,
  data: bytes
});

// Encode account data
const accountBytes = accountCodec.encode({
  lamports: 1000000000n,
  owner: systemProgramId,
  executable: false,
  rentEpoch: 250n,
  data: new Uint8Array(100)
});
```

### Transaction Instruction Codec

```typescript
const instructionCodec = struct({
  programId: publicKey,
  accounts: vec(struct({
    pubkey: publicKey,
    isSigner: boolean,
    isWritable: boolean
  })),
  data: bytes
});
```

## Tree-Shaking

Import only what you need for optimal bundle size:

```typescript
// Instead of
import { u8, u32, struct } from '@photon/codecs';

// Import from specific paths
import { u8 } from '@photon/codecs/primitives/u8';
import { u32 } from '@photon/codecs/primitives/u32';
import { struct } from '@photon/codecs/composites/struct';
```

## TypeScript

Full type inference and safety:

```typescript
// Types are inferred from codec definition
const codec = struct({
  id: u32,
  name: string,
  tags: vec(string)
});

// TypeScript knows the exact shape
type Data = ReturnType<typeof codec.decode>[0];
// Data = { id: number, name: string, tags: string[] }
```

## Size

- ~15KB minified (full import)
- ~2KB for typical usage with tree-shaking
- Zero runtime dependencies

## License

Apache-2.0