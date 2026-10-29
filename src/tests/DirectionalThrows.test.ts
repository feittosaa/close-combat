import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';
import type { AttackButton, Direction, FrameInput } from '../input/types';

const config=createGameConfig(1024,576);
const input=(direction:Direction='N',buttons:readonly AttackButton[]=[]):FrameInput=>({direction,buttons:new Set(buttons)});
function step(sim:Simulation,player=0,value=input(),target=input()) {const inputs=[target,target];inputs[player]=value;sim.stepFrame(inputs);}
function contact(sim:Simulation,player:number) {
  for(let tick=0;tick<90;tick++) {const event=sim.snapshot().hitEvents.find(e=>e.attackerId===`player-${player+1}`);if(event)return event;step(sim);}
  throw new Error('No throw contact');
}

it.each([0,1])('chooses front/back for both throws when the command starts, even if released or changed: player %i',player=>{
  for(const move of shoto.moves.filter(m=>m.category==='throw'))for(const direction of ['N','F','B'] as const) {
    const sim=new Simulation(config,undefined,{training:true,initialDistance:48});
    step(sim); // Resolve initial body overlap before measuring throw displacement.
    const initial=sim.snapshot().characters;const sign=initial[player].facing==='right'?1:-1;
    const distance=Math.abs(initial[0].x-initial[1].x);
    step(sim,player,input(direction,move.input.buttons),input('B'));
    expect(sim.snapshot().characters[player].attack).toMatchObject({moveId:move.id,throwDirection:direction==='B'?'backward':'forward'});
    // Choosing another direction during preparation does not replace the captured choice.
    step(sim,player,input(direction==='B'?'F':'B'));
    const event=contact(sim,player);const [self,target]=[sim.snapshot().characters[player],sim.snapshot().characters[1-player]];
    const expectedSign=direction==='B'?-sign:sign;
    expect(event).toMatchObject({moveId:move.id,outcome:'hit',damage:move.damage,pushbackDirection:expectedSign>0?'right':'left'});
    expect(target.x-self.x).toBeCloseTo(expectedSign*(distance+move.pushback.hit));
    expect(self.facing).toBe(expectedSign>0?'right':'left');
    expect(target.facing).toBe(expectedSign>0?'left':'right');
    expect(target.health).toBe(1000-move.damage);
  }
});

it.each([0,1])('keeps back throws inside both walls with body separation: player %i',player=>{
  for(const wall of ['left','right'] as const)for(const move of shoto.moves.filter(m=>m.category==='throw')) {
    const sim=new Simulation(config,undefined,{training:true,initialDistance:48});
    for(let tick=0;tick<600;tick++)sim.stepFrame([input(wall==='left'?'B':'F'),input(wall==='left'?'F':'B')]);
    step(sim,player,input('B',move.input.buttons));contact(sim,player);
    const states=sim.snapshot().characters;
    for(const state of states){expect(state.x-state.collision.bodyWidth/2).toBeGreaterThanOrEqual(config.arena.left);expect(state.x+state.collision.bodyWidth/2).toBeLessThanOrEqual(config.arena.right);}
    expect(Math.abs(states[0].x-states[1].x)).toBeGreaterThanOrEqual(shoto.collision.bodyWidth-0.00001);
  }
});

it('never swaps sides on whiff, against an airborne target, or after reset clears a buffered choice',()=>{
  for(const airborne of [false,true]) {
    const sim=new Simulation(config,undefined,{training:true,initialDistance:airborne?48:300});
    if(airborne)step(sim,1,input('U'));
    step(sim,0,input('B',['1','3']));const initial=sim.snapshot().characters.map(c=>c.x);
    for(let tick=0;tick<60;tick++)step(sim);
    expect(sim.snapshot().recentContacts).toHaveLength(0);
    expect(sim.snapshot().characters.map(c=>c.x)).toEqual(initial);
    sim.resetMatch(48);step(sim,0,input('N',['1','3']));
    expect(contact(sim,0).pushbackDirection).toBe('right');
  }
});

it('resolves simultaneous back throws symmetrically from the contact positions',()=>{
  const sim=new Simulation(config,undefined,{training:true,initialDistance:56});
  const before=sim.snapshot().characters;const center=(before[0].x+before[1].x)/2;
  const grab=input('B',['1','3']);sim.stepFrame([grab,grab]);
  for(let tick=0;tick<20 && !sim.snapshot().hitEvents.length;tick++)step(sim);
  const snapshot=sim.snapshot();expect(snapshot.hitEvents).toHaveLength(2);
  expect(snapshot.characters.map(c=>c.health)).toEqual([925,925]);
  expect((snapshot.characters[0].x+snapshot.characters[1].x)/2).toBeCloseTo(center);
  expect(snapshot.characters[0].x).toBeGreaterThan(snapshot.characters[1].x);
});


it.each([0,1])('delays both throws until frame fifteen and captures at expanded range: player %i',player=>{
  for(const move of shoto.moves.filter(m=>m.category==='throw')) {
    const sim=new Simulation(config,undefined,{training:true,initialDistance:88});
    step(sim,player,input('N',move.input.buttons));
    for(let elapsed=0;elapsed<15;elapsed++) {
      expect(sim.snapshot().characters[player].attack?.elapsedFrames).toBe(elapsed);
      expect(sim.snapshot().hitEvents).toHaveLength(0);
      step(sim);
    }
    expect(sim.snapshot().characters[player].attack?.elapsedFrames).toBe(15);
    expect(sim.snapshot().hitEvents).toEqual([expect.objectContaining({moveId:move.id,outcome:'hit'})]);
    const miss=new Simulation(config,undefined,{training:true,initialDistance:110});
    step(miss,player,input('N',move.input.buttons));
    for(let tick=0;tick<60;tick++)step(miss);
    expect(miss.snapshot().recentContacts).toHaveLength(0);
    const whiff=new Simulation(config,undefined,{training:true,initialDistance:300});
    step(whiff,player,input('N',move.input.buttons));
    const total=move.startup+move.activeFrames+move.recovery;
    for(let elapsed=1;elapsed<total;elapsed++){step(whiff);expect(whiff.snapshot().characters[player].attack).toBeDefined();}
    step(whiff);expect(whiff.snapshot().characters[player].attack).toBeUndefined();
  }
});
