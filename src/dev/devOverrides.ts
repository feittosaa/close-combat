import type { CharacterDefinition, ComboRecipe } from '../engine/data/characters';
import type { MoveDefinition } from '../engine/data/moves';
import { HUD } from '../ui/hudTheme';
import { sheetScaleAdjustments } from '../rendering/animations/spriteScale';

/** Move fields the developer mode may retune; everything else stays as authored in the fighter data. */
export const MOVE_FIELDS = ['startup', 'activeFrames', 'recovery', 'damage', 'hitstun', 'blockstun'] as const;
export type MoveField = typeof MOVE_FIELDS[number];
export type MoveTuning = Partial<Record<MoveField | 'pushbackHit' | 'pushbackBlock', number>>;
export type RecipeTuning = { startupFrames?: number[]; recoveryFrames?: number };

/** CSS custom properties of the menus and overlays, declared on `:root` in style.css. */
export const CSS_COLORS = ['--ink', '--cream', '--cream-dim', '--paper-light', '--paper-shade', '--print', '--print-soft', '--red', '--accent'] as const;
/** HUD tokens drawn on the canvas, addressed as `HUD.<name>` or `HUD.<name>.<index>`. */
export const HUD_COLORS = ['ink', 'inset', 'rail', 'gold', 'lightGold', 'ivory', 'muted', 'goldText',
  'players.0', 'players.1', 'playerText.0', 'playerText.1', 'rage.0', 'rage.1', 'rage.2', 'phases.0', 'phases.1', 'phases.2'] as const;

export interface DevOverrides {
  moves: Record<string, Record<string, MoveTuning>>;
  recipes: Record<string, Record<string, RecipeTuning>>;
  combos: Record<string, ComboRecipe[]>;
  colors: Record<string, string>;
  /** Animation size multipliers per `<fighter>:<sheet>`, over the automatic or validated scale. */
  spriteScales: Record<string, number>;
}

const STORAGE_KEY = 'close-combat.dev-overrides';
const empty = (): DevOverrides => ({ moves: {}, recipes: {}, combos: {}, colors: {}, spriteScales: {} });

export function loadOverrides(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): DevOverrides {
  try { return { ...empty(), ...JSON.parse(storage?.getItem(STORAGE_KEY) ?? '{}') as Partial<DevOverrides> }; } catch { return empty(); }
}
export function saveOverrides(overrides: DevOverrides, storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage): boolean {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(overrides)); return true; } catch { return false; }
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Baseline = { moves: Map<MoveDefinition, MoveDefinition>; recipes: Map<ComboRecipe, ComboRecipe>; combos: Map<CharacterDefinition, readonly ComboRecipe[] | undefined>; hud: string };

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
    };
    this.apply();
  }

  original(move: MoveDefinition): MoveDefinition { return this.baseline.moves.get(move) ?? move; }
  originalRecipe(recipe: ComboRecipe): ComboRecipe | undefined { return this.baseline.recipes.get(recipe); }
  authoredCombos(fighter: CharacterDefinition): readonly ComboRecipe[] { return this.baseline.combos.get(fighter) ?? []; }
  hudDefault(token: string): string { return toCss(read(JSON.parse(this.baseline.hud) as Record<string, unknown>, token)); }

  apply(): void {
    for (const [move, original] of this.baseline.moves) Object.assign(move as Mutable<MoveDefinition>, structuredClone(original));
    for (const [recipe, original] of this.baseline.recipes) {
      const target = recipe as Mutable<ComboRecipe>;
      target.startupFrames = original.startupFrames; target.recoveryFrames = original.recoveryFrames;
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
        if (values.startupFrames) target.startupFrames = values.startupFrames;
        if (values.recoveryFrames !== undefined) target.recoveryFrames = values.recoveryFrames;
      }
      const custom = this.overrides.combos[fighter.id] ?? [];
      (fighter as Mutable<CharacterDefinition>).combos = custom.length ? [...this.authoredCombos(fighter), ...custom] : this.baseline.combos.get(fighter);
    }
    sheetScaleAdjustments.clear();
    for (const [sheet, scale] of Object.entries(this.overrides.spriteScales)) sheetScaleAdjustments.set(sheet, scale);
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
    if (tuning.startupFrames || tuning.recoveryFrames !== undefined) recipes[recipeId] = tuning; else delete recipes[recipeId];
    this.overrides.recipes[fighterId] = recipes; this.commit();
  }
  addCombo(fighterId: string, recipe: ComboRecipe): void {
    this.overrides.combos[fighterId] = [...(this.overrides.combos[fighterId] ?? []), recipe]; this.commit();
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
  resetFighter(fighterId: string): void {
    delete this.overrides.moves[fighterId]; delete this.overrides.recipes[fighterId]; delete this.overrides.combos[fighterId]; this.commit();
  }
  resetColors(): void { this.overrides.colors = {}; this.commit(); }
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
