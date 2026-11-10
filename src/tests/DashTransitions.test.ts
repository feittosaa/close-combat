import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { defaultCharacter as shoto } from '../engine/data/characters';
import { KeyboardInput } from '../input/KeyboardInput';
import { PLAYER_ONE_KEYS } from '../input/keyboardLayouts';
import type { Direction, FrameInput } from '../input/types';
const input=(direction:Direction='N'):FrameInput=>({direction,buttons:new Set()});
const N=input();
const practice=()=>new Simulation(createGameConfig(2200,700),undefined,{training:true,initialDistance:900});
it.each(['F','B'] as const)('segundo toque %s inicia imediatamente e completa 18F depois de soltar',direction=>{
  for(const index of [0,1]){
    const sim=practice();const pair=[N,N];pair[index]=input(direction);
    sim.stepFrame(pair);sim.stepFrame([N,N]);const before=sim.snapshot().characters[index].x;
    sim.stepFrame(pair);
    const speed=direction==='F'?shoto.movement.dashSpeed:shoto.movement.backdashSpeed;
    const sign=(index===0?1:-1)*(direction==='F'?1:-1);
    expect(sim.snapshot().characters[index].mode).toBe('dashing');
    expect(sim.snapshot().characters[index].x-before).toBeCloseTo(sign*speed);
    for(let frame=1;frame<18;frame++)sim.stepFrame([N,N]);
    expect(sim.snapshot().characters[index].mode).toBe('dashing');
    expect(sim.snapshot().characters[index].x-before).toBeCloseTo(sign*speed*18);
    expect(sim.snapshot().characters[index].x-before).toBeCloseTo(sign*(direction==='F'?4.6:3.6)*24);
    const end=sim.snapshot().characters[index].x;sim.stepFrame([N,N]);
    expect(sim.snapshot().characters[index]).toMatchObject({mode:'neutral',x:end});
  }
});
it.each([0,1])('segurar para trás não cancela nem inverte o dash para frente do jogador %i',index=>{
  const sim=practice();const side=(direction:Direction)=>{const pair=[N,N];pair[index]=input(direction);return pair;};
  for(let frame=0;frame<30;frame++)sim.stepFrame(side('B'));
  const before=sim.snapshot().characters[index].x;
  // Dash para frente com a tecla de trás ainda mantida: o pedido chega sem direção e depois só resta «trás».
  const request=[N,N];request[index]={...N,dash:'F'};sim.stepFrame(request);
  expect(sim.snapshot().characters[index].mode).toBe('dashing');
  for(let frame=1;frame<18;frame++){sim.stepFrame(side('B'));expect(sim.snapshot().characters[index].mode,`${frame}`).toBe('dashing');}
  expect((sim.snapshot().characters[index].x-before)*(index===0?1:-1)).toBeCloseTo(shoto.movement.dashSpeed*18);
});
it('um «trás» novo ainda cancela o dash para frente quando não estava mantido',()=>{
  const sim=practice();sim.stepFrame([{...N,dash:'F'},N]);sim.stepFrame([N,N]);
  expect(sim.snapshot().characters[0].mode).toBe('dashing');
  sim.stepFrame([input('B'),N]);
  expect(sim.snapshot().characters[0].mode).toBe('moving');
});
it('não transforma toques lentos ou repetição de tecla mantida em dash',()=>{
  const sim=practice();sim.stepFrame([input('F'),N]);
  for(let i=0;i<13;i++)sim.stepFrame([N,N]);
  for(let i=0;i<30;i++){sim.stepFrame([input('F'),N]);expect(sim.snapshot().characters[0].mode).toBe('moving');}
});
function key(target:EventTarget,type:string,code:string,time:number,repeat=false){
  const event=new Event(type);Object.defineProperties(event,{code:{value:code},timeStamp:{value:time},repeat:{value:repeat}});target.dispatchEvent(event);
}
it('preserva dois toques físicos entre ticks, converte pelo facing e consome o pedido uma vez',()=>{
  const target=new EventTarget(),keyboard=new KeyboardInput(PLAYER_ONE_KEYS,target as Window);
  key(target,'keydown','KeyD',0);key(target,'keyup','KeyD',10);key(target,'keydown','KeyD',50);key(target,'keyup','KeyD',60);
  const captured=keyboard.read('left');expect(captured).toMatchObject({direction:'N',dash:'B'});
  expect(keyboard.read('left').dash).toBeUndefined();
  const sim=practice();sim.stepFrame([{...captured,dash:'F'},N]);
  expect(sim.snapshot().characters[0].mode).toBe('dashing');
  keyboard.destroy();
});
it('reset/blur descartam duplo toque; auto-repeat e espera de soltura não criam novo dash',()=>{
  const target=new EventTarget(),keyboard=new KeyboardInput(PLAYER_ONE_KEYS,target as Window);
  key(target,'keydown','KeyD',0);key(target,'keydown','KeyD',50,true);
  expect(keyboard.read().dash).toBeUndefined();keyboard.clear();
  key(target,'keydown','KeyD',60);expect(keyboard.read()).toEqual(N);
  key(target,'keyup','KeyD',70);key(target,'keydown','KeyD',80);key(target,'keyup','KeyD',90);
  expect(keyboard.read().dash).toBeUndefined();
  key(target,'keydown','KeyD',100);key(target,'keyup','KeyD',110);target.dispatchEvent(new Event('blur'));
  expect(keyboard.read()).toEqual(N);keyboard.destroy();
});
it('preserva o relógio do stun quando a direção de movimento anterior é limpa',()=>{
  const sim=new Simulation(createGameConfig(1024,576),undefined,{training:true,initialDistance:64});
  sim.stepFrame([{...N,buttons:new Set(['1'])},input('F')]);
  while(sim.snapshot().characters[1].mode!=='hitstun'&&sim.snapshot().frame<15)sim.stepFrame([N,input('F')]);
  const hit=sim.snapshot().characters[1];expect(hit.mode).toBe('hitstun');
  sim.stepFrame([N,N]);
  expect(sim.snapshot().characters[1].stateStartedFrame).toBe(hit.stateStartedFrame);
});
