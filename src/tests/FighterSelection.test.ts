import { describe, expect, it } from 'vitest';
import { FighterSelection } from '../ui/FighterSelection';

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

  it('never repeats a color for a matching fighter', () => {
    const selection = new FighterSelection(1);
    selection.confirm(1, true);
    selection.confirm(1, true);
    selection.confirm(0, true);
    expect(selection.palettes).toEqual([1, 0]);
    selection.selectPalette(0, 0);
    expect(selection.palettes).toEqual([1, 0]);
  });

  it('gives the other player the leftover color when the same fighter is picked', () => {
    const selection = new FighterSelection(1);
    selection.confirm(0, true);
    selection.confirm(1, true);
    expect(selection.palettes).toEqual([0, 1]);
    selection.selectPalette(1, 0);
    expect(selection.palettes).toEqual([1, 0]);
  });

  it('locks a color confirmed by one player so the other cannot pick it', () => {
    const selection = new FighterSelection(1);
    selection.confirm(0, true); selection.selectPalette(0, 1); selection.confirm(0, true);
    expect(selection.isPaletteLocked(1, 1)).toBe(true);
    expect(selection.isPaletteLocked(1, 0)).toBe(false);
    selection.confirm(1, true);
    expect(selection.palettes).toEqual([1, 0]);
    selection.selectPalette(1, 1);
    expect(selection.palettes).toEqual([1, 0]);
    selection.move(1, 1);
    expect(selection.palettes).toEqual([1, 0]);
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

  it('confirms the random pick at once, with no colour step and without revealing the fighter', () => {
    const selection = new FighterSelection(3);
    selection.move(0, -1);
    expect(selection.random[0]).toBe(true);
    expect(selection.confirm(0, false)).toBe(true);
    expect(selection.ready[0]).toBe(true);
    expect(selection.choosingColor[0]).toBe(false);
    expect(selection.random[0]).toBe(true);           // still hidden: nothing is drawn yet
  });

  it('draws a fighter with original colour only when the fight starts', () => {
    const selection = new FighterSelection(3);
    selection.move(0, -1); selection.confirm(0, false);
    selection.resolveRandoms(() => .8);
    expect(selection.random[0]).toBe(false);
    expect(selection.indices[0]).toBe(2);
    expect(selection.palettes[0]).toBe(0);
  });

  it('versus: random and hand-picked players become ready independently, and the random pick uses original colour', () => {
    const selection = new FighterSelection(3);
    selection.select(0, 1); selection.confirm(0, true); selection.confirm(0, true);   // P1: fighter 1, colour 0
    expect(selection.ready).toEqual([true, false]);
    selection.move(1, -1);                                                              // P2 on the random tile
    expect(selection.confirm(1, true)).toBe(true);
    expect(selection.ready).toEqual([true, true]);
    selection.resolveRandoms(() => .4);                                                 // draws fighter 1, colour 0: the same as P1
    expect(selection.indices).toEqual([1, 1]);
    expect(selection.palettes[0]).toBe(0);
    expect(selection.palettes[1]).toBe(0);
  });

  it('no arcade sorteia a cor do jogador sem considerar um adversário não selecionado', () => {
    const selection = new FighterSelection(1);
    selection.selectRandom(0); selection.confirm(0, false);
    selection.resolveRandoms(() => .2, false);
    expect(selection.palettes[0]).toBe(0);
  });

  it('two random players draw independently with original colour', () => {
    const selection = new FighterSelection(1);
    selection.move(0, -1); selection.confirm(0, true);
    selection.move(1, -1); selection.confirm(1, true);
    selection.resolveRandoms(() => .2);
    expect(selection.indices).toEqual([0, 0]);
    expect(selection.palettes).toEqual([0, 0]);
  });
});

import { matchPalettes, selectsOpponent } from '../scenes/matchSetup';
it('passes chosen palettes to either side and defaults solo mirrors to opposite colors', () => {
  expect(matchPalettes({ fighterPalette: 1 }, true)).toEqual([true, false]);
  expect(matchPalettes({ fighterPalette: 0 }, true)).toEqual([false, true]);
  expect(matchPalettes({ fighterPalette: 1, opponentPalette: 1 }, false)).toEqual([true, true]);
  expect(matchPalettes({ fighterPalette: 0, opponentPalette: 0 }, true)).toEqual([false, false]);
  expect(matchPalettes({ mode: 'arcade', fighterPalette: 1 }, false)).toEqual([true, false]);
  expect(matchPalettes({ mode: 'arcade', fighterPalette: 1 }, true)).toEqual([true, false]);
  expect(matchPalettes({ mode: 'arcade', fighterPalette: 0 }, true)).toEqual([false, true]);
  expect(matchPalettes({ mode: 'arcade', fighterPalette: 0, opponentPalette: 1 }, false)).toEqual([false, false]);
  expect(matchPalettes({ mode: 'arcade', fighterPalette: 0, opponentPalette: 0 }, true)).toEqual([false, true]);
  expect(matchPalettes({ mode: 'arcade', fighterPalette: 1, opponentPalette: 1 }, true)).toEqual([true, false]);
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

it('lets an Arcade player pick the colour before the fight', () => {
  const selection = new FighterSelection(2);
  selection.select(0, 1);
  expect(selection.confirm(0, false)).toBe(false);
  expect(selection.choosingColor[0]).toBe(true);
  selection.selectPalette(0, 1);
  expect(selection.confirm(0, false)).toBe(true);
  expect(selection.palettes[0]).toBe(1);
});
