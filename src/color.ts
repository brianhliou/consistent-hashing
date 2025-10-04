const GOLDEN_ANGLE = 137.508;
const PALETTE: Array<{ h: number; s: number; l: number }> = [
  { h: 4, s: 80, l: 56 },
  { h: 210, s: 82, l: 52 },
  { h: 128, s: 54, l: 45 },
  { h: 280, s: 74, l: 58 },
  { h: 35, s: 90, l: 58 },
  { h: 185, s: 68, l: 48 },
  { h: 330, s: 70, l: 60 },
  { h: 255, s: 75, l: 55 },
  { h: 60, s: 75, l: 50 },
  { h: 15, s: 70, l: 46 },
  { h: 310, s: 68, l: 52 },
  { h: 95, s: 60, l: 48 },
];

/**
 * Generates a visually distinct HSL color string for the provided index.
 * Uses a curated palette for early nodes, then falls back to a golden-angle sweep.
 * @param index - Zero-based node index.
 * @returns CSS HSL color string.
 */
export function nextColor(index: number): string {
  if (!Number.isFinite(index) || index < 0) {
    throw new RangeError("index must be a non-negative finite number");
  }

  if (index < PALETTE.length) {
    const { h, s, l } = PALETTE[index];
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  const hue = Math.round((index * GOLDEN_ANGLE) % 360);
  const saturation = 70;
  const lightness = index % 2 === 0 ? 55 : 48;

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Chooses a contrasting text color (black or white) for the provided background color.
 * @param color - CSS color string (supports hsl(), rgb(), #rgb/#rrggbb/#rrggbbaa).
 * @returns High-contrast text color value.
 */
export function contrast(color: string): "black" | "white" {
  const rgb = parseColor(color);
  if (!rgb) {
    // Default to dark text when the color cannot be parsed.
    return "black";
  }

  const luminance = relativeLuminance(rgb[0], rgb[1], rgb[2]);
  return luminance > 0.55 ? "black" : "white";
}

function parseColor(color: string): [number, number, number] | null {
  const normalized = color.trim().toLowerCase();

  const hslMatch = normalized.match(/^hsla?\(\s*([+-]?\d+(?:\.\d+)?)\s*(?:deg)?\s*,\s*([+-]?\d+(?:\.\d+)?)%\s*,\s*([+-]?\d+(?:\.\d+)?)%/);
  if (hslMatch) {
    const h = ((Number(hslMatch[1]) % 360) + 360) % 360;
    const s = clamp01(Number(hslMatch[2]) / 100);
    const l = clamp01(Number(hslMatch[3]) / 100);
    return hslToRgb(h, s, l);
  }

  const rgbMatch = normalized.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])].map((value) =>
      Math.max(0, Math.min(255, value))
    ) as [number, number, number];
  }

  const hexMatch = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return hex.split("").map((ch) => parseInt(ch + ch, 16)) as [number, number, number];
    }

    return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number];
  }

  return null;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hPrime = h / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));

  let r = 0;
  let g = 0;
  let b = 0;

  if (hPrime >= 0 && hPrime < 1) {
    r = c;
    g = x;
  } else if (hPrime >= 1 && hPrime < 2) {
    r = x;
    g = c;
  } else if (hPrime >= 2 && hPrime < 3) {
    g = c;
    b = x;
  } else if (hPrime >= 3 && hPrime < 4) {
    g = x;
    b = c;
  } else if (hPrime >= 4 && hPrime < 5) {
    r = x;
    b = c;
  } else if (hPrime >= 5 && hPrime < 6) {
    r = c;
    b = x;
  }

  const m = l - c / 2;
  return [r + m, g + m, b + m].map((channel) => Math.round(channel * 255)) as [number, number, number];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rl, gl, bl] = [r, g, b].map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}
