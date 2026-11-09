import { expect, it } from 'vitest';
import { characters } from '../engine/data/characters';
import { createGameConfig } from '../engine/data/gameConfig';
import { Simulation } from '../engine/simulation/Simulation';
import { createHitbox, createHurtbox } from '../engine/collision/combatGeometry';
import type { FrameInput } from '../input/types';

it.each(characters)('uses the larger physical body and mirrored boxes in every posture: $id',fighter=>{
  const sim=new Simulation(createGameConfig(1024,576),[fighter,fighter],{training:true,initialDistance:100});
  const [left,right]=sim.snapshot().characters;
  if (fighter.id === 'shoto') expect(fighter.collision.bodyWidth).toBe(60.72);
  for(const [posture,box] of Object.entries(fighter.collision.hurtboxes)){
    const state={...left,grounded:posture!=='airborne',crouching:posture==='crouching',mode:posture==='knockdown'?'knockdown' as const:'neutral' as const};
    const actual=createHurtbox(state);
    expect(actual.width).toBe(box.width);expect(actual.height).toBe(box.height);
    expect(actual.y+actual.height).toBeCloseTo(left.y);
    const mirrored=createHurtbox({...state,x:right.x,facing:'left'});
    expect(mirrored.x+mirrored.width/2-right.x).toBeCloseTo(-(actual.x+actual.width/2-left.x));
  }
  if (fighter.id === 'shoto') expect(fighter.collision.hurtboxes.standing.height).toBe(182.16);
  for(const move of fighter.moves){
    const a=createHitbox(left,move),b=createHitbox(right,move);
    expect(a.x-left.x).toBeCloseTo(-(b.x+b.width-right.x));
    expect(a.width).toBe(b.width);expect(a.y).toBe(b.y);
  }
});

it('the increased reach hits at the new boundary and still misses beyond it',()=>{
  const neutral:FrameInput={direction:'N',buttons:new Set()};
  const attack:FrameInput={...neutral,buttons:new Set(['1'])};
  for(const [distance,damage] of [[108,20],[114,20],[119,20],[120,0]]){
    const sim=new Simulation(createGameConfig(1024,576),undefined,{training:true,initialDistance:distance});
    sim.stepFrame([attack,neutral]);
    for(let tick=0;tick<35;tick++)sim.stepFrame([neutral,neutral]);
    expect(sim.snapshot().characters[1].health).toBe(1000-damage);
  }
});
