import { describe, expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import type { AttackButton, FrameInput } from '../input/types';

const config = createGameConfig(1024, 576);
const input = (direction: FrameInput['direction'] = 'N', ...buttons: AttackButton[]): FrameInput => ({ direction, buttons: new Set(buttons) });
const neutral = input();

describe('blocked attack recovery', () => {
  it.each([[0, '1'], [1, '1'], [0, '2'], [1, '2']] as const)(
    'punishes player %i after blocked attack %s even while they hold back', (attacker, attackButton) => {
    const sim = new Simulation(config, undefined, { training: true, initialDistance: 64 });
    const defender = 1 - attacker;
    const advance = (attack: FrameInput, defense: FrameInput) => {
      const frames = [neutral, neutral]; frames[attacker] = attack; frames[defender] = defense; sim.stepFrame(frames);
    };
    advance(input('N', attackButton), input('B'));
    for (let i = 0; i < 30 && !sim.snapshot().hitEvents.length; i++) advance(neutral, input('B'));
    expect(sim.snapshot().hitEvents[0]).toMatchObject({ outcome: 'block', moveId: attackButton === '1' ? 'light-punch' : 'heavy-punch' });
    for (let i = 0; i < 30 && (sim.snapshot().hitstopFramesRemaining || sim.snapshot().characters[defender].mode === 'blockstun'); i++) advance(neutral, input('B'));
    advance(input('B'), input('D', '1'));
    expect(sim.snapshot().characters[attacker].mode).toBe('recovery');
    for (let i = 0; i < 12 && sim.snapshot().characters[attacker].health === 1000; i++) advance(input('B'), neutral);
    expect(sim.snapshot().hitEvents[0]).toMatchObject({ outcome: 'hit', targetId: sim.snapshot().characters[attacker].characterId });
    expect(sim.snapshot().characters[attacker].health).toBeLessThan(1000);
  });

  it('allows the attacker to block again after recovery finishes', () => {
    const sim = new Simulation(config, undefined, { training: true, initialDistance: 64 });
    sim.stepFrame([input('N', '1'), input('B')]);
    for (let i = 0; i < 30 && !sim.snapshot().hitEvents.length; i++) sim.stepFrame([input('B'), input('B')]);
    expect(sim.snapshot().hitEvents[0]?.outcome).toBe('block');
    for (let i = 0; i < 60 && (sim.snapshot().characters[0].attack || sim.snapshot().hitstopFramesRemaining); i++) sim.stepFrame([input('B'), neutral]);
    expect(sim.snapshot().characters[0].attack).toBeUndefined();
    sim.stepFrame([input('B'), input('D', '1')]);
    for (let i = 0; i < 20 && !sim.snapshot().hitEvents.length; i++) sim.stepFrame([input('B'), neutral]);
    expect(sim.snapshot().hitEvents[0]).toMatchObject({ outcome: 'block', moveId: 'crouch-punch' });
  });

  it.each([['1', 'light-punch'], ['2', 'heavy-punch'], ['3', 'light-kick'], ['4', 'heavy-kick']] as const)(
    'reports a punish window for blocked %s', (button, moveId) => {
      const sim = new Simulation(config, undefined, { training: true, initialDistance: 64 });
      sim.stepFrame([input('N', button), input('B')]);
      for (let i = 0; i < 40 && !sim.snapshot().hitEvents.length; i++) sim.stepFrame([neutral, input('B')]);
      const event = sim.snapshot().hitEvents[0];
      expect(event).toMatchObject({ outcome: 'block', moveId });
      expect(-event.frameAdvantage).toBeGreaterThanOrEqual(button === '2' || button === '4' ? 36 : 24);
    });

  it.each([0, 1])('allows a delayed manual punish against player %i holding either guard direction', attacker => {
    for (const attackButton of ['1', '2', '3', '4'] as const) {
      for (const guard of ['B', 'DB'] as const) {
        const sim = new Simulation(config, undefined, { training: true, initialDistance: 96 });
        const defender = 1 - attacker;
        const advance = (attack: FrameInput, defense: FrameInput) => {
          const inputs = [neutral, neutral]; inputs[attacker] = attack; inputs[defender] = defense;
          sim.stepFrame(inputs);
        };
        advance(input('N', attackButton), input('B'));
        for (let i = 0; i < 40 && !sim.snapshot().hitEvents.length; i++) advance(input(guard), input('B'));
        expect(sim.snapshot().hitEvents[0]?.outcome).toBe('block');
        for (let i = 0; i < 60 && (sim.snapshot().hitstopFramesRemaining || sim.snapshot().characters[defender].mode === 'blockstun'); i++) {
          advance(input(guard), input('B'));
        }
        // React after 12F, approach briefly, then use an ordinary standing jab.
        for (let i = 0; i < 12; i++) advance(input(guard), neutral);
        for (let i = 0; i < 3; i++) advance(input(guard), input('F'));
        advance(input(guard), input('N', '1'));
        for (let i = 0; i < 12 && sim.snapshot().characters[attacker].health === 1000; i++) advance(input(guard), neutral);
        expect(sim.snapshot().hitEvents[0]).toMatchObject({ outcome: 'hit', context: 'block-punish' });
        expect(sim.snapshot().characters[attacker].health).toBeLessThan(1000);
      }
    }
  });

  it.each([0, 1])('punishes a blocked heavy punch at the previously unreachable distance, player %i', attacker => {
    const sim = new Simulation(config, undefined, { training: true, initialDistance: 108 });
    const defender = 1 - attacker;
    const advance = (attack: FrameInput, defense: FrameInput) => {
      const inputs = [neutral, neutral]; inputs[attacker] = attack; inputs[defender] = defense;
      sim.stepFrame(inputs);
    };
    advance(input('N', '2'), input('B'));
    for (let i = 0; i < 40 && !sim.snapshot().hitEvents.length; i++) advance(input('B'), input('B'));
    expect(sim.snapshot().hitEvents[0]).toMatchObject({ outcome: 'block', moveId: 'heavy-punch' });
    for (let i = 0; i < 60 && (sim.snapshot().hitstopFramesRemaining || sim.snapshot().characters[defender].mode === 'blockstun'); i++) advance(input('B'), input('B'));
    const before = sim.snapshot();
    expect(Math.abs(before.characters[0].x - before.characters[1].x)).toBeCloseTo(114);
    advance(input('B'), input('N', '1'));
    for (let i = 0; i < 15 && !sim.snapshot().hitEvents.length; i++) advance(input('B'), neutral);
    expect(sim.snapshot().hitEvents[0]).toMatchObject({ outcome: 'hit', moveId: 'light-punch', context: 'block-punish' });
  });

  it('stays exposed through every recovery frame and returns to idle at the end', () => {
    const sim = new Simulation(config, undefined, { training: true, initialDistance: 64 });
    sim.stepFrame([input('N', '1'), input('B')]);
    for (let i = 0; i < 40 && !sim.snapshot().hitEvents.length; i++) sim.stepFrame([input('DB'), input('B')]);
    expect(sim.snapshot().hitEvents[0]?.outcome).toBe('block');
    for (let i = 0; i < 30 && sim.snapshot().hitstopFramesRemaining; i++) sim.stepFrame([input('DB'), neutral]);
    let recoveryFrames = 0;
    for (let i = 0; i < 100 && sim.snapshot().characters[0].attack; i++) {
      sim.stepFrame([input('DB'), neutral]);
      const state = sim.snapshot().characters[0];
      if (state.attack && state.mode === 'recovery') {
        expect(state.crouching).toBe(false);
        recoveryFrames++;
      }
    }
    expect(recoveryFrames).toBeGreaterThanOrEqual(24);
    expect(sim.snapshot().characters[0].attack).toBeUndefined();
    sim.stepFrame([neutral, neutral]);
    expect(sim.snapshot().characters[0]).toMatchObject({ mode: 'neutral', remainingStateFrames: 0 });
  });
  it('does not restart the owner’s recovery when a distant projectile is blocked', () => {
    const sim = new Simulation(config, undefined, { training: true, initialDistance: 400 });
    sim.stepFrame([input('D'), input('B')]);
    sim.stepFrame([input('DF'), input('B')]);
    sim.stepFrame([input('F', '1'), input('B')]);
    expect(sim.snapshot().characters[0].attack?.moveId).toBe('wine-glass');
    let recoveredBeforeBlock = false;
    for (let i = 0; i < 100 && !sim.snapshot().hitEvents.length; i++) {
      sim.stepFrame([input('F'), input('B')]);
      if (!sim.snapshot().characters[0].attack) recoveredBeforeBlock = true;
    }
    const state = sim.snapshot();
    expect(recoveredBeforeBlock).toBe(true);
    expect(state.hitEvents[0]).toMatchObject({ outcome: 'block', moveId: 'wine-glass' });
    expect(state.characters[0].attack).toBeUndefined();
    expect(state.characters[0].mode).not.toBe('recovery');
  });

});
