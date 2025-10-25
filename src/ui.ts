import { contrast, nextColor } from "./color";
import { hashToSlot } from "./hash";
import { lookupOwners } from "./ring";
import { nodeOrder, shares as computeShares, movedPercent } from "./metrics";
import { subscribe, update } from "./state";
import type { LabState, Node } from "./types";

export function mountControls(root: HTMLElement, openModal: () => void): void {
  root.innerHTML = "";

  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "1rem";

  const nodeHeader = document.createElement("div");
  nodeHeader.style.display = "flex";
  nodeHeader.style.justifyContent = "space-between";
  nodeHeader.style.alignItems = "center";

  const title = document.createElement("h2");
  title.textContent = "Nodes";
  title.style.margin = "0";
  title.style.fontSize = "1rem";

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.textContent = "+ Node";
  addButton.addEventListener("click", () => {
    update((draft) => {
      const id = nextNodeId(draft.nodes);
      const color = nextColor(Object.keys(draft.nodes).length);
      draft.nodes[id] = {
        id,
        replicas: draft.replicasDefault,
        up: true,
        color,
      };
    });
  });

  nodeHeader.append(title, addButton);

  const nodeList = document.createElement("div");
  nodeList.style.display = "flex";
  nodeList.style.flexDirection = "column";
  nodeList.style.gap = "0.4rem";
  nodeList.style.minHeight = "calc(1.3rem * 5)";
  nodeList.style.paddingBottom = "0.25rem";

  const metricsSection = document.createElement("div");
  metricsSection.style.display = "flex";
  metricsSection.style.flexDirection = "column";
  metricsSection.style.gap = "0.4rem";
  metricsSection.style.padding = "0.75rem";
  metricsSection.style.border = "1px solid rgba(148, 163, 184, 0.4)";
  metricsSection.style.borderRadius = "0.75rem";

  const metricsTitle = document.createElement("h3");
  metricsTitle.textContent = "Key Metrics";
  metricsTitle.style.margin = "0";
  metricsTitle.style.fontSize = "1rem";

  const shareList = document.createElement("div");
  shareList.style.display = "flex";
  shareList.style.flexDirection = "column";
  shareList.style.gap = "0.2rem";
  shareList.style.fontSize = "0.8rem";
  shareList.style.minHeight = "calc(1.05rem * 5)";

  const movedLine = document.createElement("div");
  movedLine.style.fontSize = "0.85rem";
  movedLine.style.minHeight = "1.2rem";

  metricsSection.append(metricsTitle, shareList, movedLine);

  const globalSection = document.createElement("div");
  globalSection.style.display = "grid";
  globalSection.style.gridTemplateColumns = "repeat(auto-fit, minmax(180px, 1fr))";
  globalSection.style.gap = "0.75rem";

  const replicationControl = createNumberControl("Replication (R)", 1, (value) => {
    if (!Number.isFinite(value) || value < 1) {
      return;
    }

    update((draft) => {
      draft.replication = Math.floor(value);
    });
  });

  globalSection.append(replicationControl.wrapper);

  const probeSection = document.createElement("div");
  probeSection.style.display = "flex";
  probeSection.style.flexDirection = "column";
  probeSection.style.gap = "0.5rem";

  const probeHeader = document.createElement("h3");
  probeHeader.textContent = "Probe";
  probeHeader.style.margin = "0";
  probeHeader.style.fontSize = "1rem";

  const probeInputRow = document.createElement("div");
  probeInputRow.style.display = "flex";
  probeInputRow.style.gap = "0.5rem";

  const probeInput = document.createElement("input");
  probeInput.type = "text";
  probeInput.placeholder = "Key";
  probeInput.style.flex = "1";

  const probeButton = document.createElement("button");
  probeButton.type = "button";
  probeButton.textContent = "Hash";
  probeButton.addEventListener("click", () => {
    commitProbeKey(probeInput.value);
  });

  const randomButton = document.createElement("button");
  randomButton.type = "button";
  randomButton.textContent = "Random";
  randomButton.addEventListener("click", () => {
    const randomKey = Math.random().toString(36).slice(2, 8);
    probeInput.value = randomKey;
    commitProbeKey(randomKey);
  });

  probeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitProbeKey(probeInput.value);
    }
  });

  probeInputRow.append(probeInput, probeButton, randomButton);

  const probeDetails = document.createElement("div");
  probeDetails.style.display = "flex";
  probeDetails.style.flexDirection = "column";
  probeDetails.style.gap = "0.25rem";
  probeDetails.style.fontSize = "0.9rem";

  const probeSlotLabel = document.createElement("div");
  const probeOwnersLabel = document.createElement("div");

  probeDetails.append(probeSlotLabel, probeOwnersLabel);

  probeSection.append(probeHeader, probeInputRow, probeDetails);

  container.append(nodeHeader, nodeList, metricsSection, globalSection, probeSection);
  root.append(container);

  subscribe((state) => {
    renderNodes(nodeList, state);
    syncReplicationControl(replicationControl, state);
    renderMetrics(shareList, movedLine, state);

    const key = state.probeKey ?? "";
    if (document.activeElement !== probeInput) {
      probeInput.value = key;
    }

    if (key) {
      const slot = hashToSlot(key, state.slots);
      const owners = lookupOwners(state.replicas, state.nodes, key, state.replication, state.slots);
      probeSlotLabel.textContent = `Slot ${slot}`;
      probeOwnersLabel.textContent = owners.length
        ? `Owners: ${owners.join(", ")}`
        : "Owners: none";
    } else {
      probeSlotLabel.textContent = "Slot: —";
      probeOwnersLabel.textContent = "Owners: —";
    }

  });
}

type NumberControl = {
  wrapper: HTMLDivElement;
  input: HTMLInputElement;
};

function createNumberControl(
  label: string,
  min: number,
  onChange: (value: number) => void
): NumberControl {
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.gap = "0.25rem";

  const labelEl = document.createElement("label");
  labelEl.textContent = label;
  labelEl.style.fontWeight = "600";
  labelEl.style.fontSize = "0.9rem";

  const input = document.createElement("input");
  input.type = "number";
  input.min = String(min);
  input.step = "1";
  input.addEventListener("change", () => {
    const value = Number(input.value);
    onChange(value);
  });

  wrapper.append(labelEl, input);

  return { wrapper, input };
}

function syncReplicationControl(control: NumberControl, state: LabState): void {
  control.input.value = String(state.replication);
}

function renderNodes(container: HTMLElement, state: LabState): void {
  container.innerHTML = "";

  const order = nodeOrder(state.nodes);

  order.forEach((id) => {
    const node = state.nodes[id];
    if (!node) {
      return;
    }

    const row = document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "repeat(5, minmax(0, auto))";
    row.style.alignItems = "center";
    row.style.gap = "0.5rem";
    row.style.fontSize = "0.85rem";
    row.style.minHeight = "1.35rem";

    const swatch = document.createElement("span");
    swatch.style.display = "inline-flex";
    swatch.style.alignItems = "center";
    swatch.style.justifyContent = "center";
    swatch.style.padding = "0.2rem 0.45rem";
    swatch.style.borderRadius = "0.5rem";
    swatch.style.backgroundColor = node.color;
    swatch.style.color = contrast(node.color);
    swatch.style.fontWeight = "600";
    swatch.style.fontSize = "0.8rem";
    swatch.textContent = node.id;

    const replicasLabel = document.createElement("label");
    replicasLabel.textContent = "Replicas";
    replicasLabel.style.fontSize = "0.8rem";

    const replicasInput = document.createElement("input");
    replicasInput.type = "number";
    replicasInput.min = "0";
    replicasInput.step = "1";
    replicasInput.value = String(node.replicas);
    replicasInput.style.fontSize = "0.85rem";
    replicasInput.style.padding = "0.15rem 0.25rem";
    replicasInput.style.width = "4rem";
    replicasInput.addEventListener("change", () => {
      const value = Math.max(0, Math.floor(Number(replicasInput.value)));
      update((draft) => {
        if (draft.nodes[id]) {
          draft.nodes[id].replicas = value;
        }
      });
    });

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.textContent = node.up ? "Up" : "Down";
    toggleButton.style.fontSize = "0.8rem";
    toggleButton.style.padding = "0.2rem 0.5rem";
    toggleButton.addEventListener("click", () => {
      update((draft) => {
        if (draft.nodes[id]) {
          draft.nodes[id].up = !draft.nodes[id].up;
        }
      });
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.style.fontSize = "0.8rem";
    removeButton.style.padding = "0.2rem 0.5rem";
    removeButton.addEventListener("click", () => {
      update((draft) => {
        delete draft.nodes[id];
      });
    });

    row.append(swatch, replicasLabel, replicasInput, toggleButton, removeButton);
    container.append(row);
  });

  if (order.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "No nodes yet. Click + Node to begin.";
    empty.style.fontSize = "0.9rem";
    container.append(empty);
  }
}

function renderMetrics(
  shareList: HTMLElement,
  movedLine: HTMLElement,
  state: LabState
): void {
  const order = nodeOrder(state.nodes);
  const shareData = computeShares(state.owners, order);

  shareList.innerHTML = "";

  if (order.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "Ownership: —";
    shareList.append(empty);
  } else {
    for (const id of order) {
      const value = shareData[id] ?? 0;
      const percent = (value * 100).toFixed(1);
      const row = document.createElement("div");
      row.textContent = `${id}: ${percent}%`;
      row.style.fontSize = "0.8rem";
      shareList.append(row);
    }
  }

  if (state.prevOwners && state.prevOwners.length === state.owners.length) {
    const moved = movedPercent(state.prevOwners, state.owners) * 100;
    movedLine.textContent = `Moved keys: ${moved.toFixed(1)}%`;
  } else {
    movedLine.textContent = "Moved keys: —";
  }

}

function commitProbeKey(raw: string): void {
  const value = raw.trim();
  update((draft) => {
    draft.probeKey = value.length > 0 ? value : undefined;
  });
}

function nextNodeId(nodes: Record<string, Node>): string {
  let highest = 0;
  for (const key of Object.keys(nodes)) {
    const match = key.match(/^node-(\d+)$/);
    if (match) {
      highest = Math.max(highest, Number(match[1]));
    }
  }
  return `node-${highest + 1}`;
}
