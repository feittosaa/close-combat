import type { KeyboardLayout } from './KeyboardInput';
import { PLAYER_ONE_KEYS, PLAYER_TWO_KEYS } from './keyboardLayouts';
import type { AttackButton } from './types';
export type ControlLayouts = [KeyboardLayout, KeyboardLayout];
export interface SystemControlLayout { pause: string; reset: string }
export const defaultControls = (): ControlLayouts => structuredClone([PLAYER_ONE_KEYS, PLAYER_TWO_KEYS]);
const reserved = new Set(['Escape','Enter','Tab','Space','F1']);
export const defaultTrainingControls = () => ({ step:'Period', speed:'KeyL', reset:'F2', autoLife:'F3', distance:'F4', opponent:'KeyG', geometry:'KeyH', inputs:'KeyI',
  tutorialSection:'KeyC', tutorialPrevious:'KeyZ', tutorialNext:'KeyX', tutorialDemo:'KeyV' });
export type TrainingControls = ReturnType<typeof defaultTrainingControls>;
const trainingStorageKey = 'close-combat-training-controls-v1';
const validKey = (code: unknown) => typeof code === 'string' && /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Arrow(Up|Down|Left|Right)|Period|F[2-9]|F1[0-2])$/.test(code) && !reserved.has(code);
export function validateTrainingControls(value: unknown): value is TrainingControls {
  if (!value || typeof value !== 'object') return false;
  const controls = value as TrainingControls;
  const keys = Object.keys(defaultTrainingControls()) as (keyof TrainingControls)[];
  const values = keys.map(key => controls[key]);
  return values.every(validKey) && new Set(values).size === keys.length;
}
const SPARE_KEYS = [...'CZXVBQOYFGHIL'].map(letter => `Key${letter}`).concat([...'123456789'].map(digit => `Digit${digit}`), ['F5','F6','F7','F8','F9','F10','F11','F12']);
/**
 * Keeps every saved key; a command added after the mapping was saved gets its default key when free,
 * otherwise the first free spare key, so a new command never discards the player's mapping.
 */
export function loadTrainingControls(storage?: Pick<Storage,'getItem'>, reserved: Iterable<string> = []): TrainingControls {
  const defaults = defaultTrainingControls();
  let saved: Record<string, unknown> = {};
  try { saved = JSON.parse((storage ?? globalThis.localStorage)?.getItem(trainingStorageKey) ?? 'null') ?? {}; } catch { /* Defaults below. */ }
  const keys = Object.keys(defaults) as (keyof TrainingControls)[];
  const used = new Set(reserved), value = {} as TrainingControls;
  for (const key of keys) {
    const code = saved[key];
    if (validKey(code) && !used.has(code as string)) { value[key] = code as string; used.add(code as string); }
  }
  // Free defaults first, so a command left without one never takes the default of another new command.
  for (const key of keys) if (!value[key] && !used.has(defaults[key])) { value[key] = defaults[key]; used.add(defaults[key]); }
  for (const key of keys) {
    if (value[key]) continue;
    const code = SPARE_KEYS.find(candidate => validKey(candidate) && !used.has(candidate) && !Object.values(defaults).includes(candidate));
    if (!code) return defaults;
    value[key] = code; used.add(code);
  }
  return value;
}
let trainingControls: TrainingControls = loadTrainingControls();
export const getTrainingControls = (): TrainingControls => ({ ...trainingControls });
export function saveTrainingControls(value: TrainingControls): boolean {
  if (!validateTrainingControls(value)) return false;
  trainingControls = { ...value };
  try { globalThis.localStorage?.setItem(trainingStorageKey, JSON.stringify(value)); } catch { /* Session mapping remains available. */ }
  return true;
}
export function validateControlSet(players: ControlLayouts, system: SystemControlLayout, training: TrainingControls): boolean {
  if (!validateLayouts(players) || !validateSystemControls(system) || !validateTrainingControls(training)) return false;
  const keys = [...players.flatMap(layout => [...Object.values(layout.directions), ...Object.values(layout.buttons), layout.ultimate, layout.taunt, layout.rageAction]), ...Object.values(system), ...Object.values(training)];
  return new Set(keys).size === keys.length;
}
const systemDefaultKeys = new Set(['KeyP','KeyR']);
const storageKey = 'close-combat-controls-v1';
const systemStorageKey = 'close-combat-system-controls-v1';
export const defaultSystemControls = (): SystemControlLayout => ({ pause: 'KeyP', reset: 'KeyR' });
let systemControls = defaultSystemControls();
export function validateSystemControls(value: unknown): value is SystemControlLayout {
  if (!value || typeof value !== 'object') return false;
  const controls = value as SystemControlLayout;
  const valid = validKey;
  return valid(controls.pause) && valid(controls.reset) && controls.pause !== controls.reset;
}
export function validateLayouts(value: unknown): value is ControlLayouts {
  if (!Array.isArray(value) || value.length !== 2) return false;
  const seen = new Set<string>();
  return value.every(layout => layout && ['left','right','up','down'].every(key => typeof layout.directions?.[key] === 'string') &&
    ['1','2','3','4'].every(key => typeof layout.buttons?.[key] === 'string') && typeof layout.ultimate === 'string' && typeof layout.taunt === 'string' && typeof layout.rageAction === 'string' &&
    [...Object.values(layout.directions), ...Object.values(layout.buttons), layout.ultimate, layout.taunt, layout.rageAction].every(code => {
      if (typeof code !== 'string' || !validKey(code) || seen.has(code)) return false;
      seen.add(code); return true;
    }));
}
export function loadControls(storage?: Pick<Storage,'getItem'>): ControlLayouts {
  try {
    const data = JSON.parse((storage ?? globalThis.localStorage)?.getItem(storageKey) ?? 'null');
    if (Array.isArray(data) && data.length === 2 && data.every(layout => layout && typeof layout === 'object')) {
      const storedSystem = JSON.parse((storage ?? globalThis.localStorage)?.getItem(systemStorageKey) ?? 'null');
      const used = new Set([...data.flatMap(layout => [...Object.values(layout.directions ?? {}), ...Object.values(layout.buttons ?? {}), layout.ultimate, layout.taunt, layout.rageAction].filter(Boolean)), ...(validateSystemControls(storedSystem) ? Object.values(storedSystem) : []), ...Object.values(trainingControls)]);
      for (const [index, layout] of data.entries()) for (const action of ['ultimate', 'taunt', 'rageAction'] as const) {
        if (typeof layout[action] === 'string') continue;
        const key = [defaultControls()[index][action], ...'ETUYOQZXCVB'.split('').map(letter => `Key${letter}`), 'Numpad5','Numpad6','Numpad7','Numpad8'].find(code => !used.has(code) && !reserved.has(code) && !systemDefaultKeys.has(code));
        if (!key) return defaultControls();
        layout[action] = key; used.add(key);
      }
    }
    return validateLayouts(data) ? data : defaultControls();
  } catch { return defaultControls(); }
}
let layouts = loadControls();
export function getPlayerLayout(index = 0): KeyboardLayout { return structuredClone(layouts[index === 1 ? 1 : 0]); }
export function saveControls(value: ControlLayouts, storage?: Pick<Storage,'setItem'>): boolean {
  if (!validateLayouts(value)) return false;
  layouts = structuredClone(value);
  try { (storage ?? globalThis.localStorage)?.setItem(storageKey, JSON.stringify(value)); } catch { /* Session mapping still works when storage is unavailable. */ }
  return true;
}
export function resetControls(): void { saveControls(defaultControls()); saveSystemControls(defaultSystemControls()); saveTrainingControls(defaultTrainingControls()); }
systemControls = (() => { try { const v = JSON.parse(globalThis.localStorage?.getItem(systemStorageKey) ?? 'null'); return validateSystemControls(v) ? v : defaultSystemControls(); } catch { return defaultSystemControls(); } })();
// With the players' and system keys known, new training commands avoid them as well.
trainingControls = loadTrainingControls(undefined, [...layouts.flatMap(layout => [...Object.values(layout.directions), ...Object.values(layout.buttons), layout.ultimate, layout.taunt, layout.rageAction]), ...Object.values(systemControls)]);
export function getSystemControls(): SystemControlLayout { return { ...systemControls }; }
export function saveSystemControls(value: SystemControlLayout, storage?: Pick<Storage,'setItem'>): boolean {
  if (!validateSystemControls(value)) return false;
  if (layouts.flatMap(layout => [...Object.values(layout.directions), ...Object.values(layout.buttons), layout.ultimate, layout.taunt, layout.rageAction]).some(code => code === value.pause || code === value.reset)) return false;
  systemControls = { ...value }; try { (storage ?? globalThis.localStorage)?.setItem(systemStorageKey, JSON.stringify(value)); } catch { /* Runtime mapping remains usable for this session. */ } return true;
}
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num${code.slice(6)}`;
  return ({ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Period:'.'} as Record<string,string>)[code] ?? code;
}
export const BUTTON_COLORS: Record<AttackButton,string> = { '1':'#72c4ff','2':'#ff929e','3':'#8cdeb0','4':'#ffda80' };
