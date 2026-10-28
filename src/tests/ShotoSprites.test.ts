import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { getShotoSpritePose, getShotoUltimateActivationPose, shotoSpriteManifest } from '../rendering/animations/shotoSprites';
import { CombatantView } from '../rendering/CombatantView';
const atlasFiles=import.meta.glob<{frames:Record<string,{trimmed:boolean;frame:{w:number;h:number}}>}>('../assets/sprites/characters/shoto/*.atlas.json',{eager:true,import:'default'});
vi.mock('phaser', () => ({ default: {} }));
const initial = () => new Simulation(createGameConfig(1024,576)).snapshot().characters[0];

it('entrega 134 células fixas sem trim e com pivô/escala compartilhados entre as ações', () => {
  const frames = Object.assign({},...Object.values(atlasFiles).map(a=>a.frames));
  expect(Object.keys(frames)).toHaveLength(134);
  for (let i=0;i<134;i++) {
    const f = frames[String(i) as keyof typeof frames];
    expect(f).toBeDefined();
    expect(f.trimmed).toBe(false);
    expect(f.frame.w).toBe(i>=84 && i<108?1152:768);
    expect(f.frame.h).toBe(shotoSpriteManifest.frameSize.height);
  }
  expect(shotoSpriteManifest.footAnchorY).toBe(720);
  expect(shotoSpriteManifest.displaySize!.width/768).toBe(shotoSpriteManifest.displaySize!.height/768);
});
it('seleciona idle, ida, recuo e agachado; não mascara estados sem arte', () => {
  const state=initial();
  expect(getShotoSpritePose(state,0)).toMatchObject({texture:'shoto-idle',frame:0,flipX:false});
  expect(getShotoSpritePose({...state,facing:'left'},0)?.flipX).toBe(true);
  expect(getShotoSpritePose({...state,mode:'moving',movementDirection:'forward'},0)?.frame).toBe(8);
  expect(getShotoSpritePose({...state,mode:'moving',movementDirection:'backward'},0)?.frame).toBe(36);
  for (let f=0;f<60;f++) expect(getShotoSpritePose({...state,mode:'crouching',crouching:true},f)!.frame).toBeGreaterThanOrEqual(16);
  for(const mode of ['startup','active','recovery','hitstun'] as const)
    expect(getShotoSpritePose({...state,mode},30)).toBeUndefined();
  expect(getShotoSpritePose({...state,grounded:false,mode:'airborne'},18)?.texture).toBe('shoto-jump');
  expect(getShotoSpritePose({...state,mode:'blocking'},0)?.texture).toBe('shoto-defense');
  expect(getShotoSpritePose({...state,mode:'dashing',movementDirection:'forward'},0)?.texture).toBe('shoto-dash');
  expect(getShotoSpritePose({...state,mode:'dashing',movementDirection:'backward'},0)?.texture).toBe('shoto-backstep');
});
it('intercala os oito desenhos existentes com intermediárias sem mudar a duração do passo',()=>{
  const state={...initial(),mode:'moving' as const,movementDirection:'forward' as const};
  const expected=[8,120,9,121,10,122,11,123,12,124,13,125,14,126,15,127];
  expect(Array.from({length:16},(_,i)=>getShotoSpritePose(state,i*3)!.frame)).toEqual(expected);
  for(let f=0;f<144;f++){
    const pose=getShotoSpritePose(state,f)!;
    expect(pose.texture).toBe(pose.frame>=120?'shoto-walk-inbetweens':'shoto-walk');
    expect(getShotoSpritePose(state,f+48)).toEqual(pose);
    expect(getShotoSpritePose(state,f)).toEqual(pose);
  }
});
describe.each([30,60,120,144])('renderização de sprites em %i FPS', fps => {
  it('preserva pose lógica e pausa, troca de textura e retorno à geometria sem modificar estado', () => {
    const calls: unknown[][]=[];
    const graphic=Object.fromEntries(['setDepth','clear','fillStyle','fillRect','lineStyle','strokeRect','lineBetween','destroy'].map(k=>[k,(...a:unknown[])=>{calls.push([k,...a]);return graphic;}]));
    const image=Object.fromEntries(['setDepth','setTexture','setAngle','setOrigin','setScale','setPosition','setFlipX','setVisible','setAlpha','destroy'].map(k=>[k,(...a:unknown[])=>{calls.push([k,...a]);return image;}]));
    const view=new CombatantView({add:{graphics:()=>graphic,image:()=>image},textures:{exists:()=>true}} as unknown as Phaser.Scene,0xff0000);
    const sim=new Simulation(createGameConfig(1024,576));
    const neutral={direction:'N' as const,buttons:new Set<'1'>()};
    for(let i=0;i<fps;i++){
      sim.advance(1000/fps,()=>[neutral,neutral]);
      view.sync(sim.snapshot().characters[0],sim.snapshot().frame);
    }
    const snapshot=sim.snapshot(),state=snapshot.characters[0],original=structuredClone(state);
    const expected=getShotoSpritePose(state,snapshot.frame)!;
    calls.length=0; view.sync(state,snapshot.frame); const paused=[...calls];
    calls.length=0; view.sync(state,snapshot.frame); expect(calls).toEqual(paused);
    expect(calls).toContainEqual(['setTexture',expected.texture,String(expected.frame)]);
    expect(calls).toContainEqual(['setOrigin',.5,720/768]);
    expect(calls).toContainEqual(['setPosition',state.x,state.y]);
    expect(state).toEqual(original);
    view.sync({...state,mode:'crouching',crouching:true,facing:'left'},snapshot.frame);
    expect(calls).toContainEqual(['setFlipX',true]);
    calls.length=0;view.sync({...state,mode:'hitstun'},snapshot.frame);
    expect(calls).toContainEqual(['setVisible',false]);
    expect(calls.some(c=>c[0]==='fillRect')).toBe(true);
    sim.resetMatch();view.sync(sim.snapshot().characters[0],0);
    expect(calls).toContainEqual(['setTexture','shoto-idle','0']);
    view.destroy();
  });
});

it('preserva a escala uniforme e os pés comuns; proporção do agachado já preparada no atlas',()=>{
  const state=initial(),original=structuredClone(state);
  expect(getShotoSpritePose(state,0)?.scale).toBe(1);
  for(let frame=0;frame<60;frame++){
    const pose=getShotoSpritePose({...state,mode:'crouching',crouching:true},frame)!;
    expect(pose.scale).toBe(1);
    expect(shotoSpriteManifest.footAnchorY).toBe(720);
  }
  expect(getShotoSpritePose({...state,mode:'moving'},0)?.scale).toBe(1);
  expect(state).toEqual(original);
});

it('fecha o ciclo agachado por poses vizinhas e não reinicia a entrada de guarda a cada volta',()=>{
  const state=initial();
  const crouched={...state,mode:'crouching' as const,crouching:true};
  let previous=getShotoSpritePose(crouched,0)!.frame;
  for(let frame=1;frame<240;frame++){
    const pose=getShotoSpritePose(crouched,frame)!;
    expect(Math.abs(pose.frame-previous)).toBeLessThanOrEqual(1);
    previous=pose.frame;
  }
  const guard={...state,mode:'blocking' as const};
  expect(getShotoSpritePose(guard,0)?.frame).toBe(30);
  expect(getShotoSpritePose(guard,2)?.frame).toBe(31);
  for(let frame=4;frame<240;frame++)expect(getShotoSpritePose(guard,frame)!.frame).toBeGreaterThanOrEqual(32);
});
it('seleciona os oito quadros de salto sem repetir o clipe no ar',()=>{
  const state={...initial(),grounded:false,mode:'airborne' as const};
  const frames=new Set(Array.from({length:38},(_,frame)=>getShotoSpritePose(state,frame)!.frame));
  expect([...frames]).toEqual([22,23,24,25,26,27,28,29]);
  expect(getShotoSpritePose(state,80)?.frame).toBe(29);
});

it('espelha todos os clipes e mantém guarda fechada durante o impacto bloqueado',()=>{
  const state=initial();
  const states=[state,{...state,mode:'moving' as const,movementDirection:'forward' as const},
    {...state,mode:'moving' as const,movementDirection:'backward' as const},
    {...state,mode:'crouching' as const,crouching:true},
    {...state,mode:'dashing' as const,movementDirection:'forward' as const},
    {...state,mode:'dashing' as const,movementDirection:'backward' as const},
    {...state,mode:'blocking' as const},
    {...state,mode:'airborne' as const,grounded:false}];
  for(const pose of states){
    const right=getShotoSpritePose({...pose,facing:'right'},18)!;
    const left=getShotoSpritePose({...pose,facing:'left'},18)!;
    expect(left).toEqual({...right,flipX:true});
    expect(right.flipX).toBe(false);
  }
  expect(getShotoSpritePose({...state,mode:'blockstun',remainingStateFrames:10},0)!.frame).toBeGreaterThanOrEqual(32);
});

it('keeps bottle-confirmed defenders upright and presents the independent lighter throw',()=>{
  const state=initial();
  for(const grounded of [true,false]){
    const pose=getShotoSpritePose({...state,mode:'hitstun',grounded,ultimateCapture:{ownerId:'player-2'}},20);
    expect(pose).toMatchObject({texture:'shoto-idle',frame:0});
  }
  const throwing={...state,ultimateThrowStartedFrame:20};
  expect(getShotoSpritePose(throwing,20)).toMatchObject({texture:'shoto-heavy-punch',frame:92});
  expect(getShotoSpritePose({...throwing,facing:'left'},26)).toMatchObject({texture:'shoto-heavy-punch',frame:95,flipX:true});
  expect(getShotoSpritePose(throwing,28)?.texture).toBe('shoto-idle');
});

it('spreads all six drinking poses across the full two-second global pause',()=>{
  const counts=new Map<number,number>();
  for(let tick=0;tick<120;tick++){
    const pose=getShotoUltimateActivationPose(tick,'right');
    counts.set(pose.frame,(counts.get(pose.frame)??0)+1);
    expect(getShotoUltimateActivationPose(tick,'left')).toEqual({...pose,flipX:true});
  }
  expect([...counts]).toEqual([[128,20],[129,20],[130,20],[131,20],[132,20],[133,20]]);
  expect(getShotoUltimateActivationPose(120,'right').frame).toBe(133);
});
