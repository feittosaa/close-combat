import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { texas } from '../engine/data/fighters/texas';
import { shoto } from '../engine/data/fighters/shoto';
import type { AttackButton, Direction, FrameInput } from '../input/types';

const press = (direction: Direction, ...buttons: AttackButton[]): FrameInput => ({ direction, buttons: new Set(buttons) });
const idle = press('N');

it.each([['light-kick', 'N', '3'], ['crouch-punch', 'D', '1']] as const)(
  'a Texas encaixa o tiro duplo (1+2) em combo depois de %s', (starter, direction, button) => {
    const sim = new Simulation(createGameConfig(1024, 576), [texas, shoto], { training: true, initialDistance: 56 });
    sim.stepFrame([press(direction, button), idle]);
    let starterHit = false;
    for (let i = 0; i < 60 && !starterHit; i++) {
      sim.stepFrame([press(direction), idle]);
      starterHit = sim.snapshot().hitEvents.some(event => event.moveId === starter && event.outcome === 'hit');
    }
    expect(starterHit).toBe(true);
    sim.stepFrame([press('N', '1', '2'), idle]);
    let shot;
    for (let i = 0; i < 80 && !shot; i++) {
      sim.stepFrame([idle, idle]);
      shot = sim.snapshot().hitEvents.find(event => event.moveId === 'double-shot');
    }
    expect(shot?.outcome).toBe('hit');
    const combo = sim.snapshot().comboHistory.find(entry => entry.attackerId === 'player-1');
    expect(combo?.hits).toBeGreaterThanOrEqual(2);
  });
