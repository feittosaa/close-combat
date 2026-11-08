import type { AttackButton } from './types';

/**
 * Buttons of a controller in the browser's standard mapping, which every common pad (Xbox, PlayStation, 8BitDo,
 * Switch Pro) reports: face buttons by position, shoulders, triggers, Select/Start, stick clicks and the d-pad.
 */
export const PAD = { south: 0, east: 1, west: 2, north: 3, leftBumper: 4, rightBumper: 5, leftTrigger: 6, rightTrigger: 7,
  select: 8, start: 9, leftStick: 10, rightStick: 11, up: 12, down: 13, left: 14, right: 15 } as const;
/** Fixed outside the fight layout: Start pauses, Select restarts free training, the d-pad moves. */
const RESERVED = new Set<number>([PAD.select, PAD.start, PAD.up, PAD.down, PAD.left, PAD.right]);
const ASSIGNABLE = [PAD.south, PAD.east, PAD.west, PAD.north, PAD.leftBumper, PAD.rightBumper, PAD.leftTrigger, PAD.rightTrigger, PAD.leftStick, PAD.rightStick];

/** The fight actions a player may move to another button; directions always come from the d-pad and the left stick. */
export interface GamepadLayout {
  buttons: Record<AttackButton, number>;
  ultimate: number;
  taunt: number;
  rageAction: number;
}
export type GamepadLayouts = [GamepadLayout, GamepadLayout];

/** Punches on the upper face buttons and kicks on the lower ones, the usual layout of fighting games. */
const DEFAULT_LAYOUT: GamepadLayout = {
  buttons: { '1': PAD.west, '2': PAD.north, '3': PAD.south, '4': PAD.east },
  ultimate: PAD.rightTrigger, rageAction: PAD.leftTrigger, taunt: PAD.rightBumper,
};
export const defaultGamepadLayouts = (): GamepadLayouts => [structuredClone(DEFAULT_LAYOUT), structuredClone(DEFAULT_LAYOUT)];

const assigned = (layout: GamepadLayout): number[] => [...Object.values(layout.buttons), layout.ultimate, layout.taunt, layout.rageAction];
/** Each player's actions use distinct assignable buttons; the two players have their own controllers, so they may repeat. */
export function validateGamepadLayouts(value: unknown): value is GamepadLayouts {
  if (!Array.isArray(value) || value.length !== 2) return false;
  return value.every(layout => {
    if (!layout || typeof layout !== 'object' || !layout.buttons) return false;
    const buttons = assigned(layout as GamepadLayout);
    return buttons.length === 7 && buttons.every(button => ASSIGNABLE.includes(button as typeof ASSIGNABLE[number]) && !RESERVED.has(button))
      && new Set(buttons).size === buttons.length;
  });
}

const storageKey = 'close-combat-gamepad-controls-v1';
export function loadGamepadLayouts(storage?: Pick<Storage, 'getItem'>): GamepadLayouts {
  try {
    const value = JSON.parse((storage ?? globalThis.localStorage)?.getItem(storageKey) ?? 'null');
    return validateGamepadLayouts(value) ? value : defaultGamepadLayouts();
  } catch { return defaultGamepadLayouts(); }
}
let layouts = loadGamepadLayouts();
export const getGamepadLayout = (player: number): GamepadLayout => structuredClone(layouts[player === 1 ? 1 : 0]);
export function saveGamepadLayouts(value: GamepadLayouts, storage?: Pick<Storage, 'setItem'>): boolean {
  if (!validateGamepadLayouts(value)) return false;
  layouts = structuredClone(value);
  try { (storage ?? globalThis.localStorage)?.setItem(storageKey, JSON.stringify(value)); } catch { /* The mapping still holds for this session. */ }
  return true;
}
export const isAssignableButton = (button: number): boolean => ASSIGNABLE.includes(button as typeof ASSIGNABLE[number]);

/** Neutral names: the Xbox letters, with the PlayStation symbols, since controllers print different glyphs on the same positions. */
const LABELS: Readonly<Record<number, string>> = {
  [PAD.south]: 'A / ✕', [PAD.east]: 'B / ○', [PAD.west]: 'X / □', [PAD.north]: 'Y / △', [PAD.leftBumper]: 'LB / L1', [PAD.rightBumper]: 'RB / R1',
  [PAD.leftTrigger]: 'LT / L2', [PAD.rightTrigger]: 'RT / R2', [PAD.select]: 'Select', [PAD.start]: 'Start', [PAD.leftStick]: 'L3', [PAD.rightStick]: 'R3',
};
export const gamepadButtonLabel = (button: number): string => LABELS[button] ?? `#${button}`;
