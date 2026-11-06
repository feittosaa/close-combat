import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';
import type { AttackButton, Direction, FrameInput } from '../input/types';

const press = (direction: Direction, ...buttons: AttackButton[]): FrameInput => ({ direction, buttons: new Set(buttons) });
const crouch = press('D');

function lowThenHigh(defender: Direction) {
  const sim = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true, initialDistance: 56 });
  for (let i = 0; i < 6; i++) sim.stepFrame([press('N'), press(defender)]);
  const defenderState = () => sim.snapshot().characters[1];
  sim.stepFrame([press('D', '1'), press(defender)]);
  let firstHit = false;
  for (let i = 0; i < 40 && !firstHit; i++) {
    sim.stepFrame([press('D'), press(defender)]);
    firstHit = sim.snapshot().hitEvents.some(event => event.moveId === 'crouch-punch' && event.outcome === 'hit');
  }
  return { sim, firstHit, defenderState };
}

it('quem leva um golpe agachado se levanta, e o combo continua com um golpe alto', () => {
  const { sim, firstHit, defenderState } = lowThenHigh('D');
  expect(firstHit).toBe(true);
  expect(defenderState()).toMatchObject({ mode: 'hitstun', crouching: false });
  // Standing in hitstun, the target can now be hit by a high attack that used to pass over a crouching target.
  sim.stepFrame([press('N', '1'), crouch]);
  let high;
  for (let i = 0; i < 30 && !high; i++) {
    sim.stepFrame([press('N'), crouch]);
    high = sim.snapshot().hitEvents.find(event => event.moveId === 'light-punch');
  }
  expect(high?.outcome).toBe('hit');
});

it('um golpe baixo bloqueado agachado não levanta o defensor', () => {
  const sim = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true, initialDistance: 56 });
  const guard = press('DB');
  for (let i = 0; i < 6; i++) sim.stepFrame([press('N'), guard]);
  sim.stepFrame([press('D', '1'), guard]);
  let blocked = false;
  for (let i = 0; i < 40 && !blocked; i++) {
    sim.stepFrame([press('D'), guard]);
    blocked = sim.snapshot().hitEvents.some(event => event.moveId === 'crouch-punch' && event.outcome === 'block');
  }
  expect(blocked).toBe(true);
  expect(sim.snapshot().characters[1].crouching).toBe(true);
});
