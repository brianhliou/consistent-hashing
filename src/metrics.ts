import { lookupOwners } from "./ring";
import type { Node, Replica } from "./types";

/**
 * Produces a deterministic ordering of node identifiers by id.
 * @param nodes - Node metadata keyed by node ID.
 * @returns Sorted array of node IDs.
 */
export function nodeOrder(nodes: Record<string, Node>): string[] {
  return Object.keys(nodes).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );
}

/**
 * Builds an array describing the primary owner index for each slot on the ring.
 * @param replicas - Sorted replicas generated from the ring builder.
 * @param nodes - Node metadata keyed by node ID.
 * @param slots - Total number of slots on the ring.
 * @returns Array of length `slots` with owning node indices, or -1 when unowned.
 */
export function ownersArray(
  replicas: Replica[],
  nodes: Record<string, Node>,
  slots = 256
): number[] {
  if (!Number.isInteger(slots) || slots <= 0) {
    throw new RangeError("slots must be a positive integer");
  }

  const order = nodeOrder(nodes);
  const indexById = new Map(order.map((id, index) => [id, index]));

  const owners: number[] = new Array(slots);
  for (let slot = 0; slot < slots; slot += 1) {
    const [primary] = lookupOwners(replicas, nodes, slot.toString(), 1, slots);
    owners[slot] = primary !== undefined ? indexById.get(primary) ?? -1 : -1;
  }

  return owners;
}

/**
 * Computes the fraction of keys whose ownership changed between two snapshots.
 * @param prev - Previous ownership array.
 * @param next - New ownership array.
 * @returns Fraction of keys that moved owners, ignoring unowned entries.
 */
export function movedPercent(prev: number[], next: number[]): number {
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

/**
 * Calculates each node's share of ownership across the ring.
 * @param owners - Ownership indices for the ring.
 * @param nodeIds - Ordered node identifiers matching the indices in `owners`.
 * @returns Fractional shares per node ID, summing to ~1 for owned slots.
 */
export function shares(owners: number[], nodeIds: string[]): Record<string, number> {
  const totals: Record<string, number> = Object.fromEntries(nodeIds.map((id) => [id, 0]));
  const totalSlots = owners.length;

  if (totalSlots === 0 || nodeIds.length === 0) {
    return totals;
  }

  for (const index of owners) {
    if (index >= 0 && index < nodeIds.length) {
      const nodeId = nodeIds[index];
      totals[nodeId] += 1;
    }
  }

  return Object.fromEntries(
    nodeIds.map((id) => [id, totalSlots === 0 ? 0 : totals[id] / totalSlots])
  );
}
