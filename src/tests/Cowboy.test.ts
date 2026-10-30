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
