import { renderRing } from "./render";
import { createInitialState, subscribe, getState } from "./state";
import { lookupOwners } from "./ring";
import { hashToSlot } from "./hash";
import { mountControls } from "./ui";

const ring = document.querySelector<HTMLCanvasElement>("#ring");
const controls = document.querySelector<HTMLElement>("#controls");

if (!ring) {
  throw new Error("Missing canvas element with id 'ring'");
}

if (!controls) {
  throw new Error("Missing controls container with id 'controls'");
}

createInitialState();

subscribe((state) => {
  const { replicas, owners, nodes, probeKey, replication, slots } = state;

  let probeSlot: number | undefined;
  let probeOwners: string[] | undefined;

  if (probeKey && probeKey.length > 0) {
    probeSlot = hashToSlot(probeKey, slots);
    probeOwners = lookupOwners(replicas, nodes, probeKey, replication, slots);
  }

  renderRing(ring, {
    replicas,
    owners,
    nodes,
    probeSlot,
    probeOwners,
  });
});

mountControls(controls);

console.log("boot", getState());
