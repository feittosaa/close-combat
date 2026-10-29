import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { getShotoSpritePose } from '../rendering/animations/shotoSprites';
import type { AttackButton, FrameInput } from '../input/types';

const neutral:FrameInput={direction:'N',buttons:new Set()};
function step(sim:Simulation, player:number, button?:AttackButton) {
  const inputs=[neutral,neutral];
  if(button)inputs[player]={...neutral,buttons:new Set([button])};
  sim.stepFrame(inputs);
}
function pose(sim:Simulation,player:number) {
  const snapshot=sim.snapshot();
  return getShotoSpritePose(snapshot.characters[player],snapshot.frame);
}

it.each([0,1])('uses original contact poses 3/6/7 and returns via pose 8 after one, two or three entries: player %i',player=>{
  for(const count of [1,2,3]) {
    const sim=new Simulation(createGameConfig(1024,576),undefined,{training:true,initialDistance:400});
    for(let strike=0;strike<count;strike++) {
      step(sim,player,'1');
      expect(pose(sim,player)).toMatchObject({texture:'shoto-light-combo',frame:[134,137,138][strike],flipX:player===1});
      while(sim.snapshot().characters[player].attack!.elapsedFrames<8)step(sim,player);
      for(let tick=0;tick<3;tick++) {
        expect(pose(sim,player)).toMatchObject({texture:'shoto-light-combo',frame:[136,138,139][strike]});
        step(sim,player);
      }
    }
    const recovery:number[]=[];
    while(sim.snapshot().characters[player].attack) {
      recovery.push(pose(sim,player)!.frame);
      step(sim,player);
    }
    expect(recovery).toHaveLength(15);
    expect(recovery[recovery.length-1]).toBe(140);
    expect(pose(sim,player)).toMatchObject({texture:'shoto-idle',frame:0});
    expect(sim.snapshot().characters[1-player].health).toBe(1000);
    // A fresh string always starts with the shoulder, never the previous string's hook/slap.
    step(sim,player,'1');expect(pose(sim,player)?.frame).toBe(134);
  }
});

it.each([0,1])('shares the first two strikes with 1,1,2 and retains the strong launcher contact: player %i',player=>{
  const sim=new Simulation(createGameConfig(1024,576),undefined,{training:true,initialDistance:96});
  for(const [button,texture,frame] of [
    ['1','shoto-light-combo',136],['1','shoto-light-combo',138],['2','shoto-heavy-punch',92],
  ] as const) {
    step(sim,player,button);
    let contact=false;
    for(let tick=0;tick<100;tick++) {
      const snapshot=sim.snapshot();
      if(snapshot.hitEvents.some(event=>event.attackerId===`player-${player+1}`)) {
        expect(pose(sim,player)).toMatchObject({texture,frame,flipX:player===1});contact=true;break;
      }
      step(sim,player);
    }
    expect(contact).toBe(true);
  }
  expect(sim.snapshot().characters[1-player].juggle).toBeDefined();
});
