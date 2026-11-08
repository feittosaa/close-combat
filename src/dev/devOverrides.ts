import type { CharacterDefinition, ComboRecipe } from '../engine/data/characters';
import type { MoveDefinition } from '../engine/data/moves';
import { HUD } from '../ui/hudTheme';
import { DEFAULT_HERO_FRAME, DEFAULT_TILE_FRAME, fighterArt, type FighterArt, type IconWindow, type SelectionFrame, type VictoryFrame } from '../ui/fighterArt';
import { sheetScaleAdjustments } from '../rendering/animations/spriteScale';
import { frameCutAdjustments, frameSizeAdjustments, type FrameCut, type FrameSize } from '../rendering/contactEffects';

/** Move fields the developer mode may retune; everything else stays as authored in the fighter data. */
export const MOVE_FIELDS = ['startup', 'activeFrames', 'recovery', 'damage', 'hitstun', 'blockstun'] as const;
export type MoveField = typeof MOVE_FIELDS[number];
export type MoveTuning = Partial<Record<MoveField | 'pushbackHit' | 'pushbackBlock', number>>;
/** Recipe fields the developer mode may edit; projectile sequences and launches stay as authored. */
export const RECIPE_FIELDS = ['name', 'notation', 'moveIds', 'startupFrames', 'finisherMoveId', 'recoveryFrames', 'continueOnHit', 'endsBasicChain'] as const;
type RecipeField = typeof RECIPE_FIELDS[number];
/** Edited recipe fields; `null` removes an authored optional field. */
export type RecipeTuning = { -readonly [K in RecipeField]?: ComboRecipe[K] | null };

/** CSS custom properties of the menus and overlays, declared on `:root` in style.css. */
export const CSS_COLORS = ['--ink', '--cream', '--cream-dim', '--paper-light', '--paper-shade', '--print', '--print-soft', '--red', '--accent'] as const;
/** HUD tokens drawn on the canvas, addressed as `HUD.<name>` or `HUD.<name>.<index>`. */
export const HUD_COLORS = ['ink', 'inset', 'rail', 'gold', 'lightGold', 'ivory', 'muted', 'goldText',
  'players.0', 'players.1', 'playerText.0', 'playerText.1', 'rage.0', 'rage.1', 'rage.2', 'phases.0', 'phases.1', 'phases.2'] as const;

/** Framing of one fighter's selection art: panel and tile images, HUD icon window and victory screen. */
export interface SelectionTuning { hero?: SelectionFrame; tile?: SelectionFrame; iconWindow?: IconWindow; victory?: VictoryFrame }
export const SELECTION_FIELDS = ['hero', 'tile', 'iconWindow', 'victory'] as const;

export interface DevOverrides {
  moves: Record<string, Record<string, MoveTuning>>;
  recipes: Record<string, Record<string, RecipeTuning>>;
  combos: Record<string, ComboRecipe[]>;
  colors: Record<string, string>;
  /** Animation size multipliers per `<fighter>:<sheet>`, over the automatic or validated scale. */
  spriteScales: Record<string, number>;
  /** Frame cuts of contact sheets per texture and frame index (`frames.json` beside the sheets). */
  frameCuts: Record<string, Record<string, FrameCut>>;
  /** Frame sizes of contact sheets per texture (`frames.json` beside the sheets). */
  frameSizes: Record<string, FrameSize>;
  /** Selection-screen framing per fighter id (`fighterArt.ts`). */
  selection: Record<string, SelectionTuning>;
}

const STORAGE_KEY = 'close-combat.dev-overrides';
const empty = (): DevOverrides => ({ moves: {}, recipes: {}, combos: {}, colors: {}, spriteScales: {}, frameCuts: {}, frameSizes: {}, selection: {} });

export function loadOverrides(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): DevOverrides {
  try { return { ...empty(), ...JSON.parse(storage?.getItem(STORAGE_KEY) ?? '{}') as Partial<DevOverrides> }; } catch { return empty(); }
}
export function saveOverrides(overrides: DevOverrides, storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage): boolean {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(overrides)); return true; } catch { return false; }
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Baseline = { moves: Map<MoveDefinition, MoveDefinition>; recipes: Map<ComboRecipe, ComboRecipe>; combos: Map<CharacterDefinition, readonly ComboRecipe[] | undefined>; hud: string; art: Map<FighterArt, SelectionTuning> };

/**
 * Applies developer tuning to the live fighter data. The simulation reads these objects every frame, so changes reach
 * the next action; the authored values are kept aside and restored before every application.
 */
export class DevTuning {
  private readonly baseline: Baseline;
  constructor(private readonly fighters: readonly CharacterDefinition[], public overrides: DevOverrides = empty()) {
    this.baseline = {
      moves: new Map(fighters.flatMap(fighter => fighter.moves.map(move => [move, structuredClone(move)] as const))),
      recipes: new Map(fighters.flatMap(fighter => (fighter.combos ?? []).map(recipe => [recipe, structuredClone(recipe)] as const))),
      combos: new Map(fighters.map(fighter => [fighter, fighter.combos] as const)),
      hud: JSON.stringify(HUD),
      art: new Map(Object.values(fighterArt).map(art => [art, structuredClone({ hero: art.hero, tile: art.tile, iconWindow: art.iconWindow, victory: art.victory })] as const)),
    };
    if (this.dropOrphanRecipes()) saveOverrides(this.overrides);
    this.apply();
  }

  /**
   * Edits of a recipe that is neither authored nor created in the panel (left behind when a created combo went away)
   * cannot be shown or saved, and made saving combos fail; they are dropped. Returns whether anything was dropped.
   */
  private dropOrphanRecipes(): boolean {
    let dropped = false;
    for (const [fighterId, edits] of Object.entries(this.overrides.recipes)) {
      const fighter = this.fighters.find(entry => entry.id === fighterId);
      const known = new Set([...(fighter ? this.authoredCombos(fighter) : []), ...(this.overrides.combos[fighterId] ?? [])].map(recipe => recipe.id));
      for (const recipeId of Object.keys(edits)) if (!known.has(recipeId)) { delete edits[recipeId]; dropped = true; }
      if (!Object.keys(edits).length) delete this.overrides.recipes[fighterId];
    }
    return dropped;
  }
  original(move: MoveDefinition): MoveDefinition { return this.baseline.moves.get(move) ?? move; }
  originalRecipe(recipe: ComboRecipe): ComboRecipe | undefined { return this.baseline.recipes.get(recipe); }
  authoredCombos(fighter: CharacterDefinition): readonly ComboRecipe[] { return this.baseline.combos.get(fighter) ?? []; }
  authoredSelection(id: string): Required<SelectionTuning> | undefined {
    const base = this.baseline.art.get(fighterArt[id]); return base && { hero: base.hero ?? DEFAULT_HERO_FRAME, tile: base.tile ?? DEFAULT_TILE_FRAME, iconWindow: base.iconWindow!, victory: base.victory! };
  }
  hudDefault(token: string): string { return toCss(read(JSON.parse(this.baseline.hud) as Record<string, unknown>, token)); }

  apply(): void {
    for (const [move, original] of this.baseline.moves) Object.assign(move as Mutable<MoveDefinition>, structuredClone(original));
    for (const [recipe, original] of this.baseline.recipes) {
      const target = recipe as Mutable<ComboRecipe>;
      for (const field of RECIPE_FIELDS) (target as Record<string, unknown>)[field] = original[field];
    }
    for (const fighter of this.fighters) {
      const tuning = this.overrides.moves[fighter.id] ?? {};
      for (const move of fighter.moves) {
        const values = tuning[move.id]; if (!values) continue;
        const target = move as Mutable<MoveDefinition>;
        for (const field of MOVE_FIELDS) if (values[field] !== undefined) target[field] = values[field]!;
        if (values.pushbackHit !== undefined || values.pushbackBlock !== undefined)
          target.pushback = { hit: values.pushbackHit ?? move.pushback.hit, block: values.pushbackBlock ?? move.pushback.block };
      }
      for (const recipe of this.baseline.combos.get(fighter) ?? []) {
        const values = this.overrides.recipes[fighter.id]?.[recipe.id]; if (!values) continue;
        const target = recipe as Mutable<ComboRecipe>;
        for (const field of RECIPE_FIELDS) if (values[field] !== undefined) (target as Record<string, unknown>)[field] = values[field] ?? undefined;
      }
      const custom = this.overrides.combos[fighter.id] ?? [];
      (fighter as Mutable<CharacterDefinition>).combos = custom.length ? [...this.authoredCombos(fighter), ...custom] : this.baseline.combos.get(fighter);
    }
    sheetScaleAdjustments.clear();
    for (const [sheet, scale] of Object.entries(this.overrides.spriteScales)) sheetScaleAdjustments.set(sheet, scale);
    frameCutAdjustments.clear();
    for (const [texture, frames] of Object.entries(this.overrides.frameCuts)) frameCutAdjustments.set(texture, frames);
    frameSizeAdjustments.clear();
    for (const [texture, size] of Object.entries(this.overrides.frameSizes)) frameSizeAdjustments.set(texture, size);
    for (const [art, original] of this.baseline.art) Object.assign(art as Mutable<FighterArt>, structuredClone(original));
    for (const [id, tuning] of Object.entries(this.overrides.selection)) {
      const art = fighterArt[id]; if (art) Object.assign(art as Mutable<FighterArt>, structuredClone(tuning));
    }
    const hud = JSON.parse(this.baseline.hud) as Record<string, unknown>;
    for (const token of HUD_COLORS) if (this.overrides.colors[`hud:${token}`]) write(hud, token, fromCss(this.overrides.colors[`hud:${token}`], read(hud, token)));
    Object.assign(HUD as Record<string, unknown>, hud);
    if (typeof document !== 'undefined') for (const name of CSS_COLORS) {
      const value = this.overrides.colors[`css:${name}`];
      if (value) document.documentElement.style.setProperty(name, value); else document.documentElement.style.removeProperty(name);
    }
  }

  setMove(fighterId: string, moveId: string, field: keyof MoveTuning, value: number | undefined): void {
    const tuning = { ...(this.overrides.moves[fighterId]?.[moveId] ?? {}), [field]: value };
    if (value === undefined) delete tuning[field];
    this.overrides.moves[fighterId] = { ...(this.overrides.moves[fighterId] ?? {}), [moveId]: tuning };
    if (!Object.keys(tuning).length) delete this.overrides.moves[fighterId][moveId];
    this.commit();
  }
  setRecipe(fighterId: string, recipeId: string, tuning: RecipeTuning): void {
    const recipes = { ...(this.overrides.recipes[fighterId] ?? {}) };
    if (Object.keys(tuning).length) recipes[recipeId] = tuning; else delete recipes[recipeId];
    this.overrides.recipes[fighterId] = recipes; this.commit();
  }
  addCombo(fighterId: string, recipe: ComboRecipe): void {
    this.overrides.combos[fighterId] = [...(this.overrides.combos[fighterId] ?? []), recipe]; this.commit();
  }
  replaceCombo(fighterId: string, recipe: ComboRecipe): void {
    this.overrides.combos[fighterId] = (this.overrides.combos[fighterId] ?? []).map(custom => custom.id === recipe.id ? recipe : custom); this.commit();
  }
  removeCombo(fighterId: string, recipeId: string): void {
    this.overrides.combos[fighterId] = (this.overrides.combos[fighterId] ?? []).filter(recipe => recipe.id !== recipeId); this.commit();
  }
  setColor(key: string, value: string | undefined): void {
    if (value) this.overrides.colors[key] = value; else delete this.overrides.colors[key];
    this.commit();
  }
  setSpriteScale(sheet: string, scale: number | undefined): void {
    if (scale === undefined || scale === 1) delete this.overrides.spriteScales[sheet]; else this.overrides.spriteScales[sheet] = scale;
    this.commit();
  }
  /** Sets one framing of a fighter's selection art; `undefined` returns it to the authored value. */
  setSelection(id: string, field: keyof SelectionTuning, value: SelectionFrame | IconWindow | VictoryFrame | undefined): void {
    const tuning: Record<string, unknown> = { ...(this.overrides.selection[id] ?? {}) };
    if (value === undefined) delete tuning[field]; else tuning[field] = value;
    if (Object.keys(tuning).length) this.overrides.selection[id] = tuning as SelectionTuning; else delete this.overrides.selection[id];
    this.commit();
  }
  /** Drops the move tuning of one fighter; its combos stay as they are. */
  resetMoves(fighterId: string): void { delete this.overrides.moves[fighterId]; this.commit(); }
  /** Drops the recipe edits and the panel-created combos of one fighter; its move tuning stays as it is. */
  resetCombos(fighterId: string): void { delete this.overrides.recipes[fighterId]; delete this.overrides.combos[fighterId]; this.commit(); }
  setFrameCut(texture: string, frame: number, cut: FrameCut | undefined): void {
    const frames = { ...(this.overrides.frameCuts[texture] ?? {}) };
    if (cut) frames[frame] = cut; else delete frames[frame];
    if (Object.keys(frames).length) this.overrides.frameCuts[texture] = frames; else delete this.overrides.frameCuts[texture];
    this.commit();
  }
  setFrameSize(texture: string, size: FrameSize | undefined): void {
    if (size) this.overrides.frameSizes[texture] = size; else delete this.overrides.frameSizes[texture];
    this.commit();
  }
  /** Replaces whole sections, e.g. `{ colors: {} }` to clear them or a saved copy to bring them back. */
  assign(sections: Partial<DevOverrides>): void { Object.assign(this.overrides, sections); this.commit(); }
  private commit(): void { saveOverrides(this.overrides); this.apply(); }
}

function read(target: Record<string, unknown>, token: string): unknown {
  return token.split('.').reduce<unknown>((value, key) => (value as Record<string, unknown>)?.[key], target);
}
function write(target: Record<string, unknown>, token: string, value: unknown): void {
  const [key, index] = token.split('.');
  if (index === undefined) target[key] = value; else (target[key] as unknown[])[Number(index)] = value;
}
/** HUD tokens are either Phaser numbers (0xrrggbb) or CSS strings; the editor always works with `#rrggbb`. */
export function toCss(value: unknown): string { return typeof value === 'number' ? `#${value.toString(16).padStart(6, '0')}` : String(value); }
function fromCss(value: string, original: unknown): number | string { return typeof original === 'number' ? parseInt(value.slice(1), 16) : value; }
