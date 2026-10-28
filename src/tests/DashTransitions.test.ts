import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { defaultCharacter as shoto } from '../engine/data/characters';
import { KeyboardInput } from '../input/KeyboardInput';
import { PLAYER_ONE_KEYS } from '../input/keyboardLayouts';
import type { Direction, FrameInput } from '../input/types';
import { getShotoSpritePose, getShotoSpriteLayers } from '../rendering/animations/shotoSprites';
const input=(direction:Direction='N'):FrameInput=>({direction,buttons:new Set()});
const N=input();
const practice=()=>new Simulation(createGameConfig(2200,700),undefined,{training:true,initialDistance:900});
it.each(['F','B'] as const)('segundo toque %s inicia imediatamente e completa 24F depois de soltar',direction=>{
  for(const index of [0,1]){
    const sim=practice();const pair=[N,N];pair[index]=input(direction);
    sim.stepFrame(pair);sim.stepFrame([N,N]);const before=sim.snapshot().characters[index].x;
    sim.stepFrame(pair);
    const speed=direction==='F'?shoto.movement.dashSpeed:shoto.movement.backdashSpeed;
    const sign=(index===0?1:-1)*(direction==='F'?1:-1);
    expect(sim.snapshot().characters[index].mode).toBe('dashing');
    expect(sim.snapshot().characters[index].x-before).toBeCloseTo(sign*speed);
    for(let frame=1;frame<24;frame++)sim.stepFrame([N,N]);
    expect(sim.snapshot().characters[index].mode).toBe('dashing');
    expect(sim.snapshot().characters[index].x-before).toBeCloseTo(sign*speed*24);
    const end=sim.snapshot().characters[index].x;sim.stepFrame([N,N]);
    expect(sim.snapshot().characters[index]).toMatchObject({mode:'neutral',x:end});
  }
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
it('entra/sai da caminhada com desenhos intermediários e sem atrasar o deslocamento',()=>{
  const sim=practice(),x=sim.snapshot().characters[0].x;sim.stepFrame([input('F'),N]);
  let snapshot=sim.snapshot();expect(snapshot.characters[0].x-x).toBeCloseTo(shoto.movement.walkSpeed);
  expect(getShotoSpritePose(snapshot.characters[0],snapshot.frame)).toMatchObject({texture:'shoto-enter-walk',frame:56});
  for(let frame=1;frame<9;frame++)sim.stepFrame([input('F'),N]);
  snapshot=sim.snapshot();expect(getShotoSpritePose(snapshot.characters[0],snapshot.frame)?.texture).toBe('shoto-walk');
  sim.stepFrame([N,N]);snapshot=sim.snapshot();
  expect(getShotoSpritePose(snapshot.characters[0],snapshot.frame)).toMatchObject({texture:'shoto-enter-walk',frame:59});
  for(let frame=0;frame<8;frame++)sim.stepFrame([N,N]);snapshot=sim.snapshot();
  expect(getShotoSpritePose(snapshot.characters[0],snapshot.frame)?.texture).toBe('shoto-idle');
});
it('toque breve de agachar retorna da profundidade alcançada, sem saltar para a pose mais baixa',()=>{
  const sim=practice();sim.stepFrame([input('D'),N]);sim.stepFrame([N,N]);const snapshot=sim.snapshot();
  expect(getShotoSpritePose(snapshot.characters[0],snapshot.frame)).toMatchObject({texture:'shoto-enter-crouch',frame:64});
  expect(getShotoSpriteLayers(snapshot.characters[0],snapshot.frame)).toEqual([{...getShotoSpritePose(snapshot.characters[0],snapshot.frame),alpha:1}]);
});
it('camadas de transição são determinísticas em 30/60/120/144 FPS e permanecem imóveis na pausa',()=>{
  const run=(fps:number)=>{
    const sim=practice();for(let i=0;i<fps;i++)sim.advance(1000/fps,(_states,frame)=>[frame>=54&&frame<59?input('D'):N,N]);
    const snapshot=sim.snapshot(),before=structuredClone(snapshot);
    const layers=getShotoSpriteLayers(snapshot.characters[0],snapshot.frame);
    expect(getShotoSpriteLayers(snapshot.characters[0],snapshot.frame)).toEqual(layers);
    expect(snapshot).toEqual(before);expect(layers).toHaveLength(1);expect(layers[0].alpha).toBe(1);
    return layers;
  };
  const reference=run(60);for(const fps of [30,120,144])expect(run(fps)).toEqual(reference);
});

it('preserva o relógio do stun quando a direção de movimento anterior é limpa',()=>{
  const sim=new Simulation(createGameConfig(1024,576),undefined,{training:true,initialDistance:64});
  sim.stepFrame([{...N,buttons:new Set(['1'])},input('F')]);
  while(sim.snapshot().characters[1].mode!=='hitstun'&&sim.snapshot().frame<15)sim.stepFrame([N,input('F')]);
  const hit=sim.snapshot().characters[1];expect(hit.mode).toBe('hitstun');
  sim.stepFrame([N,N]);
  expect(sim.snapshot().characters[1].stateStartedFrame).toBe(hit.stateStartedFrame);
});
