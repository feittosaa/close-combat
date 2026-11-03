import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

it.each([['low', 640], ['high', 1280]] as const)('loads only the %s texture set at its native frame size', async (quality, size) => {
  vi.stubGlobal('localStorage', { getItem: () => quality, setItem: vi.fn() });
  vi.resetModules();
  const { preloadCowboySprites, cowboyFrameSize, getCowboyFrameSize } = await import('../rendering/animations/cowboySprites');
  const atlas = vi.fn();
  preloadCowboySprites({ textures: { exists: () => false }, load: { atlas } } as never);
  expect(cowboyFrameSize).toBe(size);
  expect(atlas).toHaveBeenCalledTimes(75);
  const idle = atlas.mock.calls.find(([key]) => key === 'cowboy-idle');
  expect(idle?.[2].frames['0'].frame.w).toBe(size);
  const exit = atlas.mock.calls.find(([key]) => key === 'cowboy-victory-exit');
  expect(exit?.[2].frames['0'].frame.w).toBe(size);
  expect(getCowboyFrameSize('cowboy-victory-exit')).toBe(size);
});

it('defaults to low and persists the selected quality', async () => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  const { loadGraphicsQuality, saveGraphicsQuality } = await import('../ui/graphicsSettings');
  expect(loadGraphicsQuality()).toBe('low');
  expect(saveGraphicsQuality('high')).toBe(true);
  expect(loadGraphicsQuality()).toBe('high');
});
