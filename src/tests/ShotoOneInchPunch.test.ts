import { expect, it } from 'vitest';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';
import { getShotoSpritePose } from '../rendering/animations/shotoSprites';
import { Simulation } from '../engine/simulation/Simulation';
import type { FrameInput } from '../input/types';

const neutral: FrameInput = { direction: 'N', buttons: new Set() };
const forward: FrameInput = { direction: 'F', buttons: new Set() };
const punch: FrameInput = { direction: 'N', buttons: new Set(['1', '2']) };

it.each([0, 1])('empurra no acerto e quica na parede para o jogador %i', player => {
  const base = createGameConfig(1024, 576);
  const config = { ...base, arena: { ...base.arena, left: 0, right: 350, maxSeparation: undefined } };
  const sim = new Simulation(config, [shoto, shoto], { training: true, initialDistance: 56 });
  const step = (value = neutral) => sim.stepFrame(player === 0 ? [value, neutral] : [neutral, value]);
  for (let i = 0; i < 160; i++) step(forward);
  step(punch);
  for (let i = 0; i < 160 && !sim.snapshot().characters[1 - player].wallBounceEffect; i++) step();
  const target = sim.snapshot().characters[1 - player];
  expect(target.wallBounceEffect).toBeDefined();
  expect(target.mode).toBe('hitstun');
  expect(target.grounded).toBe(false);
  expect(target.verticalVelocity).toBe(-8);
});

it.each([0, 1])('o punho fecha no primeiro quadro de contato para o jogador %i', player => {
  const sim = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true, initialDistance: 56 });
  const step = (value = neutral) => sim.stepFrame(player === 0 ? [value, neutral] : [neutral, value]);
  step(punch);
  const move = shoto.moves.find(candidate => candidate.id === 'power-punch')!;
  expect(move).toMatchObject({ startup: 12, activeFrames: 3, recovery: 40, hitbox: { forward: 32, yOffset: -148, width: 26, height: 25 } });
  while (sim.snapshot().characters[player].attack!.elapsedFrames < move.startup - 1) step();
  let snapshot = sim.snapshot();
  expect(getShotoSpritePose(snapshot.characters[player], snapshot.frame)).toMatchObject({ texture: 'shoto-power-punch', frame: 3 });
  step();
  snapshot = sim.snapshot();
  expect(snapshot.hitEvents[0]).toMatchObject({ moveId: 'power-punch', outcome: 'hit', damage: shoto.moves.find(candidate => candidate.id === 'light-punch')!.damage });
  expect(getShotoSpritePose(snapshot.characters[player], snapshot.frame)).toMatchObject({ texture: 'shoto-power-punch', frame: 4 });
});
