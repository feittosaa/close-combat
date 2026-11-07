import { describe, expect, it } from 'vitest';
import registry from '../assets/sprites/prepared.json';

const project = (key: string) => key.replace(/^\.\.\//, 'src/');
const sheets = Object.keys(import.meta.glob('../assets/sprites/**/*.png')).map(project).sort();

describe('sprite intake', () => {
  it('registers every sprite as prepared (background cleanup), and nothing else', () => {
    expect(Object.keys(registry.files).sort(), 'rode npm run sprites:prepare').toEqual(sheets);
    for (const kept of registry.keep) expect(sheets).toContain(kept);
  });

  it('measures every character sheet for the automatic animation size', () => {
    const measurements = import.meta.glob<Record<string, unknown>>('../assets/sprites/characters/*/measurements.json', { eager: true, import: 'default' });
    for (const atlas of Object.keys(import.meta.glob('../assets/sprites/characters/*/*.atlas.json'))) {
      const [, fighter, sheet] = atlas.match(/characters\/([^/]+)\/(.+)\.atlas\.json$/)!;
      expect(Object.keys(measurements[`../assets/sprites/characters/${fighter}/measurements.json`]), `${fighter}/${sheet}`).toContain(sheet);
    }
  });
});
