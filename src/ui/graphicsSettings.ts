export type GraphicsQuality = 'low' | 'high';
const storageKey = 'close-combat-graphics-quality-v1';

export function loadGraphicsQuality(): GraphicsQuality {
  try { return globalThis.localStorage?.getItem(storageKey) === 'high' ? 'high' : 'low'; }
  catch { return 'low'; }
}

export function saveGraphicsQuality(quality: GraphicsQuality): boolean {
  try {
    if (!globalThis.localStorage) return false;
    globalThis.localStorage.setItem(storageKey, quality);
    return true;
  } catch { return false; }
}
