const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * Computes the 32-bit FNV-1a hash for a given string.
 * @param value - Arbitrary string input to hash.
 * @returns Unsigned 32-bit hash value produced by the FNV-1a algorithm.
 */
export function fnv1a32(value: string): number {
  let hash = FNV_OFFSET_BASIS;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }

  return hash >>> 0;
}

/**
 * Maps a string to a specific slot on the hash ring using FNV-1a.
 * @param value - String to slot on the ring.
 * @param slots - Total number of slots available on the ring (default 256).
 * @returns The slot index in the range [0, slots - 1].
 */
export function hashToSlot(value: string, slots = 256): number {
  if (!Number.isInteger(slots) || slots <= 0) {
    throw new RangeError("slots must be a positive integer");
  }

  return fnv1a32(value) % slots;
}
