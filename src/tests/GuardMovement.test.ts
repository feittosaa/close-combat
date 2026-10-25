import { describe, expect, it } from 'vitest';
import { defaultCharacter } from '../engine/data/characters';
import { createGameConfig } from '../engine/data/gameConfig';
import { Simulation } from '../engine/simulation/Simulation';
import type { FrameInput } from '../input/types';

const config = createGameConfig(1024, 576);
const neutral: FrameInput = { direction: 'N', buttons: new Set() };
const back: FrameInput = { direction: 'B', buttons: new Set() };
const forward: FrameInput = { direction: 'F', buttons: new Set() };
const strike: FrameInput = { direction: 'N', buttons: new Set(['2']) };
const cross = defaultCharacter.moves.find(({ id }) => id === 'heavy-punch')!;
const attacker = { ...defaultCharacter, id: 'guard-test-attacker', moves: [
  { ...cross, id: 'guard-test-strike', startup: 4, activeFrames: 3, recovery: 8, pushback: { hit: 6, block: 4 } },
] };

function step(sim: Simulation, inputs: readonly FrameInput[]): void {
  sim.advance(1000 / 60, () => inputs);
}

describe('guard and grounded movement', () => {
  it('walks backward normally when the opponent is not attacking', () => {
    const sim = new Simulation(config);
    const before = sim.snapshot().characters;
    step(sim, [back, back]);
    const after = sim.snapshot().characters;
    expect(after[0]).toMatchObject({ mode: 'moving', movementDirection: 'backward', facing: 'right' });
    expect(after[1]).toMatchObject({ mode: 'moving', movementDirection: 'backward', facing: 'left' });
    expect(after[0].x).toBe(before[0].x - defaultCharacter.movement.backwardWalkSpeed!);
    expect(after[1].x).toBe(before[1].x + defaultCharacter.movement.backwardWalkSpeed!);
  });

  it.each([0, 1])('guards a distant new attack immediately for defender %i and stays still on a whiff', (defenderIndex) => {
    const attackerIndex = 1 - defenderIndex;
    const sim = new Simulation(config, defenderIndex === 0 ? [defaultCharacter, attacker] : [attacker, defaultCharacter]);
    const before = sim.snapshot().characters[defenderIndex].x;
    const inputs = [back, back]; inputs[attackerIndex] = strike;
    step(sim, inputs);
    expect(sim.snapshot().characters[defenderIndex]).toMatchObject({ mode: 'blocking', x: before });
    const held = [back, back]; held[attackerIndex] = neutral;
    for (let t = 0; t < 30 && sim.snapshot().characters[attackerIndex].attack; t += 1) {
      step(sim, held);
      expect(sim.snapshot().characters[defenderIndex].x).toBe(before);
      expect(sim.snapshot().hitEvents).toHaveLength(0);
    }
    expect(sim.snapshot().characters[attackerIndex].attack).toBeUndefined();
    step(sim, held);
    expect(sim.snapshot().characters[defenderIndex].mode).toBe('moving');
    expect(sim.snapshot().characters[defenderIndex].x).not.toBe(before);
  });

  it('requires the guard input instead of guarding automatically in neutral', () => {
    const sim = new Simulation(config, [attacker, defaultCharacter]);
    step(sim, [strike, neutral]);
    expect(sim.snapshot().characters[1].mode).toBe('neutral');
  });

  it.each(['D', 'DF', 'DB'] as const)('prevents movement and dash while holding %s', (direction) => {
    const sim = new Simulation(config);
    step(sim, [forward, neutral]); step(sim, [neutral, neutral]); step(sim, [forward, neutral]);
    expect(sim.snapshot().characters[0].mode).toBe('dashing');
    const x = sim.snapshot().characters[0].x;
    for (let t = 0; t < 20; t += 1) {
      step(sim, [{ direction, buttons: new Set() }, neutral]);
      expect(sim.snapshot().characters[0]).toMatchObject({ x, mode: 'crouching', crouching: true });
    }
  });

  it('does not let body contact drag a stationary crouching fighter', () => {
    const sim = new Simulation(config);
    const x = sim.snapshot().characters[1].x;
    for (let t = 0; t < 360; t += 1) step(sim, [forward, { direction: 'D', buttons: new Set() }]);
    expect(sim.snapshot().characters[1].x).toBe(x);
    expect(sim.snapshot().characters[1].x - sim.snapshot().characters[0].x).toBe(defaultCharacter.collision.bodyWidth);
  });

  it('does not drag guard during startup at body contact', () => {
    const advancing = attacker;
    const sim = new Simulation(config, [advancing, defaultCharacter]);
    for (let t = 0; t < 180; t += 1) step(sim, [forward, forward]);
    const x = sim.snapshot().characters[1].x;
    step(sim, [strike, back]);
    expect(sim.snapshot().characters[1]).toMatchObject({ mode: 'blocking', x });
    expect(sim.snapshot().hitEvents).toHaveLength(0);
  });

  it('does not create an attack or movement while crouched', () => {
    const sim = new Simulation(config);
    const x = sim.snapshot().characters[0].x;
    step(sim, [{ direction: 'D', buttons: new Set(['2']) }, neutral]);
    for (let t = 0; t < 10; t += 1) step(sim, [{ direction: 'D', buttons: new Set() }, neutral]);
    expect(sim.snapshot().characters[0].attack).toBeUndefined();
    expect(sim.snapshot().characters[0].x).toBe(x);
  });

  it.each([0, 1])('applies only a small single displacement on a blocked hit to defender %i', (defenderIndex) => {
    const ai = 1 - defenderIndex;
    const sim = new Simulation(config, defenderIndex === 0 ? [defaultCharacter, attacker] : [attacker, defaultCharacter]);
    for (let t = 0; t < 180; t += 1) step(sim, [forward, forward]);
    const x = sim.snapshot().characters[defenderIndex].x;
    const inputs = [back, back]; inputs[ai] = strike;
    step(sim, inputs);
    const held = [back, back]; held[ai] = neutral;
    for (let t = 0; t < 30 && sim.snapshot().hitEvents.length === 0; t += 1) step(sim, held);
    const hit = sim.snapshot();
    expect(hit.hitEvents[0]).toMatchObject({ outcome: 'block', pushback: 4 });
    expect(hit.characters[defenderIndex].health).toBe(defaultCharacter.maxHealth);
    const displaced = x + (defenderIndex === 0 ? -4 : 4);
    expect(hit.characters[defenderIndex].x).toBe(displaced);
    for (let t = 0; t < 5; t += 1) {
      step(sim, held);
      expect(sim.snapshot().characters[defenderIndex].x).toBe(displaced);
    }
  });
});
