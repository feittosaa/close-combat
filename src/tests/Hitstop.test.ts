import { expect, it, vi } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { defaultCharacter } from '../engine/data/characters';
import { CONTACT_HITSTOP_FRAMES } from '../engine/combat/hitstop';
import { getShotoSpritePose } from '../rendering/animations/shotoSprites';
import type { AttackButton, Direction, FrameInput } from '../input/types';
vi.mock('phaser', () => ({ default: {} }));
const input=(direction:Direction='N',button?:AttackButton):FrameInput=>({direction,buttons:new Set(button?[button]:[])});
const neutral=[input(),input()];
const config=createGameConfig(1024,576);
const contactPoses:Record<string,number>={'light-punch':136,'heavy-punch':92,'light-kick':98,'heavy-kick':104};

it.each(defaultCharacter.moves.filter(move => move.category === 'basic' && !move.airborne))('$name pausa ambos no contato, conserva a pose máxima e mantém o relógio em hit e block',move=>{
  for(const player of [0,1])for(const outcome of ['hit','block'] as const){
    const sim=new Simulation(config,undefined,{initialDistance:64});
    const inputs=[input(),input()];inputs[player]=input('N',move.input.buttons[0]);
    inputs[1-player]=input(outcome==='block'?'B':'N');
    sim.stepFrame(inputs);inputs[player]=input();
    for(let i=0;i<move.startup;i++)sim.stepFrame(inputs);
    const contact=sim.snapshot();
    expect(contact.hitEvents).toHaveLength(1);
    expect(contact.hitEvents[0].outcome).toBe(outcome);
    expect(contact.hitstopFramesRemaining).toBe(CONTACT_HITSTOP_FRAMES);
    const pose=getShotoSpritePose(contact.characters[player],contact.frame);
    expect(pose?.texture).toBe(move.id==='light-punch'?'shoto-light-combo':`shoto-${move.id}`);
    expect(pose?.frame).toBe(contactPoses[move.id]);
    for(let tick=1;tick<=CONTACT_HITSTOP_FRAMES;tick++){
      // Even movement/jump inputs cannot change positions, physics, stun or pose during contact.
      sim.stepFrame([input('UF'),input('UB')]);const paused=sim.snapshot();
      expect(paused.characters).toEqual(contact.characters);
      expect(paused.frame).toBe(contact.frame);
      expect(paused.elapsedFrames).toBe(contact.elapsedFrames+tick);
      expect(paused.roundFramesRemaining).toBe(contact.roundFramesRemaining-tick);
      expect(paused.hitstopFramesRemaining).toBe(CONTACT_HITSTOP_FRAMES-tick);
      expect(paused.hitEvents).toEqual([]);
      expect(paused.recentContacts).toEqual(contact.recentContacts);
      expect(getShotoSpritePose(paused.characters[player],paused.frame)).toEqual(pose);
    }
    sim.stepFrame(neutral);
    expect(sim.snapshot().frame).toBe(contact.frame+1);
    expect(sim.snapshot().characters[player].attack?.elapsedFrames).toBe(move.startup+1);
    expect(sim.snapshot().characters[1-player].remainingStateFrames).toBe(contact.characters[1-player].remainingStateFrames-1);
  }
});
it('erro não pausa; o mesmo relógio avança em hit, bloqueio e erro',()=>{
  for(const distance of [64,400]){
    const sim=new Simulation(config,undefined,{initialDistance:distance});
    sim.stepFrame([input('N','1'),input()]);
    for(let i=0;i<59;i++)sim.stepFrame(neutral);
    expect(sim.snapshot().elapsedFrames).toBe(60);
    expect(sim.snapshot().roundFramesRemaining).toBe(config.match.roundDurationFrames-60);
    expect(sim.snapshot().frame).toBe(distance===400?60:60-CONTACT_HITSTOP_FRAMES);
    expect(sim.snapshot().recentContacts).toHaveLength(distance===400?0:1);
  }
});
it('trade inicia uma única pausa compartilhada e reset não carrega pausa antiga',()=>{
  const sim=new Simulation(config,undefined,{training:true,initialDistance:64});
  sim.stepFrame([input('N','1'),input('N','1')]);
  for(let i=0;i<8;i++)sim.stepFrame(neutral);
  expect(sim.snapshot().hitEvents).toHaveLength(2);
  expect(sim.snapshot().hitstopFramesRemaining).toBe(CONTACT_HITSTOP_FRAMES);
  sim.resetMatch();expect(sim.snapshot()).toMatchObject({frame:0,elapsedFrames:0,hitstopFramesRemaining:0});
  sim.stepFrame(neutral);expect(sim.snapshot().frame).toBe(1);
});
it.each([20,1000])('KO/time-up com %i HP conserva a micro pausa sem tempo extra no relógio',health=>{
  const fragile={...defaultCharacter,maxHealth:health};
  const sim=new Simulation({...config,match:{...config.match,roundDurationFrames:11}},[fragile,fragile],{initialDistance:64});
  sim.stepFrame([input('N','1'),input()]);for(let i=0;i<8;i++)sim.stepFrame(neutral);
  const pose=sim.snapshot().characters[0].attack;
  for(let i=0;i<CONTACT_HITSTOP_FRAMES-1;i++){
    sim.stepFrame(neutral);expect(sim.snapshot().phase).toBe('fight');
    expect(sim.snapshot().characters[0].attack).toEqual(pose);
  }
  expect(sim.snapshot().roundFramesRemaining).toBe(0);
  sim.stepFrame(neutral);expect(sim.snapshot()).toMatchObject({phase:'round-over',roundEndReason:health===20?'knockout':'time',roundFramesRemaining:0});
});
it('reproduz contatos, poses congeladas e relógio iguais em 30/60/120/144 FPS',()=>{
  const run=(fps:number)=>{
    const sim=new Simulation(config,undefined,{initialDistance:64});const trace:unknown[]=[];
    for(let i=0;i<fps*2;i++)sim.advance(1000/fps,(_characters,frame)=>{
      trace.push(sim.snapshot());return [input('N',frame===0?'1':undefined),input('B')];
    });
    return {trace,snapshot:sim.snapshot()};
  };
  const reference=run(60);for(const fps of [30,120,144])expect(run(fps)).toEqual(reference);
});

it('uses seven fixed ticks for the requested impact pause',()=>expect(CONTACT_HITSTOP_FRAMES).toBe(7));
