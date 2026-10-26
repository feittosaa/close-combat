/** One set of cel tones for every Shoto drawing. Ordered from shadow to light. */
export const shotoPalette = {
  ink: ['#0e100f'],
  trousers: ['#222423', '#2d302c', '#383c35', '#44483e'],
  jacket: ['#625b4d', '#8e8169', '#b8aa89', '#d6c8a8', '#eee0c1'],
  shirt: ['#301b21', '#50252e', '#71343c', '#914b4e'],
  shoes: ['#211c19', '#392b23', '#543d2d', '#73553e'],
  hair: ['#251c18', '#3c2922', '#563a2b', '#704b35', '#896246'],
  skin: ['#4d3024', '#704731', '#966344', '#b78359', '#d09f73'],
} as const;

type Material = keyof typeof shotoPalette;
type RGB = readonly [number, number, number];
const colors = Object.fromEntries(Object.entries(shotoPalette).map(([key, ramp]) => [key,
  ramp.map(hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)] as RGB),
])) as Record<Material, RGB[]>;
const thresholds: Record<Material, readonly number[]> = {
  ink: [], trousers: [50, 76, 106], jacket: [95, 140, 184, 220],
  shirt: [67, 105, 150], shoes: [55, 90, 135], hair: [65, 100, 140, 180],
  skin: [85, 123, 190, 230],
};

/** Spatial hints distinguish identical red pigments in hair, shirt and leather. */
export function shotoMaterial(r: number, g: number, b: number, height: number, fromBody = 0): Material {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), chroma = max - min;
  if (max < 24) return 'ink';
  const warmth = (g - b) / Math.max(1, r - b);
  // Ivory folds in the retreat sheet are warmer than in idle; do not turn them into skin.
  if (max > 110 && g > r * .7 && b > r * .38 && warmth > .48) return 'jacket';
  if (r > g * 1.15 && r > b * 1.25 && chroma > 18) {
    if (height < .18 && warmth < .25) return 'hair';
    if (height > .72) return 'shoes';
    // Red reflected shadows on an exposed hand must not inherit the wine shirt.
    if (fromBody > .075 && warmth > .08) return 'skin';
    return warmth >= .25 ? 'skin' : 'shirt';
  }
  // Warm light neutrals belong to ivory cloth; olive/dark neutrals to trousers.
  return max >= 120 || (height < .43 && max >= 75) ? 'jacket' : 'trousers';
}

export function shotoColor(r: number, g: number, b: number, height: number, fromBody = 0): RGB {
  const material = shotoMaterial(r, g, b, height, fromBody);
  const value = Math.max(r, g, b);
  let level = 0;
  for (const threshold of thresholds[material]) if (value >= threshold) level++;
  return colors[material][level];
}

/** Palette application changes RGB only. Layout, transparent pixels and alpha are untouched. */
export function applyShotoPalettePixels(data: Uint8ClampedArray, width: number, height: number, cellWidth = 768): void {
  for (let cell = 0; cell < width; cell += cellWidth) {
    let top = height, bottom = -1;
    const end = Math.min(width, cell + cellWidth);
    for (let y = 0; y < height; y++) for (let x = cell; x < end; x++) {
      if (data[(y * width + x) * 4 + 3] > 32) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
    }
    if (bottom < top) continue;
    const bodyHeight = Math.max(1, bottom - top);
    for (let y = top; y <= bottom; y++) {
      const occupied: number[] = [];
      for (let x = cell; x < end; x++) if (data[(y * width + x) * 4 + 3] > 32) occupied.push(x);
      const center = occupied[Math.floor(occupied.length / 2)] ?? cell + cellWidth / 2;
      for (let x = cell; x < end; x++) {
        const offset = (y * width + x) * 4;
        if (!data[offset + 3]) continue;
        const color = shotoColor(data[offset], data[offset + 1], data[offset + 2], (y - top) / bodyHeight, Math.abs(x - center) / bodyHeight);
        data[offset] = color[0]; data[offset + 1] = color[1]; data[offset + 2] = color[2];
      }
    }
  }
}
