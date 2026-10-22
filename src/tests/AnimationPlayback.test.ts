import { describe, expect, it } from 'vitest';
import testerManifest from '../assets/animations/tester.json';
import { testerMoves } from '../engine/data/moves';
import { createGameConfig } from '../engine/data/gameConfig';
import { Simulation } from '../engine/simulation/Simulation';
import type { CharacterState } from '../engine/characters/CharacterState';
import { getCharacterAnimationKey } from '../rendering/animations/CharacterAnimationMap';
import { getAttackAnimationFrame, getClipFrames, getTimedAnimationFrame, shouldFlipAnimation } from '../rendering/animations/AnimationPlayback';
import type { AnimationClip } from '../rendering/animations/AnimationPlayback';

const clips: readonly AnimationClip[] = testerManifest.clips;
const fighter = new Simulation(createGameConfig(1024, 576)).snapshot().characters[0]!;

function attacking(moveId: string, mode: 'startup' | 'active' | 'recovery', elapsedFrames = 0): CharacterState {
  const move = testerMoves.find(({ id }) => id === moveId)!;
  return {
    ...fighter, mode,
    attack: { moveId, buttons: move.input.buttons, airborne: move.airborne, crouching: move.crouching,
      elapsedFrames, hasHit: false, preciseExecution: false },
  };
}

describe('character animation playback', () => {
  it('samples explicit holds and the return seam identically for previews and state clips', () => {
    const loop: AnimationClip = { key: 'held-loop', start: 0, end: 2, frames: [0, 1, 2, 1], frameDurations: [14, 10, 14, 10], frameRate: 10, repeat: -1 };
    expect([0, 13, 14, 23, 24, 37, 38, 47, 48].map(t => getTimedAnimationFrame(loop, t)))
      .toEqual([0, 0, 1, 1, 2, 2, 1, 1, 0]);
    expect(getTimedAnimationFrame({ ...loop, repeat: 0 }, 100)).toBe(1);
  });
  it('faces the opponent for both source orientations, including idle, walking and kicks', () => {
    for (const key of ['tester-idle', 'tester-walk', 'tester-dash', 'tester-light-kick-active']) {
      const clip = clips.find((clip) => clip.key === key)!;
      expect(shouldFlipAnimation('right', clip)).toBe(true);
      expect(shouldFlipAnimation('left', clip)).toBe(false);
    }
    const kick = clips.find((clip) => clip.key === 'tester-heavy-kick-active')!;
    expect(shouldFlipAnimation('right', kick)).toBe(false);
    expect(shouldFlipAnimation('left', kick)).toBe(true);
  });

  it('resolves every registered kick and its three phases to real atlas frames', () => {
    const kicks = testerMoves.filter((move) => !move.throw && move.input.buttons.some((button) => button === '3' || button === '4'));
    expect(kicks.length).toBeGreaterThan(4);
    for (const move of kicks) {
      for (const mode of ['startup', 'active', 'recovery'] as const) {
        const key = getCharacterAnimationKey(attacking(move.id, mode));
        const clip = clips.find((clip) => clip.key === key);
        expect(clip, `${move.id} / ${mode}`).toBeDefined();
        expect(getClipFrames(clip!).every((frame) => frame >= 0 && frame < testerManifest.totalFrames)).toBe(true);
      }
    }
  });

  it('keeps the standing guard poses on block impact instead of playing a falling sequence', () => {
    const guard = clips.find((clip) => clip.key === 'tester-defense')!;
    const blocked = clips.find((clip) => clip.key === getCharacterAnimationKey({ ...fighter, mode: 'blockstun' }))!;
    expect(getClipFrames(blocked)).toEqual(getClipFrames(guard));
    expect(blocked.sourceFacesLeft).toBe(guard.sourceFacesLeft);
    expect(getCharacterAnimationKey({ ...fighter, crouching: true, mode: 'blockstun' })).toBe('tester-crouch');
  });

  it('mirrors the jump toward the opponent on both sides of the arena', () => {
    const jump = clips.find((clip) => clip.key === getCharacterAnimationKey({ ...fighter, mode: 'airborne' }))!;
    expect(shouldFlipAnimation('right', jump)).toBe(true);
    expect(shouldFlipAnimation('left', jump)).toBe(false);
  });

  it('uses a grounded hit reaction without the somersault frames used by knockdown', () => {
    const hit = clips.find((clip) => clip.key === getCharacterAnimationKey({ ...fighter, mode: 'hitstun' }))!;
    const knockdown = clips.find((clip) => clip.key === 'tester-knockdown')!;
    expect(getClipFrames(hit)).toEqual([144, 145, 144]);
    expect(getClipFrames(hit).some((frame) => getClipFrames(knockdown).includes(frame))).toBe(false);
    expect(hit.repeat).toBe(0);
    expect(shouldFlipAnimation('right', hit)).toBe(true);
    expect(shouldFlipAnimation('left', hit)).toBe(false);
  });

  it('keeps crouching and aerial kicks distinct from standing kicks', () => {
    expect(getCharacterAnimationKey(attacking('test-sweep', 'active'))).toBe('tester-crouch-light-kick-active');
    expect(getCharacterAnimationKey(attacking('test-air-heavy-kick', 'active'))).toBe('tester-air-heavy-kick-active');
    expect(getCharacterAnimationKey({ ...attacking('test-low-kick', 'active'), fighterId: 'dummy' }))
      .toBe('dummy-test-low-kick-active');
  });

  it('selects a separate retreat clip and preserves facing toward the opponent', () => {
    const retreat = clips.find(clip => clip.key === 'tester-walk-backward')!;
    expect(getCharacterAnimationKey({ ...fighter, mode: 'moving', movementDirection: 'backward' })).toBe('tester-walk-backward');
    expect(getCharacterAnimationKey({ ...fighter, mode: 'dashing', movementDirection: 'backward' })).toBe('tester-backdash');
    expect(getClipFrames(retreat)).not.toEqual(getClipFrames(clips.find(clip => clip.key === 'tester-walk')!));
    expect(shouldFlipAnimation('right', retreat)).toBe(true);
    expect(shouldFlipAnimation('left', retreat)).toBe(false);
  });

  it('holds the impact pose throughout active frames and spans the whole recovery', () => {
    const move = testerMoves.find(({ id }) => id === 'test-heavy-kick')!;
    const active = clips.find((clip) => clip.key === 'tester-heavy-kick-active')!;
    for (let t = move.startup; t < move.startup + move.activeFrames; t += 1) {
      expect(getAttackAnimationFrame(attacking(move.id, 'active', t), active, move)).toBe(69);
    }
    const recovery = clips.find((clip) => clip.key === 'tester-heavy-kick-recovery')!;
    const begins = move.startup + move.activeFrames;
    expect(getAttackAnimationFrame({ ...attacking(move.id, 'recovery', begins), attack: { ...attacking(move.id, 'recovery', begins).attack!, hitOutcome: 'block' } }, recovery, move)).toBe(69);
    expect(getAttackAnimationFrame({ ...attacking(move.id, 'recovery', begins + move.recovery - 1), attack: { ...attacking(move.id, 'recovery', begins + move.recovery - 1).attack!, hitOutcome: 'block' } }, recovery, move)).toBe(64);
    expect(getAttackAnimationFrame(fighter, recovery, move)).toBeUndefined();
  });

  it('preserves the explicit return poses of loops instead of replacing them with a numeric range', () => {
    const idle = clips.find((clip) => clip.key === 'tester-idle')!;
    expect(getClipFrames(idle)).toEqual([212, 213, 214, 215, 216, 217, 218, 217, 216, 215, 214, 213]);
    expect(idle.repeat).toBe(-1);
    expect(getClipFrames({ key: 'range', start: 2, end: 4, frameRate: 8, repeat: 0 })).toEqual([2, 3, 4]);
  });
});

describe('juggle visual', () => {
  it('selects a dedicated reaction only while the victim is airborne', () => {
    const state: CharacterState = { ...fighter, mode: 'hitstun', grounded: false,
      combo: { attackerId: 'player-2', hits: 1, damage: 10, screwUsed: false, wallUsed: false, wallFrames: 0, moveIds: [] } };
    expect(getCharacterAnimationKey(state)).toBe('tester-juggle');
    expect(getCharacterAnimationKey({ ...state, grounded: true })).toBe('tester-hit');
    expect(getCharacterAnimationKey({ ...state, combo: undefined })).toBe('tester-hit');
    expect(getCharacterAnimationKey({ ...state, mode: 'airborne', combo: undefined })).toBe('tester-jump');
  });
});
