import { describe, expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';
import type { FrameInput, AttackButton } from '../input/types';

const input = (buttons: AttackButton[] = [], rageAction = false): FrameInput => ({ direction: 'N', buttons: new Set(buttons), rageAction });
const light = shoto.moves.find(move => move.id === 'light-punch')!;
const heavy = shoto.moves.find(move => move.id === 'heavy-punch')!;
const lightKick = shoto.moves.find(move => move.id === 'light-kick')!;
const fighter = { ...shoto, moves: [light, heavy, lightKick].map(move => ({ ...move, startup: 1, activeFrames: 2, recovery: 2, hitstun: 80, hitbox: { forward: 0, yOffset: -140, width: 120, height: 140 } })) };
const setup = (definition = fighter) => { const sim = new Simulation(createGameConfig(1024, 576), [definition, definition], { training: true, initialDistance: 56 }); sim.fillTrainingRage(); return sim; };
const step = (sim: Simulation, p1 = input(), p2 = input()) => sim.stepFrame([p1, p2]);
const hit = (sim: Simulation, button: AttackButton) => {
  step(sim, input([button]));
  for (let i = 0; i < 40; i++) {
    step(sim);
    if (sim.snapshot().hitEvents.some(event => event.outcome === 'hit')) return;
  }
  throw new Error('Expected attack to hit');
};

describe('rage actions', () => {
  it.each(['1', '3'] as const)('breaks a light attack when guessed with %s', guess => {
    const sim = setup(); hit(sim, '1'); step(sim, input(), input([guess], true));
    expect(sim.snapshot().characters[1].rage).toBe(550);
    step(sim); step(sim); step(sim, input(['1']));
    for (let i = 0; i < 15; i++) step(sim);
    const snapshot = sim.snapshot();
    expect(snapshot.characters[1].health).toBe(980);
    expect(snapshot.characters.every(character => character.mode === 'neutral')).toBe(true);
    expect(snapshot.comboHistory[snapshot.comboHistory.length - 1]?.active).toBe(false);
  });
  it.each(['2', '4'] as const)('breaks a heavy attack when guessed with %s', guess => {
    const sim = setup(); hit(sim, '1'); step(sim, input(), input([guess], true));
    step(sim); step(sim); step(sim, input(['2']));
    for (let i = 0; i < 15; i++) step(sim);
    expect(sim.snapshot().characters[1].health).toBe(980);
    expect(sim.snapshot().comboHistory.slice(-1)[0]?.active).toBe(false);
  });
  it('breaks a light kick with a light punch prediction', () => {
    const sim = setup({ ...fighter, combos: [] });
    hit(sim, '1');
    step(sim, input(), input(['1'], true));
    expect(sim.snapshot().characters[1]).toMatchObject({ rage: 550, mode: 'hitstun' });
    step(sim); step(sim); step(sim, input(['3']));
    for (let i = 0; i < 6 && sim.snapshot().comboHistory[0].active; i++) step(sim);
    expect(sim.snapshot().characters[1].health).toBe(980);
    expect(sim.snapshot().characters.map(character => character.mode)).toEqual(['neutral', 'neutral']);
    expect(sim.snapshot().comboHistory[0].active).toBe(false);
    expect(sim.snapshot().characters[0].attack).toBeUndefined();
  });
  it('penalizes heavy attacks after a light prediction', () => {
    const sim = setup({ ...fighter, combos: [{ id: 'fixture', name: 'fixture', notation: '1,2,2', moveIds: ['light-punch', 'heavy-punch', 'heavy-punch'], startupFrames: [1, 1, 1] }] }); hit(sim, '1'); step(sim, input(), input(['1'], true));
    step(sim); step(sim); hit(sim, '2');
    expect(sim.snapshot().hitEvents[0].damage).toBe(Math.round(heavy.damage * 1.2));
    step(sim); step(sim); hit(sim, '2');
    expect(sim.snapshot().hitEvents[0].damage).toBe(Math.round(heavy.damage * 1.2));
  });
  it('increases damage on a wrong guess and subsequent hits in that combo', () => {
    const sim = setup(); hit(sim, '1'); step(sim, input(), input(['2'], true));
    step(sim); step(sim); hit(sim, '1');
    expect(sim.snapshot().hitEvents[0].damage).toBe(24);
    step(sim); step(sim); hit(sim, '1');
    expect(sim.snapshot().hitEvents[0].damage).toBe(24);
    expect(sim.snapshot().characters[1].health).toBe(932);
  });
  it.each(['hitstun', 'knockdown'] as const)('recovers an airborne character from %s for 50 rage', mode => {
    const sim = setup();
    const state = (sim as unknown as { characters: ReturnType<Simulation['snapshot']>['characters'] }).characters[1];
    state.mode = mode; state.grounded = false; state.y -= 80; state.remainingStateFrames = 30;
    state.verticalVelocity = -3; state.juggle = { gravityScale: 1, airHits: 1 };
    step(sim, input(), input([], true));
    expect(sim.snapshot().characters[1]).toMatchObject({ rage: 550, mode: 'airborne', remainingStateFrames: 0 });
    expect(sim.snapshot().characters[1].juggle).toBeUndefined();
    step(sim, input(['1']), { ...input(), direction: 'B' });
    expect(sim.snapshot().characters[1].mode).toBe('blocking');
  });
  it('does not consume rage for recovery while grounded or without enough rage', () => {
    const sim = setup(); const state = (sim as unknown as { characters: ReturnType<Simulation['snapshot']>['characters'] }).characters[1];
    state.mode = 'hitstun'; state.remainingStateFrames = 30;
    step(sim, input(), input([], true));
    expect(sim.snapshot().characters[1].rage).toBe(600);
    state.grounded = false; state.y -= 80; state.rage = 49;
    step(sim); step(sim, input(), input([], true));
    expect(sim.snapshot().characters[1].rage).toBe(49);
    expect(sim.snapshot().characters[1].mode).toBe('hitstun');
  });

  it('lets player one break an attack from player two', () => {
    const sim = setup();
    step(sim, input(), input(['1']));
    for (let i = 0; i < 30 && !sim.snapshot().hitEvents.length; i++) step(sim);
    expect(sim.snapshot().characters[0].health).toBe(980);
    step(sim, input(['3'], true));
    expect(sim.snapshot().characters[0].rage).toBe(550);
    step(sim); step(sim); step(sim, input(), input(['1']));
    for (let i = 0; i < 15; i++) step(sim);
    expect(sim.snapshot().characters[0].health).toBe(980);
    expect(sim.snapshot().comboHistory.slice(-1)[0].active).toBe(false);
  });
  it('does not carry a failed breaker penalty into a later combo', () => {
    const sim = setup(); hit(sim, '1'); step(sim, input(), input(['2'], true));
    step(sim); step(sim); hit(sim, '1');
    expect(sim.snapshot().hitEvents[0].damage).toBe(24);
    for (let i = 0; i < 100; i++) step(sim);
    hit(sim, '1');
    expect(sim.snapshot().hitEvents[0].damage).toBe(20);
  });

  it('caps accumulated rage at two levels', () => {
    const fastFighter = { ...fighter, rage: { ...fighter.rage!, onHit: 300 } };
    const sim = new Simulation(createGameConfig(1024, 576), [fastFighter, fastFighter], { training: true, initialDistance: 56 });
    for (let count = 0; count < 3; count++) { hit(sim, '1'); for (let i = 0; i < 90; i++) step(sim); }
    expect(sim.snapshot().characters[0]).toMatchObject({ rage: 600, maxRage: 600 });
  });

});
