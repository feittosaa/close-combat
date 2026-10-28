import { describe, expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { defaultCharacter } from '../engine/data/characters';
import { getShotoSpriteLayers, getShotoSpritePose } from '../rendering/animations/shotoSprites';
import type { Direction, AttackButton, FrameInput } from '../input/types';
const input=(direction:Direction='N',button?:AttackButton):FrameInput=>({direction,buttons:new Set(button?[button]:[])});
const config=createGameConfig(1024,576);

describe.each([0,1])('golpes/guardas do jogador %i',player=>{
  it.each(defaultCharacter.moves.filter(move => move.category === 'basic' && !move.airborne))('sincroniza todas as poses de $id com as fases reais',move=>{
    const sim=new Simulation(config,undefined,{training:true,initialDistance:400});
    const seen=new Set<number>();
    for(let t=0;t<move.startup+move.activeFrames+move.recovery;t++){
      const inputs=[input(),input()]; if(t===0)inputs[player]=input('N',move.input.buttons[0]);
      sim.stepFrame(inputs);
      const snapshot=sim.snapshot(),state=snapshot.characters[player];
      const pose=getShotoSpritePose(state,snapshot.frame)!;
      if(pose.texture==='shoto-enter-defense'){
        const elapsed=state.attack!.elapsedFrames;
        expect(elapsed<2 || (move.id==='light-punch'&&elapsed>=move.startup+move.activeFrames+move.recovery-2)).toBe(true);
        expect([72,73]).toContain(pose.frame);
        continue;
      }
      expect(pose.texture).toBe(`shoto-${move.id}`);
      expect(pose.flipX).toBe(player===1);
      expect(getShotoSpriteLayers(state,snapshot.frame)).toHaveLength(1);
      expect(getShotoSpriteLayers(state,snapshot.frame)[0].alpha).toBe(1);
      const start=84+defaultCharacter.moves.indexOf(move)*6;
      const local=pose.frame-start;seen.add(local);
      expect(local).toBeGreaterThanOrEqual(state.mode==='startup'?0:state.mode==='active'?2:3);
      expect(local).toBeLessThanOrEqual(state.mode==='startup'?1:state.mode==='active'?2:5);
      expect(getShotoSpritePose(state,snapshot.frame)).toEqual(pose);
    }
    expect([...seen]).toEqual([0,1,2,3,4,5]);
    sim.stepFrame([input(),input()]);expect(sim.snapshot().characters[player].attack).toBeUndefined();
    sim.resetMatch();expect(getShotoSpritePose(sim.snapshot().characters[player],0)?.texture).toBe('shoto-idle');
  });

  it('bloqueia chute médio agachado com o clipe próprio',()=>{
    const sim=new Simulation(config,undefined,{training:true,initialDistance:64});
    const opponent=1-player;
    for(let t=0;t<22;t++){
      const inputs=[input(),input()];inputs[player]=input('DB');if(t===0)inputs[opponent]=input('N','3');
      sim.stepFrame(inputs);const snapshot=sim.snapshot(),state=snapshot.characters[player];
      if(state.mode==='blocking'||state.mode==='blockstun'){
        expect(['shoto-enter-crouch','shoto-crouch-defense']).toContain(getShotoSpritePose(state,snapshot.frame)?.texture);
        expect(state.crouching).toBe(true);
      }
    }
    expect(sim.snapshot().recentContacts.some(({event})=>event.outcome==='block')).toBe(true);
    expect(sim.snapshot().characters[player].health).toBe(defaultCharacter.maxHealth);
  });

  it('bloqueia no ar, preserva gravidade fora do hitstop e retorna ao chão',()=>{
    const sim=new Simulation(config,undefined,{training:true,initialDistance:50});
    const control=new Simulation(config,undefined,{training:true,initialDistance:400});
    const opponent=1-player;
    const jump=[input(),input()];jump[player]=input('U');sim.stepFrame(jump);control.stepFrame(jump);
    let guarded=false,blocked=false;
    for(let t=0;t<55;t++){
      const inputs=[input(),input()];inputs[player]=input('B');if(t===0)inputs[opponent]=input('N','1');
      const before=sim.snapshot();
      sim.stepFrame(inputs);
      if(!before.hitstopFramesRemaining)control.stepFrame([input(),input()]);
      else expect(sim.snapshot().characters[player]).toEqual(before.characters[player]);
      const snapshot=sim.snapshot(),state=snapshot.characters[player];
      expect(state.y).toBe(control.snapshot().characters[player].y);
      if(!state.grounded&&(state.mode==='blocking'||state.mode==='blockstun')){
        guarded=true;expect(getShotoSpritePose(state,snapshot.frame)?.texture).toBe('shoto-air-defense');
      }
      blocked ||= snapshot.hitEvents.some(event=>event.outcome==='block');
    }
    expect(guarded).toBe(true);expect(blocked).toBe(true);
    expect(sim.snapshot().characters[player]).toMatchObject({grounded:true,health:defaultCharacter.maxHealth});
  });
});

it('mantém os seis clipes e pausa idênticos em 30/60/120/144 FPS',()=>{
  const run=(fps:number)=>{
    const sim=new Simulation(config,undefined,{training:true,initialDistance:64});
    const trace:unknown[]=[];const textures=new Set<string>();
    for(let i=0;i<fps*4;i++)sim.advance(1000/fps,(_characters,frame)=>{
      const snapshot=sim.snapshot();
      for(const state of snapshot.characters){
        const layers=getShotoSpriteLayers(state,snapshot.frame);
        expect(getShotoSpriteLayers(state,snapshot.frame)).toEqual(layers);
        layers.forEach(layer=>textures.add(layer.texture));trace.push(layers);
      }
      if(frame<160){
        const button=frame===0?'1':frame===40?'2':frame===80?'3':frame===120?'4':undefined;
        return [input('N',button),input('DB')];
      }
      return [input(frame===180?'U':frame>180&&frame<215?'B':'N'),input('N',frame===181?'1':undefined)];
    });
    for(const name of ['light-punch','heavy-punch','light-kick','heavy-kick','crouch-defense','air-defense'])expect(textures.has(`shoto-${name}`)).toBe(true);
    return trace;
  };
  const reference=run(60);for(const fps of [30,120,144])expect(run(fps)).toEqual(reference);
});

it('mantém movimento aéreo comum sem ameaça e guarda ao aterrissar sob ameaça',()=>{
  const sim=new Simulation(config,undefined,{training:true,initialDistance:400});
  sim.stepFrame([input('U'),input()]);
  const before=sim.snapshot().characters[0];sim.stepFrame([input('B'),input()]);
  const after=sim.snapshot().characters[0];
  expect(after.mode).toBe('airborne');expect(after.x).toBeLessThan(before.x);
  expect(getShotoSpritePose(after,sim.snapshot().frame)?.texture).toBe('shoto-enter-jump');
  while(!sim.snapshot().characters[0].grounded){
    const c=sim.snapshot().characters[0];
    const landingNext=c.y+c.verticalVelocity>=config.arena.floorY;
    sim.stepFrame([input('B'),input('N',landingNext?'4':undefined)]);
  }
  expect(sim.snapshot().characters[0].mode).toBe('blocking');
  expect(getShotoSpritePose(sim.snapshot().characters[0],sim.snapshot().frame)?.texture).toBe('shoto-enter-defense');
});

it('fecha a guarda por intermediárias, mantém o ciclo fechado e reabre sem transparência',()=>{
  const sim=new Simulation(config,undefined,{training:true,initialDistance:400});
  const frames:number[]=[];
  for(let t=0;t<13;t++){
    sim.stepFrame([input('DB'),input('N',t===0?'2':undefined)]);
    const snap=sim.snapshot();frames.push(getShotoSpritePose(snap.characters[0],snap.frame)!.frame);
  }
  expect(frames.slice(0,8)).toEqual([64,65,66,67,108,108,109,109]);
  expect(frames.slice(8).every(frame=>frame>=110&&frame<=113)).toBe(true);
  for(let i=0;i<4;i++){
    sim.stepFrame([input('D'),input()]);const snap=sim.snapshot();
    expect(getShotoSpriteLayers(snap.characters[0],snap.frame)).toEqual([
      expect.objectContaining({texture:'shoto-crouch-defense',frame:109-Math.floor(i/2),alpha:1}),
    ]);
  }
  sim.stepFrame([input('D'),input()]);const snap=sim.snapshot();
  expect(getShotoSpritePose(snap.characters[0],snap.frame)?.texture).toBe('shoto-crouch');
});

it('não reinicia a pose de subida depois de soltar a guarda aérea',()=>{
  const sim=new Simulation(config,undefined,{training:true,initialDistance:400});
  const control=new Simulation(config,undefined,{training:true,initialDistance:400});
  for(let t=0;t<22;t++){
    const direction=t===0?'U':t>=6&&t<14?'B':'N';
    sim.stepFrame([input(direction),input('N',t===6?'2':undefined)]);
    control.stepFrame([input(direction),input()]);
    const snapshot=sim.snapshot(),state=snapshot.characters[0];
    expect(state.airborneStartedFrame).toBe(0);
    if(t>=18){
      expect(getShotoSpritePose(state,snapshot.frame)).toEqual(getShotoSpritePose(control.snapshot().characters[0],snapshot.frame));
      expect(getShotoSpritePose(state,snapshot.frame)!.frame).toBeGreaterThanOrEqual(25);
    }
  }
});


it('não salta para guarda fechada ao interromper uma entrada de apenas um frame',()=>{
  const sim=new Simulation(config,undefined,{training:true,initialDistance:400});
  sim.stepFrame([input('DB'),input('N','2')]);
  expect(getShotoSpritePose(sim.snapshot().characters[0],1)?.frame).toBe(64);
  sim.stepFrame([input('D'),input()]);
  expect(getShotoSpritePose(sim.snapshot().characters[0],2)).toMatchObject({texture:'shoto-enter-crouch',frame:65});
  const air=new Simulation(config,undefined,{training:true,initialDistance:400});
  air.stepFrame([input('U'),input()]);
  air.stepFrame([input('B'),input('N','2')]);
  expect(getShotoSpritePose(air.snapshot().characters[0],2)?.frame).toBe(114);
  air.stepFrame([input(),input()]);
  expect(getShotoSpritePose(air.snapshot().characters[0],3)).toMatchObject({texture:'shoto-air-defense',frame:114});
});
