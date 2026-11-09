import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { shoto } from '../engine/data/fighters/shoto';
import { routeInputs, type RouteStep } from '../training/comboRoute';
import { TUTORIAL_DISTANCE, tutorialGameConfig } from '../training/tutorialLessons';
import type { FrameInput } from '../input/types';

const N: FrameInput = { direction: 'N', buttons: new Set() };
const create = () => new Simulation(tutorialGameConfig(), [shoto, shoto], { training: true, initialDistance: TUTORIAL_DISTANCE });
const hitsOf = (sim: Simulation) => sim.snapshot().comboHistory.filter(combo => combo.attackerId === 'player-1').map(combo => combo.hits);

it.each([['4', 'd+4'], ['d+4', '4']])('Bob não encadeia %s com %s (chute forte em pé e agachado)', (first, second) => {
  for (let wait = 2; wait <= 45; wait++) {
    const sim = create();
    for (const input of routeInputs([{ wait: 1, command: first }, { wait, command: second }], 90)) sim.stepFrame([input, N]);
    expect(hitsOf(sim).every(hits => hits < 2), `${first},${second} após ${wait} quadros`).toBe(true);
  }
});

it.each<[string, string, RouteStep[]]>([
  ['forte', 'flying-kick-heavy', [{ wait: 6, command: 'b,db,d,df,f,4' }]],
  ['fraca', 'flying-kick-light', [{ wait: 6, command: 'b,db,d,df,f,3' }]],
])('voadora %s para de avançar ao acertar e não atravessa o adversário', (_, moveId, steps) => {
  const sim = create();
  let hit = false;
  for (const input of routeInputs(steps, 120)) {
    sim.stepFrame([input, N]);
    const snapshot = sim.snapshot();
    hit ||= snapshot.hitEvents.some(event => event.moveId === moveId);
    expect(snapshot.characters[0].x).toBeLessThan(snapshot.characters[1].x);
  }
  expect(hit).toBe(true);
});

it('Bob não usa o soco forte agachado depois de um soco forte em pé no mesmo combo', () => {
  for (let wait = 2; wait <= 45; wait++) {
    const sim = create();
    for (const input of routeInputs([{ wait: 1, command: '2' }, { wait, command: 'd+2' }], 90)) sim.stepFrame([input, N]);
    expect(hitsOf(sim).every(hits => hits < 2), `2,d+2 após ${wait} quadros`).toBe(true);
  }
});

it.each(['1', '2', '3', '4', 'd+2', 'd+4', 'd,df,f,1', 'f,d,df,4', 'b,db,d,df,f,3', 'd,df,f,d,df,f,1'])('3+4 do Bob finaliza o combo: %s não continua', command => {
  for (let wait = command.split(',').length + 1; wait <= 45; wait++) {
    const sim = create();
    sim.fillTrainingRage();
    for (const input of routeInputs([{ wait: 1, command: '3+4' }, { wait, command }], 200)) sim.stepFrame([input, N]);
    expect(hitsOf(sim).every(hits => hits < 2), `3+4,${command} após ${wait} quadros`).toBe(true);
  }
});

it.each(['b,db,d,df,f,3', 'b,db,d,df,f,4'])('depois da voadora %s o Bob só ataca de novo ao tocar o chão', kick => {
  for (const air of ['1', '2', '3', '4']) for (let wait = 3; wait <= 60; wait += 2) {
    const sim = create();
    let attackedInAir = false;
    for (const input of routeInputs([{ wait: 6, command: kick }, { wait, command: air }], 60)) {
      sim.stepFrame([input, N]);
      const self = sim.snapshot().characters[0], move = shoto.moves.find(entry => entry.id === self.attack?.moveId);
      attackedInAir ||= Boolean(move?.airborne && move.id !== 'flying-kick-followup');
    }
    expect(attackedInAir, `${kick} + no ar ${air} após ${wait}`).toBe(false);
  }
});

it('a continuação autorada da voadora fraca segue disponível no ar', () => {
  const sim = create();
  let followUp = false;
  for (const input of routeInputs([{ wait: 6, command: 'b,db,d,df,f,3' }, { wait: 14, command: '3' }], 60)) {
    sim.stepFrame([input, N]);
    followUp ||= sim.snapshot().characters[0].attack?.moveId === 'flying-kick-followup';
  }
  expect(followUp).toBe(true);
});

it.each(['4', 'd+4'])('a voadora não devolve o chute forte: depois de %s conectado, nenhum outro chute forte no combo', first => {
  for (const kick of ['b,db,d,df,f,3', 'b,db,d,df,f,4']) for (const second of ['4', 'd+4']) for (let wait = 6; wait <= 60; wait += 2) {
    const sim = create();
    const steps = routeInputs([{ wait: 1, command: first }, { wait: 24, command: kick }, { wait, command: second }], 90);
    for (const input of steps) sim.stepFrame([input, N]);
    const heavyHits = sim.snapshot().recentContacts.filter(entry => entry.event.attackerId === 'player-1' && ['heavy-kick', 'crouch-heavy-kick'].includes(entry.event.moveId));
    const combos = sim.snapshot().comboHistory.filter(combo => combo.attackerId === 'player-1');
    expect(heavyHits.length <= 1 || combos.length > 1, `${first}, voadora, ${second} após ${wait}`).toBe(true);
  }
});

it('o antiaéreo do Bob (d+2) conecta uma vez só por combo, mesmo com voadora no meio', () => {
  for (const middle of [[], ['b,db,d,df,f,3'], ['b,db,d,df,f,4']]) for (let wait = 6; wait <= 60; wait += 2) {
    const steps = [{ wait: 1, command: 'd+2' }, ...middle.map(command => ({ wait: 30, command })), { wait, command: 'd+2' }];
    const sim = create();
    for (const input of routeInputs(steps, 90)) sim.stepFrame([input, N]);
    const antiAirs = sim.snapshot().recentContacts.filter(entry => entry.event.attackerId === 'player-1' && entry.event.moveId === 'crouch-uppercut');
    const combos = sim.snapshot().comboHistory.filter(combo => combo.attackerId === 'player-1');
    expect(antiAirs.length <= 1 || combos.length > 1, `d+2,${middle.join(',')},d+2 após ${wait}`).toBe(true);
  }
});
