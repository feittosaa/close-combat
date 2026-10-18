// src/tests/Simulation.test.ts
import { describe, expect, it } from 'vitest';
import type { FrameInput } from '../input/types';
import { createGameConfig } from '../engine/data/gameConfig';
import { Simulation } from '../engine/simulation/Simulation';

const config = createGameConfig(1024, 576);
const neutral: FrameInput = { direction: 'N', buttons: new Set() };

function step(simulation: Simulation, inputs: readonly FrameInput[]): void {
  simulation.advance(1000 / 60, () => inputs);
}

describe('Simulation movement foundation', () => {
  it('advances exactly one logic frame at 60 Hz', () => {
    const simulation = new Simulation(config);
    step(simulation, [neutral, neutral]);
    expect(simulation.snapshot().frame).toBe(1);
  });

  it('moves forward relative to each player facing', () => {
    const simulation = new Simulation(config);
    const before = simulation.snapshot().characters;
    step(simulation, [
      { direction: 'F', buttons: new Set() },
      { direction: 'F', buttons: new Set() },
    ]);
    const after = simulation.snapshot().characters;

    expect(after[0].x - before[0].x).toBe(config.movement.walkSpeed);
    expect(before[1].x - after[1].x).toBe(config.movement.walkSpeed);
  });

  it('moves backward relative to each player facing', () => {
    const simulation = new Simulation(config);
    const before = simulation.snapshot().characters;
    const backward: FrameInput = { direction: 'B', buttons: new Set() };
    step(simulation, [backward, backward]);
    const after = simulation.snapshot().characters;

    expect(before[0].x - after[0].x).toBe(config.movement.walkSpeed);
    expect(after[1].x - before[1].x).toBe(config.movement.walkSpeed);
  });

  it('uses a diagonal direction to jump and move toward the opponent', () => {
    const simulation = new Simulation(config);
    const before = simulation.snapshot().characters[0];
    step(simulation, [{ direction: 'UF', buttons: new Set() }, neutral]);
    const after = simulation.snapshot().characters[0];

    expect(after.grounded).toBe(false);
    expect(after.x).toBe(before.x + config.movement.walkSpeed);
  });

  it('jumps once on a fresh up input and lands at the arena floor', () => {
    const simulation = new Simulation(config);
    const jump: FrameInput = { direction: 'U', buttons: new Set() };
    step(simulation, [jump, neutral]);
    expect(simulation.snapshot().characters[0].grounded).toBe(false);

    for (let frame = 0; frame < 120; frame += 1) step(simulation, [jump, neutral]);

    const player = simulation.snapshot().characters[0];
    expect(player.grounded).toBe(true);
    expect(player.y).toBe(config.arena.floorY);
  });

  it('crouches while down is held on the ground', () => {
    const simulation = new Simulation(config);
    step(simulation, [{ direction: 'D', buttons: new Set() }, neutral]);
    expect(simulation.snapshot().characters[0].crouching).toBe(true);
  });

  it('keeps the fighters in the arena and prevents them passing through each other', () => {
    const simulation = new Simulation(config);
    const towardOpponent: FrameInput = { direction: 'F', buttons: new Set() };
    for (let frame = 0; frame < 240; frame += 1) step(simulation, [towardOpponent, towardOpponent]);

    const [first, second] = simulation.snapshot().characters;
    expect(first.x).toBeGreaterThanOrEqual(config.arena.left + config.movement.bodyWidth / 2);
    expect(second.x).toBeLessThanOrEqual(config.arena.right - config.movement.bodyWidth / 2);
    expect(second.x - first.x).toBeGreaterThanOrEqual(config.movement.bodyWidth);
  });

  it('clamps backward movement to both arena boundaries', () => {
    const simulation = new Simulation(config);
    const awayFromOpponent: FrameInput = { direction: 'B', buttons: new Set() };
    for (let frame = 0; frame < 240; frame += 1) step(simulation, [awayFromOpponent, awayFromOpponent]);

    const [first, second] = simulation.snapshot().characters;
    const halfBody = config.movement.bodyWidth / 2;
    expect(first.x).toBe(config.arena.left + halfBody);
    expect(second.x).toBe(config.arena.right - halfBody);
  });

  it('starts an attack from a fresh button press and exposes its active hitbox', () => {
    const simulation = new Simulation(config);
    const forward: FrameInput = { direction: 'F', buttons: new Set() };
    for (let frame = 0; frame < 100; frame += 1) step(simulation, [forward, forward]);

    const jab: FrameInput = { direction: 'N', buttons: new Set(['1']) };
    step(simulation, [jab, neutral]);
    for (let frame = 0; frame < 3; frame += 1) step(simulation, [neutral, neutral]);

    const active = simulation.snapshot();
    expect(active.characters[0].mode).toBe('active');
    expect(active.activeHitboxes).toHaveLength(1);
    expect(active.activeHitboxes[0]?.ownerId).toBe('player-1');

    step(simulation, [neutral, neutral]);
    expect(simulation.snapshot().characters[1].health).toBe(config.match.maxHealth - 45);
  });

  it('does not repeat an attack while the same key remains held', () => {
    const simulation = new Simulation(config);
    const forward: FrameInput = { direction: 'F', buttons: new Set() };
    for (let frame = 0; frame < 100; frame += 1) step(simulation, [forward, forward]);

    const heldJab: FrameInput = { direction: 'N', buttons: new Set(['1']) };
    for (let frame = 0; frame < 40; frame += 1) step(simulation, [heldJab, neutral]);

    expect(simulation.snapshot().characters[1].health).toBe(config.match.maxHealth - 45);
  });

  it('keeps unassigned simultaneous button chords from becoming accidental attacks', () => {
    const simulation = new Simulation(config);
    const chord: FrameInput = { direction: 'DF', buttons: new Set(['1', '2']) };
    step(simulation, [chord, neutral]);

    expect(simulation.snapshot().characters[0].attack).toBeUndefined();
  });

  it('resolves simultaneous active attacks as a trade', () => {
    const simulation = new Simulation(config);
    const forward: FrameInput = { direction: 'F', buttons: new Set() };
    for (let frame = 0; frame < 100; frame += 1) step(simulation, [forward, forward]);

    const jab: FrameInput = { direction: 'N', buttons: new Set(['1']) };
    step(simulation, [jab, jab]);
    for (let frame = 0; frame < 4; frame += 1) step(simulation, [neutral, neutral]);
    step(simulation, [neutral, neutral]);

    const [first, second] = simulation.snapshot().characters;
    expect(first.health).toBe(config.match.maxHealth - 45);
    expect(second.health).toBe(config.match.maxHealth - 45);
  });
});
