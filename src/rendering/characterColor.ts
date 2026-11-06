import type Phaser from 'phaser';
import type { StageDefinition } from './stages/StageDefinition';
import type { StageLayout } from './stages/stageLayout';

export type Palette = 'none' | 'bob' | 'texas' | 'magic' | 'magic-highlight';
export interface CharacterColor { hue: number; brightness: number; alternate?: boolean }
type CanvasImage = Phaser.GameObjects.Image & { renderCanvas: (...args: [Phaser.Renderer.Canvas.CanvasRenderer, ...unknown[]]) => void };
const smoothstep = (a: number, b: number, value: number): number => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Provisional scene grading; lights follow their scenery layer's parallax. */
export function characterColor(stage: StageDefinition, layout: StageLayout, x: number, cameraScrollX: number, alternate: boolean): CharacterColor {
  const ambient: Record<string, CharacterColor> = {
    'sala-treino': { hue: 0, brightness: 1 },
    'fazenda': { hue: -4, brightness: 1.03 },
    'saloon-dia': { hue: -5, brightness: 1.03 },
    'saloon-noite': { hue: 8, brightness: .91 },
    'saloon': { hue: -8, brightness: .94 },
  };
  const base = ambient[stage.id] ?? { hue: 0, brightness: 1 };
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
  return { hue: base.hue - 5 * light, brightness: base.brightness + .09 * light, alternate };
}

/** Change selected chromatic ranges only, retaining shading and transparency. */
export function palettePixel(r: number, g: number, b: number, palette: Palette): [number, number, number] {
  if (palette === 'magic-highlight') return [Math.round(r * .72), Math.round(g * .5), b];
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  if (!delta || !max) return [r, g, b];
  const saturation = delta / max;
  let h = (max === r ? (g - b) / delta + (g < b ? 6 : 0) : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60;
  if (palette === 'bob' && h >= 27 && h <= 56 && saturation >= .38 && max < 190 && max > 20) {
    // Saturated orange at the low hue edge is blond hair or straw, not shirt: fade it out instead of cutting.
    const shirt = Math.max(smoothstep(30, 35, h), 1 - smoothstep(.6, .72, saturation));
    const red = hsvToRgb(355 + (h - 40) * .35, Math.min(255, max * 1.15), Math.max(saturation, .9));
    return red.map((value, index) => Math.round([r, g, b][index] + (value - [r, g, b][index]) * shirt)) as [number, number, number];
  }
  else if (palette === 'texas' && !(h >= 160 && h <= 255 && saturation >= .1)) {
    const warm = Math.max(1 - smoothstep(34, 44, h), smoothstep(292, 307, h));
    const red = Math.max(1 - smoothstep(8, 24, h), smoothstep(292, 307, h));
    const dark = warm * smoothstep(.18, .35, saturation) * (1 - smoothstep(.69, .82, max / 255));
    const vividRed = red * smoothstep(.35, .6, saturation);
    const weight = Math.max(dark, vividRed);
    const shade = max * .3;
    return [r, g, b].map(value => Math.round(value + (shade - value) * weight)) as [number, number, number];
  }
  else if ((palette === 'magic' || palette === 'texas') && h >= 160 && h <= 255 && saturation >= .1) return hsvToRgb(h + 55, max, saturation).map(Math.round) as [number, number, number];
  return [r, g, b];
}

function hsvToRgb(hue: number, value: number, saturation: number): [number, number, number] {
  const h = ((hue % 360) + 360) % 360 / 60, c = value * saturation;
  const x = c * (1 - Math.abs(h % 2 - 1)), m = value - c;
  const rgb = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  return rgb.map(channel => channel + m) as [number, number, number];
}

/** Stage grading is independent from the selective alternate palette and always runs after it, like a filter over the recolored sprite. */
export class CharacterColorEffect {
  private readonly matrices = new WeakMap<Phaser.GameObjects.Image, { matrix: Phaser.FX.ColorMatrix; post: boolean }>();
  private readonly canvasColors = new WeakMap<Phaser.GameObjects.Image, CharacterColor>();
  private readonly canvasPalettes = new WeakMap<Phaser.GameObjects.Image, Palette>();
  private readonly pipelines = new WeakMap<Phaser.GameObjects.Image, { palette: number }>();
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
          context.filter = `hue-rotate(${current.hue}deg) brightness(${current.brightness})`;
          if (selected === 'none') {
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
                  const [r, g, b] = palettePixel(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2], selected);
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
    if (palette !== 'none' && !this.pipelines.has(sprite)) {
      sprite.setPostPipeline('character-palette');
      const pipeline = sprite.getPostPipeline('character-palette') as unknown as { palette: number } | undefined;
      if (pipeline) this.pipelines.set(sprite, pipeline);
    }
    const pipeline = this.pipelines.get(sprite);
    if (pipeline) pipeline.palette = palette === 'bob' ? 1 : palette === 'texas' ? 2 : palette === 'magic' ? 3 : palette === 'magic-highlight' ? 4 : 0;
    // Recolored sprites light after the palette (post effect, like a filter); plain sprites keep their original pre effect.
    const post = this.pipelines.has(sprite);
    let entry = this.matrices.get(sprite);
    if (entry && entry.post !== post) {
      (entry.post ? sprite.postFX : sprite.preFX)?.remove(entry.matrix as unknown as Phaser.FX.Controller);
      entry = undefined;
    }
    const effects = post ? sprite.postFX : sprite.preFX;
    if (!effects) return;
    if (!entry) { entry = { matrix: effects.addColorMatrix(), post }; this.matrices.set(sprite, entry); }
    entry.matrix.hue(color.hue);
    entry.matrix.brightness(color.brightness, true);
  }
}
