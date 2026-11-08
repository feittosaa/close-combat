import type Phaser from 'phaser';
import type { HitEvent } from '../engine/combat/AttackResolver';
import type { MoveDefinition } from '../engine/data/moves';
import hitLight from '../assets/sprites/effects/contact/hit-light.png';
import hitHeavy from '../assets/sprites/effects/contact/hit-heavy.png';
import hitSweep from '../assets/sprites/effects/contact/hit-sweep.png';
import blockLight from '../assets/sprites/effects/contact/block-light.png';
import blockHeavy from '../assets/sprites/effects/contact/block-heavy.png';
import blockSweep from '../assets/sprites/effects/contact/block-sweep.png';
import blockPerfect from '../assets/sprites/effects/contact/block-perfect.png';
import hitBlue from '../assets/sprites/effects/contact/hit-blue.png';
import blockBlue from '../assets/sprites/effects/contact/block-blue.png';
import hitWine from '../assets/sprites/effects/contact/hit-wine.png';
import blockWine from '../assets/sprites/effects/contact/block-wine.png';
import wallBounce from '../assets/sprites/effects/contact/wall-bounce.png';
import authoredCuts from '../assets/sprites/effects/contact/frames.json';

const sheets = {
  'hit-light': hitLight, 'hit-heavy': hitHeavy, 'hit-sweep': hitSweep,
  'block-light': blockLight, 'block-heavy': blockHeavy, 'block-sweep': blockSweep,
  'block-perfect': blockPerfect,
  'hit-blue': hitBlue, 'block-blue': blockBlue, 'hit-wine': hitWine, 'block-wine': blockWine,
} as const;

type Sheet = keyof typeof sheets;
const FRAME_HEIGHT = 724;
const frameWidth = (name: string) => name === 'hit-heavy' ? 464 : name === 'hit-wine' ? 512 : 362;

/**
 * Where one drawing of a contact sheet is cut from the sheet (`x`, `y`, `width`, `height`) and where its corner sits
 * (`left`, `top`) inside the sheet's regular grid frame, so drawings that cross the grid are shown whole and in place.
 */
export interface FrameCut { x: number; y: number; width: number; height: number; left: number; top: number }
/** Size of a sheet's frame, the dashed box of the developer mode; it grows around the grid frame's center. */
export interface FrameSize { width: number; height: number }
/** Frame size and cuts per sheet validated in `frames.json`; what is not listed follows the regular grid. */
const authored = authoredCuts as Readonly<Record<string, { size?: FrameSize; frames?: Readonly<Record<string, FrameCut>> }>>;
/** Cuts per texture (`contact-<sheet>`) and frame tried live in the developer mode; always empty in normal play. */
export const frameCutAdjustments = new Map<string, Readonly<Record<string, FrameCut>>>();
/** Frame sizes per texture tried live in the developer mode; always empty in normal play. */
export const frameSizeAdjustments = new Map<string, FrameSize>();

const gridSize = (key: string): FrameSize => ({ width: frameWidth(key.replace(/^contact-/, '')), height: FRAME_HEIGHT });
export function contactFrameSize(key: string): FrameSize {
  return frameSizeAdjustments.get(key) ?? authored[key.replace(/^contact-/, '')]?.size ?? gridSize(key);
}
/** How much larger than the grid frame the sheet's frame is; the effect's display size grows by it, so drawings keep their size. */
export function contactFrameGrowth(key: string): { x: number; y: number } {
  const size = contactFrameSize(key), grid = gridSize(key);
  return { x: size.width / grid.width, y: size.height / grid.height };
}
/** Offset of the grid frame inside the sheet's frame. */
export function contactFrameMargin(key: string): { x: number; y: number } {
  const size = contactFrameSize(key), grid = gridSize(key);
  return { x: Math.round((size.width - grid.width) / 2), y: Math.round((size.height - grid.height) / 2) };
}
export function contactFrameCut(key: string, frame: number): FrameCut {
  const { width, height } = gridSize(key);
  return frameCutAdjustments.get(key)?.[frame] ?? authored[key.replace(/^contact-/, '')]?.frames?.[frame] ??
    { x: frame * width, y: 0, width, height, left: 0, top: 0 };
}
/** Whether a texture is a contact sheet whose frames can be recut. */
export const isContactSheet = (key: string): boolean => key.startsWith('contact-') && key.slice('contact-'.length) in sheets;

/** Recuts every frame of a loaded contact sheet inside the sheet's frame size. */
export function applyContactFrames(textures: Phaser.Textures.TextureManager, key: string): void {
  if (!textures.exists(key)) return;
  const texture = textures.get(key), size = contactFrameSize(key), margin = contactFrameMargin(key);
  for (let index = 0; texture.has(String(index)); index += 1) {
    const cut = contactFrameCut(key, index);
    texture.get(index).setSize(cut.width, cut.height, cut.x, cut.y)
      .setTrim(size.width, size.height, cut.left + margin.x, cut.top + margin.y, cut.width, cut.height);
  }
}

export function preloadContactEffects(scene: Phaser.Scene): void {
  if (!scene.textures.exists('wall-bounce')) scene.load.image('wall-bounce', wallBounce);
  for (const [name, url] of Object.entries(sheets)) {
    const key = `contact-${name}`;
    if (scene.textures.exists(key)) continue;
    scene.load.spritesheet(key, url, { frameWidth: frameWidth(name), frameHeight: FRAME_HEIGHT });
    scene.load.once(`filecomplete-spritesheet-${key}`, () => applyContactFrames(scene.textures, key));
  }
}

export function contactEffectKey(event: HitEvent, move?: MoveDefinition): Sheet {
  const sweep = move?.hitLevel === 'low' && (move.knockdown || move.id === 'crouch-heavy-kick');
  const push = move?.id === 'push-away';
  const heavy = move?.category === 'power' || move?.category === 'ultimate' ||
    move?.input.buttons.some(button => button === '2' || button === '4');
  if (event.perfectBlock) return 'block-perfect';
  let color: 'blue' | 'wine' | undefined;
  if (move?.category === 'special' || move?.category === 'ultimate') {
    if (move.projectile?.visual === 'bullet' || move.projectile?.visual === 'dynamite') color = 'blue';
    else if (move.projectile?.visual === 'tomato') color = 'wine';
  }
  return `${event.outcome}-${color ?? (sweep || push ? 'sweep' : heavy ? 'heavy' : 'light')}`;
}
