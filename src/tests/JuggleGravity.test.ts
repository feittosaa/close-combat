import { describe, expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { ayla } from '../engine/data/fighters/ayla';
import { gris } from '../engine/data/fighters/gris';
import { defaultCharacter, type CharacterDefinition } from '../engine/data/characters';
import type { MoveDefinition } from '../engine/data/moves';
import type { FrameInput } from '../input/types';

const N: FrameInput = { direction: 'N', buttons: new Set() };
const config = createGameConfig(1600, 700);
function game(fighter: CharacterDefinition) {
  return new Simulation(config, [fighter, defaultCharacter], { training: true, initialDistance: 62 });
}
function prior(fighter: CharacterDefinition): CharacterDefinition {
  return { ...fighter, combatRules: { ...fighter.combatRules!, launchVelocity: fighter.id === 'ayla' ? -6.8 : -6.6,
    launchGravity: .24, juggleBaseGravity: .2, juggleGravity: .012, fallGravityMultiplier: 1 } };
}
function flight(fighter: CharacterDefinition) {
  const sim = game(fighter);
  sim.stepFrame([{ direction: 'N', buttons: new Set(['1', '2', '3']) }, N]);
  for (let f = 0; f < 60 && sim.snapshot().characters[1].grounded; f++) sim.stepFrame([N, N]);
  expect(sim.snapshot().characters[1].grounded).toBe(false);
  let frames = 0, apex = 0, height = 0;
  while (!sim.snapshot().characters[1].grounded && frames < 180) {
    const state = sim.snapshot().characters[1];
    height = Math.max(height, config.arena.floorY - state.y);
    if (state.verticalVelocity < 0) apex = frames;
    sim.stepFrame([N, N]); frames++;
  }
  expect(sim.snapshot().characters[1]).toMatchObject({ grounded: true, mode: 'knockdown', verticalVelocity: 0, y: config.arena.floorY });
  return { height, frames, descent: frames - apex };
}
function stressBook(fighter: CharacterDefinition, interval: number): CharacterDefinition {
  const seed = fighter.moves.find(move => !move.legacy && move.id === 'standing-lp')!;
  const hitbox = { forward: 0, yOffset: -650, width: 300, height: 700 };
  // Deliberately stronger than real strings: contact every frame, no pushback,
  // no height/range whiffs, and only the first contact consumes a launcher.
  const move: MoveDefinition = { ...seed, id: 'gravity-stress', input: { buttons: ['1'] }, startup: 1, activeFrames: 220,
    advance: 0, damage: 1, hitbox, pushback: { hit: 0, block: 0 }, combat: { ...seed.combat!,
      command: { notation: '1', buttons: ['1'], posture: 'standing' },
      strikes: Array.from({ length: Math.floor(220 / interval) }, (_, i) => ({ from: 1 + i * interval, to: 1 + i * interval,
        damage: 1, hitLevel: 'mid', hitbox, hitstun: 18, blockstun: 1, reaction: i === 0 ? 'launch' : undefined })) } };
  return { ...fighter, moves: [move] };
}

describe.each([ayla, gris])('$name: levantamento alto e queda progressiva', fighter => {
  it('sobe mais alto, desce mais rápido e encerra o voo antes do ajuste anterior', () => {
    const before = flight(prior(fighter));
    const after = flight(fighter);
    expect(after.height).toBeGreaterThan(before.height * 1.4);
    expect(after.descent).toBeLessThan(before.descent);
    expect(after.frames).toBeLessThan(before.frames);
  });

  it('cada contato aéreo aumenta a aceleração, sem diminuir a gravidade do launcher', () => {
    const sim = game(stressBook(fighter, 8));
    sim.stepFrame([{ direction: 'N', buttons: new Set(['1']) }, N]);
    const accelerations: number[] = [];
    for (let frame = 0; frame < 50 && accelerations.length < 4; frame++) {
      const before = sim.snapshot();
      sim.stepFrame([N, N]);
      const after = sim.snapshot();
      if (before.hitEvents.length && !after.hitEvents.length && !before.characters[1].grounded && !after.characters[1].grounded) {
        accelerations.push(after.characters[1].verticalVelocity - before.characters[1].verticalVelocity);
      }
    }
    expect(accelerations).toHaveLength(4);
    for (let i = 1; i < accelerations.length; i++) expect(accelerations[i]).toBeGreaterThan(accelerations[i - 1]);
  });

  it('aterrissa mesmo sob um contato por frame, sem precisar do terceiro levantamento', () => {
    const sim = game(stressBook(fighter, 1));
    sim.stepFrame([{ direction: 'N', buttons: new Set(['1']) }, N]);
    let airborne = false, landed = false, hits = 0;
    for (let frame = 0; frame < 100; frame++) {
      sim.stepFrame([N, N]);
      const target = sim.snapshot().characters[1];
      if (!target.grounded) airborne = true;
      hits = Math.max(hits, target.combo?.hits ?? 0);
      if (airborne && target.grounded) {
        expect(target.combo?.launches).toBe(1);
        expect(target.combo?.forcedFall).not.toBe(true);
        expect(target.y).toBe(config.arena.floorY);
        landed = true; break;
      }
    }
    expect(hits).toBeGreaterThan(10);
    expect(landed).toBe(true);
  });

  it('mantém a trajetória do salto livre', () => {
    const current = game(fighter), old = game(prior(fighter));
    for (let frame = 0; frame < 70; frame++) {
      const input: FrameInput = { direction: frame === 0 ? 'U' : 'N', buttons: new Set() };
      current.stepFrame([input, N]); old.stepFrame([input, N]);
      const { combatRules: _currentRules, ...currentState } = current.snapshot().characters[0];
      const { combatRules: _oldRules, ...oldState } = old.snapshot().characters[0];
      expect(currentState).toEqual(oldState);
    }
  });
});
