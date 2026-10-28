import type { FrameInput } from '../input/types';
import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';
import { createHurtbox } from '../engine/collision/combatGeometry';
import { intersects } from '../engine/collision/intersects';
import { getShotoSpritePose } from '../rendering/animations/shotoSprites';

it.each([0,1])('uses an authored compact hurtbox only while the free jump folds its legs: player %i',player=>{
  const sim=new Simulation(createGameConfig(1024,576),undefined,{training:true,initialDistance:300});
  const neutral={direction:'N' as const,buttons:new Set<'1'>()};
  for(let tick=1;tick<=38;tick++) {
    const inputs:FrameInput[]=[neutral,neutral];if(tick===1)inputs[player]={...neutral,direction:'U'};
    sim.stepFrame(inputs);const snapshot=sim.snapshot(),state=snapshot.characters[player];
    const box=createHurtbox(state);
    if(!state.grounded) {
      const compact=tick>=12&&tick<22;
      expect(box.height).toBe(compact?121:159.5);
      expect(box.y-state.y).toBe(compact?-187:-181.5);
      expect(box.width).toBe(60.72);
      const pose=getShotoSpritePose(state,snapshot.frame)!;
      if(compact)expect(pose).toMatchObject({texture:'shoto-jump',frame:25});
      expect(createHurtbox({...state,facing:'left'}).width).toBe(box.width);
      if(compact) {
        expect(intersects(box,{x:state.x-4,y:state.y-20,width:8,height:10})).toBe(false);
        expect(intersects(box,{x:state.x-4,y:state.y-120,width:8,height:10})).toBe(true);
      }
      for(const mode of ['startup','active','blocking','hitstun'] as const)expect(createHurtbox({...state,mode}).height).toBe(shoto.collision.hurtboxes.airborne.height);
    } else {
      expect(state.airborneElapsedFrames).toBeUndefined();
      expect(box.height).toBe(shoto.collision.hurtboxes.standing.height);
    }
  }
});
