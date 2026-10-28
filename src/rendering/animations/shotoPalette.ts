/** Art-direction references. Runtime grading preserves continuous source shading instead of snapping to these swatches. */
export const shotoPalette = {
  ink: ['#0e100f'],
  trousers: ['#222423', '#2d302c', '#383c35', '#44483e'],
  jacket: ['#625b4d', '#8e8169', '#b8aa89', '#d6c8a8', '#eee0c1'],
  shirt: ['#301b21', '#50252e', '#71343c', '#914b4e'],
  shoes: ['#211c19', '#392b23', '#543d2d', '#73553e'],
  hair: ['#251c18', '#3c2922', '#563a2b', '#704b35', '#896246'],
  skin: ['#4d3024', '#704731', '#966344', '#b78359', '#d09f73'],
} as const;

type RGB = readonly [number, number, number];

function smooth(low: number, high: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

/** Continuous grading, never a material classifier or a quantized replacement color.
 * Ivory and ink retain their source detail; mild overlapping weights preserve cel shading.
 */
export function shotoColor(r: number, g: number, b: number, height: number): RGB {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const saturation = (max - min) / Math.max(1, max);
  const warmth = (g - b) / Math.max(1, r - b);
  const red = smooth(0, .25, (r - g) / Math.max(1, max));
  const redPigment = red * smooth(.35, .65, saturation) * (1 - smooth(.12, .3, warmth));
  const hair = redPigment * (1 - smooth(.12, .24, height));
  const skin = red * smooth(.32, .58, saturation) * smooth(.16, .32, warmth)
    * (1 - smooth(.46, .65, warmth));
  const trousers = (1 - smooth(.25, .5, saturation)) * smooth(.35, .6, height)
    * (1 - smooth(100, 170, max));
  const leather = red * smooth(.32, .6, saturation) * smooth(.68, .86, height);
  const luminance = .2126 * r + .7152 * g + .0722 * b;
  const source: RGB = [r, g, b];
  const hairTarget: RGB = [luminance * 1.18, luminance * .84, luminance * .64];
  const skinScale: RGB = [.88, .91, .96];
  const leatherScale: RGB = [.88, .96, 1.03];
  return source.map((value, channel) => Math.round(Math.max(0, Math.min(255,
    value + hair * (hairTarget[channel] - value)
      + skin * value * (skinScale[channel] - 1)
      - trousers * value * .23
      + leather * value * (leatherScale[channel] - 1),
  )))) as unknown as RGB;
}

/** Grade RGB only, retaining every original alpha value, pixel position and atlas cell. */
export function applyShotoPalettePixels(data: Uint8ClampedArray, width: number, height: number, cellWidth = 768): void {
  for (let cell = 0; cell < width; cell += cellWidth) {
    let top = height, bottom = -1;
    const end = Math.min(width, cell + cellWidth);
    for (let y = 0; y < height; y++) for (let x = cell; x < end; x++) {
      if (data[(y * width + x) * 4 + 3] > 32) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
    }
    if (bottom < top) continue;
    for (let y = top; y <= bottom; y++) for (let x = cell; x < end; x++) {
      const offset = (y * width + x) * 4;
      if (!data[offset + 3]) continue;
      const color = shotoColor(data[offset], data[offset + 1], data[offset + 2], (y - top) / Math.max(1, bottom - top));
      data[offset] = color[0]; data[offset + 1] = color[1]; data[offset + 2] = color[2];
    }
  }
}
