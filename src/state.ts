import { buildRing } from "./ring";
import { ownersArray, nodeOrder } from "./metrics";
import type { LabState, Node } from "./types";

export type { LabState } from "./types";

type Listener = (state: LabState) => void;

let state: LabState = initializeState();
const listeners: Listener[] = [];

function initializeState(): LabState {
  const base: LabState = {
    slots: 256,
    nodes: {},
    replication: 1,
    replicasDefault: 3,
    replicas: [],
    owners: [],
  };

  base.replicas = [];
  base.owners = new Array(base.slots).fill(-1);
  rebuildTopology(base, false);

  return base;
}

function rebuildTopology(target: LabState, preservePrevOwners: boolean): void {
  const previousOwners = preservePrevOwners ? [...target.owners] : undefined;
  const orderedIds = nodeOrder(target.nodes);
  const orderedNodes: Node[] = orderedIds.map((id) => target.nodes[id]);

  target.replicas = buildRing(orderedNodes, target.slots);
  target.owners = ownersArray(target.replicas, target.nodes, target.slots);

  target.prevOwners = previousOwners;
}

function notify(): void {
  for (const listener of [...listeners]) {
    listener(state);
  }
}

export function createInitialState(): LabState {
  state = initializeState();
  notify();
  return state;
}

export function getState(): LabState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.push(listener);
  listener(state);

  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
}

export function update(mutator: (draft: LabState) => void): void {
  mutator(state);
  rebuildTopology(state, true);
  notify();
}
