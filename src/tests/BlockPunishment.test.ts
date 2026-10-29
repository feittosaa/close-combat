import { describe, expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import type { AttackButton, FrameInput } from '../input/types';

const config = createGameConfig(1024, 576);
const input = (direction: FrameInput['direction'] = 'N', ...buttons: AttackButton[]): FrameInput => ({ direction, buttons: new Set(buttons) });
const neutral = input();

describe('blocked attack recovery', () => {
  it.each([0, 1])('allows a defender to punish a blocked light attack, player %i', attacker => {
    const sim = new Simulation(config, undefined, { training: true, initialDistance: 64 });
    const defender = 1 - attacker;
    const advance = (attack: FrameInput, defense: FrameInput) => {
      const frames = [neutral, neutral]; frames[attacker] = attack; frames[defender] = defense; sim.stepFrame(frames);
    };
    advance(input('N', '1'), input('B'));
    for (let i = 0; i < 30 && !sim.snapshot().hitEvents.length; i++) advance(neutral, input('B'));
    expect(sim.snapshot().hitEvents[0]).toMatchObject({ outcome: 'block', moveId: 'light-punch' });
    for (let i = 0; i < 30 && (sim.snapshot().hitstopFramesRemaining || sim.snapshot().characters[defender].mode === 'blockstun'); i++) advance(neutral, input('B'));
    advance(input('N', '1'), input('D', '1'));
    expect(sim.snapshot().characters[attacker].attack?.moveId).toBe('light-punch');
    for (let i = 0; i < 12 && sim.snapshot().characters[attacker].health === 1000; i++) advance(neutral, neutral);
    expect(sim.snapshot().characters[attacker].health).toBeLessThan(1000);
  });

  it.each([['1', 'light-punch'], ['2', 'heavy-punch'], ['3', 'light-kick'], ['4', 'heavy-kick']] as const)(
    'reports a punish window for blocked %s', (button, moveId) => {
      const sim = new Simulation(config, undefined, { training: true, initialDistance: 64 });
      sim.stepFrame([input('N', button), input('B')]);
      for (let i = 0; i < 40 && !sim.snapshot().hitEvents.length; i++) sim.stepFrame([neutral, input('B')]);
      const event = sim.snapshot().hitEvents[0];
      expect(event).toMatchObject({ outcome: 'block', moveId });
      expect(-event.frameAdvantage).toBeGreaterThanOrEqual(button === '2' || button === '4' ? 16 : 9);
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
