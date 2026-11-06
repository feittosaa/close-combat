import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { cowboy } from '../engine/data/fighters/cowboy';
import { shoto } from '../engine/data/fighters/shoto';
import type { Direction, FrameInput } from '../input/types';

const config = createGameConfig(1024, 576);
const press = (direction: Direction, ...buttons: ('1' | '2')[]): FrameInput => ({ direction, buttons: new Set(buttons) });

it.each([['left wall', 'left'], ['right wall', 'right']] as const)('os tiros da ultimate da Texas acertam o adversário colado nela, mesmo encurralada na %s', (_name, wall) => {
  const sim = new Simulation(config, [cowboy, shoto], { training: true, initialDistance: 40 });
  sim.fillTrainingRage();
  const state = (sim as unknown as { characters: { x: number; facing: string }[] }).characters;
  const edge = wall === 'left' ? config.arena.left + 40 : config.arena.right - 40;
  state[0].x = edge; state[1].x = edge + (wall === 'left' ? 45 : -45);
  for (const direction of ['B', 'DB', 'D', 'DF'] as const) sim.stepFrame([press(direction), press('N')]);
  sim.stepFrame([press('F', '1', '2'), press('N')]);
  const shots = new Set<number>();
  for (let i = 0; i < 400; i++) {
    sim.stepFrame([press('N'), press('N')]);
    for (const event of sim.snapshot().hitEvents) if (event.moveId === 'bulls-eye' && event.outcome === 'hit') shots.add(event.volleyStep ?? -1);
    if (sim.snapshot().characters[1].mode === 'knockdown' && shots.size) break;
  }
  expect(shots.size).toBeGreaterThanOrEqual(2);
  expect(sim.snapshot().characters[1].health).toBeLessThan(1000);
});
