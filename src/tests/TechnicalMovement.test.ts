import { describe, expect, it } from 'vitest';
import { ayla } from './fixtures/referenceFighters';
import { gris } from './fixtures/referenceFighters';
import { aylaForwardJab, aylaMove } from '../engine/data/combat/aylaCombatBook';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import type { FrameInput, Direction, AttackButton } from '../input/types';
import { getCharacterAnimationKey } from '../rendering/animations/CharacterAnimationMap';
import { getTimedAnimationFrame, shouldFlipAnimation } from '../rendering/animations/AnimationPlayback';
import manifest from '../assets/animations/ayla.json';
const input = (direction: Direction = 'N', buttons: readonly AttackButton[] = []): FrameInput => ({ direction, buttons: new Set(buttons) });
const N = input();
function sim() { return new Simulation(createGameConfig(1024, 700), [ayla, gris], { training: true, initialDistance: 180 }); }

describe('movimento técnico por personagem', () => {
  it.each([0, 1])('recuo mantém a orientação e usa velocidade própria do lutador %i', index => {
    const game = sim(); const before = game.snapshot().characters[index];
    for (let i = 0; i < 10; i++) game.stepFrame(index === 0 ? [input('B'), N] : [N, input('B')]);
    const after = game.snapshot().characters[index]; const fighter = index === 0 ? ayla : gris;
    expect(after.facing).toBe(before.facing);
    expect(Math.abs(after.x - before.x)).toBeCloseTo(fighter.movement.backwardWalkSpeed! * 10);
    expect(getCharacterAnimationKey(after)).toBe(`${fighter.id}-walk-backward`);
    expect(fighter.movement.backwardWalkSpeed).toBeLessThan(fighter.movement.walkSpeed);
  });
  it('backdash usa deslocamento e clipe de recuo sem virar Ayla', () => {
    const game = sim(); game.stepFrame([input('B'), N]); game.stepFrame([N, N]);
    const before = game.snapshot().characters[0]; game.stepFrame([input('B'), N]);
    const after = game.snapshot().characters[0];
    expect(after.mode).toBe('dashing'); expect(before.x - after.x).toBeCloseTo(ayla.movement.backdashSpeed!);
    expect(getCharacterAnimationKey(after)).toBe('ayla-backdash');
    const clip = manifest.clips.find(c => c.key === 'ayla-backdash')!;
    expect(shouldFlipAnimation(after.facing, clip)).toBe(false);
    expect(clip.frames).toEqual([24,25,26,27,28,29,30,31]);
    expect(getTimedAnimationFrame(clip, 0)).toBe(24);
    expect(getTimedAnimationFrame(clip, 11)).toBe(31);
  });
  it('1 em neutro e f+1 andando são golpes próprios com preparação e alcance distintos', () => {
    const standing = sim(); standing.stepFrame([input('N', ['1']), N]);
    const walking = sim(); walking.stepFrame([input('F'), N]); walking.stepFrame([input('F', ['1']), N]);
    expect(standing.snapshot().characters[0].attack?.moveId).toBe(aylaMove('1').id);
    expect(walking.snapshot().characters[0].attack?.moveId).toBe(aylaForwardJab.id);
    expect(aylaForwardJab.startup).toBeGreaterThan(aylaMove('1').startup);
    expect(aylaForwardJab.hitbox.width).toBeGreaterThan(aylaMove('1').hitbox.width);
    expect(gris.moves.some(move => move.id === aylaForwardJab.id)).toBe(false);
  });
  it('o jab de avanço conecta a string própria sem liberar cancelamento geral', () => {
    const game = new Simulation(createGameConfig(1024,700), [ayla, ayla], { training: true, initialDistance: 62 });
    game.stepFrame([input('F', ['1']), N]);
    const next = aylaMove('1,1');
    for (let i = 0; i < 120 && (game.snapshot().characters[0].attack?.elapsedFrames ?? 0) < next.combat!.command.followupWindow!.from; i++) game.stepFrame([N,N]);
    game.stepFrame([input('N', ['1']), N]);
    expect(game.snapshot().characters[0].attack?.moveId).toBe(next.id);
    game.stepFrame([input('N', ['4']), N]);
    expect(game.snapshot().characters[0].attack?.moveId).toBe(next.id);
  });
});
