import { shotoSpriteManifest } from '../rendering/animations/shotoSprites';
import { FIGHT_WORLD_SCALE } from '../engine/data/fightFraming';
import { Simulation } from '../engine/simulation/Simulation';
import { expect, it, vi } from 'vitest';
import { LOGICAL_VIEW, RENDER_SIZE, configureUiCamera, getUiViewport, projectCameraToOutput } from '../rendering/presentation';
import { getFightCameraFrame, createStageLayout } from '../rendering/stages/stageLayout';
import { defaultStage } from '../rendering/stages/stageCatalog';
import { createGameConfig } from '../engine/data/gameConfig';

it('mapeia todos os cantos do menu lógico para um canvas real 1920x1080 sem deformar', () => {
  expect(RENDER_SIZE).toEqual({width:1920,height:1080});
  const f=projectCameraToOutput({zoom:1,scrollX:0,scrollY:0},LOGICAL_VIEW,RENDER_SIZE);
  const x=(v:number)=>960+(v-f.scrollX-960)*f.zoom;
  const y=(v:number)=>540+(v-f.scrollY-540)*f.zoom;
  expect(f.zoom).toBe(1.875);
  expect([x(0),y(0),x(1024),y(576)]).toEqual([0,0,1920,1080]);
});
it('mantém escala fixa e o piso em Full HD', () => {
  const config=createGameConfig(LOGICAL_VIEW.width,LOGICAL_VIEW.height);
  const layout=createStageLayout(defaultStage,1024,576,config.arena.floorY);
  const logical=getFightCameraFrame(layout,[750,850]);
  const f=projectCameraToOutput(logical,LOGICAL_VIEW,RENDER_SIZE);
  const y=(v:number)=>540+(v-f.scrollY-540)*f.zoom;
  expect(logical.zoom).toBe(FIGHT_WORLD_SCALE);
  expect(y(config.arena.floorY)).toBeCloseTo(915);
  expect(y(config.arena.floorY-144)).toBeGreaterThan(220);
  expect(y(config.arena.floorY)-y(config.arena.floorY-144)).toBeCloseTo(432);
  expect(config.arena).toEqual({left:24,right:1000,floorY:488,maxSeparation:499.2});
});
it('mantém ambos os lados visíveis ao afastar e trocar lutadores de lado em 1080p',()=>{
  const layout=createStageLayout(defaultStage,1024,576,488);
  const left=24+layout.arenaOffsetX,right=1000+layout.arenaOffsetX;
  for(const positions of [[left,left+40],[left,left+464],[right-464,right],[right,right-512]]){
    const f=projectCameraToOutput(getFightCameraFrame(layout,positions),LOGICAL_VIEW,RENDER_SIZE);
    for(const p of positions){
      const x=960+(p-f.scrollX-960)*f.zoom;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1920);
    }
  }
});

it('ancora o HUD no canto superior para textos com scrollFactor zero não saírem da tela',()=>{
  const camera={setOrigin:vi.fn(),setZoom:vi.fn(),setScroll:vi.fn()};
  Object.values(camera).forEach(fn=>fn.mockReturnValue(camera));
  configureUiCamera(camera as never,RENDER_SIZE);
  expect(camera.setOrigin).toHaveBeenCalledWith(0,0);
  expect(camera.setZoom).toHaveBeenCalledWith(1.875);
  expect(camera.setScroll).toHaveBeenCalledWith(0,0);
});

it('mantém escala e altura constantes no contato, afastamento e troca de lados',()=>{
  const layout=createStageLayout(defaultStage,1024,576,488);
  for(const positions of [[750,850],[304,1280],[1280,304],[400,500]]) {
    const frame=getFightCameraFrame(layout,positions);
    expect(frame.zoom).toBe(FIGHT_WORLD_SCALE);
    expect(frame.scrollY).toBeCloseTo(75);
    const headAtApex=488-(110+144)*frame.zoom;
    expect(headAtApex).toBeGreaterThan(78);
  }
  expect(getFightCameraFrame(layout,[400,500]).scrollX).not.toBe(getFightCameraFrame(layout,[900,1000]).scrollX);
});

it('acompanha a subida e a descida do salto real com zoom fixo',()=>{
  const config=createGameConfig(1024,576);
  const sim=new Simulation(config,undefined,{training:true,initialDistance:96});
  const layout=createStageLayout(defaultStage,1024,576,488);
  const neutral={direction:'N' as const,buttons:new Set<never>()};
  let airborne=false;
  for(let frame=0;frame<60;frame++){
    sim.stepFrame([{...neutral,direction:frame===0?'U':'N'},neutral]);
    const snapshot=sim.snapshot();
    const camera=getFightCameraFrame(layout,snapshot.characters.map(c=>c.x),snapshot.characters.map(c=>c.y));
    expect(camera.zoom).toBe(FIGHT_WORLD_SCALE);
    expect(camera.scrollY).toBeLessThanOrEqual(75);
    if (!snapshot.characters[0].grounded) expect(camera.scrollY).toBeLessThan(75);
    for(const fighter of snapshot.characters){
      const head=288+(fighter.y-(144*1.03*1.15*1.1)-camera.scrollY-288)*camera.zoom;
      expect(head).toBeGreaterThan(78);
      expect(fighter.y).toBeLessThanOrEqual(488);
      airborne ||= !fighter.grounded;
    }
  }
  expect(airborne).toBe(true);
  expect(sim.snapshot().characters[0].grounded).toBe(true);
});

it('amplia o desenho em mais 10% e deixa as silhuetas em pé próximas das bordas sem mudar o zoom',()=>{
  expect(shotoSpriteManifest.displaySize!.height).toBeCloseTo(172.8*1.03*1.15*1.1);
  const config=createGameConfig(1024,576);
  const layout=createStageLayout(defaultStage,1024,576,488);
  const positions=[layout.worldWidth/2-config.arena.maxSeparation!/2,layout.worldWidth/2+config.arena.maxSeparation!/2];
  expect(positions[1]-positions[0]).toBeCloseTo(config.arena.maxSeparation!);
  const frame=getFightCameraFrame(layout,positions);
  // Visible neutral body extends at most 140 source pixels from the root, not the transparent cell edge.
  const silhouetteHalfWidth=140*shotoSpriteManifest.displaySize!.width/768;
  const left=512+(positions[0]-silhouetteHalfWidth-frame.scrollX-512)*frame.zoom;
  const right=512+(positions[1]+silhouetteHalfWidth-frame.scrollX-512)*frame.zoom;
  expect(left).toBeGreaterThan(0);expect(left).toBeLessThan(65);
  expect(right).toBeLessThan(1024);expect(right).toBeGreaterThan(959);
});


it.each([{width: 2560, height: 1080}, {width: 3840, height: 1080}, {width: 1920, height: 1080}])('preserves fighter and HUD scale in a wide output: $width x $height', output => {
  const viewport = getUiViewport(output);
  expect(viewport.width).toBe(1920);
  expect(viewport.height).toBe(1080);
  expect(viewport.x).toBe((output.width - 1920) / 2);
  const frame = projectCameraToOutput({zoom: FIGHT_WORLD_SCALE, scrollX: 0, scrollY: 0}, LOGICAL_VIEW, output);
  expect(frame.zoom).toBe(FIGHT_WORLD_SCALE * 1.875);
  const center = output.width / 2 + (512 - frame.scrollX - output.width / 2) * frame.zoom;
  expect(center).toBeCloseTo(output.width / 2);
});
