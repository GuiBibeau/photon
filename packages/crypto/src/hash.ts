/**
 * SHA-256 hashing utilities using WebCrypto API
 */

/**
 * Compute SHA-256 hash of the given data
 * @param data - The data to hash
 * @returns The SHA-256 hash as a Uint8Array
 */
export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
  return new Uint8Array(hashBuffer);
}

/**
 * Compute SHA-256 hash of multiple data segments concatenated together
 * @param segments - Array of data segments to hash
 * @returns The SHA-256 hash of the concatenated data
 */
export async function sha256Concat(...segments: Uint8Array[]): Promise<Uint8Array> {
  // Calculate total length
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);

  // Concatenate all segments
  const concatenated = new Uint8Array(totalLength);
  let offset = 0;
  for (const segment of segments) {
    concatenated.set(segment, offset);
    offset += segment.length;
  }

  return sha256(concatenated);
}
