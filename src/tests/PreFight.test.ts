import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import type { Direction, FrameInput } from '../input/types';

const input = (direction: Direction = 'N', ...buttons: ('1' | '2' | '3' | '4')[]): FrameInput => ({ direction, buttons: new Set(buttons), taunt: false, rageAction: false });
const N = input();

it('antes da luta os personagens andam, mas golpes não são lidos e o cronômetro espera', () => {
  const sim = new Simulation(createGameConfig(1024, 576), undefined, { initialDistance: 300 });
  sim.setPreFight(true);
  const start = sim.snapshot();
  for (let i = 0; i < 20; i++) sim.stepFrame([input('F', '1'), N]);
  const during = sim.snapshot();
  expect(during.characters[0].x).toBeGreaterThan(start.characters[0].x);
  expect(during.characters[0].attack).toBeUndefined();
  expect(during.roundFramesRemaining).toBe(start.roundFramesRemaining);
  sim.setPreFight(false);
  sim.stepFrame([input('N', '1'), N]);
  expect(sim.snapshot().characters[0].attack?.moveId).toBe('light-punch');
  sim.stepFrame([N, N]);
  expect(sim.snapshot().roundFramesRemaining).toBeLessThan(start.roundFramesRemaining);
});
