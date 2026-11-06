import { describe, expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';
import type { CharacterDefinition } from '../engine/data/characters';
import type { FrameInput, AttackButton } from '../input/types';
import { AIR_RECOVERY_FREEZE_FRAMES, BREAKER_FREEZE_FRAMES, BREAKER_INVULNERABLE_FRAMES, BREAKER_MISS_FREEZE_FRAMES } from '../engine/combat/rage';

const input = (buttons: AttackButton[] = [], rageAction = false): FrameInput => ({ direction: 'N', buttons: new Set(buttons), rageAction });
const light = shoto.moves.find(move => move.id === 'light-punch')!;
const heavy = shoto.moves.find(move => move.id === 'heavy-punch')!;
const lightKick = shoto.moves.find(move => move.id === 'light-kick')!;
const fighter: CharacterDefinition = { ...shoto, combos: shoto.combos!.map(({ startupFrames, ...recipe }) => recipe), moves: [light, heavy, lightKick].map(move => ({ ...move, startup: 1, activeFrames: 2, recovery: 2, hitstun: 80, hitbox: { forward: 0, yOffset: -140, width: 120, height: 140 } })) };
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
    expect(sim.snapshot().characters[1].rage).toBe(800);
    step(sim); step(sim); step(sim, input(['1']));
    for (let i = 0; i < 15; i++) step(sim);
    const snapshot = sim.snapshot();
    expect(snapshot.characters[1].health).toBe(980);
    expect(snapshot.characters.every(character => character.mode === 'neutral')).toBe(true);
    expect(snapshot.comboHistory[snapshot.comboHistory.length - 1]?.active).toBe(false);
  });
  it('does not teleport a fighter to the floor when a break happens in the air', () => {
    const sim = setup(); hit(sim, '1');
    const target = (sim as unknown as { characters: ReturnType<Simulation['snapshot']>['characters'] }).characters[1];
    target.grounded = false; target.y -= 300; target.verticalVelocity = 0;
    const airY = target.y;
    step(sim, input(), input(['1'], true));
    step(sim); step(sim); step(sim, input(['1']));
    for (let i = 0; i < 15; i++) step(sim);
    const after = sim.snapshot().characters[1];
    expect(sim.snapshot().comboHistory.slice(-1)[0]?.active).toBe(false);
    expect(after.grounded).toBe(false);
    expect(after.y).toBeGreaterThanOrEqual(airY);
    expect(after.y).toBeLessThan(createGameConfig(1024, 576).arena.floorY - 100);
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
    expect(sim.snapshot().characters[1]).toMatchObject({ rage: 800, mode: 'hitstun' });
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
    expect(sim.snapshot().characters[1]).toMatchObject({ rage: 800, mode: 'airborne', remainingStateFrames: 0 });
    expect(sim.snapshot().characters[1].juggle).toBeUndefined();
    // A short freeze lets both fighters reset before play resumes.
    const frozenAt = sim.snapshot().frame;
    for (let i = 0; i < AIR_RECOVERY_FREEZE_FRAMES - 1; i++) step(sim);
    expect(sim.snapshot().frame).toBe(frozenAt);
    step(sim, input(['1']), { ...input(), direction: 'B' });
    step(sim, input(['1']), { ...input(), direction: 'B' });
    expect(['blocking', 'blockstun']).toContain(sim.snapshot().characters[1].mode);
  });
  it('does not consume rage for recovery while grounded or without enough rage', () => {
    const sim = setup(); const state = (sim as unknown as { characters: ReturnType<Simulation['snapshot']>['characters'] }).characters[1];
    state.mode = 'hitstun'; state.remainingStateFrames = 30;
    step(sim, input(), input([], true));
    expect(sim.snapshot().characters[1].rage).toBe(900);
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
    expect(sim.snapshot().characters[0].rage).toBe(800);
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
    expect(sim.snapshot().characters[0]).toMatchObject({ rage: 900, maxRage: 900 });
  });

  it('freezes after a successful break, shoves the attacker away standing and reports it', () => {
    const sim = setup(); hit(sim, '1'); step(sim, input(), input(['1'], true));
    step(sim); step(sim);
    const before = sim.snapshot();
    step(sim, input(['1']));
    for (let i = 0; i < 5 && !sim.snapshot().breakerNotices.length; i++) step(sim);
    const frozen = sim.snapshot();
    expect(frozen.breakerNotices).toMatchObject([{ characterId: 'player-2', outcome: 'broken' }]);
    expect(frozen.characters.every(character => character.mode === 'neutral' && !character.attack)).toBe(true);
    for (let i = 0; i < BREAKER_FREEZE_FRAMES - 1; i++) step(sim);
    expect(sim.snapshot().frame).toBe(frozen.frame);
    for (let i = 0; i < 20; i++) step(sim);
    const after = sim.snapshot();
    expect(before.characters[0].x - after.characters[0].x).toBeGreaterThanOrEqual(80);
    expect(after.characters[0]).toMatchObject({ mode: 'neutral', grounded: true });
  });
  it('freezes more briefly after a wrong guess and reports the miss', () => {
    const sim = setup(); hit(sim, '1'); step(sim, input(), input(['2'], true));
    step(sim); step(sim); step(sim, input(['1']));
    for (let i = 0; i < 5 && !sim.snapshot().breakerNotices.length; i++) step(sim);
    const missed = sim.snapshot();
    expect(missed.breakerNotices).toMatchObject([{ characterId: 'player-2', outcome: 'missed' }]);
    expect(BREAKER_MISS_FREEZE_FRAMES).toBeLessThan(BREAKER_FREEZE_FRAMES);
    for (let i = 0; i < BREAKER_MISS_FREEZE_FRAMES - 1; i++) step(sim);
    expect(sim.snapshot().frame).toBe(missed.frame);
  });
  it('makes whoever broke the combo invulnerable until both fighters have repositioned', () => {
    const sim = setup(); hit(sim, '1'); step(sim, input(), input(['1'], true));
    step(sim); step(sim); step(sim, input(['1']));
    for (let i = 0; i < 5 && !sim.snapshot().breakerNotices.length; i++) step(sim);
    expect(sim.snapshot().breakerNotices[0]?.outcome).toBe('broken');
    for (let i = 0; i < BREAKER_FREEZE_FRAMES; i++) step(sim);
    const hurt = sim.snapshot().characters[1].health;
    for (let i = 0; i < BREAKER_INVULNERABLE_FRAMES - 4; i++) {
      step(sim, input(['1']));
      expect(sim.snapshot().characters[1].health).toBe(hurt);
    }
  });
  it('costs 100 rage per breaker or air recovery', () => {
    const sim = setup(); hit(sim, '1'); step(sim, input(), input(['1'], true));
    expect(sim.snapshot().characters[1].rage).toBe(800);
  });
});
