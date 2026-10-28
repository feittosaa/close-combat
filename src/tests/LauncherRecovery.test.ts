import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';
import { CONTACT_HITSTOP_FRAMES } from '../engine/combat/hitstop';
import { getShotoCombatPose } from '../rendering/animations/shotoCombatSprites';
import { TrainingSession } from '../training/TrainingSession';
import type { AttackButton, FrameInput } from '../input/types';

const config=createGameConfig(1024,576);
const N:FrameInput={direction:'N',buttons:new Set()};
function step(sim:Simulation,player=0,value=N){const inputs=[N,N];inputs[player]=value;sim.stepFrame(inputs);}
function hit(sim:Simulation,player:number,button:AttackButton){
  step(sim,player,{direction:'N',buttons:new Set([button])});
  for(let tick=0;tick<100;tick++){
    const event=sim.snapshot().hitEvents.find(e=>e.attackerId===`player-${player+1}`);
    if(event)return event;
    step(sim);
  }
  throw new Error('Missing contact');
}
function launch(player:number){
  const sim=new Simulation(config,undefined,{training:true,initialDistance:56});
  for(const button of ['1','1','2'] as const)hit(sim,player,button);
  return sim;
}

it.each([0,1])('recovers early enough for a real jumping heavy-punch continuation: player %i',player=>{
  const sim=launch(player);const initial=sim.snapshot();const move=shoto.moves.find(m=>m.id==='heavy-punch')!;
  expect(initial.characters[player].attack).toMatchObject({elapsedFrames:move.startup,recoveryFrames:6});
  expect(initial.hitEvents[0].attackerRecoveryFrames).toBe(move.activeFrames+6);
  for(let tick=0;tick<CONTACT_HITSTOP_FRAMES;tick++){
    step(sim);expect(sim.snapshot().characters).toEqual(initial.characters);
  }
  for(let tick=1;tick<move.activeFrames+6;tick++){step(sim);expect(sim.snapshot().characters[player].attack).toBeDefined();}
  step(sim,player,{direction:'U',buttons:new Set()});
  expect(sim.snapshot().characters[player]).toMatchObject({grounded:false,attack:undefined});
  expect(sim.snapshot().characters[1-player].juggle).toBeDefined();
  const event=hit(sim,player,'2');
  expect(event).toMatchObject({moveId:'air-heavy-punch',outcome:'hit',damage:35});
  expect(sim.snapshot().characters[1-player].juggle?.airHits).toBe(1);
  expect(sim.snapshot().characters[player].attack?.recoveryFrames).toBeUndefined();
  sim.resetMatch();expect(sim.snapshot().characters.every(c=>!c.attack&&!c.hitSequence)).toBe(true);
});

it.each([0,1])('plays the complete shortened recovery and keeps the measured training entry: player %i',player=>{
  const sim=launch(player);const training=new TrainingSession();training.observe(sim.snapshot());
  expect(training.lastMoves[player]?.recovery).toBe(6);
  for(let tick=0;tick<CONTACT_HITSTOP_FRAMES;tick++)step(sim);
  const frames=new Set<number>();
  while(sim.snapshot().characters[player].attack){
    const snapshot=sim.snapshot();const state=snapshot.characters[player];
    if(state.mode==='recovery')frames.add(getShotoCombatPose(state,snapshot.frame)!.frame);
    step(sim);
  }
  expect([...frames]).toEqual([93,94,95]);
  training.observe(sim.snapshot());expect(training.lastMoves[player]?.recovery).toBe(6);
  expect(sim.snapshot().characters[1-player].grounded).toBe(false);
});
