import { afterEach, expect, it, vi } from 'vitest';
// Vitest runs this file in Node; the project does not otherwise depend on Node typings.
// @ts-expect-error Node's built-in module is available to the test runner.
import { readFileSync } from 'node:fs';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
type Layout = { frames: Record<string, { sourceSize: { w: number; h: number }; spriteSourceSize: Record<string, number>; source: Record<string, number> }> };
const layouts = import.meta.glob<Layout>('../assets/sprites/characters/**/*.packed.json', { eager: true, import: 'default' });
/** The trimmed layout a loader call points at, by its served URL. */
const layoutOf = (url: string): Layout => layouts[Object.keys(layouts).find(path => url.split('?')[0].endsWith(path.slice(2)))!];

it.each(['guard', 'perfect-block'])('keeps every high-resolution %s frame inside its image', name => {
  const base = new URL(`../assets/sprites/characters/texas/high/${name}`, import.meta.url);
  const png = readFileSync(`${base.pathname}.png`);
  const atlas = JSON.parse(readFileSync(`${base.pathname}.atlas.json`, 'utf8'));
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  for (const { frame } of Object.values(atlas.frames) as { frame: { x: number; y: number; w: number; h: number } }[]) {
    expect(frame.x + frame.w).toBeLessThanOrEqual(width);
    expect(frame.y + frame.h).toBeLessThanOrEqual(height);
  }
});

it.each([['low', 640], ['high', 1280]] as const)('loads only the %s texture set at its native frame size', async (quality, size) => {
  vi.stubGlobal('localStorage', { getItem: () => quality, setItem: vi.fn() });
  vi.resetModules();
  const { preloadTexasSprites, texasFrameSize, getTexasFrameSize } = await import('../rendering/animations/texasSprites');
  const packedAtlas = vi.fn();
  preloadTexasSprites({ textures: { exists: () => false }, load: { packedAtlas } } as never);
  expect(texasFrameSize).toBe(size);
  expect(packedAtlas).toHaveBeenCalledTimes(87);
  for (const name of ['double-shot', 'fall-landing', 'launch-hit']) {
    const art = packedAtlas.mock.calls.find(([key]) => key === `texas-${name}`)!;
    expect(layoutOf(art[2]).frames['0'].sourceSize.w).toBe(size);
    expect(Object.keys(layoutOf(art[2]).frames)).toHaveLength(6);
  }
  const idle = packedAtlas.mock.calls.find(([key]) => key === 'texas-idle')!;
  expect(layoutOf(idle[2]).frames['0'].sourceSize.w).toBe(size);
  expect(getTexasFrameSize('texas-idle')).toBe(size);
});

it.each(['low', 'high'] as const)('loads every Bob atlas at %s quality without changing display scale', async quality => {
  vi.stubGlobal('localStorage', { getItem: () => quality, setItem: vi.fn() });
  vi.resetModules();
  const { preloadShotoSprites, getShotoResolution, shotoSpriteScale, shotoIdleScale } = await import('../rendering/animations/shotoSprites');
  const packedAtlas = vi.fn();
  preloadShotoSprites({ textures: { exists: () => false }, load: { packedAtlas } } as never);
  expect(packedAtlas).toHaveBeenCalledTimes(62);
  const ratio = quality === 'high' ? 2 : 1;
  const originals = import.meta.glob<{ frames: Record<string, { frame: Record<string, number> }> }>(
    '../assets/sprites/characters/shoto/*.atlas.json', { eager: true, import: 'default' });
  for (const [key, image, url] of packedAtlas.mock.calls) {
    const original = originals[`../assets/sprites/characters/shoto/${key.slice('shoto-'.length)}.atlas.json`];
    const metadata = layoutOf(url);
    expect(url.includes('/high/'), key).toBe(quality === 'high');
    expect(Object.keys(metadata.frames), key).toEqual(Object.keys(original.frames));
    for (const [index, source] of Object.entries(original.frames)) {
      // Each trimmed frame keeps the original cell (size and position in the sheet) through its trim offset.
      const { sourceSize, spriteSourceSize: trim, source: cut } = metadata.frames[index];
      expect([cut.x - trim.x, cut.y - trim.y, sourceSize.w, sourceSize.h], `${key}:${index}`)
        .toEqual(['x', 'y', 'w', 'h'].map(dimension => source.frame[dimension] * ratio));
    }

    expect(image.includes('/high/'), key).toBe(quality === 'high');
    expect(getShotoResolution(key), key).toBe(ratio);
    const frame = metadata.frames['0'].sourceSize;
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
