import { describe, expect, it } from 'vitest';
import { cowboy } from '../engine/data/fighters/cowboy';
import { shoto } from '../engine/data/fighters/shoto';
import { createGameConfig } from '../engine/data/gameConfig';
import { Simulation } from '../engine/simulation/Simulation';
import type { AttackButton, Direction, FrameInput } from '../input/types';

const input = (direction: Direction = 'N', button?: AttackButton): FrameInput => ({ direction, buttons: new Set(button ? [button] : []) });

describe('Cowboy protótipo', () => {
  it('tem quatro básicos por postura aérea e no chão e apenas as receitas autoradas', () => {
    expect(cowboy.moves.filter(move => move.category === 'basic' && !move.airborne)).toHaveLength(4);
    expect(cowboy.moves.filter(move => move.category === 'basic' && move.airborne)).toHaveLength(4);
    expect(cowboy.combos?.map(combo => combo.notation)).toEqual(['3,3,3', '1,2,2,2']);
  });
  it.each([0, 1])('executa os disparos e o afastamento do lado %i', player => {
    for (const [button, id, distance] of [['1', 'quick-shot', 65], ['2', 'heavy-shot', 65], ['4', 'push-away', 56]] as const) {
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

it.each([0, 1])('tiros especiais têm dano alto e alcance curto: jogador %i', player => {
  for (const [button, id, damage] of [['1', 'quick-shot', 120], ['2', 'heavy-shot', 140]] as const) {
    for (const [distance, defense, expected] of [[65, 'N', 'hit'], [65, 'B', 'block'], [300, 'N', 'miss'], [65, 'D', 'miss']] as const) {
      const definitions = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
      const sim = new Simulation(createGameConfig(1024, 576), definitions, { training: true, initialDistance: distance });
      const step = (value: FrameInput) => sim.stepFrame(player === 0 ? [value, input(defense)] : [input(defense), value]);
      for (const direction of ['D', 'DF', 'F'] as const) step(input(direction));
      step(input('F', button));
      let outcome = 'miss';
      for (let tick = 0; tick < 70; tick++) {
        step(input());
        const event = sim.snapshot().hitEvents.find(hit => hit.moveId === id);
        if (event) { outcome = event.outcome; expect(event.damage).toBe(expected === 'hit' ? damage : 0); break; }
      }
      expect(outcome).toBe(expected);
    }
  }
});

it.each([0, 1])('tiro especial forte alcança adversário no ar próximo: jogador %i', player => {
  const definitions = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(createGameConfig(1024, 576), definitions, { training: true, initialDistance: 85 });
  const step = (value: FrameInput, target: FrameInput) => sim.stepFrame(player === 0 ? [value, target] : [target, value]);
  for (const direction of ['D', 'DF', 'F'] as const) step(input(direction), input());
  step(input('F', '2'), input('U'));
  let hit = false;
  for (let tick = 0; tick < 45; tick++) {
    step(input(), input());
    if (sim.snapshot().hitEvents.some(event => event.moveId === 'heavy-shot' && event.outcome === 'hit')) { hit = true; break; }
  }
  expect(hit).toBe(true);
});

it.each([0, 1])('executa 3,3,3 com entradas e acertos separados: jogador %i', player => {
  const defs = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(createGameConfig(1024, 576), defs, { training: true, initialDistance: 65 });
  const step = (value: FrameInput) => sim.stepFrame(player === 0 ? [value, input()] : [input(), value]);
  for (let strike = 0; strike < 3; strike++) {
    step(input('N', '3'));
    let hit = false;
    for (let tick = 0; tick < 50; tick++) {
      step(input());
      if (sim.snapshot().hitEvents.some(event => event.moveId === 'light-kick' && event.outcome === 'hit')) { hit = true; break; }
    }
    expect(hit).toBe(true);
    while (sim.snapshot().hitstopFramesRemaining) step(input());
  }
  expect(sim.snapshot().characters[1 - player].health).toBe(928);
});

it.each([0, 1])('encadeia 1,2,2,2 com dois tiros atrasados após acertos: jogador %i', player => {
  const defs = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(createGameConfig(1024, 576), defs, { training: true, initialDistance: 100 });
  const step = (value: FrameInput) => sim.stepFrame(player === 0 ? [value, input('B')] : [input('B'), value]);
  // Defender só começa a defender após o primeiro impacto.
  const first = (value: FrameInput) => sim.stepFrame(player === 0 ? [value, input()] : [input(), value]);
  first(input('N', '1'));
  while (!sim.snapshot().hitEvents.length) first(input());
  while (sim.snapshot().hitstopFramesRemaining) first(input());
  for (const startup of [10, 32, 32]) {
    step(input('N', '2'));
    expect(sim.snapshot().characters[player].attack?.startupFrames).toBe(startup);
    let hit = false;
    for (let tick = 0; tick < 100; tick++) {
      step(input());
      if (sim.snapshot().hitEvents.some(event => event.moveId === 'heavy-punch' && event.outcome === 'hit')) { hit = true; break; }
    }
    expect(hit).toBe(true);
    while (sim.snapshot().hitstopFramesRemaining) step(input());
  }
  expect(sim.snapshot().characters[1 - player].health).toBe(866);
});

it.each([0, 1])('permite punir entre os tiros quando os primeiros foram bloqueados: jogador %i', player => {
  const defs = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(createGameConfig(1024, 576), defs, { training: true, initialDistance: 65 });
  const step = (value: FrameInput, guard: FrameInput = input('B')) => sim.stepFrame(player === 0 ? [value, guard] : [guard, value]);
  for (const button of ['1', '2'] as const) {
    step(input('N', button));
    let blocked = false;
    for (let tick = 0; tick < 80; tick++) {
      step(input());
      if (sim.snapshot().hitEvents.some(event => event.outcome === 'block')) { blocked = true; break; }
    }
    expect(blocked).toBe(true);
    while (sim.snapshot().hitstopFramesRemaining) step(input());
  }
  step(input('N', '2'));
  expect(sim.snapshot().characters[player].attack?.startupFrames).toBe(32);
  let punished = false;
  for (let tick = 0; tick < 30; tick++) {
    const target = sim.snapshot().characters[1 - player];
    step(input(), target.mode === 'blockstun' ? input('B') : input('N', '1'));
    if (sim.snapshot().hitEvents.some(event => event.attackerId === `player-${2 - player}` && event.outcome === 'hit')) { punished = true; break; }
  }
  expect(punished).toBe(true);
});

it.each([0, 1])('tiro atrasado acerta quem solta a guarda depois dos dois primeiros: jogador %i', player => {
  const defs = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(createGameConfig(1024, 576), defs, { training: true, initialDistance: 65 });
  const step = (value: FrameInput, guard: FrameInput = input('B')) => sim.stepFrame(player === 0 ? [value, guard] : [guard, value]);
  for (const button of ['1', '2'] as const) {
    step(input('N', button));
    for (let tick = 0; tick < 80; tick++) { step(input()); if (sim.snapshot().hitEvents.some(event => event.outcome === 'block')) break; }
    expect(sim.snapshot().hitEvents[0]?.outcome).toBe('block');
    while (sim.snapshot().hitstopFramesRemaining) step(input());
  }
  step(input('N', '2'));
  let hit = false;
  for (let tick = 0; tick < 60; tick++) {
    step(input(), input());
    if (sim.snapshot().hitEvents.some(event => event.moveId === 'heavy-punch' && event.outcome === 'hit')) { hit = true; break; }
  }
  expect(hit).toBe(true);
});

it.each([0, 1])('mantém confirmação dos projéteis em voo na sequência de longa distância: jogador %i', player => {
  const defs = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(createGameConfig(1024, 576), defs, { training: true, initialDistance: 300 });
  const step = (value: FrameInput) => sim.stepFrame(player === 0 ? [value, input()] : [input(), value]);
  step(input('N', '1'));
  for (let tick = 0; tick < 12; tick++) step(input());
  step(input('N', '2'));
  for (let tick = 0; tick < 80 && !((sim.snapshot().characters[player].projectileComboHits ?? 0) & 2); tick++) step(input());
  expect((sim.snapshot().characters[player].projectileComboHits ?? 0) & 3).toBe(3);
  while (sim.snapshot().hitstopFramesRemaining) step(input());
  for (let shot = 0; shot < 2; shot++) {
    step(input('N', '2'));
    expect(sim.snapshot().characters[player].attack?.startupFrames).toBe(32);
    let hit = false;
    for (let tick = 0; tick < 100; tick++) {
      step(input());
      if (sim.snapshot().hitEvents.some(event => event.moveId === 'heavy-punch' && event.outcome === 'hit')) { hit = true; break; }
    }
    expect(hit).toBe(true);
    while (sim.snapshot().hitstopFramesRemaining) step(input());
  }
});
