import { CONTACT_HITSTOP_FRAMES } from '../engine/combat/hitstop';
import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';
import { getShotoSpritePose } from '../rendering/animations/shotoSprites';
import type { AttackButton, Direction, FrameInput } from '../input/types';

const config = createGameConfig(1024,576);
const input = (direction: Direction = 'N', button?: AttackButton): FrameInput => ({ direction, buttons: new Set(button ? [button] : []) });
function step(sim: Simulation, player = 0, value = input(), target = input()) {
  const inputs = [target,target]; inputs[player] = value; sim.stepFrame(inputs);
}
function contact(sim: Simulation, player: number, guard = input()) {
  for (let tick = 0; tick < 120; tick++) {
    const event = sim.snapshot().hitEvents.find(event => event.attackerId === `player-${player+1}`);
    if (event) return event;
    step(sim,player,input(),guard);
  }
  throw new Error('Missing contact');
}

it.each([0,1])('executes each air basic, preserves gravity and mirrors the existing strike poses: player %i', player => {
  for (const move of shoto.moves.filter(move => move.airborne && move.category === 'basic')) {
    const sim = new Simulation(config,undefined,{training:true,initialDistance:56});
    step(sim,player,input('U'),input('U'));
    step(sim,player,input('U',move.input.buttons[0]));
    const started = sim.snapshot().characters[player];
    expect(started.attack?.moveId).toBe(move.id);
    expect(started.verticalVelocity).toBeCloseTo(shoto.movement.jumpVelocity+2*config.movement.gravity);
    const pose = getShotoSpritePose(started,sim.snapshot().frame)!;
    expect(pose.texture === `shoto-${move.pose}` || pose.texture === 'shoto-enter-defense').toBe(true);
    expect(pose.flipX).toBe(player===1);
    expect(contact(sim,player)).toMatchObject({moveId:move.id,damage:move.damage});
    for(let tick=0;tick<100;tick++)step(sim);
    expect(sim.snapshot().characters[player]).toMatchObject({grounded:true,mode:'neutral',attack:undefined});
    sim.resetMatch();step(sim,player,input('N',move.input.buttons[0]));
    expect(sim.snapshot().characters[player].attack?.moveId).toBe(move.pose);
  }
});

it.each([0,1])('ends air basics on landing without ground activity or held-button repetition: player %i', player => {
  const sim = new Simulation(config,undefined,{training:true,initialDistance:400});
  step(sim,player,input('U'));
  for(let tick=0;tick<33;tick++)step(sim);
  step(sim,player,input('N','4'));
  expect(sim.snapshot().characters[player].attack?.moveId).toBe('air-heavy-kick');
  for(let tick=0;tick<50;tick++) {
    step(sim,player,input('N','4'));
    const state = sim.snapshot().characters[player];
    if(state.grounded)expect(state.attack).toBeUndefined();
  }
});

it.each([0,1])('launches only the confirmed final hit of 1,1,2: player %i', player => {
  for (const guard of [false,true]) {
    const sim = new Simulation(config,undefined,{training:true,initialDistance:56});
    for (const button of ['1','1','2'] as const) {
      step(sim,player,input('N',button),input(guard?'B':'N'));
      contact(sim,player,input(guard?'B':'N'));
    }
    const target = sim.snapshot().characters[1-player];
    expect(target.grounded).toBe(guard);
    expect(target.verticalVelocity).toBe(guard?0:-10);
    if(!guard) {
      const y=target.y;step(sim);for(let tick=0;tick<CONTACT_HITSTOP_FRAMES;tick++)step(sim);
      expect(sim.snapshot().characters[1-player].y).toBeLessThan(y);
    }
  }
  for (const buttons of [['2'],['1','2'],['2','2','2']] as const) {
    const sim = new Simulation(config,undefined,{training:true,initialDistance:56});
    for(const button of buttons){step(sim,player,input('N',button));contact(sim,player);}
    expect(sim.snapshot().characters[1-player].grounded).toBe(true);
  }
});

it.each([0,1])('air basics block against legal air guard, whiff out of range, and reset cleanly: player %i', player => {
  for(const move of shoto.moves.filter(move=>move.category==='basic' && move.airborne)) {
    const sim=new Simulation(config,undefined,{training:true,initialDistance:56});
    step(sim,player,input('U'),input('U'));
    step(sim,player,input('N',move.input.buttons[0]),input('B'));
    expect(contact(sim,player,input('B'))).toMatchObject({moveId:move.id,outcome:'block',damage:0});
    const impact=sim.snapshot();
    for(let tick=0;tick<CONTACT_HITSTOP_FRAMES;tick++)step(sim);
    expect(sim.snapshot().characters).toEqual(impact.characters);
    sim.resetMatch(400);step(sim,player,input('U'));step(sim,player,input('N',move.input.buttons[0]));
    for(let tick=0;tick<80;tick++)step(sim);
    expect(sim.snapshot().recentContacts).toHaveLength(0);
    sim.resetMatch();expect(sim.snapshot().characters.every(c=>c.grounded && !c.attack && c.verticalVelocity===0)).toBe(true);
  }
});
