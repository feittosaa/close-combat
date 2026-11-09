import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { texas } from '../engine/data/fighters/texas';
import { shoto } from '../engine/data/fighters/shoto';
import type { AttackButton, Direction, FrameInput } from '../input/types';

const input = (direction: Direction = 'N', button?: AttackButton): FrameInput => ({ direction, buttons: new Set(button ? [button] : []) });
const config = createGameConfig(1024, 576);
function send(sim: Simulation, player: number, value = input()) {
  sim.stepFrame(player === 0 ? [value, input()] : [input(), value]);
}
function hit(sim: Simulation, player: number, button: AttackButton) {
  send(sim, player, input('N', button));
  for (let i = 0; i < 150; i++) {
    if (sim.snapshot().hitEvents.some(event => event.attackerId === `player-${player + 1}` && event.outcome === 'hit')) {
      while (sim.snapshot().hitstopFramesRemaining) send(sim, player);
      return;
    }
    send(sim, player);
  }
  throw new Error('No confirmed hit');
}
function special(sim: Simulation, player: number, button: AttackButton) {
  send(sim, player, input('D')); send(sim, player, input('DF')); send(sim, player, input('F', button));
}

it.each([0, 1])('Texas cancela socos confirmados em ambos especiais de dinamite, jogador %i', player => {
  for (const count of [1, 2, 3]) for (const button of ['1', '2'] as const) {
    const defs = player === 0 ? [texas, shoto] as const : [shoto, texas] as const;
    const sim = new Simulation(config, defs, { training: true, initialDistance: 65 });
    hit(sim, player, '1');
    for (let i = 0; i < count; i++) hit(sim, player, '2');
    special(sim, player, button);
    expect(sim.snapshot().characters[player].attack?.moveId, `${count} ${button}`).toBe(button === '1' ? 'quick-shot' : 'heavy-shot');
  }
});

it.each([0, 1])('Shoto cancela ataques confirmados em tomate fraco e forte, jogador %i', player => {
  for (const first of ['1', '3'] as const) for (const button of ['1', '2'] as const) {
    const sim = new Simulation(config, [shoto, shoto], { training: true, initialDistance: 56 });
    hit(sim, player, first); special(sim, player, button);
    expect(sim.snapshot().characters[player].attack?.moveId).toBe(button === '1' ? 'tomato-light' : 'tomato-heavy');
  }
});

it.each([0, 1])('Texas cancela chutes fracos confirmados em afastamento, jogador %i', player => {
  for (const count of [1, 2]) {
    const defs = player === 0 ? [texas, shoto] as const : [shoto, texas] as const;
    const sim = new Simulation(config, defs, { training: true, initialDistance: 56 });
    for (let i = 0; i < count; i++) hit(sim, player, '3');
    special(sim, player, '4');
    expect(sim.snapshot().characters[player].attack?.moveId).toBe('push-away');
  }
});

it.each([0, 1])('aplica a direção da família fraca do Shoto, jogador %i', player => {
  for (const forbidden of ['1', '2'] as const) {
    const sim = new Simulation(config, [shoto, shoto], { training: true, initialDistance: 56 });
    hit(sim, player, '3'); hit(sim, player, '3');
    send(sim, player, input('N', forbidden));
    expect(sim.snapshot().characters[player].attack?.moveId).toBe('light-kick');
  }
  const sim = new Simulation(config, [shoto, shoto], { training: true, initialDistance: 56 });
  for (const button of ['1', '1', '1', '3', '3', '2'] as const) hit(sim, player, button);
  expect(sim.snapshot().comboHistory.slice(-1)[0]?.hits).toBe(6);
  expect(sim.snapshot().characters[player].attack?.moveId).toBe('heavy-punch');
  for (const forbidden of ['1', '3', '4'] as const) {
    send(sim, player, input('N', forbidden));
    expect(sim.snapshot().characters[player].attack?.moveId).toBe('heavy-punch');
  }
});

it.each([0, 1])('Texas pode trocar de família fraca durante o combo, jogador %i', player => {
  for (const [first, next] of [['1', '3'], ['3', '1']] as const) {
    const defs = player === 0 ? [texas, shoto] as const : [shoto, texas] as const;
    const sim = new Simulation(config, defs, { training: true, initialDistance: 65 });
    hit(sim, player, first);
    send(sim, player, input('N', next));
    expect(sim.snapshot().characters[player].attack?.moveId).toBe(next === '1' ? 'light-punch' : 'light-kick');
  }
});
