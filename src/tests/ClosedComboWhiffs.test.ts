import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';
import type { AttackButton, FrameInput } from '../input/types';

const config=createGameConfig(1024,576);
const input=(buttons: readonly AttackButton[]=[]):FrameInput=>({direction:'N',buttons:new Set(buttons)});
const N=input();
function step(sim:Simulation,player=0,value=N){const inputs=[N,N];inputs[player]=value;sim.stepFrame(inputs);}
function wait(sim:Simulation,frames:number){for(let i=0;i<frames;i++)step(sim);}

it.each([0,1])('executes every authored punch recipe in empty space with separate legal inputs: player %i',player=>{
  for(const recipe of shoto.combos!){
    const sim=new Simulation(config,undefined,{training:true,initialDistance:300});
    for(const id of recipe.moveIds){
      const move=shoto.moves.find(candidate=>candidate.id===id)!;
      step(sim,player,input(move.input.buttons));
      expect(sim.snapshot().characters[player].attack).toMatchObject({moveId:id,elapsedFrames:0,hasHit:false});
      wait(sim,move.startup+move.activeFrames);
      expect(sim.snapshot().characters[player].attack).toMatchObject({moveId:id,elapsedFrames:move.startup+move.activeFrames});
      expect(sim.snapshot().characters[1-player]).toMatchObject({health:1000,mode:'neutral',grounded:true});
      expect(sim.snapshot().hitEvents).toEqual([]);
      expect(sim.snapshot().characters[player].hitSequence).toBeUndefined();
    }
    const last=shoto.moves.find(move=>move.id===recipe.moveIds[recipe.moveIds.length-1])!;
    wait(sim,last.recovery);
    expect(sim.snapshot().characters[player].attack).toBeUndefined();
    expect(sim.snapshot().recentContacts).toEqual([]);
  }
});

it('does not skip startup/activity, auto-repeat a held button, or invent a whiff route',()=>{
  const jab=shoto.moves.find(move=>move.id==='light-punch')!;
  const create=()=>new Simulation(config,undefined,{training:true,initialDistance:300});
  const early=create();step(early,0,input(['1']));step(early);step(early,0,input(['1']));
  wait(early,jab.startup+jab.activeFrames-2);
  expect(early.snapshot().characters[0].attack?.elapsedFrames).toBe(jab.startup+jab.activeFrames);
  step(early,0,input(['1']));expect(early.snapshot().characters[0].attack?.elapsedFrames).toBe(0);

  const held=create();for(let tick=0;tick<120;tick++)step(held,0,input(['1']));
  expect(held.snapshot().characters[0].attack).toBeUndefined();

  for(const button of ['2','3','4'] as const){
    const sim=create();step(sim,0,input(['1']));wait(sim,jab.startup+jab.activeFrames);
    step(sim,0,input([button]));
    expect(sim.snapshot().characters[0].attack).toMatchObject({moveId:'light-punch',elapsedFrames:jab.startup+jab.activeFrames+1});
    expect(sim.snapshot().characters[1].remainingStateFrames).toBe(0);
  }
});

it.each([0,1])('uses only one unit of hit pushback for ordinary grounded strikes: player %i',player=>{
  for(const move of shoto.moves.filter(move=>!move.airborne&&['basic','crouching','power'].includes(move.category??''))){
    const sim=new Simulation(config,undefined,{training:true,initialDistance:64});
    const start=sim.snapshot().characters[1-player].x;
    const attack:FrameInput={direction:move.crouching?'D':'N',buttons:new Set(move.input.buttons)};
    step(sim,player,attack);
    for(let tick=0;tick<move.startup;tick++)step(sim);
    const event=sim.snapshot().hitEvents[0];
    expect(event).toMatchObject({moveId:move.id,outcome:'hit',pushback:1});
    expect(sim.snapshot().characters[1-player].x-start).toBeCloseTo(player===0?1:-1);
  }
});
