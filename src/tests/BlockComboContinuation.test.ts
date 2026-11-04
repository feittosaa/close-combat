import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { cowboy } from '../engine/data/fighters/cowboy';
import { shoto } from '../engine/data/fighters/shoto';
import type { AttackButton, Direction, FrameInput } from '../input/types';

const input = (direction: Direction = 'N', button?: AttackButton): FrameInput => ({ direction, buttons: new Set(button ? [button] : []) });
const config = createGameConfig(1024, 576);
let guardDirection: Direction = 'B';
function send(sim: Simulation, player: number, value = input()) {
  const guard = input(guardDirection);
  sim.stepFrame(player === 0 ? [value, guard] : [guard, value]);
}
function block(sim: Simulation, player: number, button: AttackButton) {
  send(sim, player, input('N', button));
  for (let i = 0; i < 150; i++) {
    if (sim.snapshot().hitEvents.some(event => event.attackerId === `player-${player + 1}` && event.outcome === 'block')) {
      while (sim.snapshot().hitstopFramesRemaining) send(sim, player);
      return;
    }
    send(sim, player);
  }
  throw new Error(`No blocked ${button}`);
}

it.each([0, 1])('Shoto continua golpes defendidos e preserva sua família fraca, jogador %i', player => {
  for (const [first, wrong] of [['3', '1'], ['3', '2']] as const) {
    guardDirection = 'B';
    const sim = new Simulation(config, [shoto, shoto], { training: true, initialDistance: 56 });
    block(sim, player, first);
    const previous = sim.snapshot().characters[player].attack?.moveId;
    send(sim, player, input('N', wrong));
    expect(sim.snapshot().characters[player].attack?.moveId).toBe(previous);
    const repeat = new Simulation(config, [shoto, shoto], { training: true, initialDistance: 56 });
    block(repeat, player, first);
    send(repeat, player, input('N', first));
    for (let i = 0; i < 4; i++) send(repeat, player);
    expect(repeat.snapshot().characters[player].chain).toHaveLength(2);
  }
});

it.each([0, 1])('Cowboy pode trocar entre golpes fracos defendidos, jogador %i', player => {
  for (const [first, next] of [['1', '3'], ['3', '1']] as const) {
    guardDirection = first === '3' ? 'DB' : 'B';
    const defs = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
    const sim = new Simulation(config, defs, { training: true, initialDistance: 65 });
    block(sim, player, first);
    send(sim, player, input('N', next));
    send(sim, player);
    expect(sim.snapshot().characters[player].attack?.moveId).toBe(next === '1' ? 'light-punch' : 'light-kick');
  }
});

it.each([0, 1])('cancela um golpe defendido em especial para cada personagem, jogador %i', player => {
  for (const fighter of [shoto, cowboy]) {
    guardDirection = 'B';
    const defs = player === 0 ? [fighter, shoto] as const : [shoto, fighter] as const;
    const sim = new Simulation(config, defs, { training: true, initialDistance: 56 });
    block(sim, player, '1');
    send(sim, player, input('D')); send(sim, player, input('DF')); send(sim, player, input('F', '1'));
    expect(sim.snapshot().characters[player].attack?.moveId).toBe(fighter.id === 'shoto' ? 'tomato-light' : 'quick-shot');
  }
});

it.each([0, 1])('Shoto limita repetição de 1,1,1 e 2,2,2 defendidos, mas aceita especial, jogador %i', player => {
  guardDirection = 'B';
  for (const button of ['1', '2'] as const) {
    const sim = new Simulation(config, [shoto, shoto], { training: true, initialDistance: 56 });
    for (let i = 0; i < 3; i++) block(sim, player, button);
    const attack = sim.snapshot().characters[player].attack!;
    expect(attack.recoveryFrames).toBe(button === '1' ? 20 : 30);
    send(sim, player, input('N', button)); send(sim, player);
    expect(sim.snapshot().characters[player].chain).toHaveLength(3);
    send(sim, player, input('D')); send(sim, player, input('DF')); send(sim, player, input('F', '1'));
    expect(sim.snapshot().characters[player].attack?.moveId).toBe('tomato-light');
  }
});
