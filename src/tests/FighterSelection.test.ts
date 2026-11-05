import { describe, expect, it, vi } from 'vitest';
import { FighterSelection } from '../ui/FighterSelection';
import { fighterArt, selectionPortraitSize } from '../ui/fighterArt';

it('scales visible selection portraits to the authored heights and shared baseline', () => {
  for (const [id,height] of Object.entries({cowboy:160,shoto:170,puppet:175,grappler:205})) {
    const art = fighterArt[id], size = selectionPortraitSize(id);
    expect(size.height * (art.bottom-art.top) / art.imageHeight).toBeCloseTo(height/205*125);
    expect(size.bottom + size.height * (art.imageHeight-art.bottom) / art.imageHeight).toBeCloseTo(0);
  }
});

describe('fighter selection', () => {
  it('requires a character and color confirmation for each player', () => {
    const selection = new FighterSelection(3);
    selection.select(0, 1);
    expect(selection.confirm(0, true)).toBe(false);
    expect(selection.choosingColor[0]).toBe(true);
    selection.selectPalette(0, 1);
    expect(selection.confirm(0, true)).toBe(false);
    expect(selection.activePlayer).toBe(1);
    selection.select(1, 2);
    expect(selection.confirm(1, true)).toBe(false);
    expect(selection.confirm(1, true)).toBe(true);
    expect(selection.indices).toEqual([1, 2]);
    expect(selection.palettes).toEqual([1, 0]);
  });

  it('defaults a matching fighter to the other color but allows either choice', () => {
    const selection = new FighterSelection(1);
    selection.confirm(1, true);
    selection.confirm(1, true);
    selection.confirm(0, true);
    expect(selection.palettes).toEqual([1, 0]);
    selection.selectPalette(0, 0);
    expect(selection.confirm(0, true)).toBe(true);
    expect(selection.palettes).toEqual([0, 0]);
  });

  it('moves between colors without changing the fighter and reopens selection', () => {
    const selection = new FighterSelection(3);
    selection.select(0, 1);
    selection.confirm(0, false);
    selection.move(0, 1);
    expect(selection.indices[0]).toBe(1);
    expect(selection.palettes[0]).toBe(1);
    expect(selection.confirm(0, false)).toBe(true);
    selection.reopen();
    expect(selection.ready).toEqual([false, false]);
    expect(selection.choosingColor).toEqual([false, false]);
    expect(selection.indices[0]).toBe(1);
  });

  it('resolves random before opening the color menu', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.8);
    try {
      const selection = new FighterSelection(3);
      selection.move(0, -1);
      expect(selection.random[0]).toBe(true);
      expect(selection.confirm(0, false)).toBe(false);
      expect(selection.indices[0]).toBe(2);
      expect(selection.random[0]).toBe(false);
      expect(selection.choosingColor[0]).toBe(true);
      expect(selection.confirm(0, false)).toBe(true);
    } finally { random.mockRestore(); }
  });
});

import { matchPalettes, selectsOpponent } from '../scenes/matchSetup';
it('passes chosen palettes to either side and defaults solo mirrors to opposite colors', () => {
  expect(matchPalettes({ fighterPalette: 1 }, true)).toEqual([true, false]);
  expect(matchPalettes({ fighterPalette: 0 }, true)).toEqual([false, true]);
  expect(matchPalettes({ fighterPalette: 1, opponentPalette: 1 }, false)).toEqual([true, true]);
  expect(matchPalettes({ fighterPalette: 0, opponentPalette: 0 }, true)).toEqual([false, false]);
});

it('lets training select and confirm a different opponent and palette', () => {
  expect(selectsOpponent('training')).toBe(true);
  expect(selectsOpponent('versus')).toBe(true);
  expect(selectsOpponent('tutorial')).toBe(false);
  const selection = new FighterSelection(2);
  selection.confirm(0, selectsOpponent('training'));
  expect(selection.confirm(0, selectsOpponent('training'))).toBe(false);
  expect(selection.activePlayer).toBe(1);
  selection.select(1, 1);
  selection.confirm(1, selectsOpponent('training'));
  selection.selectPalette(1, 1);
  expect(selection.confirm(1, selectsOpponent('training'))).toBe(true);
  expect(selection.indices).toEqual([0, 1]);
  expect(selection.palettes).toEqual([0, 1]);
});
