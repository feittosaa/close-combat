import { describe, expect, it, vi } from 'vitest';
// Vitest runs this file in Node; the project does not otherwise depend on Node typings.
// @ts-expect-error Node's built-in module is available to the test runner.
import { readFileSync } from 'node:fs';
// @ts-expect-error Node's built-in module is available to the test runner.
import { createHash } from 'node:crypto';
import registry from '../assets/sprites/prepared.json';
import { fullFrames, type PackedLayout } from '../rendering/packedAtlas';
vi.mock('phaser', () => ({ default: {} }));

const project = (key: string) => key.replace(/^\.\.\//, 'src/');
const sheets = Object.keys(import.meta.glob('../assets/sprites/**/*.png')).map(project).sort();
const characterArt = Object.keys(import.meta.glob(['../assets/art/characters/*/fullbody*.png', '../assets/art/characters/*/selection-icon.png'])).map(project).sort();

describe('sprite intake', () => {
  it('registers every sprite and every victory pose and icon as prepared (background cleanup), and nothing else', () => {
    expect(Object.keys(registry.files).sort(), 'rode npm run sprites:prepare').toEqual(sheets);
    expect(Object.keys(registry.art).sort(), 'rode npm run sprites:prepare').toEqual(characterArt);
    for (const kept of registry.keep) expect([...sheets, ...characterArt]).toContain(kept);
  });

  it('measures every character sheet for the automatic animation size', () => {
    const measurements = import.meta.glob<Record<string, unknown>>('../assets/sprites/characters/*/measurements.json', { eager: true, import: 'default' });
    for (const atlas of Object.keys(import.meta.glob('../assets/sprites/characters/*/*.atlas.json'))) {
      const [, fighter, sheet] = atlas.match(/characters\/([^/]+)\/(.+)\.atlas\.json$/)!;
      expect(Object.keys(measurements[`../assets/sprites/characters/${fighter}/measurements.json`]), `${fighter}/${sheet}`).toContain(sheet);
    }
  });

  it('keeps an up-to-date trimmed layout of every character sheet that rebuilds its original frames', () => {
    const atlases = import.meta.glob<{ frames: Record<string, { frame: unknown }> }>('../assets/sprites/characters/**/*.atlas.json', { eager: true, import: 'default' });
    const layouts = import.meta.glob<PackedLayout & { sourceHash: string }>('../assets/sprites/characters/**/*.packed.json', { eager: true, import: 'default' });
    const file = (path: string) => readFileSync(new URL(path, import.meta.url));
    expect(Object.keys(layouts).sort(), 'rode npm run sprites:prepare').toEqual(Object.keys(atlases).map(path => path.replace('.atlas.json', '.packed.json')).sort());
    for (const [path, atlas] of Object.entries(atlases)) {
      const layout = layouts[path.replace('.atlas.json', '.packed.json')];
      const hash = createHash('sha256').update(file(path.replace('.atlas.json', '.png'))).update(file(path)).digest('hex').slice(0, 16);
      expect(layout.sourceHash, `${path}: rode npm run sprites:prepare`).toBe(hash);
      expect(fullFrames(layout).frames, path).toEqual(Object.fromEntries(Object.entries(atlas.frames).map(([key, entry]) => [key, { frame: entry.frame }])));
    }
  });
});
