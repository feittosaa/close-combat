import type Phaser from 'phaser';
import type { StageDefinition } from './stages/StageDefinition';
import type { StageLayout } from './stages/stageLayout';

export const CHARACTER_COLOR_PIPELINE = 'character-color';
/** Colour correction of one sheet: a 3×3 matrix by rows, each followed by its offset, over RGB from 0 to 1. */
export type SheetCorrection = readonly number[];
export const IDENTITY_CORRECTION: SheetCorrection = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
const correctionFiles = import.meta.glob<Record<string, SheetCorrection>>('../assets/sprites/characters/*/colors.json', { eager: true, import: 'default' });
/**
 * Per-sheet corrections written by `scripts/verify-character-colors.py`, keyed by texture (`<fighter>-<sheet>`): they
 * bring the materials of a sheet to the colours of the fighter's idle without touching its image.
 */
const corrections = new Map<string, SheetCorrection>(Object.entries(correctionFiles).flatMap(([path, sheets]) => {
  const fighter = path.split('/').slice(-2)[0];
  return Object.entries(sheets).map(([sheet, correction]) => [`${fighter}-${sheet}`, correction] as const);
}));
const correctedFighters = new Set([...corrections.keys()].map(texture => texture.split('-')[0]));
/** The correction of the sheet behind a texture key, if it has one. */
export const sheetCorrection = (texture: string | undefined): SheetCorrection | undefined => texture === undefined ? undefined : corrections.get(texture);
const fighterFiles = <T>(files: Record<string, T>) => new Map(Object.entries(files).map(([path, file]) => [path.split('/').slice(-2)[0], file] as const));
/** On-screen outline width, in world pixels, of each fighter with uniform outlines (`outline.json`). */
export const outlineTargets = new Map([...fighterFiles(import.meta.glob<{ width: number }>('../assets/sprites/characters/*/outline.json', { eager: true, import: 'default' }))]
  .map(([fighter, file]) => [fighter, file.width] as const));
/** Outline width of every frame, as a fraction of its height (`scripts/measure-outlines.py`), keyed by texture. */
const measuredOutlines = new Map<string, readonly (number | null)[]>([...fighterFiles(import.meta.glob<Record<string, readonly (number | null)[]>>('../assets/sprites/characters/*/outline-widths.json', { eager: true, import: 'default' }))]
  .flatMap(([fighter, sheets]) => Object.entries(sheets).map(([sheet, widths]) => [`${fighter}-${sheet}`, widths] as const)));
/** Outline widths tried in the developer mode, per fighter, over `outlineTargets`. */
export const outlineWidths = new Map<string, number>();
/**
 * Texels to trim from the outside of a frame's outline (negative: to grow outward) so it shows at the fighter's target
 * width: `frameHeight` is the frame's height in texels and `worldPerTexel` the scale it is drawn with.
 */
export function outlineTrim(texture: string, frame: string | number, frameHeight: number, worldPerTexel: number): number {
  const fighter = texture.split('-')[0], target = outlineWidths.get(fighter) ?? outlineTargets.get(fighter);
  const measured = measuredOutlines.get(texture)?.[Number(frame)];
  return target === undefined || measured === undefined || measured === null || !worldPerTexel ? 0 : measured * frameHeight - target / worldPerTexel;
}
/**
 * Colour of one sprite, read by the shared pipeline (`palettePipeline.ts`) while it draws that sprite: the selective
 * alternate palette (`palette`: 0 none, 1 bob, 2 texas, 3 magic, 4 magic highlight, 5 grappler) and, when `lit`, the stage light.
 * The sheet correction is read by the pipeline from the texture being drawn.
 */
export interface CharacterColorData {
  palette: number; lit: boolean; exposure: number; shadow: readonly [number, number, number]; occlusion: number; warmth: number;
}
export type Palette = 'none' | 'bob' | 'texas' | 'magic' | 'magic-highlight' | 'grappler';
/**
 * Stage lighting for a fighter: `exposure` scales the whole figure, `shadow` is the ambient colour taken by its dark tones,
 * `occlusion` deepens them and `warmth` is the flame light on the lit surfaces. Nothing rotates hue, so clothing keeps its colour.
 */
export interface CharacterColor { exposure?: number; shadow?: readonly [number, number, number]; occlusion?: number; warmth?: number; alternate?: boolean }
type CanvasImage = Phaser.GameObjects.Image & { renderCanvas: (...args: [Phaser.Renderer.Canvas.CanvasRenderer, ...unknown[]]) => void };
const smoothstep = (a: number, b: number, value: number): number => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Provisional scene lighting; lights follow their scenery layer's parallax. */
export function characterColor(stage: StageDefinition, layout: StageLayout, x: number, cameraScrollX: number, alternate: boolean): CharacterColor {
  const ambient: Record<string, Required<Omit<CharacterColor, 'alternate' | 'warmth'>>> = {
    'sala-treino': { exposure: 1, shadow: [1, 1, 1], occlusion: 0 },
    'fazenda': { exposure: 1.03, shadow: [.9, .94, 1], occlusion: .12 },
    'saloon-dia': { exposure: 1.03, shadow: [.96, .91, .86], occlusion: .14 },
    'saloon-noite': { exposure: .91, shadow: [.8, .82, 1], occlusion: .26 },
    'saloon': { exposure: .95, shadow: [.92, .84, .8], occlusion: .2 },
  };
  const base = ambient[stage.id] ?? ambient['sala-treino'];
  let light = 0;
  for (const layer of stage.layers) {
    if (!layer.id.startsWith('chama-')) continue;
    const center = (layer.x + (layer.size?.width ?? 0) / 2) * layout.scale;
    const projected = center + cameraScrollX * (1 - layer.parallax);
    for (const side of [-1, 0, 1]) {
      const position = side === 0 ? projected : (side < 0 ? -center : 2 * layout.worldWidth - center) + cameraScrollX * (1 - layer.parallax);
      light = Math.max(light, Math.max(0, 1 - Math.abs(x - position) / (200 * layout.scale)));
    }
  }
  return { ...base, warmth: light, alternate };
}

/** Applies a sheet correction to one pixel (0–255), as the pipeline does before the palette. */
export function correctedPixel(r: number, g: number, b: number, correction: SheetCorrection): [number, number, number] {
  const rgb = [r / 255, g / 255, b / 255];
  return [0, 1, 2].map(row => Math.round(Math.min(1, Math.max(0,
    correction[row * 4] * rgb[0] + correction[row * 4 + 1] * rgb[1] + correction[row * 4 + 2] * rgb[2] + correction[row * 4 + 3])) * 255)) as [number, number, number];
}

/** Hue (degrees), saturation and value (0–255) of a pixel. */
function hsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b), delta = max - Math.min(r, g, b);
  if (!delta || !max) return [0, 0, max];
  const hue = (max === r ? (g - b) / delta + (g < b ? 6 : 0) : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60;
  return [hue, delta / max, max];
}

/**
 * Change selected chromatic ranges only, retaining shading and transparency. Which pixels change is read from `drawn`,
 * the colour before the sheet correction (the ranges were tuned on it); the colour they take comes from the pixel given.
 */
export function palettePixel(r: number, g: number, b: number, palette: Palette, drawn: readonly [number, number, number] = [r, g, b]): [number, number, number] {
  if (palette === 'magic-highlight') return [Math.round(r * .72), Math.round(g * .5), b];
  const [h, saturation, max] = hsv(r, g, b);
  const [dh, ds, dv] = hsv(...drawn);
  if (!ds) return [r, g, b];
  // The olive shirt, its shadows and the tie reach greener, duller tones in some sheets than in the idle.
  if (palette === 'grappler') {
    // Only the neon orange and amber of the suit (fully saturated, unlike leather and skin) turn cyan, keeping light and shade.
    const weight = smoothstep(.8, .86, ds) * smoothstep(8, 14, dh) * (1 - smoothstep(48, 58, dh));
    const cyan = hsvToRgb(190 + (h - 30) * .5, max, saturation);
    return [r, g, b].map((value, index) => Math.round(value + (cyan[index] - value) * weight)) as [number, number, number];
  }
  if (palette === 'bob' && dh >= 27 && dh <= 90 && ds >= (dh > 56 ? .3 : .38) && dv < 190 && dv > 20) {
    // Saturated orange at the low hue edge is blond hair or straw, not shirt: fade it out instead of cutting; the
    // green edge fades out too.
    const shirt = Math.max(smoothstep(30, 35, dh), 1 - smoothstep(.6, .72, ds)) * (1 - smoothstep(80, 90, dh));
    const red = hsvToRgb(355 + (h - 40) * .35, Math.min(255, max * 1.15), Math.max(saturation, .9));
    return red.map((value, index) => Math.round([r, g, b][index] + (value - [r, g, b][index]) * shirt)) as [number, number, number];
  }
  if (palette === 'magic') {
    // The spectral blue turns gold; the violet and pink specks that mixed into it turn orange.
    if (dh < 160 || dh > 345 || ds < .1) return [r, g, b];
    return hsvToRgb(45 + (h - 200) * .3 + smoothstep(240, 270, dh) * (25 - (45 + (h - 200) * .3)), max, saturation).map(Math.round) as [number, number, number];
  }
  if (palette === 'texas') {
    // Only the red (poncho, hat band, fringe) turns blue, keeping its light and shade; leather, skin and gold stay. Read
    // from the corrected color, which the sheet correction aligns with the idle's materials. Red and leather overlap in
    // hue, so the boundary is a line in hue and saturation fitted to the sheets: the redder the hue, the less saturation it takes.
    const hue = h > 180 ? h - 360 : h;
    const weight = smoothstep(-.05, .05, saturation - (.48 + .0115 * hue)) * smoothstep(.3, .45, saturation) *
      smoothstep(-90, -70, hue) * (1 - smoothstep(35, 60, hue));
    const blue = hsvToRgb(215 + hue * .5, max, saturation);
    return [r, g, b].map((value, index) => Math.round(value + (blue[index] - value) * weight)) as [number, number, number];
  }
  return [r, g, b];
}

function hsvToRgb(hue: number, value: number, saturation: number): [number, number, number] {
  const h = ((hue % 360) + 360) % 360 / 60, c = value * saturation;
  const x = c * (1 - Math.abs(h % 2 - 1)), m = value - c;
  const rgb = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  return rgb.map(channel => channel + m) as [number, number, number];
}

/** Stage lighting is independent from the selective alternate palette and always runs after it, like a filter over the recolored sprite. */
export class CharacterColorEffect {
  private readonly canvasColors = new WeakMap<Phaser.GameObjects.Image, CharacterColor>();
  private readonly canvasPalettes = new WeakMap<Phaser.GameObjects.Image, Palette>();
  apply(sprite: Phaser.GameObjects.Image, color: CharacterColor, palette: Palette = 'none'): void {
    palette = color.alternate ? palette : 'none';
    if (sprite.scene?.sys.game.renderer.type === 1) {
      if (!this.canvasColors.has(sprite)) {
        const image = sprite as CanvasImage;
        const render = image.renderCanvas;
        let canvas: HTMLCanvasElement | undefined;
        let previousFrame: Phaser.Textures.Frame | undefined, previousPalette: Palette = 'none';
        image.renderCanvas = (renderer, ...args) => {
          const current = this.canvasColors.get(sprite)!;
          const selected = this.canvasPalettes.get(sprite)!;
          const context = renderer.currentContext;
          context.save();
          context.filter = `brightness(${current.exposure ?? 1})`;
          const correction = sheetCorrection(sprite.texture?.key);
          if (selected === 'none' && !correction) {
            try { render.call(image, renderer, ...args); } finally { context.restore(); }
            return;
          }
          const frame = sprite.frame;
          const source = frame.source;
          const original = source.image;
          const canvasData = frame.canvasData as { x: number; y: number };
          const x = canvasData.x, y = canvasData.y;
          try {
            canvas ??= document.createElement('canvas');
            if (frame !== previousFrame || selected !== previousPalette) {
                canvas.width = frame.cutWidth; canvas.height = frame.cutHeight;
                const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
                ctx.drawImage(original as CanvasImageSource, x, y, frame.cutWidth, frame.cutHeight, 0, 0, frame.cutWidth, frame.cutHeight);
                const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
                for (let i = 0; i < pixels.data.length; i += 4) {
                  if (!pixels.data[i + 3]) continue;
                  const drawn = [pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]] as const;
                  const [r, g, b] = palettePixel(...(correction ? correctedPixel(...drawn, correction) : drawn), selected, drawn);
                  pixels.data[i] = r; pixels.data[i + 1] = g; pixels.data[i + 2] = b;
                }
                ctx.putImageData(pixels, 0, 0); previousFrame = frame; previousPalette = selected;
            }
            source.image = canvas; canvasData.x = 0; canvasData.y = 0;
            render.call(image, renderer, ...args);
          } finally { source.image = original; canvasData.x = x; canvasData.y = y; context.restore(); }
        };
      }
      this.canvasColors.set(sprite, color);
      this.canvasPalettes.set(sprite, palette);
      return;
    }
    // Every coloured sprite draws through one shared pipeline that reads its colour from `pipelineData`.
    const lit = isLit(color);
    if (sprite.pipeline?.name !== CHARACTER_COLOR_PIPELINE) {
      // A fighter with corrected sheets or uniform outlines always draws through the pipeline, which reads both from the texture.
      const fighter = sprite.texture?.key.split('-')[0] ?? '';
      if (palette === 'none' && !lit && !correctedFighters.has(fighter) && !outlineTargets.has(fighter)) return;
      sprite.setPipeline(CHARACTER_COLOR_PIPELINE);
    }
    const data: CharacterColorData = { palette: PALETTE_CODES[palette], lit, exposure: color.exposure ?? 1, shadow: color.shadow ?? [1, 1, 1],
      occlusion: color.occlusion ?? 0, warmth: color.warmth ?? 0 };
    Object.assign(sprite.pipelineData, data);
  }
}

const PALETTE_CODES: Readonly<Record<Palette, number>> = { none: 0, bob: 1, texas: 2, magic: 3, 'magic-highlight': 4, grappler: 5 };
const isLit = (color: CharacterColor): boolean =>
  (color.exposure ?? 1) !== 1 || (color.occlusion ?? 0) > 0 || (color.warmth ?? 0) > 0 || (color.shadow ?? [1, 1, 1]).some(channel => channel !== 1);
