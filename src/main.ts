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

// Setup modal
const modal = document.querySelector<HTMLElement>("#modal");
const modalClose = document.querySelector<HTMLElement>("#modal-close");
const modalBackdrop = modal?.querySelector<HTMLElement>(".modal-backdrop");
const headerHowItWorksBtn = document.querySelector<HTMLElement>("#how-it-works-header-btn");

function openModal() {
  if (modal) {
    modal.style.display = "block";
    document.body.style.overflow = "hidden";
  }
}

function closeModal() {
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "unset";
  }
}

modalClose?.addEventListener("click", closeModal);
modalBackdrop?.addEventListener("click", closeModal);
headerHowItWorksBtn?.addEventListener("click", openModal);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal?.style.display === "block") {
    closeModal();
  }
});

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

mountControls(controls, openModal);

console.log("boot", getState());
