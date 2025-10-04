import { nodeOrder } from "./metrics";
import { upperBound } from "./ring";
import type { Node, Replica } from "./types";

const TOTAL_SLOTS = 256;
const TWO_PI = Math.PI * 2;

export type RenderParams = {
  replicas: Replica[];
  owners: number[];
  nodes: Record<string, Node>;
  probeSlot?: number;
  probeOwners?: string[];
};

/**
 * Renders the consistent hash ring onto the provided canvas element.
 * @param canvas - Canvas to draw into.
 * @param params - Data describing the current ring snapshot.
 */
export function renderRing(canvas: HTMLCanvasElement, params: RenderParams): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const { replicas, nodes, probeSlot, probeOwners } = params;
  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 24;
  const ringWidth = Math.max(12, radius * 0.18);

  const orderedIds = nodeOrder(nodes);
  const activeOrder = orderedIds.filter((id) => nodes[id]?.up);
  const indexById = new Map(activeOrder.map((id, index) => [id, index]));
  const slotOwners = computeSlotOwners(replicas, nodes, indexById);

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";

  drawBaseRing(ctx, centerX, centerY, radius, ringWidth);
  drawTicks(ctx, centerX, centerY, radius, ringWidth);
  drawOwnershipArcs(ctx, centerX, centerY, radius, ringWidth, slotOwners, activeOrder, nodes);
  drawReplicas(ctx, centerX, centerY, radius, ringWidth, replicas, nodes);
  drawProbe(ctx, centerX, centerY, radius, ringWidth, slotOwners, activeOrder, probeSlot, probeOwners);

  ctx.restore();
}

function computeSlotOwners(
  replicas: Replica[],
  nodes: Record<string, Node>,
  indexById: Map<string, number>
): number[] {
  const owners = new Array<number>(TOTAL_SLOTS).fill(-1);
  if (replicas.length === 0 || indexById.size === 0) {
    return owners;
  }

  for (let slot = 0; slot < TOTAL_SLOTS; slot += 1) {
    const startIndex = upperBound(replicas, slot) % replicas.length;
    const ownerId = findPrimaryOwner(replicas, nodes, startIndex);
    owners[slot] = ownerId !== undefined ? indexById.get(ownerId) ?? -1 : -1;
  }

  return owners;
}

function findPrimaryOwner(
  replicas: Replica[],
  nodes: Record<string, Node>,
  startIndex: number
): string | undefined {
  for (let offset = 0; offset < replicas.length; offset += 1) {
    const idx = (startIndex + offset) % replicas.length;
    const { nodeId } = replicas[idx];
    const node = nodes[nodeId];
    if (node && node.up) {
      return nodeId;
    }
  }

  return undefined;
}

function drawBaseRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  ringWidth: number
): void {
  ctx.beginPath();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
  ctx.lineWidth = ringWidth;
  ctx.arc(cx, cy, radius, 0, TWO_PI, false);
  ctx.stroke();
}

function drawTicks(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  ringWidth: number
): void {
  const inner = radius - ringWidth / 2 - 6;
  const outer = radius + ringWidth / 2 + 6;

  ctx.strokeStyle = "rgba(100, 116, 139, 0.45)";
  ctx.lineWidth = 1.4;

  for (let slot = 0; slot < TOTAL_SLOTS; slot += 1) {
    const angle = slotToAngle(slot);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(cx + cos * inner, cy + sin * inner);
    ctx.lineTo(cx + cos * outer, cy + sin * outer);
    ctx.stroke();
  }
}

function drawOwnershipArcs(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  ringWidth: number,
  owners: number[],
  order: string[],
  nodes: Record<string, Node>
): void {
  if (owners.length === 0 || order.length === 0) {
    return;
  }

  let segmentStart = 0;
  let currentOwner = owners[0];

  for (let i = 1; i <= owners.length; i += 1) {
    const ownerIndex = owners[i % owners.length];

    if (ownerIndex !== currentOwner || i === owners.length) {
      const startAngle = slotToAngle(segmentStart);
      const endAngle = slotToAngle(i);
      const color = resolveOwnerColor(currentOwner, order, nodes);

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = ringWidth;
      ctx.arc(cx, cy, radius, startAngle, endAngle, false);
      ctx.stroke();

      segmentStart = i;
      currentOwner = ownerIndex;
    }
  }
}

function drawReplicas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  ringWidth: number,
  replicas: Replica[],
  nodes: Record<string, Node>
): void {
  const inner = radius - ringWidth / 2;
  const outer = radius + ringWidth / 2 + 8;
  ctx.lineWidth = 2;

  for (const replica of replicas) {
    const angle = slotToAngle(replica.slot);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const node = nodes[replica.nodeId];
    const stroke = node?.up ? node.color : "rgba(148, 163, 184, 0.4)";

    ctx.beginPath();
    ctx.strokeStyle = stroke;
    ctx.moveTo(cx + cos * inner, cy + sin * inner);
    ctx.lineTo(cx + cos * outer, cy + sin * outer);
    ctx.stroke();
  }
}

function drawProbe(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  ringWidth: number,
  owners: number[],
  order: string[],
  probeSlot?: number,
  probeOwners?: string[]
): void {
  if (probeSlot === undefined || order.length === 0) {
    return;
  }

  const slotIndex = ((Math.round(probeSlot) % TOTAL_SLOTS) + TOTAL_SLOTS) % TOTAL_SLOTS;
  const angle = slotToAngle(slotIndex);
  const pointerRadius = radius + ringWidth / 2 + 18;
  const pointerColor = "#1f2937";

  drawPointer(ctx, cx, cy, angle, pointerRadius, pointerColor);

  if (!probeOwners || probeOwners.length === 0 || owners.length === 0) {
    return;
  }

  const primaryOwner = probeOwners[0];
  const ownerIndex = order.indexOf(primaryOwner);
  if (ownerIndex === -1) {
    return;
  }

  let targetSlot = -1;
  for (let offset = 0; offset < owners.length; offset += 1) {
    const idx = (slotIndex + offset) % owners.length;
    if (owners[idx] === ownerIndex) {
      targetSlot = idx;
      break;
    }
  }

  if (targetSlot === -1) {
    return;
  }

  const deltaSlots = (targetSlot - slotIndex + owners.length) % owners.length;
  if (deltaSlots === 0) {
    return;
  }

  const arcAngle = angle + (deltaSlots / owners.length) * TWO_PI;
  drawProbeArc(ctx, cx, cy, radius, ringWidth, angle, arcAngle, pointerColor);
}

function drawPointer(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  radius: number,
  color: string
): void {
  const tipX = cx + Math.cos(angle) * radius;
  const tipY = cy + Math.sin(angle) * radius;
  const baseRadius = radius - 12;
  const baseX = cx + Math.cos(angle) * baseRadius;
  const baseY = cy + Math.sin(angle) * baseRadius;
  const side = 6;

  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    baseX + Math.cos(angle + Math.PI / 2) * side,
    baseY + Math.sin(angle + Math.PI / 2) * side
  );
  ctx.lineTo(
    baseX + Math.cos(angle - Math.PI / 2) * side,
    baseY + Math.sin(angle - Math.PI / 2) * side
  );
  ctx.closePath();
  ctx.fill();
}

function drawProbeArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  ringWidth: number,
  startAngle: number,
  endAngle: number,
  color: string
): void {
  const arcRadius = radius + ringWidth / 2 + 14;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.arc(cx, cy, arcRadius, startAngle, endAngle, false);
  ctx.stroke();
  ctx.restore();

  const tipAngle = endAngle;
  const tipX = cx + Math.cos(tipAngle) * arcRadius;
  const tipY = cy + Math.sin(tipAngle) * arcRadius;
  const size = 6;

  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    tipX + Math.cos(tipAngle - Math.PI / 2) * size,
    tipY + Math.sin(tipAngle - Math.PI / 2) * size
  );
  ctx.lineTo(
    tipX + Math.cos(tipAngle + Math.PI / 2) * size,
    tipY + Math.sin(tipAngle + Math.PI / 2) * size
  );
  ctx.closePath();
  ctx.fill();
}

function resolveOwnerColor(
  ownerIndex: number,
  order: string[],
  nodes: Record<string, Node>
): string {
  if (ownerIndex === -1 || ownerIndex >= order.length) {
    return "rgba(203, 213, 225, 0.45)";
  }

  const nodeId = order[ownerIndex];
  const node = nodes[nodeId];
  if (!node || !node.up) {
    return "rgba(203, 213, 225, 0.45)";
  }

  return node.color;
}

function slotToAngle(slot: number): number {
  return (slot / TOTAL_SLOTS) * TWO_PI - Math.PI / 2;
}
