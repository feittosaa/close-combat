import { expect, it } from 'vitest';
import { AttackResolver } from '../engine/combat/AttackResolver';
import { createGameConfig } from '../engine/data/gameConfig';
import { getCharacterById } from '../engine/data/characters';
import { Simulation } from '../engine/simulation/Simulation';
import { cowboy } from '../engine/data/fighters/cowboy';
import { shoto } from '../engine/data/fighters/shoto';
import { ULTIMATE_ACTIVATION_FRAMES } from '../engine/combat/ultimateActivation';
import type { FrameInput } from '../input/types';
import type { ProjectileState } from '../engine/combat/ProjectileState';

const neutral: FrameInput = { direction: 'N', buttons: new Set() };
const resolver = new AttackResolver((fighter, id) => getCharacterById(fighter)?.moves.find(move => move.id === id));

it.each(['shoto', 'cowboy'])('protects %s ultimate against strikes and throws without cancelling it', fighter => {
  for (const attackId of ['light-punch', 'throw-13']) {
    const sim = new Simulation(createGameConfig(1024, 576), [shoto, fighter === 'shoto' ? shoto : cowboy], { training: true, initialDistance: 60 });
    const characters = [...sim.snapshot().characters];
    const attacker = characters[0], target = characters[1];
    const move = shoto.moves.find(item => item.id === attackId)!;
    attacker.mode = 'active'; attacker.attack = { moveId: attackId, buttons: move.input.buttons, elapsedFrames: move.startup, hasHit: false };
    target.mode = 'active'; target.attack = { moveId: fighter === 'shoto' ? 'rake-ultimate' : 'bulls-eye', buttons: ['1'], elapsedFrames: 8, hasHit: false };
    const before = structuredClone(target.attack);
    const [event] = resolver.resolve(characters, [neutral, neutral]);
    expect(event).toMatchObject({ armored: true, damage: Math.round(move.damage / 2), pushback: 0, defenderStunFrames: 0 });
    expect(target.health).toBe(target.maxHealth - event.damage);
    expect(target.attack).toEqual(before);
    expect(target.mode).toBe('active');
  }
});

it('halves projectile damage and consumes the projectile without stopping the ultimate', () => {
  const characters = [...new Simulation(createGameConfig(1024, 576), [shoto, cowboy], { training: true, initialDistance: 60 }).snapshot().characters];
  const move = shoto.moves.find(item => item.id === 'tomato-light')!;
  const target = characters[1];
  target.mode = 'recovery';
  target.attack = { moveId: 'bulls-eye', buttons: ['1', '2'], elapsedFrames: 100, hasHit: false };
  const projectile: ProjectileState = { id: 1, ownerId: characters[0].characterId, fighterId: 'shoto',
    x: target.x - move.hitbox.forward - move.hitbox.width / 2, y: target.y, facing: 'right', velocity: 0,
    remainingFrames: 10, visual: 'tomato', attack: { moveId: move.id, buttons: move.input.buttons, elapsedFrames: move.startup, hasHit: false } };
  const [event] = resolver.resolve(characters, [neutral, neutral], [projectile]);
  expect(event).toMatchObject({ armored: true, damage: Math.round(move.damage / 2) });
  expect(projectile.attack.hasHit).toBe(true);
  expect(target.attack?.moveId).toBe('bulls-eye');
  expect(target.mode).toBe('recovery');
});

it.each([0, 1])('continues an ultimate after an opponent hits it: player %i', player => {
  const fighter = { ...shoto, moves: shoto.moves.map(move => move.id === 'rake-ultimate' ? { ...move, startup: 80, movement: undefined } : move) };
  const sim = new Simulation(createGameConfig(1024, 576), [fighter, fighter], { training: true, initialDistance: 65 });
  sim.fillTrainingRage();
  const ultimate: FrameInput = { ...neutral, ultimate: true };
  sim.stepFrame(player === 0 ? [ultimate, neutral] : [neutral, ultimate]);
  for (let i = 0; i < ULTIMATE_ACTIVATION_FRAMES; i++) sim.stepFrame([neutral, neutral]);
  const strike: FrameInput = { direction: 'N', buttons: new Set(['1']) };
  sim.stepFrame(player === 0 ? [neutral, strike] : [strike, neutral]);
  let event;
  for (let i = 0; i < 40 && !event; i++) {
    sim.stepFrame([neutral, neutral]);
    event = sim.snapshot().hitEvents.find(hit => hit.targetId === `player-${player + 1}` && hit.armored);
  }
  expect(event).toMatchObject({ armored: true, damage: 10 });
  const target = sim.snapshot().characters[player];
  expect(target.health).toBe(target.maxHealth - 10);
  expect(target.attack?.moveId).toBe('rake-ultimate');
  expect(target.mode).not.toBe('hitstun');
});

it.each([0, 1])('does not launch or displace an armored ultimate on a launcher hit: player %i', player => {
  const attacker = {...shoto, combos:[{id:'test-launcher',name:'Launcher',notation:'2',moveIds:['heavy-punch'],launch:{velocity:-10,recoveryFrames:6}}]};
  const defender = {...shoto, moves:shoto.moves.map(move => move.id === 'rake-ultimate' ? {...move,startup:80,movement:undefined} : move)};
  const sim = new Simulation(createGameConfig(1024,576), player === 0 ? [defender,attacker] : [attacker,defender], {training:true,initialDistance:56});
  sim.fillTrainingRage();
  const step = (defense:FrameInput=neutral, offense:FrameInput=neutral) => sim.stepFrame(player === 0 ? [defense,offense] : [offense,defense]);
  step({...neutral,ultimate:true});
  for (let i=0;i<ULTIMATE_ACTIVATION_FRAMES;i++) step();
  step(neutral,{direction:'N',buttons:new Set(['2'])});
  let hit;
  for (let i=0;i<60 && !hit;i++) { step(); hit=sim.snapshot().hitEvents.find(event=>event.targetId===`player-${player+1}`); }
  expect(hit).toMatchObject({armored:true,pushback:0,defenderStunFrames:0});
  const target=sim.snapshot().characters[player];
  expect(target).toMatchObject({grounded:true,verticalVelocity:0});
  expect(target.juggle).toBeUndefined();
  expect(target.throwPull).toBeUndefined();
  expect(target.knockdown).toBeUndefined();
  expect(target.attack?.moveId).toBe('rake-ultimate');
});
