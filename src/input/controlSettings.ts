import type { KeyboardLayout } from './KeyboardInput';
import { PLAYER_ONE_KEYS, PLAYER_TWO_KEYS } from './keyboardLayouts';
import type { AttackButton } from './types';
export type ControlLayouts = [KeyboardLayout, KeyboardLayout];
export interface SystemControlLayout { pause: string; reset: string }
const defaults = (): ControlLayouts => structuredClone([PLAYER_ONE_KEYS, PLAYER_TWO_KEYS]);
const reserved = new Set(['Escape','Enter','Tab','Space','Period','KeyG','KeyH','KeyI','KeyL','F1','F2','F3','F4']);
const systemDefaultKeys = new Set(['KeyP','KeyR']);
const storageKey = 'close-combat-controls-v1';
const systemStorageKey = 'close-combat-system-controls-v1';
const defaultSystem = (): SystemControlLayout => ({ pause: 'KeyP', reset: 'KeyR' });
let systemControls = defaultSystem();
export function validateSystemControls(value: unknown): value is SystemControlLayout {
  if (!value || typeof value !== 'object') return false;
  const controls = value as SystemControlLayout;
  const valid = (code: unknown) => typeof code === 'string' && /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Arrow(Up|Down|Left|Right))$/.test(code) && !reserved.has(code);
  return valid(controls.pause) && valid(controls.reset) && controls.pause !== controls.reset;
}
export function validateLayouts(value: unknown): value is ControlLayouts {
  if (!Array.isArray(value) || value.length !== 2) return false;
  const seen = new Set<string>();
  return value.every(layout => layout && ['left','right','up','down'].every(key => typeof layout.directions?.[key] === 'string') &&
    ['1','2','3','4'].every(key => typeof layout.buttons?.[key] === 'string') &&
    [...Object.values(layout.directions), ...Object.values(layout.buttons)].every(code => {
      if (typeof code !== 'string' || !/^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Arrow(Up|Down|Left|Right))$/.test(code) || reserved.has(code) || systemDefaultKeys.has(code) || seen.has(code)) return false;
      seen.add(code); return true;
    }));
}
export function loadControls(storage?: Pick<Storage,'getItem'>): ControlLayouts {
  try { const data = JSON.parse((storage ?? globalThis.localStorage)?.getItem(storageKey) ?? 'null'); return validateLayouts(data) ? data : defaults(); } catch { return defaults(); }
}
let layouts = loadControls();
export function getPlayerLayout(index = 0): KeyboardLayout { return structuredClone(layouts[index === 1 ? 1 : 0]); }
export function saveControls(value: ControlLayouts, storage?: Pick<Storage,'setItem'>): boolean {
  if (!validateLayouts(value)) return false;
  layouts = structuredClone(value);
  try { (storage ?? globalThis.localStorage)?.setItem(storageKey, JSON.stringify(value)); } catch { /* Session mapping still works when storage is unavailable. */ }
  return true;
}
export function resetControls(): void { saveControls(defaults()); }
systemControls = (() => { try { const v = JSON.parse(globalThis.localStorage?.getItem(systemStorageKey) ?? 'null'); return validateSystemControls(v) ? v : defaultSystem(); } catch { return defaultSystem(); } })();
export function getSystemControls(): SystemControlLayout { return { ...systemControls }; }
export function saveSystemControls(value: SystemControlLayout, storage?: Pick<Storage,'setItem'>): boolean {
  if (!validateSystemControls(value)) return false;
  if ([...Object.values(layouts[0].directions), ...Object.values(layouts[0].buttons), ...Object.values(layouts[1].directions), ...Object.values(layouts[1].buttons)].some(code => code === value.pause || code === value.reset)) return false;
  systemControls = { ...value }; try { (storage ?? globalThis.localStorage)?.setItem(systemStorageKey, JSON.stringify(value)); } catch { /* Runtime mapping remains usable for this session. */ } return true;
}
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num${code.slice(6)}`;
  return ({ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→'} as Record<string,string>)[code] ?? code;
}
export const BUTTON_COLORS: Record<AttackButton,string> = { '1':'#72c4ff','2':'#ff929e','3':'#8cdeb0','4':'#ffda80' };
