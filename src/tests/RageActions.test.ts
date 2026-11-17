import { describe, expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';
import type { CharacterDefinition } from '../engine/data/characters';
import type { FrameInput, AttackButton } from '../input/types';
import { AIR_RECOVERY_FREEZE_FRAMES, BREAKER_FREEZE_FRAMES } from '../engine/combat/rage';

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
const combo = (sim: Simulation) => { hit(sim, '1'); hit(sim, '1'); };

describe('rage actions', () => {
  it.each([0, 1])('interrompe o combo com um novo E para o jogador %i', defender => {
    const sim = setup();
    if (defender === 1) combo(sim);
    else for (let n = 0; n < 2; n++) { step(sim, input(), input(['1'])); for (let i = 0; i < 30 && !sim.snapshot().hitEvents.some(event => event.outcome === 'hit'); i++) step(sim); }
    step(sim, ...(defender === 0 ? [input([], true), input()] : [input(), input([], true)]) as [FrameInput, FrameInput]);
    const state = sim.snapshot();
    expect(state.characters[defender].rage).toBe(750);
    expect(state.breakerNotices).toMatchObject([{ characterId: state.characters[defender].characterId, outcome: 'broken' }]);
    expect(state.comboHistory[state.comboHistory.length - 1]?.active).toBe(false);
    expect(state.characters[1 - defender].attack).toBeUndefined();
  });
  it('ignora E mantido antes do primeiro acerto e exige soltar e apertar durante o combo', () => {
    const sim = setup();
    step(sim, input(), input([], true));
    step(sim, input(['1']), input([], true));
    for (let i = 0; i < 40 && !sim.snapshot().hitEvents.length; i++) step(sim, input(), input([], true));
    step(sim, input(['1']), input([], true));
    for (let i = 0; i < 40 && !sim.snapshot().hitEvents.some(event => event.outcome === 'hit' && sim.snapshot().comboHistory.at(-1)?.hits === 2); i++) step(sim, input(), input([], true));
    step(sim, input(), input([], true));
    expect(sim.snapshot().characters[1].rage).toBe(900);
    expect(sim.snapshot().breakerNotices).toHaveLength(0);
    step(sim); step(sim, input(), input([], true));
    expect(sim.snapshot().characters[1].rage).toBe(750);
    expect(sim.snapshot().breakerNotices[0]?.outcome).toBe('broken');
  });
  it('avisa o efeito do combo breaker certo e o da falha, sem alterar o combate', () => {
    const right = setup(); combo(right);
    step(right, input(), input([], true));
    expect(right.snapshot().effectNotices).toMatchObject([{ kind: 'breaker', characterId: right.snapshot().characters[1].characterId }]);
    const failed = setup(); combo(failed);
    (failed as unknown as { characters: { rage: number }[] }).characters[1].rage = 149;
    step(failed, input(), input([], true));
    expect(failed.snapshot().effectNotices).toMatchObject([{ kind: 'breaker-fail', characterId: failed.snapshot().characters[1].characterId }]);
    expect(failed.snapshot().characters[1].rage).toBe(149);
    step(failed, input(), input([], true));
    expect(failed.snapshot().effectNotices).toHaveLength(1);
  });
  it('não avisa falha de breaker fora de um combo', () => {
    const sim = setup();
    (sim as unknown as { characters: { rage: number }[] }).characters[1].rage = 0;
    step(sim, input(), input([], true));
    expect(sim.snapshot().effectNotices).toHaveLength(0);
  });
  it('não interrompe o combo sem 150 de rage', () => {
    const sim = setup(); combo(sim);
    const target = (sim as unknown as { characters: { rage: number }[] }).characters[1]; target.rage = 149;
    step(sim, input(), input([], true));
    expect(sim.snapshot().characters[1].rage).toBe(149);
    expect(sim.snapshot().comboHistory[sim.snapshot().comboHistory.length - 1]?.active).toBe(true);
  });
  it.each(['hitstun', 'knockdown'] as const)('recovers an airborne character from %s for 150 rage', mode => {
    const sim = setup();
    const state = (sim as unknown as { characters: ReturnType<Simulation['snapshot']>['characters'] }).characters[1];
    state.mode = mode; state.grounded = false; state.y -= 80; state.remainingStateFrames = 30;
    state.verticalVelocity = -3; state.juggle = { gravityScale: 1, airHits: 1 };
    step(sim, input(), input([], true));
    expect(sim.snapshot().characters[1]).toMatchObject({ rage: 750, mode: 'airborne', remainingStateFrames: 0 });
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
    state.grounded = false; state.y -= 80; state.rage = 149;
    step(sim); step(sim, input(), input([], true));
    expect(sim.snapshot().characters[1].rage).toBe(149);
    expect(sim.snapshot().characters[1].mode).toBe('hitstun');
  });

  it('caps accumulated rage at two levels', () => {
    const fastFighter = { ...fighter, rage: { ...fighter.rage!, onHit: 300 } };
    const sim = new Simulation(createGameConfig(1024, 576), [fastFighter, fastFighter], { training: true, initialDistance: 56 });
    for (let count = 0; count < 3; count++) { hit(sim, '1'); for (let i = 0; i < 90; i++) step(sim); }
    expect(sim.snapshot().characters[0]).toMatchObject({ rage: 900, maxRage: 900 });
  });

  it('congela a luta e afasta o atacante após o breaker', () => {
    const sim = setup(); combo(sim);
    const before = sim.snapshot().characters[0].x;
    step(sim, input(), input([], true));
    const frozen = sim.snapshot();
    expect(frozen.breakerNotices[0]?.outcome).toBe('broken');
    for (let i = 0; i < BREAKER_FREEZE_FRAMES - 1; i++) step(sim);
    expect(sim.snapshot().frame).toBe(frozen.frame);
    for (let i = 0; i < 20; i++) step(sim);
    expect(before - sim.snapshot().characters[0].x).toBeGreaterThanOrEqual(80);
  });

  it('não permite breaker no primeiro golpe do combo', () => {
    const sim = setup(); hit(sim, '1');
    step(sim, input(), input([], true));
    expect(sim.snapshot().breakerNotices).toHaveLength(0);
    expect(sim.snapshot().characters[1].rage).toBe(900);
  });
  it('descarta os comandos apertados durante a pausa do breaker', () => {
    const sim = setup(); combo(sim);
    step(sim, input(), input([], true));
    for (let i = 0; i < BREAKER_FREEZE_FRAMES + 2; i++) step(sim, input(['1']));
    expect(sim.snapshot().characters[0].attack).toBeUndefined();
  });
});

import { rageDrawing } from '../rendering/animations/rageAnimation';
describe('animação do combo breaker', () => {
  it('mostra o quadro alto durante a pausa e termina o gesto depois dela', () => {
    const sim = setup(); combo(sim);
    step(sim, input(), input([], true));
    const paused = sim.snapshot();
    expect(rageDrawing(paused.characters[1], paused.frame)).toMatchObject({ name: 'combo-breaker', drawing: 3 });
    for (let i = 0; i < BREAKER_FREEZE_FRAMES + 12; i++) step(sim);
    const after = sim.snapshot();
    expect(rageDrawing(after.characters[1], after.frame)?.drawing).toBeGreaterThan(3);
  });
});
