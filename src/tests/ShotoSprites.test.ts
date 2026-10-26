import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { getShotoSpritePose, shotoSpriteManifest } from '../rendering/animations/shotoSprites';
import { CombatantView } from '../rendering/CombatantView';
import idleAtlas from '../assets/sprites/characters/shoto/idle.atlas.json';
import walkAtlas from '../assets/sprites/characters/shoto/walk.atlas.json';
import crouchAtlas from '../assets/sprites/characters/shoto/crouch.atlas.json';
vi.mock('phaser', () => ({ default: {} }));
const initial = () => new Simulation(createGameConfig(1024,576)).snapshot().characters[0];

it('entrega 22 células fixas sem trim e com pivô/escala compartilhados entre as ações', () => {
  const frames = {...idleAtlas.frames,...walkAtlas.frames,...crouchAtlas.frames};
  expect(Object.keys(frames)).toHaveLength(22);
  for (let i=0;i<22;i++) {
    const f = frames[String(i) as keyof typeof frames];
    expect(f).toBeDefined();
    expect(f.trimmed).toBe(false);
    expect(f.frame.w).toBe(shotoSpriteManifest.frameSize.width);
    expect(f.frame.h).toBe(shotoSpriteManifest.frameSize.height);
  }
  expect(shotoSpriteManifest.footAnchorY).toBe(720);
  expect(shotoSpriteManifest.displaySize!.width/512).toBe(shotoSpriteManifest.displaySize!.height/768);
});
it('seleciona idle, ida, recuo e agachado; não mascara estados sem arte', () => {
  const state=initial();
  expect(getShotoSpritePose(state,0)).toMatchObject({texture:'shoto-idle',frame:0,flipX:false});
  expect(getShotoSpritePose({...state,facing:'left'},0)?.flipX).toBe(true);
  expect(getShotoSpritePose({...state,mode:'moving',movementDirection:'forward'},0)?.frame).toBe(8);
  expect(getShotoSpritePose({...state,mode:'moving',movementDirection:'backward'},0)?.frame).toBe(15);
  for (let f=0;f<60;f++) expect(getShotoSpritePose({...state,mode:'crouching',crouching:true},f)!.frame).toBeGreaterThanOrEqual(16);
  for(const mode of ['startup','active','recovery','hitstun','blockstun','blocking','airborne','dashing','running'] as const)
    expect(getShotoSpritePose({...state,mode},30)).toBeUndefined();
  expect(getShotoSpritePose({...state,grounded:false},30)).toBeUndefined();
});
describe.each([30,60,120,144])('renderização de sprites em %i FPS', fps => {
  it('preserva pose lógica e pausa, troca de textura e retorno à geometria sem modificar estado', () => {
    const calls: unknown[][]=[];
    const graphic=Object.fromEntries(['setDepth','clear','fillStyle','fillRect','lineStyle','strokeRect','lineBetween','destroy'].map(k=>[k,(...a:unknown[])=>{calls.push([k,...a]);return graphic;}]));
    const image=Object.fromEntries(['setDepth','setTexture','setOrigin','setScale','setPosition','setFlipX','setVisible','destroy'].map(k=>[k,(...a:unknown[])=>{calls.push([k,...a]);return image;}]));
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
