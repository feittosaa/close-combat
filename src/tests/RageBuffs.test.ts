import { describe, expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';
import type { CharacterDefinition } from '../engine/data/characters';
import type { FrameInput } from '../input/types';
import { RUSH_FREEZE_FRAMES } from '../engine/combat/rage';

const input = (extra: Partial<FrameInput> = {}): FrameInput => ({ direction: 'N', buttons: new Set(), ...extra });
const punch = shoto.moves.find(move => move.id === 'light-punch')!;
const fixture = (category: 'basic' | 'special' | 'ultimate'): CharacterDefinition => ({
  ...shoto, combos: [],
  moves: [{ ...punch, category, startup: 10, activeFrames: 2, recovery: 4, damage: 100, hitbox: { forward: 0, yOffset: -140, width: 120, height: 140 } }],
});
const create = (definition: CharacterDefinition, rage = 600) => {
  const sim = new Simulation(createGameConfig(1024, 576), [definition, definition], { training: true, initialDistance: 56 });
  sim.fillTrainingRage();
  (sim as unknown as { characters: { rage: number }[] }).characters[0].rage = rage;
  return sim;
};
const step = (sim: Simulation, p1 = input()) => sim.stepFrame([p1, input()]);
const strike = (sim: Simulation, duringAttack?: Partial<FrameInput>) => {
  step(sim, input({ buttons: new Set(['1']) }));
  for (let i = 0; i < 4 && !sim.snapshot().characters[0].attack; i++) step(sim);
  if (duringAttack) step(sim, input(duringAttack));
  for (let i = 0; i < 40; i++) {
    step(sim);
    const hit = sim.snapshot().hitEvents.find(event => event.outcome === 'hit');
    if (hit) return hit.damage;
  }
  throw new Error('Expected attack to hit');
};

describe('buffs de rage', () => {
  it('ativa o Rush com E + provocação, gasta uma barra e aumenta o dano em 10%', () => {
    const sim = create(fixture('basic'));
    step(sim, input({ rageAction: true, taunt: true }));
    expect(sim.snapshot().characters[0]).toMatchObject({ rush: true, rage: 300 });
    expect(strike(sim)).toBe(110);
  });
  it.each([['sem provocação', { rageAction: true }, 600], ['sem barra cheia', { rageAction: true, taunt: true }, 299]] as const)('não ativa o Rush %s', (_name, action, rage) => {
    const sim = create(fixture('basic'), rage);
    step(sim, input(action));
    expect(sim.snapshot().characters[0].rush).toBeUndefined();
    expect(sim.snapshot().characters[0].rage).toBeGreaterThanOrEqual(rage - 50);
  });
  it('não reativa o Rush já ativo', () => {
    const sim = create(fixture('basic'));
    step(sim, input({ rageAction: true, taunt: true })); step(sim);
    step(sim, input({ rageAction: true, taunt: true }));
    expect(sim.snapshot().characters[0].rage).toBe(300);
  });
  it('reforça o especial com E durante o golpe', () => {
    const sim = create(fixture('special'));
    expect(strike(sim, { rageAction: true })).toBe(110);
    expect(sim.snapshot().characters[0].rage).toBe(310);
  });
  it('soma Rush e reforço de especial', () => {
    const sim = create(fixture('special'));
    step(sim, input({ rageAction: true, taunt: true }));
    for (let i = 0; i < RUSH_FREEZE_FRAMES; i++) step(sim);
    expect(strike(sim, { rageAction: true })).toBe(121);
    expect(sim.snapshot().characters[0].rage).toBe(10);
  });
  it('não reforça golpe básico', () => {
    const sim = create(fixture('basic'));
    expect(strike(sim, { rageAction: true })).toBe(100);
    expect(sim.snapshot().characters[0].rage).toBe(600);
  });
  it('mantém o reforço no projétil já lançado', () => {
    const tomato = shoto.moves.find(move => move.id === 'tomato-light')!;
    const definition: CharacterDefinition = { ...shoto, combos: [], moves: [{ ...tomato, startup: 3, damage: 100, input: { buttons: ['1'] }, hitbox: { forward: 0, yOffset: -140, width: 60, height: 140 } }] };
    const sim = create(definition);
    expect(strike(sim, { rageAction: true })).toBe(110);
  });
  describe('animação do Rush', () => {
    const rush = () => { const sim = create(fixture('basic')); step(sim, input({ rageAction: true, taunt: true })); return sim; };
    it('não executa a provocação e libera o lutador após a pausa', () => {
      const sim = rush();
      expect(sim.snapshot().characters[0].tauntStartedFrame).toBeUndefined();
      for (let i = 0; i < RUSH_FREEZE_FRAMES; i++) step(sim);
      expect(sim.snapshot().characters[0].mode).toBe('neutral');
      step(sim, input({ buttons: new Set(['1']) }));
      expect(sim.snapshot().characters[0].attack?.moveId).toBe('light-punch');
    });
    it('pausa os quadros dos dois lutadores por um instante', () => {
      const sim = rush(), frame = sim.snapshot().frame;
      for (let i = 0; i < RUSH_FREEZE_FRAMES - 1; i++) step(sim);
      expect(sim.snapshot().frame).toBe(frame);
      step(sim); expect(sim.snapshot().frame).toBe(frame + 1);
    });
    it('cancela a provocação já iniciada e aceita E depois de T', () => {
      const sim = create(fixture('basic'));
      step(sim, input({ taunt: true }));
      expect(sim.snapshot().characters[0].tauntStartedFrame).toBeDefined();
      step(sim, input({ taunt: true, rageAction: true }));
      expect(sim.snapshot().characters[0]).toMatchObject({ rush: true, tauntStartedFrame: undefined });
    });
    it('mantém a provocação sozinha', () => {
      const sim = create(fixture('basic'));
      step(sim, input({ taunt: true }));
      expect(sim.snapshot().characters[0].tauntStartedFrame).toBeDefined();
    });
  });
});
