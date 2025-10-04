/**
 * Computes baseline modulo ownership where each slot maps to slot % n.
 * @param n - Number of bins/nodes participating.
 * @param slots - Number of slots to evaluate.
 * @returns Array of length `slots` with bin indices or -1 when n is invalid.
 */
export function moduloOwners(n: number, slots = 256): number[] {
  if (!Number.isInteger(slots) || slots <= 0) {
    throw new RangeError("slots must be a positive integer");
  }

  if (!Number.isInteger(n) || n <= 0) {
    return new Array(slots).fill(-1);
  }

  const owners = new Array<number>(slots);
  for (let slot = 0; slot < slots; slot += 1) {
    owners[slot] = slot % n;
  }

  return owners;
}

/**
 * Computes the fraction of slots whose modulo owner changed between two snapshots.
 * @param prev - Previous modulo ownership array.
 * @param next - New modulo ownership array.
 * @returns Fraction of slots that changed owners, ignoring -1 entries.
 */
export function movedPercentModulo(prev: number[], next: number[]): number {
  if (prev.length !== next.length) {
    throw new RangeError("Ownership arrays must be the same length");
  }

  let compared = 0;
  let moved = 0;

  for (let i = 0; i < prev.length; i += 1) {
    const a = prev[i];
    const b = next[i];

    if (a === -1 || b === -1) {
      continue;
    }

    compared += 1;
    if (a !== b) {
      moved += 1;
    }
  }

  if (compared === 0) {
    return 0;
  }

  return moved / compared;
}
