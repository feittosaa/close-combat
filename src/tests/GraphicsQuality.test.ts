import { afterEach, expect, it, vi } from 'vitest';
// Vitest runs this file in Node; the project does not otherwise depend on Node typings.
// @ts-expect-error Node's built-in module is available to the test runner.
import { readFileSync } from 'node:fs';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

it.each(['guard', 'perfect-block'])('keeps every high-resolution %s frame inside its image', name => {
  const base = new URL(`../assets/sprites/characters/cowboy/high/${name}`, import.meta.url);
  const png = readFileSync(`${base.pathname}.png`);
  const atlas = JSON.parse(readFileSync(`${base.pathname}.atlas.json`, 'utf8'));
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  expect(atlas.meta.size).toEqual({ w: width, h: height });
  for (const { frame } of Object.values(atlas.frames) as { frame: { x: number; y: number; w: number; h: number } }[]) {
    expect(frame.x + frame.w).toBeLessThanOrEqual(width);
    expect(frame.y + frame.h).toBeLessThanOrEqual(height);
  }
});

it.each([['low', 640], ['high', 1280]] as const)('loads only the %s texture set at its native frame size', async (quality, size) => {
  vi.stubGlobal('localStorage', { getItem: () => quality, setItem: vi.fn() });
  vi.resetModules();
  const { preloadCowboySprites, cowboyFrameSize, getCowboyFrameSize } = await import('../rendering/animations/cowboySprites');
  const atlas = vi.fn();
  preloadCowboySprites({ textures: { exists: () => false }, load: { atlas } } as never);
  expect(cowboyFrameSize).toBe(size);
  expect(atlas).toHaveBeenCalledTimes(81);
  for (const name of ['double-shot', 'fall-landing', 'launch-hit']) {
    const art = atlas.mock.calls.find(([key]) => key === `cowboy-${name}`);
    expect(art?.[2].frames['0'].frame.w).toBe(size);
    expect(Object.keys(art?.[2].frames ?? {})).toHaveLength(6);
  }
  const idle = atlas.mock.calls.find(([key]) => key === 'cowboy-idle');
  expect(idle?.[2].frames['0'].frame.w).toBe(size);
  const exit = atlas.mock.calls.find(([key]) => key === 'cowboy-victory-exit');
  expect(exit?.[2].frames['0'].frame.w).toBe(size);
  expect(getCowboyFrameSize('cowboy-victory-exit')).toBe(size);
});

it.each(['low', 'high'] as const)('loads every Bob atlas at %s quality without changing display scale', async quality => {
  vi.stubGlobal('localStorage', { getItem: () => quality, setItem: vi.fn() });
  vi.resetModules();
  const { preloadShotoSprites, getShotoResolution, shotoSpriteScale, shotoIdleScale } = await import('../rendering/animations/shotoSprites');
  const atlas = vi.fn();
  preloadShotoSprites({ textures: { exists: () => false }, load: { atlas } } as never);
  expect(atlas).toHaveBeenCalledTimes(57);
  const ratio = quality === 'high' ? 2 : 1;
  const originals = import.meta.glob<{ frames: Record<string, { frame: Record<string, number> }> }>(
    '../assets/sprites/characters/shoto/*.atlas.json', { eager: true, import: 'default' });
  for (const [key, image, metadata] of atlas.mock.calls) {
    const original = originals[`../assets/sprites/characters/shoto/${key.slice('shoto-'.length)}.atlas.json`];
    expect(Object.keys(metadata.frames), key).toEqual(Object.keys(original.frames));
    for (const [index, source] of Object.entries(original.frames)) {
      for (const dimension of ['x', 'y', 'w', 'h']) {
        expect(metadata.frames[index].frame[dimension], `${key}:${index}:${dimension}`).toBe(source.frame[dimension] * ratio);
      }
    }

    expect(image.includes('/high/'), key).toBe(quality === 'high');
    expect(getShotoResolution(key), key).toBe(ratio);
    const frame = metadata.frames['0'].frame;
    expect(frame.w % ratio, key).toBe(0);
    expect(frame.h % ratio, key).toBe(0);
    if (key === 'shoto-idle') expect(frame.w).toBe(480 * ratio);
    if (key === 'shoto-jump') expect(frame.w).toBe(1024 * ratio);
    if (key === 'shoto-tomato') expect(frame.w).toBe(512 * ratio);
    if (key === 'shoto-effect-ultimate-wind') expect(frame.w).toBe(512 * ratio);
  }
  expect(shotoSpriteScale / ratio * (1024 * ratio)).toBeCloseTo(shotoSpriteScale * 1024);
  expect(shotoIdleScale / ratio * (480 * ratio)).toBeCloseTo(shotoIdleScale * 480);
});

it('defaults to low and persists the selected quality', async () => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  const { loadGraphicsQuality, saveGraphicsQuality } = await import('../ui/graphicsSettings');
  expect(loadGraphicsQuality()).toBe('low');
  expect(saveGraphicsQuality('high')).toBe(true);
  expect(loadGraphicsQuality()).toBe('high');
});
