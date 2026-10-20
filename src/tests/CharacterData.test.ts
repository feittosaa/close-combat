import { describe, expect, it } from 'vitest';
import { DEFAULT_CHARACTER_ID, defaultCharacter, getCharacterById, SECOND_TEST_CHARACTER_ID } from '../engine/data/characters';
import { getCharacterAnimationKey } from '../rendering/animations/CharacterAnimationMap';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';

describe('provisional Tester character', () => {
  it('is the default fighter and has resolvable prototype moves', () => {
    expect(DEFAULT_CHARACTER_ID).toBe('tester');
    expect(defaultCharacter.name).toBe('Tester');
    expect(defaultCharacter.moves.length).toBeGreaterThan(0);
    expect(defaultCharacter.moves.some((move) => move.id === 'test-front-throw')).toBe(true);
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
    expect(dummy?.moves.length).toBeGreaterThan(0);
    expect(dummy?.moves.map((move) => move.id)).toContain('dummy-jab');
    expect(dummy?.moves.map((move) => move.id)).not.toContain('test-jab');
    expect(dummy?.moves.find((move) => move.id === 'dummy-jab')?.hitbox)
      .not.toEqual(defaultCharacter.moves.find((move) => move.id === 'test-jab')?.hitbox);
    expect(dummy?.collision.hurtboxes.airborne).not.toEqual(defaultCharacter.collision.hurtboxes.airborne);

    const snapshot = new Simulation(createGameConfig(1024, 576), [defaultCharacter, dummy!]).snapshot();
    expect(snapshot.characters.map((character) => character.fighterId)).toEqual(['tester', 'dummy']);
    expect(snapshot.characters.map((character) => character.health)).toEqual([1000, 900]);
  });

  it('resolves the Dummy move book and damage independently from Tester', () => {
    const dummy = getCharacterById(SECOND_TEST_CHARACTER_ID)!;
    const simulation = new Simulation(createGameConfig(1024, 576), [defaultCharacter, dummy]);
    const forward = { direction: 'F' as const, buttons: new Set<never>() };
    const neutral = { direction: 'N' as const, buttons: new Set<never>() };
    for (let frame = 0; frame < 100; frame += 1) simulation.advance(1000 / 60, () => [forward, forward]);
    simulation.advance(1000 / 60, () => [neutral, { direction: 'N', buttons: new Set(['1' as const]) }]);
    let snapshot = simulation.snapshot();
    for (let frame = 0; frame < 24 && snapshot.hitEvents.length === 0; frame += 1) {
      simulation.advance(1000 / 60, () => [neutral, neutral]);
      snapshot = simulation.snapshot();
    }

    expect(snapshot.hitEvents[0]).toMatchObject({ moveId: 'dummy-jab', damage: 38, outcome: 'hit' });
    expect(snapshot.characters[0].health).toBe(1000 - 38);
  });

  it('applies the configured match health ceiling to both fighters', () => {
    const matchConfig = createGameConfig(1024, 576);
    matchConfig.match.maxHealth = 750;
    const snapshot = new Simulation(matchConfig).snapshot();
    expect(snapshot.characters.map((character) => character.health)).toEqual([750, 750]);
  });

  it('maps combat modes and attacks to stable animation keys', () => {
    const [fighter] = new Simulation(createGameConfig(1024, 576)).snapshot().characters;
    expect(getCharacterAnimationKey(fighter!)).toBe('tester-idle');

    const attacking = {
      ...fighter!,
      mode: 'active' as const,
      attack: { moveId: 'test-jab', buttons: ['1'] as const, elapsedFrames: 4, hasHit: false, preciseExecution: false },
    };
    expect(getCharacterAnimationKey(attacking)).toBe('tester-light-punch-active');
  });

  it('maps Guilty Gear crouch, kick, and aerial attack clips separately', () => {
    const fighter = { ...new Simulation(createGameConfig(1024, 576)).snapshot().characters[0]!, fighterId: 'guilty-gear' };
    expect(getCharacterAnimationKey({ ...fighter, mode: 'crouching' })).toBe('guilty-gear-crouch');
    expect(getCharacterAnimationKey({
      ...fighter,
      mode: 'active',
      attack: { moveId: 'test-low-kick', buttons: ['3'], elapsedFrames: 1, hasHit: false, preciseExecution: false },
    })).toBe('guilty-gear-light-kick');
    expect(getCharacterAnimationKey({
      ...fighter,
      mode: 'active',
      attack: { moveId: 'test-air-descending-kick', buttons: ['3'], airborne: true, elapsedFrames: 1, hasHit: false, preciseExecution: false },
    })).toBe('guilty-gear-air-light-kick');
    expect(getCharacterAnimationKey({
      ...fighter,
      mode: 'active',
      attack: { moveId: 'test-crouching-hook', buttons: ['2'], crouching: true, elapsedFrames: 1, hasHit: false, preciseExecution: false },
    })).toBe('guilty-gear-crouch-heavy-punch');
  });
});
