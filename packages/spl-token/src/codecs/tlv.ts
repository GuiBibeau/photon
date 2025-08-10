/**
 * Type-Length-Value (TLV) parser for Token-2022 extensions.
 *
 * Token-2022 uses a TLV encoding scheme for extensions that allows
 * flexible addition of new features while maintaining backward compatibility.
 * Each extension is encoded as: [Type (2 bytes)][Length (2 bytes)][Value (variable)]
 */

import { u16 } from '@photon/codecs/primitives/numeric';
import type { Codec } from '@photon/codecs';
import { CodecError } from '@photon/codecs';

/**
 * A parsed TLV entry containing type, length, and raw data.
 */
export interface TlvEntry {
  /** Extension type identifier (2 bytes) */
  type: number;
  /** Length of the extension data (2 bytes) */
  length: number;
  /** Raw extension data */
  data: Uint8Array;
  /** Offset in the original buffer where this entry starts */
  offset: number;
}

/**
 * Result of parsing TLV data.
 */
export interface TlvParseResult {
  /** All parsed TLV entries */
  entries: TlvEntry[];
  /** Total bytes consumed */
  bytesRead: number;
}

/**
 * Parse TLV-encoded data from a buffer.
 *
 * @param buffer - The buffer containing TLV data
 * @param offset - Starting offset in the buffer
 * @param maxBytes - Maximum bytes to parse (optional)
 * @returns Parsed TLV entries and total bytes read
 */
export function parseTlv(buffer: Uint8Array, offset = 0, maxBytes?: number): TlvParseResult {
  const entries: TlvEntry[] = [];
  let currentOffset = offset;
  const maxOffset = maxBytes ? offset + maxBytes : buffer.length;

  while (currentOffset < maxOffset) {
    // Check if we have at least 4 bytes for type and length
    if (currentOffset + 4 > buffer.length) {
      break;
    }

    // Parse type (2 bytes, little-endian)
    const [type] = u16.decode(buffer, currentOffset);
    currentOffset += 2;

    // Parse length (2 bytes, little-endian)
    const [length] = u16.decode(buffer, currentOffset);
    currentOffset += 2;

    // Check if we have enough bytes for the value
    if (currentOffset + length > buffer.length) {
      throw new CodecError(
        `Insufficient bytes for TLV value. Expected ${length} bytes at offset ${currentOffset}`,
      );
    }

    // Extract the value data (creates a view, not a copy)
    const data = buffer.slice(currentOffset, currentOffset + length);

    entries.push({
      type,
      length,
      data,
      offset: currentOffset - 4, // Include type and length in offset
    });

    currentOffset += length;
  }

  return {
    entries,
    bytesRead: currentOffset - offset,
  };
}

/**
 * Encode TLV entries into a buffer.
 *
 * @param entries - TLV entries to encode
 * @returns Encoded buffer
 */
export function encodeTlv(entries: Omit<TlvEntry, 'offset'>[]): Uint8Array {
  // Calculate total size
  let totalSize = 0;
  for (const entry of entries) {
    totalSize += 4 + entry.length; // 2 bytes type + 2 bytes length + data
  }

  const buffer = new Uint8Array(totalSize);
  let offset = 0;

  for (const entry of entries) {
    // Write type (2 bytes)
    buffer.set(u16.encode(entry.type), offset);
    offset += 2;

    // Write length (2 bytes)
    buffer.set(u16.encode(entry.length), offset);
    offset += 2;

    // Write data
    buffer.set(entry.data, offset);
    offset += entry.length;
  }

  return buffer;
}

/**
 * Find a specific TLV entry by type.
 *
 * @param entries - Array of TLV entries
 * @param type - The type to search for
 * @returns The first matching entry, or undefined if not found
 */
export function findTlvEntry(entries: TlvEntry[], type: number): TlvEntry | undefined {
  return entries.find((entry) => entry.type === type);
}

/**
 * Find all TLV entries of a specific type.
 *
 * @param entries - Array of TLV entries
 * @param type - The type to search for
 * @returns All matching entries
 */
export function findAllTlvEntries(entries: TlvEntry[], type: number): TlvEntry[] {
  return entries.filter((entry) => entry.type === type);
}

/**
 * Calculate the total size of TLV entries.
 *
 * @param entries - TLV entries
 * @returns Total size in bytes including headers
 */
export function calculateTlvSize(entries: TlvEntry[]): number {
  return entries.reduce((sum, entry) => sum + 4 + entry.length, 0);
}

/**
 * Create a TLV codec for a specific extension type.
 *
 * @param type - Extension type identifier
 * @param valueCodec - Codec for the extension value
 * @returns A codec that encodes/decodes the TLV entry
 */
export function tlvCodec<T>(type: number, valueCodec: Codec<T>): Codec<T> {
  return {
    encode(value: T): Uint8Array {
      const valueBytes = valueCodec.encode(value);
      const buffer = new Uint8Array(4 + valueBytes.length);

      // Write type
      buffer.set(u16.encode(type), 0);

      // Write length
      buffer.set(u16.encode(valueBytes.length), 2);

      // Write value
      buffer.set(valueBytes, 4);

      return buffer;
    },

    decode(bytes: Uint8Array, offset = 0): readonly [T, number] {
      // Read type
      const [entryType] = u16.decode(bytes, offset);
      if (entryType !== type) {
        throw new CodecError(`Expected TLV type ${type}, got ${entryType}`);
      }

      // Read length
      const [length] = u16.decode(bytes, offset + 2);

      // Decode value
      const [value, bytesRead] = valueCodec.decode(bytes, offset + 4);

      if (bytesRead !== length) {
        throw new CodecError(`TLV length mismatch. Header says ${length}, codec read ${bytesRead}`);
      }

      return [value, 4 + length] as const;
    },

    size:
      'size' in valueCodec
        ? typeof valueCodec.size === 'function'
          ? (value: T) => 4 + (valueCodec.size as (v: T) => number)(value)
          : 4 + (valueCodec.size as number)
        : undefined,
  } as Codec<T>;
}

/**
 * Create a lazy TLV parser that only parses headers initially.
 * Values are parsed on-demand when accessed.
 */
export class LazyTlvParser {
  private entries: Map<number, TlvEntry> = new Map();
  private buffer: Uint8Array;
  private parsed = false;

  constructor(
    buffer: Uint8Array,
    private offset = 0,
    private maxBytes?: number,
  ) {
    this.buffer = buffer;
  }

  /**
   * Parse headers only (type and length) without parsing values.
   */
  private parseHeaders(): void {
    if (this.parsed) {
      return;
    }

    let currentOffset = this.offset;
    const maxOffset = this.maxBytes ? this.offset + this.maxBytes : this.buffer.length;

    while (currentOffset < maxOffset) {
      if (currentOffset + 4 > this.buffer.length) {
        break;
      }

      const [type] = u16.decode(this.buffer, currentOffset);
      const [length] = u16.decode(this.buffer, currentOffset + 2);

      if (currentOffset + 4 + length > this.buffer.length) {
        break;
      }

      // Store entry with lazy data reference
      this.entries.set(type, {
        type,
        length,
        data: this.buffer.slice(currentOffset + 4, currentOffset + 4 + length),
        offset: currentOffset,
      });

      currentOffset += 4 + length;
    }

    this.parsed = true;
  }

  /**
   * Get a TLV entry by type.
   */
  get(type: number): TlvEntry | undefined {
    this.parseHeaders();
    return this.entries.get(type);
  }

  /**
   * Check if an entry exists.
   */
  has(type: number): boolean {
    this.parseHeaders();
    return this.entries.has(type);
  }

  /**
   * Get all entries.
   */
  getAll(): TlvEntry[] {
    this.parseHeaders();
    return Array.from(this.entries.values());
  }

  /**
   * Get all entry types present.
   */
  getTypes(): number[] {
    this.parseHeaders();
    return Array.from(this.entries.keys());
  }
}
