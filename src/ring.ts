import { hashToSlot } from "./hash";
import type { Node, Replica } from "./types";

/**
 * Builds a sorted list of replicas for the provided nodes on a hash ring.
 * @param nodes - The nodes participating in the ring.
 * @param slots - Total number of slots on the ring.
 * @returns Sorted replicas positioned according to their hashed slot.
 */
export function buildRing(nodes: Node[], slots = 256): Replica[] {
  if (!Number.isInteger(slots) || slots <= 0) {
    throw new RangeError("slots must be a positive integer");
  }

  const decorated: { replica: Replica; order: number }[] = [];

  nodes.forEach((node, nodeOrder) => {
    const replicaCount = Math.max(0, Math.floor(node.replicas));

    for (let i = 0; i < replicaCount; i += 1) {
      const slot = hashToSlot(`${node.id}#${i}`, slots);
      decorated.push({
        replica: { slot, nodeId: node.id },
        order: decorated.length,
      });
    }
  });

  decorated.sort((a, b) => {
    if (a.replica.slot === b.replica.slot) {
      return a.order - b.order;
    }

    return a.replica.slot - b.replica.slot;
  });

  return decorated.map(({ replica }) => replica);
}

/**
 * Finds the insertion point for the first replica whose slot is greater than the provided slot.
 * @param replicas - Sorted replicas that make up the ring.
 * @param slot - Slot to find the upper bound for.
 * @returns Index where a replica with the provided slot would be inserted.
 */
export function upperBound(replicas: Replica[], slot: number): number {
  let low = 0;
  let high = replicas.length;

  while (low < high) {
    const mid = (low + high) >>> 1;
    if (replicas[mid].slot <= slot) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

/**
 * Looks up the owner node IDs for the provided key using the ring.
 * @param replicas - Sorted ring replicas.
 * @param nodes - Node metadata keyed by node ID.
 * @param key - The key to place on the ring.
 * @param R - Desired number of owners.
 * @param slots - Total number of slots on the ring.
 * @returns Node IDs for the primary and additional replica owners.
 */
export function lookupOwners(
  replicas: Replica[],
  nodes: Record<string, Node>,
  key: string,
  R = 1,
  slots = 256
): string[] {
  if (R <= 0) {
    return [];
  }

  const totalNodes = Object.values(nodes).filter((node) => node.up).length;
  if (totalNodes === 0) {
    return [];
  }

  const targetSlot = hashToSlot(key, slots);
  const startIndex = replicas.length === 0 ? 0 : upperBound(replicas, targetSlot) % replicas.length;

  const owners: string[] = [];
  const visited = new Set<string>();

  for (let i = 0; owners.length < Math.min(R, totalNodes) && i < replicas.length; i += 1) {
    const idx = (startIndex + i) % replicas.length;
    const replica = replicas[idx];
    const node = nodes[replica.nodeId];

    if (!node || !node.up || visited.has(replica.nodeId)) {
      continue;
    }

    owners.push(replica.nodeId);
    visited.add(replica.nodeId);
  }

  return owners;
}
