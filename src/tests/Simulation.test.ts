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

  it('starts a dash after tapping the same horizontal direction twice', () => {
    const simulation = new Simulation(config);
    const forward: FrameInput = { direction: 'F', buttons: new Set() };
    step(simulation, [forward, neutral]);
    step(simulation, [neutral, neutral]);
    step(simulation, [forward, neutral]);

    const player = simulation.snapshot().characters[0];
    expect(player.mode).toBe('dashing');
    expect(player.x).toBeGreaterThan(config.arena.left + 190 + config.movement.walkSpeed * 2);
  });

  it('does not count directional taps in the air toward a dash', () => {
    const simulation = new Simulation(config);
    step(simulation, [{ direction: 'U', buttons: new Set() }, neutral]);
    const airborneStartX = simulation.snapshot().characters[0].x;
    step(simulation, [{ direction: 'F', buttons: new Set() }, neutral]);
    step(simulation, [neutral, neutral]);
    step(simulation, [{ direction: 'F', buttons: new Set() }, neutral]);

    const airbornePlayer = simulation.snapshot().characters[0];
    expect(airbornePlayer.grounded).toBe(false);
    expect(airbornePlayer.mode).toBe('airborne');
    expect(airbornePlayer.x - airborneStartX).toBe(config.movement.walkSpeed * 2);

    for (let frame = 0; frame < 120 && !simulation.snapshot().characters[0].grounded; frame += 1) {
      step(simulation, [neutral, neutral]);
    }
    const landedX = simulation.snapshot().characters[0].x;
    step(simulation, [{ direction: 'F', buttons: new Set() }, neutral]);
    const groundedPlayer = simulation.snapshot().characters[0];
    expect(groundedPlayer.mode).toBe('moving');
    expect(groundedPlayer.x - landedX).toBe(config.movement.walkSpeed);
  });

  it('allows an airborne fighter to cross the opponent and updates relative facing', () => {
    const simulation = new Simulation(config);
    const forward: FrameInput = { direction: 'F', buttons: new Set() };
    for (let frame = 0; frame < 200; frame += 1) step(simulation, [forward, neutral]);

    step(simulation, [{ direction: 'U', buttons: new Set() }, neutral]);
    for (let frame = 0; frame < 60; frame += 1) {
      const [first, second] = simulation.snapshot().characters;
      if (first.x > second.x) break;
      step(simulation, [forward, neutral]);
    }

    const [first, second] = simulation.snapshot().characters;
    expect(first.x).toBeGreaterThan(second.x);
    expect(first.facing).toBe('left');
    expect(second.facing).toBe('right');

    const crossedX = first.x;
    step(simulation, [forward, neutral]);
    expect(simulation.snapshot().characters[0].x).toBe(crossedX - config.movement.walkSpeed);
  });

  it.each([
    ['F', '1', 'test-advancing-jab'],
    ['B', '1', 'test-retreating-jab'],
    ['DF', '2', 'test-rising-punch'],
    ['DB', '2', 'test-retreating-elbow'],
    ['D', '3', 'test-sweep'],
    ['D', '1', 'test-crouching-jab'],
    ['D', '2', 'test-crouching-hook'],
    ['D', '4', 'test-crouching-sweep-kick'],
    ['UF', '4', 'test-jumping-kick'],
    ['UB', '4', 'test-backward-jumping-kick'],
  ] as const)('selects the directional move %s+%s', (direction, button, moveId) => {
    const simulation = new Simulation(config);
    const forward: FrameInput = { direction: 'F', buttons: new Set() };
    for (let frame = 0; frame < 100; frame += 1) step(simulation, [forward, forward]);
    step(simulation, [{ direction, buttons: new Set([button]) }, neutral]);
    expect(simulation.snapshot().characters[0].attack?.moveId).toBe(moveId);
  });

  it('keeps the crouching stance and hurtbox during a crouching attack', () => {
    const simulation = new Simulation(config);
    step(simulation, [{ direction: 'D', buttons: new Set(['1']) }, neutral]);
    expect(simulation.snapshot().characters[0].attack?.moveId).toBe('test-crouching-jab');
    expect(simulation.snapshot().characters[0].crouching).toBe(true);

    step(simulation, [neutral, neutral]);
    expect(simulation.snapshot().characters[0].crouching).toBe(true);
  });

  it.each([
    ['1', 'test-air-jab'],
    ['2', 'test-air-strong'],
    ['3', 'test-air-descending-kick'],
    ['4', 'test-air-heavy-kick'],
  ] as const)('selects the airborne move for button %s', (button, moveId) => {
    const simulation = new Simulation(config);
    step(simulation, [{ direction: 'U', buttons: new Set() }, neutral]);
    expect(simulation.snapshot().characters[0].grounded).toBe(false);

    step(simulation, [{ direction: 'N', buttons: new Set([button]) }, neutral]);
    expect(simulation.snapshot().characters[0].attack?.moveId).toBe(moveId);
  });

  it('blocks high and mid attacks standing, and blocks lows while crouching', () => {
    for (const [button, direction] of [['1', 'B'], ['2', 'B'], ['3', 'DB']] as const) {
      const simulation = new Simulation(config);
      const forward: FrameInput = { direction: 'F', buttons: new Set() };
      for (let frame = 0; frame < 100; frame += 1) step(simulation, [forward, forward]);
      const targetX = simulation.snapshot().characters[1].x;
      step(simulation, [{ direction: 'N', buttons: new Set([button]) }, { direction, buttons: new Set() }]);
      let snapshot = simulation.snapshot();
      for (let frame = 0; frame < 14 && snapshot.hitEvents.length === 0; frame += 1) {
        step(simulation, [neutral, { direction, buttons: new Set() }]);
        snapshot = simulation.snapshot();
      }

      expect(snapshot.characters[1].health).toBe(config.match.maxHealth);
      expect(snapshot.characters[1].mode).toBe('blockstun');
      expect(snapshot.hitEvents[0]?.outcome).toBe('block');
      expect(snapshot.characters[1].x).toBeGreaterThan(targetX);
    }
  });

  it('does not block a low while standing or a mid while crouching', () => {
    for (const [button, direction] of [['3', 'B'], ['2', 'DB']] as const) {
      const simulation = new Simulation(config);
      const forward: FrameInput = { direction: 'F', buttons: new Set() };
      for (let frame = 0; frame < 100; frame += 1) step(simulation, [forward, forward]);
      step(simulation, [{ direction: 'N', buttons: new Set([button]) }, { direction, buttons: new Set() }]);
      let snapshot = simulation.snapshot();
      for (let frame = 0; frame < 14 && snapshot.hitEvents.length === 0; frame += 1) {
        step(simulation, [neutral, { direction, buttons: new Set() }]);
        snapshot = simulation.snapshot();
      }

      expect(snapshot.characters[1].health).toBeLessThan(config.match.maxHealth);
      expect(snapshot.hitEvents[0]?.outcome).toBe('hit');
    }
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
