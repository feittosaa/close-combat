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
  const texts:{value:string;style:unknown;x:number;setText:(s:string)=>unknown}[]=[];
  const commands:unknown[][]=[];
  let colorChanges=0;
  const images: {x:number;y:number;key:string;width:number;height:number;scale:number;crop?:number[]}[]=[];
  const graphics=Object.fromEntries(['fillStyle','fillRect','fillPoints','strokePoints','fillCircle','strokeCircle','fillRoundedRect','strokeRoundedRect','lineStyle','lineBetween','strokeRect','clear','destroy'].map(k=>[k,(...args:unknown[])=>{commands.push([k,...args]);return graphics;}]));
  const add={
    graphics:()=>graphics,
    rectangle:()=>graphics,
    image:(x:number,y:number,key:string)=>{
      const image={x,y,key,width:1254,height:1254,scale:1,crop:undefined as number[]|undefined,setCrop:(...crop:number[])=>{image.crop=crop;return image;},setScale:(scale:number)=>{image.scale=scale;return image;},setPosition:(px:number,py:number)=>{image.x=px;image.y=py;return image;}};
      images.push(image);return image;
    },
    text:(_x:number,_y:number,value:string,style:unknown)=>{
      const text={value,style,x:_x,get width(){return text.value.length*10;},setText:(s:string)=>{text.value=s;return text;},setX:(x:number)=>{text.x=x;return text;},setColor:(color:string)=>{text.style={...(text.style as object),color};colorChanges++;return text;},setFontSize:()=>text,setOrigin:()=>text,setVisible:()=>text};
      texts.push(text);return text;
    },
    container:()=>{const c={setDepth:()=>c,setScrollFactor:()=>c,destroy:vi.fn()};return c;},
  };
  return {scene:{add} as unknown as Phaser.Scene,texts,commands,images,colorChanges:()=>colorChanges};
}
it('positions each fighter icon at the outer edge of the health bar',()=>{
  const {scene,images}=mockScene();
  const hud=new CombatHud(scene,1024,['Texas','Shoto'],false,'TREINO LIVRE',['texas','shoto']);
  // Every icon shows a square window of its art at exactly 76 × 76 px, centred at the outer edge of its bar.
  expect(images.map(image=>image.key)).toEqual(['fighter-icon-texas','fighter-icon-shoto']);
  images.forEach((image,index)=>{
    const [cropX,cropY,cropWidth,cropHeight]=image.crop!;
    expect(cropWidth).toBe(cropHeight);
    expect(cropWidth*image.scale).toBeCloseTo(76,6);
    expect(image.x+(cropX+cropWidth/2-image.width/2)*image.scale).toBeCloseTo(index===0?40:984,6);
    expect(image.y+(cropY+cropHeight/2-image.height/2)*image.scale).toBeCloseTo(39,6);
  });
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
  const hud=new CombatHud(scene,1024,['Shoto','Shoto']);
  const snapshot=new Simulation(createGameConfig(1024,576)).snapshot();
  snapshot.characters[0].health=750;snapshot.characters[1].health=250;
  const original=structuredClone(snapshot);hud.update(snapshot,1024);
  expect(texts.some(t=>t.value==='99')).toBe(true);
  expect(texts.filter(t=>t.value==='SHOTO').map(t=>(t.style as {fontSize:string}).fontSize)).toEqual(['18px','18px']);
  expect(texts.filter(t=>/ \/ 1000|P[12]\b|JOGADOR|SALA/.test(t.value)).map(t=>t.value)).toEqual([]);
  expect(texts.some(t=>t.value==='ROUND 1')).toBe(true);
  expect(commands).toContainEqual(['fillStyle',HUD.players[0]]);
  expect(commands).toContainEqual(['fillRect',85,12,265.5,13]);
  expect(commands).toContainEqual(['fillRect',850.5,12,88.5,13]);
  // The health bars carry no inner markers.
  expect(commands.filter(c=>c[0]==='lineBetween')).toEqual([]);
  expect(snapshot).toEqual(original);
  snapshot.characters[0].health=0;snapshot.phase='match-over';snapshot.matchWinnerId='player-2';
  hud.update(snapshot,1024);
  // The stage's own K.O./victory titles announce the result; the HUD adds no result text.
  expect(texts.filter(t=>/VENCE|K\.O\.|EMPATE/.test(t.value))).toEqual([]);
  expect(texts.every(t=>!t.value.includes('REINICIAR'))).toBe(true);
  hud.destroy();
});
it('mostra o combo com o número de acertos grande e o dano embaixo, no lado do jogador',()=>{
  const {scene,texts}=mockScene();
  const hud=new CombatHud(scene,1024,['Texas','Shoto'],true);
  const snapshot=new Simulation(createGameConfig(1024,576)).snapshot();
  hud.update({...snapshot,comboHistory:[{attackerId:'player-1',targetId:'player-2',hits:3,damage:72,active:true,lastFrame:0}]},1024);
  const count=texts.find(text=>text.value==='3')!;
  expect((count.style as {fontSize:string}).fontSize).toBe('58px');
  expect(texts.find(text=>text.value==='HITS')?.x).toBeGreaterThan(210);
  expect(texts.some(text=>text.value==='72 DE DANO')).toBe(true);
  hud.destroy();
});
it('treino usa teclas remapeadas e mantém dados de contato e pausa legíveis',()=>{
  saveSystemControls({pause:'KeyQ',reset:'KeyZ'});
  const {scene,texts}=mockScene();
  const hud=new TrainingHud(scene,1024,576),session=new TrainingSession();
  session.paused=true;session.speed=.25;
  const snapshot=new Simulation(createGameConfig(1024,576)).snapshot();
  hud.update(snapshot,session);
  expect(texts.some(t=>t.value.includes('PAUSADO')&&t.value.includes('25%'))).toBe(true);
  expect(texts.some(t=>t.value.includes('Q PAUSA')&&t.value.includes('Z / F2 RESET'))).toBe(true);
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
  expect(commands).toContainEqual(['fillRect',82,10,510.5,17]);
  expect(commands).toContainEqual(['fillRect',width-592.5,10,510.5,17]);
  // Three separate rage cells per bar, filled from each player's outer edge: 100 rage fills one of them.
  const cell=(260-10-4*2)/3, step=cell+4;
  // 6 empty cell rails plus the 2 full cells (one per player).
  expect(commands.filter(c=>c[0]==='fillRoundedRect'&&c[2]===537&&c[4]===10&&c[3]===cell)).toHaveLength(8);
  for (const x of [50,width-300+2*step]) expect(commands).toContainEqual(['fillRoundedRect',x,537,cell,10,3]);
  hud.destroy();
});


it('layers white, yellow and red rage fills and shows completed levels', () => {
  const { scene, texts, commands } = mockScene();
  const hud = new CombatHud(scene, 1024);
  const snapshot = new Simulation(createGameConfig(1024, 576)).snapshot();
  snapshot.characters[0].rage = 450; snapshot.characters[1].rage = 750;
  hud.update(snapshot, 1024);
  expect(commands).toContainEqual(['fillStyle', HUD.rage[0]]);
  expect(commands).toContainEqual(['fillStyle', HUD.rage[1]]);
  expect(commands).toContainEqual(['fillStyle', HUD.rage[2]]);
  // Fill order: white first, then yellow, then red.
  expect(HUD.rage).toEqual([0xf4efe2, 0xe8b53a, 0xc41f3f]);
  expect(commands).toContainEqual(['fillRoundedRect', 50, 537, (260 - 10 - 4 * 2) / 3, 10, 3]);
  expect(texts.some(text => text.value === '1')).toBe(true);
  expect(texts.some(text => text.value === '2')).toBe(true);
  // No rage value or total is written: only the level (0 to 3) in the seal.
  expect(texts.filter(text => /RAGE|\d+\s*\/\s*\d+|^\d{3,}$/.test(text.value))).toEqual([]);
  hud.destroy();
});
it('only restyles HUD text when its colour changes, so identical frames redraw no text texture',()=>{
  const {scene,texts,colorChanges}=mockScene();
  const hud=new CombatHud(scene,1024,['Texas','Shoto'],true);
  const snapshot=new Simulation(createGameConfig(1024,576)).snapshot();
  hud.update(snapshot,1024);
  const colours=texts.map(text=>(text.style as {color?:string}).color), changes=colorChanges();
  hud.update(snapshot,1024);
  expect(colorChanges()).toBe(changes);
  expect(texts.map(text=>(text.style as {color?:string}).color)).toEqual(colours);
  hud.destroy();
});
