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
  const images: {x:number;y:number;key:string;width:number;height:number}[]=[];
  const graphics=Object.fromEntries(['fillStyle','fillRect','fillPoints','strokePoints','lineStyle','lineBetween','strokeRect','clear','destroy'].map(k=>[k,(...args:unknown[])=>{commands.push([k,...args]);return graphics;}]));
  const add={
    graphics:()=>graphics,
    rectangle:()=>graphics,
    image:(x:number,y:number,key:string)=>{
      const image={x,y,key,width:0,height:0,setDisplaySize:(width:number,height:number)=>{image.width=width;image.height=height;return image;}};
      images.push(image);return image;
    },
    text:(_x:number,_y:number,value:string,style:unknown)=>{
      const text={value,style,setText:(s:string)=>{text.value=s;return text;},setColor:()=>text,setFontSize:()=>text,setOrigin:()=>text,setVisible:()=>text};
      texts.push(text);return text;
    },
    container:()=>{const c={setDepth:()=>c,setScrollFactor:()=>c,destroy:vi.fn()};return c;},
  };
  return {scene:{add} as unknown as Phaser.Scene,texts,commands,images};
}
it('positions each fighter icon at the outer edge of the health bar',()=>{
  const {scene,images}=mockScene();
  const hud=new CombatHud(scene,1024,['Cowboy','Shoto'],'Sala',false,'TREINO LIVRE',['cowboy','shoto']);
  expect(images.map(({x,y,key,width,height})=>({x,y,key,width,height}))).toEqual([
    {x:30,y:29,key:'fighter-icon-cowboy',width:57,height:57},
    {x:994,y:29,key:'fighter-icon-shoto',width:57,height:57},
  ]);
  hud.destroy();
});
it('barra representa zero, máximo e dano simétrico sem ultrapassar o trilho',()=>{
  expect(healthBarFill(750,1000,28,360,false)).toEqual({x:28,width:270,ratio:.75});
  expect(healthBarFill(750,1000,636,360,true)).toEqual({x:726,width:270,ratio:.75});
  expect(healthBarFill(0,1000,636,360,true)).toEqual({x:996,width:0,ratio:0});
  expect(healthBarFill(2000,1000,28,360,false).width).toBe(360);
  expect(healthBarFill(-10,0,28,360,false).width).toBe(0);
});
it('HUD acompanha vida, timer e rounds reais, sem alterar o snapshot ou inventar recursos',()=>{
  const {scene,texts,commands}=mockScene();
  const hud=new CombatHud(scene,1024,['Shoto','Shoto'],'Sala de Treino');
  const snapshot=new Simulation(createGameConfig(1024,576)).snapshot();
  snapshot.characters[0].health=750;snapshot.characters[1].health=250;
  const original=structuredClone(snapshot);hud.update(snapshot,1024);
  expect(texts.some(t=>t.value==='750 / 1000')).toBe(true);
  expect(texts.some(t=>t.value==='250 / 1000')).toBe(true);
  expect(texts.some(t=>t.value==='99')).toBe(true);
  expect(commands).toContainEqual(['fillStyle',HUD.players[0]]);
  expect(commands).toContainEqual(['fillRect',31,12,291,13]);
  expect(commands).toContainEqual(['fillRect',896,12,97,13]);
  expect(commands.filter(c=>c[0]==='lineBetween'&&c[1]===c[3]&&Number(c[2])<30)).toEqual([]);
  expect(snapshot).toEqual(original);
  snapshot.characters[0].health=0;snapshot.phase='match-over';snapshot.matchWinnerId='player-2';
  hud.update(snapshot,1024);
  expect(texts.some(t=>t.value.includes('P2 VENCE A LUTA'))).toBe(true);
  expect(texts.every(t=>!t.value.includes('REINICIAR'))).toBe(true);
  hud.destroy();
});
it('apresenta o histórico de combo no painel com a cor do jogador',()=>{
  const {scene,texts,commands}=mockScene();
  const hud=new CombatHud(scene,1024,['Cowboy','Shoto'],'Sala',true);
  const snapshot=new Simulation(createGameConfig(1024,576)).snapshot();
  hud.update({...snapshot,comboHistory:[{attackerId:'player-1',targetId:'player-2',hits:3,damage:72,active:true,lastFrame:0}]},1024);
  expect(texts.some(text=>text.value==='3 HITS · 72 DANO')).toBe(true);
  expect(commands).toContainEqual(['lineStyle',1,HUD.players[0],.85]);
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
it('anchors health and larger bottom rage rails to both sides of a wide HUD',()=>{
  const {scene,commands}=mockScene();
  const width=1365;
  const hud=new CombatHud(scene,width);
  const snapshot=new Simulation(createGameConfig(1024,576)).snapshot();
  snapshot.characters[0].rage=100;snapshot.characters[1].rage=100;
  hud.update(snapshot,width);
  expect(commands).toContainEqual(['fillRect',28,10,564.5,17]);
  expect(commands).toContainEqual(['fillRect',width-592.5,10,564.5,17]);
  expect(commands).toContainEqual(['fillRect',35,538,250,8]);
  expect(commands).toContainEqual(['fillRect',width-285,538,250,8]);
  expect(commands).toContainEqual(['fillRect',35,538,100,8]);
  expect(commands).toContainEqual(['fillRect',width-135,538,100,8]);
  for (const x of [85,135,185,235]) expect(commands).toContainEqual(['lineBetween',x,538,x,546]);
  for (const x of [width-235,width-185,width-135,width-85]) expect(commands).toContainEqual(['lineBetween',x,538,x,546]);
  hud.destroy();
});
