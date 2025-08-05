import type { Address } from './index.js';
import { addressFromBytes, getAddressBytes } from './index.js';

// PDA marker string that's appended to prevent collisions
const PDA_MARKER = new TextEncoder().encode('ProgramDerivedAddress');

// Maximum number of seeds allowed
const MAX_SEEDS = 16;

// Maximum seed length in bytes
const MAX_SEED_LENGTH = 32;

/**
 * Check if a 32-byte value represents a valid Ed25519 curve point
 * This uses WebCrypto's validation as the primary check
 */
async function isOnCurve(bytes: Uint8Array): Promise<boolean> {
  if (bytes.length !== 32) {
    return false;
  }

  try {
    // Try to import as Ed25519 public key
    // If WebCrypto can import it successfully, it's a valid curve point
    await crypto.subtle.importKey(
      'raw',
      bytes as BufferSource,
      {
        name: 'Ed25519',
        namedCurve: 'Ed25519',
      } as EcKeyImportParams,
      false,
      ['verify'],
    );

    // If we get here, WebCrypto accepted it as a valid Ed25519 public key
    // This means it's on the curve
    return true;
  } catch {
    // WebCrypto rejected it, so it's not a valid curve point
    return false;
  }
}

/**
 * Create a Program Derived Address from seeds and a program ID
 * @param seeds - Array of seed buffers (max 16, each max 32 bytes)
 * @param programId - The program ID
 * @returns The derived address
 * @throws If the derived address is on the Ed25519 curve
 */
export async function createProgramAddress(
  seeds: Uint8Array[],
  programId: Address,
): Promise<Address> {
  // Validate seeds
  if (seeds.length > MAX_SEEDS) {
    throw new Error(`Too many seeds: ${seeds.length}. Maximum is ${MAX_SEEDS}`);
  }

  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    if (seed && seed.length > MAX_SEED_LENGTH) {
      throw new Error(
        `Seed ${i} is too long: ${seed.length} bytes. Maximum is ${MAX_SEED_LENGTH} bytes`,
      );
    }
  }

  // Calculate total buffer size
  const programIdBytes = getAddressBytes(programId);
  const totalLength =
    seeds.reduce((sum, seed) => sum + seed.length, 0) + programIdBytes.length + PDA_MARKER.length;

  // Concatenate seeds + programId + PDA marker
  const buffer = new Uint8Array(totalLength);
  let offset = 0;

  for (const seed of seeds) {
    buffer.set(seed, offset);
    offset += seed.length;
  }

  buffer.set(programIdBytes, offset);
  offset += programIdBytes.length;

  buffer.set(PDA_MARKER, offset);

  // Hash the buffer
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hash = new Uint8Array(hashBuffer);

  // Check if the hash is on the curve
  if (await isOnCurve(hash)) {
    throw new Error('Invalid seeds: derived address is on the Ed25519 curve');
  }

  return addressFromBytes(hash);
}

/**
 * Find a valid Program Derived Address and its bump seed
 * @param seeds - Array of seed buffers (max 15, since bump seed will be added)
 * @param programId - The program ID
 * @returns Tuple of [address, bump seed]
 */
export async function findProgramAddressSync(
  seeds: Uint8Array[],
  programId: Address,
): Promise<[Address, number]> {
  if (seeds.length > MAX_SEEDS - 1) {
    throw new Error(
      `Too many seeds: ${seeds.length}. Maximum is ${MAX_SEEDS - 1} when finding with bump`,
    );
  }

  // Try bump seeds from 255 down to 0
  for (let bump = 255; bump >= 0; bump--) {
    const bumpSeed = new Uint8Array([bump]);
    const seedsWithBump = [...seeds, bumpSeed];

    try {
      const address = await createProgramAddress(seedsWithBump, programId);
      // If we got here without throwing, we found a valid PDA
      return [address, bump];
    } catch (error) {
      // Continue to next bump if this one resulted in an on-curve address
      if (error instanceof Error && error.message.includes('on the Ed25519 curve')) {
        continue;
      }
      // Re-throw other errors (like invalid seeds)
      throw error;
    }
  }

  throw new Error('Unable to find a viable program address bump seed');
}

/**
 * Check if an address is a valid Program Derived Address (off-curve)
 * @param address - The address to check
 * @returns True if the address is off-curve (valid PDA), false otherwise
 */
export async function isProgramAddress(address: Address): Promise<boolean> {
  const bytes = getAddressBytes(address);
  return !(await isOnCurve(bytes));
}

/**
 * Synchronous version using a simplified curve check
 * Note: This is less accurate than the async version but allows sync operation
 * @deprecated Use isProgramAddress for accurate results
 */
export function isProgramAddressSync(address: Address): boolean {
  // This is a simplified check that may have false positives/negatives
  // For accurate results, use the async version
  console.warn(
    'isProgramAddressSync is deprecated and may be inaccurate. Use isProgramAddress instead.',
  );

  const bytes = getAddressBytes(address);

  // Very basic heuristic: check if the high bit pattern suggests off-curve
  // This is NOT cryptographically accurate but provides a sync approximation
  // Real implementation would require full Ed25519 field arithmetic
  const highByte = bytes[31];
  return highByte !== undefined && (highByte & 0x80) !== 0;
}

/**
 * Convert a string to a valid PDA seed
 * @param str - The string to convert
 * @returns The seed as a Uint8Array
 */
export function createPdaSeed(str: string): Uint8Array {
  const encoded = new TextEncoder().encode(str);
  if (encoded.length > MAX_SEED_LENGTH) {
    throw new Error(
      `Seed string is too long: ${encoded.length} bytes. Maximum is ${MAX_SEED_LENGTH} bytes`,
    );
  }
  return encoded;
}

/**
 * Convert a number to a valid PDA seed (little-endian)
 * @param num - The number to convert
 * @param bytes - Number of bytes (1, 2, 4, or 8)
 * @returns The seed as a Uint8Array
 */
export function createPdaSeedFromNumber(
  num: number | bigint,
  bytes: 1 | 2 | 4 | 8 = 4,
): Uint8Array {
  const buffer = new ArrayBuffer(bytes);
  const view = new DataView(buffer);

  switch (bytes) {
    case 1:
      if (typeof num !== 'number' || num < 0 || num > 255) {
        throw new Error('Number must be between 0 and 255 for 1-byte seed');
      }
      view.setUint8(0, num);
      break;
    case 2:
      if (typeof num !== 'number' || num < 0 || num > 65535) {
        throw new Error('Number must be between 0 and 65535 for 2-byte seed');
      }
      view.setUint16(0, num, true); // little-endian
      break;
    case 4:
      if (typeof num !== 'number' || num < 0 || num > 4294967295) {
        throw new Error('Number must be between 0 and 4294967295 for 4-byte seed');
      }
      view.setUint32(0, num, true); // little-endian
      break;
    case 8: {
      const bigintValue = typeof num === 'number' ? BigInt(num) : num;
      view.setBigUint64(0, bigintValue as bigint, true); // little-endian
      break;
    }
  }

  return new Uint8Array(buffer);
}
