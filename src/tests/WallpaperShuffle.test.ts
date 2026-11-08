import { describe, expect, it } from 'vitest';
import { createWallpaperShuffle } from '../ui/wallpaperShuffle';

describe('sorteio de wallpapers', () => {
  it('mostra todos uma vez por rodada, sem repetir o anterior, e a ordem varia', () => {
    const orders = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      let state = seed * 2654435761;
      const random = () => { state = (state + 0x6d2b79f5) >>> 0; let t = Math.imul(state ^ (state >>> 15), 1 | state); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const next = createWallpaperShuffle(3, random);
      const draws = Array.from({ length: 30 }, next);
      for (let round = 0; round < 10; round++) expect([...draws.slice(round * 3, round * 3 + 3)].sort()).toEqual([0, 1, 2]);
      draws.slice(1).forEach((value, index) => expect(value).not.toBe(draws[index]));
      orders.add(draws.slice(0, 3).join());
    }
    expect(orders.size).toBe(6);
  });
});
