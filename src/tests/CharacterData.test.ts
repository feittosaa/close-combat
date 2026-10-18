import { describe, expect, it } from 'vitest';
import { DEFAULT_CHARACTER_ID, defaultCharacter } from '../engine/data/characters';
import { getMoveById } from '../engine/data/moves';
import { getCharacterAnimationKey } from '../rendering/animations/CharacterAnimationMap';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';

describe('provisional Tester character', () => {
  it('is the default fighter and has resolvable prototype moves', () => {
    expect(DEFAULT_CHARACTER_ID).toBe('tester');
    expect(defaultCharacter.name).toBe('Tester');
    expect(defaultCharacter.moveIds.length).toBeGreaterThan(0);
    expect(defaultCharacter.moveIds.every((moveId) => getMoveById(moveId))).toBe(true);
  });

  it('loads as the default fighter for both sides of the simulation', () => {
    const snapshot = new Simulation(createGameConfig(1024, 576)).snapshot();

    expect(snapshot.characters.map((character) => character.fighterId)).toEqual(['tester', 'tester']);
    expect(snapshot.characters.map((character) => character.health)).toEqual([1000, 1000]);
  });

  it('maps combat modes and attack phases to stable animation keys', () => {
    const [fighter] = new Simulation(createGameConfig(1024, 576)).snapshot().characters;
    expect(getCharacterAnimationKey(fighter!)).toBe('tester-idle');

    const attacking = {
      ...fighter!,
      mode: 'active' as const,
      attack: { moveId: 'test-jab', button: '1' as const, elapsedFrames: 4, hasHit: false },
    };
    expect(getCharacterAnimationKey(attacking)).toBe('tester-test-jab-active');
  });
});
