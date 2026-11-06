/** Player volume levels, 0–100. Music has no track yet; its level is kept for when one is added. */
export interface AudioVolumes { master: number; music: number; effects: number }
export const DEFAULT_VOLUMES: AudioVolumes = { master: 100, music: 80, effects: 100 };
const storageKey = 'close-combat-audio-v1';
const level = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : fallback;

function load(): AudioVolumes {
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(storageKey) ?? '{}') as Partial<AudioVolumes>;
    return { master: level(saved.master, DEFAULT_VOLUMES.master), music: level(saved.music, DEFAULT_VOLUMES.music), effects: level(saved.effects, DEFAULT_VOLUMES.effects) };
  } catch { return { ...DEFAULT_VOLUMES }; }
}
let current = load();

export function getAudioVolumes(): AudioVolumes { return { ...current }; }
export function saveAudioVolumes(volumes: AudioVolumes): boolean {
  current = { master: level(volumes.master, DEFAULT_VOLUMES.master), music: level(volumes.music, DEFAULT_VOLUMES.music), effects: level(volumes.effects, DEFAULT_VOLUMES.effects) };
  try { if (!globalThis.localStorage) return false; globalThis.localStorage.setItem(storageKey, JSON.stringify(current)); return true; }
  catch { return false; }
}
/** Gain applied to a sound effect: its own mix level scaled by the general and effects volumes. */
export function effectGain(mix: number): number { return mix * current.master / 100 * current.effects / 100; }
