import { describe, expect, it } from 'vitest';
import { cowboy } from '../engine/data/fighters/cowboy';
import { shoto } from '../engine/data/fighters/shoto';
import { createGameConfig } from '../engine/data/gameConfig';
import { Simulation } from '../engine/simulation/Simulation';
import type { AttackButton, Direction, FrameInput } from '../input/types';

const input = (direction: Direction = 'N', button?: AttackButton): FrameInput => ({ direction, buttons: new Set(button ? [button] : []) });

describe('Cowboy protótipo', () => {
  it('tem quatro básicos por postura aérea e no chão e nenhuma receita inventada', () => {
    expect(cowboy.moves.filter(move => move.category === 'basic' && !move.airborne)).toHaveLength(4);
    expect(cowboy.moves.filter(move => move.category === 'basic' && move.airborne)).toHaveLength(4);
    expect(cowboy.combos).toEqual([]);
  });
  it.each([0, 1])('executa os disparos e o afastamento do lado %i', player => {
    for (const [button, id, distance] of [['1', 'quick-shot', 300], ['2', 'heavy-shot', 300], ['4', 'push-away', 56]] as const) {
      const definitions = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
      const sim = new Simulation(createGameConfig(1024, 576), definitions, { training: true, initialDistance: distance });
      const step = (value: FrameInput) => sim.stepFrame(player === 0 ? [value, input()] : [input(), value]);
      for (const direction of ['D', 'DF', 'F'] as const) step(input(direction));
      step(input('F', button));
      expect(sim.snapshot().characters[player].attack?.moveId).toBe(id);
      let hit = false;
      for (let tick = 0; tick < 150; tick++) {
        step(input());
        if (sim.snapshot().hitEvents.some(event => event.moveId === id)) { hit = true; break; }
      }
      expect(hit).toBe(true);
      if (id === 'push-away') expect(Math.abs(sim.snapshot().characters[0].x - sim.snapshot().characters[1].x)).toBeGreaterThan(130);
    }
  });
});

it.each([0, 1])('dispara horizontalmente, para baixo no ar e para cima agachada: jogador %i', player => {
  for (const [button, direction, jump, verticalSign] of [
    ['1', 'N', false, 0], ['2', 'N', false, 0],
    ['1', 'N', true, 1], ['2', 'N', true, 1], ['2', 'D', false, -1],
  ] as const) {
    const definitions = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
    const sim = new Simulation(createGameConfig(1024, 576), definitions, { training: true, initialDistance: 400 });
    const step = (value: FrameInput) => sim.stepFrame(player === 0 ? [value, input()] : [input(), value]);
    if (jump) { step(input('U')); step(input()); }
    step(input(direction, button));
    for (let tick = 0; tick < 25 && !sim.snapshot().projectiles.length; tick++) step(input());
    const shot = sim.snapshot().projectiles[0];
    expect(shot).toBeDefined();
    expect(Math.sign(shot.velocity)).toBe(player === 0 ? 1 : -1);
    expect(Math.sign(shot.verticalVelocity ?? 0)).toBe(verticalSign);
  }
});

it.each([0, 1])('rasteira derruba no acerto, mas não na guarda ou no vazio: jogador %i', player => {
  for (const [distance, guard, expected] of [[65, 'N', 'hit'], [65, 'DB', 'block'], [220, 'N', 'miss']] as const) {
    const definitions = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
    const sim = new Simulation(createGameConfig(1024, 576), definitions, { training: true, initialDistance: distance });
    const step = (value: FrameInput) => sim.stepFrame(player === 0 ? [value, input(guard)] : [input(guard), value]);
    step(input('D', '4'));
    let outcome = 'miss';
    for (let tick = 0; tick < 30; tick++) {
      step(input('D'));
      const event = sim.snapshot().hitEvents.find(hit => hit.moveId === 'crouch-heavy-kick');
      if (event) { outcome = event.outcome; break; }
    }
    expect(outcome).toBe(expected);
    expect(sim.snapshot().characters[1 - player].mode === 'knockdown').toBe(expected === 'hit');
  }
});

it('usa proporção de altura de 1,60 m para 1,85 m e chutes curtos', () => {
  expect(cowboy.collision.hurtboxes.standing.height / shoto.collision.hurtboxes.standing.height).toBeCloseTo(1.6 / 1.85, 3);
  for (const id of ['light-kick', 'heavy-kick', 'crouch-light-kick', 'crouch-heavy-kick']) {
    const move = cowboy.moves.find(entry => entry.id === id)!;
    expect(move.hitLevel).toBe('low');
    expect(move.hitbox.width).toBeLessThanOrEqual(70);
  }
});
