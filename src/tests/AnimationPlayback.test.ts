import { it, expect } from 'vitest';
import { getTimedAnimationFrame, getAttackAnimationFrame, getStateAnimationFrame, shouldFlipAnimation, validateAnimationManifest, type AnimationClip } from '../rendering/animations/AnimationPlayback';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { defaultCharacter as shoto } from '../engine/data/characters';
const loop: AnimationClip = { key: 'future-idle', start: 0, end: 2, frames: [0, 1, 2, 1], frameDurations: [14, 10, 14, 10], frameRate: 10, repeat: -1 };
it('mantém holds e o retorno de um clipe genérico sem depender de assets retirados', () => {
  expect([0, 13, 14, 23, 24, 37, 38, 47, 48].map(t => getTimedAnimationFrame(loop, t))).toEqual([0, 0, 1, 1, 2, 2, 1, 1, 0]);
  expect(getTimedAnimationFrame({ ...loop, repeat: 0 }, 100)).toBe(1);
  expect(shouldFlipAnimation('left', loop)).toBe(true);
  expect(shouldFlipAnimation('left', { ...loop, sourceFacesLeft: true })).toBe(false);
});
it('amostra fases a partir do frame lógico, incluindo recuperação em acerto', () => {
  const state = new Simulation(createGameConfig(1024, 576)).snapshot().characters[0];
  const move = shoto.moves[0];
  const start = { ...state, mode: 'startup' as const, attack: { moveId: move.id, buttons: move.input.buttons, elapsedFrames: 0, hasHit: false } };
  expect(getAttackAnimationFrame(start, loop, move)).toBe(0);
  const recovery = { ...start, mode: 'recovery' as const, attack: { ...start.attack, elapsedFrames: move.startup + move.activeFrames + move.recovery - 1, hitOutcome: 'hit' as const } };
  expect(getAttackAnimationFrame(recovery, loop, move)).toBe(1);
  expect(getStateAnimationFrame(state, loop, 14)).toBe(1);
});
it('recusa manifesto com escala desigual ou índices de quadro inválidos', () => {
  const manifest = { textureKey: 'future', frameSize: { width: 128, height: 128 }, totalFrames: 3, clips: [loop] };
  expect(() => validateAnimationManifest(manifest)).not.toThrow();
  expect(() => validateAnimationManifest({ ...manifest, displaySize: { width: 100, height: 120 } })).toThrow();
  expect(() => validateAnimationManifest({ ...manifest, totalFrames: 2 })).toThrow();
});
