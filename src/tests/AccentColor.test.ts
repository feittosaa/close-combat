import { describe, expect, it } from 'vitest';
import { accents, accentShare } from '../rendering/accentColor';
import { palettePixel } from '../rendering/characterColor';
import shotoHues from '../assets/sprites/characters/shoto/hues.json';
import texasHues from '../assets/sprites/characters/texas/hues.json';

const MIN_ACCENT_SHARE = .05;
const hueOf = ([r, g, b]: readonly number[]): number => {
  const max = Math.max(r, g, b), delta = max - Math.min(r, g, b);
  return ((max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60 + 360) % 360;
};

describe('cor de destaque', () => {
  it.each([['Bob', shotoHues, 'shoto'], ['Texas', texasHues, 'texas']] as const)('%s tem a cor de destaque presente nas folhas', (_name, hues, id) => {
    expect(accentShare(hues, accents[id])).toBeGreaterThanOrEqual(MIN_ACCENT_SHARE);
  });

  it('Bob: o verde/oliva da camisa vira vermelho na cor secundária, sem passar pelo azul', () => {
    for (const shirt of [[136, 104, 48], [100, 90, 30], [150, 120, 50], [70, 60, 20], [40, 34, 10], [30, 26, 8], [24, 20, 6]] as const) {
      const [r, g, b] = palettePixel(shirt[0], shirt[1], shirt[2], 'bob');
      expect(r).toBeGreaterThan(g * 2);
      expect(r).toBeGreaterThan(b * 2);
      const hue = hueOf([r, g, b]);
      expect(hue > 340 || hue < 25).toBe(true);
    }
  });

  it('Bob: os fios loiros do cabelo e a palha não ficam vermelhos', () => {
    // Laranja saturado na borda baixa do tom da camisa, medido nos fios e na palha das folhas.
    for (const hair of [[180, 108, 36], [120, 68, 24], [200, 125, 40], [90, 52, 18]] as const) {
      const result = palettePixel(hair[0], hair[1], hair[2], 'bob');
      expect(hueOf(result), hair.join()).toBeGreaterThan(20);
      result.forEach((channel, index) => expect(Math.abs(channel - hair[index]), hair.join()).toBeLessThanOrEqual(25));
    }
  });

  it('Texas: o vermelho vira azul, mantendo o couro e a pele', () => {
    const poncho = palettePixel(176, 32, 32, 'texas');
    expect(poncho[2]).toBeGreaterThan(poncho[0] * 2);
    expect(palettePixel(112, 64, 48, 'texas')).toEqual([112, 64, 48]);
    expect(palettePixel(241, 191, 146, 'texas')).toEqual([241, 191, 146]);
  });

  it('só os pixels da faixa de destaque mudam; pele, neutros e azuis ficam iguais', () => {
    for (const pixel of [[240, 144, 80], [240, 224, 208], [10, 8, 4], [20, 20, 20], [250, 250, 250]] as const) {
      expect(palettePixel(pixel[0], pixel[1], pixel[2], 'bob')).toEqual(pixel);
    }
  });
});
