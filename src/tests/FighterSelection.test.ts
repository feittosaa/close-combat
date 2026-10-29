import { describe, expect, it, vi } from 'vitest';
import { FighterSelection } from '../ui/FighterSelection';

describe('fighter selection', () => {
  it('keeps independent choices and waits for both players in PvP', () => {
    const selection = new FighterSelection(3);
    selection.select(0, 1);
    expect(selection.confirm(0, true)).toBe(false);
    expect(selection.activePlayer).toBe(1);
    selection.select(1, 2);
    expect(selection.confirm(1, true)).toBe(true);
    expect(selection.indices).toEqual([1, 2]);
  });

  it('allows P2 to confirm first and keeps the same character legal for both', () => {
    const selection = new FighterSelection(1);
    expect(selection.confirm(1, true)).toBe(false);
    expect(selection.activePlayer).toBe(0);
    expect(selection.confirm(0, true)).toBe(true);
    expect(selection.indices).toEqual([0, 0]);
  });

  it('wraps a cursor without moving or unlocking the other player', () => {
    const selection = new FighterSelection(3);
    selection.confirm(1, true);
    selection.select(0, -1);
    expect(selection.indices).toEqual([2, 0]);
    expect(selection.ready).toEqual([false, true]);
    selection.select(0, 3);
    expect(selection.indices[0]).toBe(0);
  });

  it('requires reconfirmation after changing a ready choice or returning from stage selection', () => {
    const selection = new FighterSelection(3);
    selection.confirm(0, true);
    selection.select(0, 1);
    expect(selection.confirm(1, true)).toBe(false);
    expect(selection.confirm(0, true)).toBe(true);
    selection.reopen();
    expect(selection.ready).toEqual([false, false]);
    expect(selection.indices).toEqual([1, 0]);
    expect(selection.confirm(0, true)).toBe(false);
  });

  it('requires only P1 confirmation in a solo mode', () => {
    expect(new FighterSelection(3).confirm(0, false)).toBe(true);
  });
  it('navigates to random and resolves it only when the player confirms', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.8);
    try {
      const selection = new FighterSelection(3);
      selection.move(0, -1);
      expect(selection.random[0]).toBe(true);
      expect(selection.indices[0]).toBe(0);
      expect(selection.confirm(0, true)).toBe(false);
      expect(selection.indices[0]).toBe(2);
      expect(selection.random[0]).toBe(false);
      expect(selection.ready).toEqual([true, false]);
      selection.selectRandom(1);
      selection.move(1, 1);
      expect(selection.random[1]).toBe(false);
      expect(selection.indices[1]).toBe(0);
    } finally { random.mockRestore(); }
  });

});
