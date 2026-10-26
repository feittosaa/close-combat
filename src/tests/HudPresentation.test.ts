import { afterEach, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { CombatHud } from '../ui/CombatHud';
import { TrainingHud } from '../ui/TrainingHud';
import { TrainingSession } from '../training/TrainingSession';
import { HUD, healthBarFill } from '../ui/hudTheme';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { resetControls, saveSystemControls } from '../input/controlSettings';
vi.mock('phaser',()=>({default:{}}));
afterEach(()=>resetControls());
function mockScene(){
  const texts:{value:string;style:unknown;setText:(s:string)=>unknown}[]=[];
  const commands:unknown[][]=[];
  const graphics=Object.fromEntries(['fillStyle','fillRect','fillPoints','strokePoints','lineStyle','lineBetween','strokeRect','clear','destroy'].map(k=>[k,(...args:unknown[])=>{commands.push([k,...args]);return graphics;}]));
  const add={
    graphics:()=>graphics,
    rectangle:()=>graphics,
    text:(_x:number,_y:number,value:string,style:unknown)=>{
      const text={value,style,setText:(s:string)=>{text.value=s;return text;},setColor:()=>text,setFontSize:()=>text,setOrigin:()=>text,setVisible:()=>text};
      texts.push(text);return text;
    },
    container:()=>{const c={setDepth:()=>c,setScrollFactor:()=>c,destroy:vi.fn()};return c;},
  };
  return {scene:{add} as unknown as Phaser.Scene,texts,commands};
}
it('barra representa zero, máximo e dano simétrico sem ultrapassar o trilho',()=>{
  expect(healthBarFill(750,1000,28,360,false)).toEqual({x:28,width:270,ratio:.75});
  expect(healthBarFill(750,1000,636,360,true)).toEqual({x:726,width:270,ratio:.75});
  expect(healthBarFill(0,1000,636,360,true)).toEqual({x:996,width:0,ratio:0});
  expect(healthBarFill(2000,1000,28,360,false).width).toBe(360);
  expect(healthBarFill(-10,0,28,360,false).width).toBe(0);
});
it('HUD acompanha vida, timer e rounds reais, sem alterar o snapshot ou inventar recursos',()=>{
  const {scene,texts,commands}=mockScene();
  const hud=new CombatHud(scene,1024,['Shoto','Shoto'],'Cais');
  const snapshot=new Simulation(createGameConfig(1024,576)).snapshot();
  snapshot.characters[0].health=750;snapshot.characters[1].health=250;
  const original=structuredClone(snapshot);hud.update(snapshot,1024);
  expect(texts.some(t=>t.value==='750 / 1000')).toBe(true);
  expect(texts.some(t=>t.value==='250 / 1000')).toBe(true);
  expect(texts.some(t=>t.value==='99')).toBe(true);
  expect(commands).toContainEqual(['fillStyle',HUD.players[0]]);
  expect(commands).toContainEqual(['fillRect',31,12,265.5,13]);
  expect(commands).toContainEqual(['fillRect',904.5,12,88.5,13]);
  expect(commands.filter(c=>c[0]==='lineBetween'&&c[1]===c[3])).toEqual([]);
  expect(snapshot).toEqual(original);
  snapshot.characters[0].health=0;snapshot.phase='match-over';snapshot.matchWinnerId='player-2';
  hud.update(snapshot,1024);
  expect(texts.some(t=>t.value.includes('P2 VENCE A LUTA'))).toBe(true);
  hud.destroy();
});
it('treino usa teclas remapeadas e mantém dados de contato e pausa legíveis',()=>{
  saveSystemControls({pause:'KeyQ',reset:'KeyE'});
  const {scene,texts}=mockScene();
  const hud=new TrainingHud(scene,1024,576),session=new TrainingSession();
  session.paused=true;session.speed=.25;
  const snapshot=new Simulation(createGameConfig(1024,576)).snapshot();
  hud.update(snapshot,session);
  expect(texts.some(t=>t.value.includes('PAUSADO')&&t.value.includes('25%'))).toBe(true);
  expect(texts.some(t=>t.value.includes('Q PAUSA')&&t.value.includes('E / F2 RESET'))).toBe(true);
  expect(texts.some(t=>t.value.includes('FRAME 0')&&t.value.includes('DISTÂNCIA'))).toBe(true);
  hud.destroy();
});
