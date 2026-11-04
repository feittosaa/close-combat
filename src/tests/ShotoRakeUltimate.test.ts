import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';
import { createHitbox } from '../engine/collision/combatGeometry';
import type { AttackButton, FrameInput } from '../input/types';

const neutral: FrameInput = { direction: 'N', buttons: new Set() };
function step(sim: Simulation, player: number, value: FrameInput = neutral) {
  sim.stepFrame(player === 0 ? [value, neutral] : [neutral, value]);
}
function hit(sim: Simulation, player: number, button: AttackButton) {
  step(sim, player, { direction: 'N', buttons: new Set([button]) });
  for (let i = 0; i < 120; i++) {
    if (sim.snapshot().hitEvents.some(event => event.attackerId === `player-${player + 1}` && event.outcome === 'hit')) {
      while (sim.snapshot().hitstopFramesRemaining) step(sim, player);
      return;
    }
    step(sim, player);
  }
  throw new Error(`sem contato ${button}`);
}

it.each([0, 1])('ultimate padrão causa 400 ou 300 após cinco acertos, jogador %i', player => {
  for (const prior of [0, 5]) {
    const sim = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true, initialDistance: 56 });
    sim.fillTrainingRage();
    if (prior) for (const button of ['1', '1', '1', '3', '3'] as const) hit(sim, player, button);
    step(sim, player, { ...neutral, ultimate: true });
    expect(sim.snapshot().characters[player].attack?.moveId).toBe('rake-ultimate');
    let damage = 0, contacts = 0;
    for (let tick = 0; tick < 500; tick++) {
      step(sim, player);
      for (const event of sim.snapshot().hitEvents) if (event.moveId === 'rake-ultimate' && event.outcome === 'hit') { damage += event.damage; contacts++; }
      if (!sim.snapshot().ultimateActivation && !sim.snapshot().characters[player].attack) break;
    }
    expect(contacts).toBe(10);
    expect(damage).toBe(prior ? 300 : 400);
  }
});

it.each([0, 1])('caixa da ultimate cobre os dois lados do corpo e termina acima dos pés, jogador %i', player => {
  const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto]).snapshot().characters[player];
  const move = shoto.moves.find(candidate => candidate.id === 'rake-ultimate')!;
  const box = createHitbox(state, move);
  expect(box.x).toBeLessThan(state.x); expect(box.x + box.width).toBeGreaterThan(state.x);
  expect(box.y + box.height).toBeLessThan(state.y);
});

it.each([0, 1])('aceita ambos os comandos de ultimate sem confundir o atalho, jogador %i', player => {
  for (const id of ['rake-ultimate', 'crow-ultimate']) {
    const sim = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true, initialDistance: 300 });
    sim.fillTrainingRage();
    const move = shoto.moves.find(candidate => candidate.id === id)!;
    const sequence = move.input.sequence!;
    sequence.forEach((direction, index) => step(sim, player, { direction, buttons: new Set(index === sequence.length - 1 ? move.input.buttons : []) }));
    expect(sim.snapshot().characters[player].attack?.moveId).toBe(id);
  }
});
