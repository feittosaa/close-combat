import { expect, it, vi } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';
import { FightSounds } from '../audio/FightSounds';
import { contactLabel } from '../ui/combatLabels';
import type { FrameInput } from '../input/types';

const neutral: FrameInput = { direction: 'N', buttons: new Set() };
const guard: FrameInput = { direction: 'B', buttons: new Set() };
const lowGuard: FrameInput = { direction: 'DB', buttons: new Set() };

function defend(player: number, lead: number, low = false) {
  const sim = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true, initialDistance: 56 });
  const attacker = 1 - player;
  const move = shoto.moves.find(m => m.id === (low ? 'crouch-light-kick' : 'light-punch'))!;
  const inputs = [neutral, neutral];
  inputs[attacker] = { direction: low ? 'D' : 'N', buttons: new Set([low ? '3' : '1']) };
  sim.stepFrame(inputs);
  while (sim.snapshot().characters[attacker].attack!.elapsedFrames < move.startup - lead) sim.stepFrame([neutral, neutral]);
  inputs[attacker] = neutral; inputs[player] = low ? lowGuard : guard;
  for (let i = 0; i < 20 && !sim.snapshot().hitEvents.length; i++) sim.stepFrame(inputs);
  return sim;
}

it.each([0, 1])('rewards timely high and low guards for player %i', player => {
  for (const low of [false, true]) for (const lead of [1, 2, 3, 4]) {
    const sim = defend(player, lead, low);
    const snapshot = sim.snapshot();
    expect(snapshot.hitEvents[0]).toMatchObject({ outcome: 'block', damage: 0 });
    expect(Boolean(snapshot.hitEvents[0].perfectBlock)).toBe(lead <= 3);
    expect(snapshot.characters[player].rage).toBe(lead <= 3 ? 50 : 5);
    expect(snapshot.characters[1 - player].rage).toBe(0);
  }
});

it('plays the dedicated perfect-block sound and identifies the contact', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const play = vi.fn();
  const sounds = new FightSounds({ cache: { audio: { exists: () => true } }, sound: { play } } as never);
  const sim = defend(1, 1);
  const snapshot = sim.snapshot();
  sounds.observe(snapshot);
  expect(play).toHaveBeenCalledWith('sfx-perfect_block_1', { volume: 1.15 });
  expect(play.mock.calls.some(call => call[0] === 'sfx-block_1')).toBe(false);
  expect(contactLabel(snapshot.hitEvents[0])).toContain('PERFECT BLOCK');
  vi.restoreAllMocks();
});

it('awards 10 rage for hitting and 15 for receiving a hit', () => {
  const sim = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true, initialDistance: 56 });
  sim.stepFrame([{ ...neutral, buttons: new Set(['1']) }, neutral]);
  for (let i = 0; i < 30 && !sim.snapshot().hitEvents.length; i++) sim.stepFrame([neutral, neutral]);
  expect(sim.snapshot().characters.map(c => c.rage)).toEqual([10, 15]);
});

it('requires 300 rage for an ultimate', () => {
  const fast = { ...shoto, rage: { ...shoto.rage!, onHit: 299 } };
  const sim = new Simulation(createGameConfig(1024, 576), [fast, fast], { training: true, initialDistance: 56 });
  sim.stepFrame([{ ...neutral, buttons: new Set(['1']) }, neutral]);
  for (let i = 0; i < 30 && !sim.snapshot().hitEvents.length; i++) sim.stepFrame([neutral, neutral]);
  expect(sim.snapshot().characters[0].rage).toBe(299);
  for (let i = 0; i < 80; i++) sim.stepFrame([neutral, neutral]);
  sim.stepFrame([{ ...neutral, ultimate: true }, neutral]);
  expect(sim.snapshot().ultimateActivation).toBeUndefined();
  sim.fillTrainingRage();
  sim.stepFrame([neutral, neutral]);
  sim.stepFrame([{ ...neutral, ultimate: true }, neutral]);
  expect(sim.snapshot().ultimateActivation?.ownerIds).toEqual(['player-1']);
  expect(sim.snapshot().characters[0].rage).toBe(600);
});
