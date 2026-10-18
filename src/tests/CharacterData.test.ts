import { describe, expect, it } from 'vitest';
import { DEFAULT_CHARACTER_ID, defaultCharacter, getCharacterById, SECOND_TEST_CHARACTER_ID } from '../engine/data/characters';
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

  it('provides a second test fighter with resolvable, distinct data', () => {
    const dummy = getCharacterById(SECOND_TEST_CHARACTER_ID);
    expect(dummy?.name).toBe('Dummy');
    expect(dummy?.id).not.toBe(defaultCharacter.id);
    expect(dummy?.maxHealth).toBe(900);
    expect(dummy?.movement.walkSpeed).toBeLessThan(defaultCharacter.movement.walkSpeed);
    expect(dummy?.moveIds.length).toBeGreaterThan(0);
    expect(dummy?.moveIds.every((moveId) => getMoveById(moveId))).toBe(true);

    const snapshot = new Simulation(createGameConfig(1024, 576), [defaultCharacter, dummy!]).snapshot();
    expect(snapshot.characters.map((character) => character.fighterId)).toEqual(['tester', 'dummy']);
    expect(snapshot.characters.map((character) => character.health)).toEqual([1000, 900]);
  });

  it('applies the configured match health ceiling to both fighters', () => {
    const matchConfig = createGameConfig(1024, 576);
    matchConfig.match.maxHealth = 750;
    const snapshot = new Simulation(matchConfig).snapshot();
    expect(snapshot.characters.map((character) => character.health)).toEqual([750, 750]);
  });

  it('maps combat modes and attack phases to stable animation keys', () => {
    const [fighter] = new Simulation(createGameConfig(1024, 576)).snapshot().characters;
    expect(getCharacterAnimationKey(fighter!)).toBe('tester-idle');

    const attacking = {
      ...fighter!,
      mode: 'active' as const,
      attack: { moveId: 'test-jab', buttons: ['1'] as const, elapsedFrames: 4, hasHit: false, preciseExecution: false },
    };
    expect(getCharacterAnimationKey(attacking)).toBe('tester-test-jab-active');
  });
});
