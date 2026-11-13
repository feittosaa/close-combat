import type Phaser from 'phaser';

/** Part of a drawing kept, as the fractions of the frame removed from each side. */
export interface FrameCrop { left: number; top: number; right: number; bottom: number }
/**
 * Placement and crop of one drawing of a fighter's sheet (`frames.json` beside the sheets). `x` and `y` move the
 * drawing and `crop` trims it, all as fractions of the frame so both resolutions of the art agree; positions are
 * given for a fighter facing right.
 */
export interface FrameAdjustment { x?: number; y?: number; crop?: FrameCrop }
/** Adjustments per fighter, sheet and frame validated in `frames.json`; what is not listed stays as drawn. */
export type FrameAdjustments = Readonly<Record<string, Readonly<Record<string, FrameAdjustment>>>>;

const files = import.meta.glob<FrameAdjustments>('../../assets/sprites/characters/*/frames.json', { eager: true, import: 'default' });
const authored = new Map(Object.entries(files).map(([path, sheets]) => [path.split('/').slice(-2)[0], sheets] as const));
/** Adjustments per `<fighter>:<sheet>:<frame>` tried live in the developer mode, replacing the validated ones; always empty in normal play. */
export const frameAdjustments = new Map<string, FrameAdjustment>();

export function frameAdjustment(fighter: string, sheet: string, frame: number): FrameAdjustment {
  return frameAdjustments.get(`${fighter}:${sheet}:${frame}`) ?? authored.get(fighter)?.[sheet]?.[frame] ?? {};
}
/** Where a drawing is moved, as fractions of its frame (right and down are positive). */
export function framePlacement(fighter: string, sheet: string, frame: number): { x: number; y: number } {
  const { x = 0, y = 0 } = frameAdjustment(fighter, sheet, frame);
  return { x, y };
}

type Cut = { cutX: number; cutY: number; cutWidth: number; cutHeight: number; x: number; y: number };
const uncropped = new WeakMap<Phaser.Textures.Frame, Cut>();

/**
 * Trims every frame of a loaded character sheet (`<fighter>-<sheet>`) to its crop. Frames are stored without their
 * transparent margins, so a crop can only remove drawn pixels: the part of the crop outside them is ignored.
 */
export function applyFrameCrops(textures: Phaser.Textures.TextureManager, key: string): void {
  const separator = key.indexOf('-');
  if (separator < 0 || !textures.exists(key)) return;
  const fighter = key.slice(0, separator), sheet = key.slice(separator + 1), texture = textures.get(key);
  for (const name of texture.getFrameNames()) {
    const frame = texture.get(name), index = Number(name), crop = frameAdjustment(fighter, sheet, index).crop;
    if (!crop && !uncropped.has(frame)) continue;
    const { cutX, cutY, cutWidth, cutHeight, x, y } = uncropped.get(frame) ?? { cutX: frame.cutX, cutY: frame.cutY, cutWidth: frame.cutWidth, cutHeight: frame.cutHeight, x: frame.x, y: frame.y };
    uncropped.set(frame, { cutX, cutY, cutWidth, cutHeight, x, y });
    const left = Math.min(x + cutWidth - 1, Math.max(x, Math.round((crop?.left ?? 0) * frame.realWidth)));
    const top = Math.min(y + cutHeight - 1, Math.max(y, Math.round((crop?.top ?? 0) * frame.realHeight)));
    const right = Math.max(left + 1, Math.min(x + cutWidth, Math.round((1 - (crop?.right ?? 0)) * frame.realWidth)));
    const bottom = Math.max(top + 1, Math.min(y + cutHeight, Math.round((1 - (crop?.bottom ?? 0)) * frame.realHeight)));
    frame.setSize(right - left, bottom - top, cutX + left - x, cutY + top - y).setTrim(frame.realWidth, frame.realHeight, left, top, right - left, bottom - top);
  }
}
