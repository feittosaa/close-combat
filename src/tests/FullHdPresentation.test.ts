import { expect, it, vi } from 'vitest';
import { LOGICAL_VIEW, RENDER_SIZE, configureUiCamera, projectCameraToOutput } from '../rendering/presentation';
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
it('aumenta enquadramento próximo em 26% preservando o piso e espaço do HUD em Full HD', () => {
  const config=createGameConfig(LOGICAL_VIEW.width,LOGICAL_VIEW.height);
  const layout=createStageLayout(defaultStage,1024,576,config.arena.floorY);
  const logical=getFightCameraFrame(layout,[750,850]);
  const f=projectCameraToOutput(logical,LOGICAL_VIEW,RENDER_SIZE);
  const y=(v:number)=>540+(v-f.scrollY-540)*f.zoom;
  expect(logical.zoom).toBe(1.95);
  expect(logical.zoom/1.55).toBeCloseTo(1.2580645);
  expect(y(config.arena.floorY)).toBeCloseTo(915);
  expect(y(config.arena.floorY-144)).toBeGreaterThan(220);
  expect(y(config.arena.floorY)-y(config.arena.floorY-144)).toBeCloseTo(526.5);
  expect(config.arena).toEqual({left:24,right:1000,floorY:488});
});
it('mantém ambos os lados visíveis ao afastar e trocar lutadores de lado em 1080p',()=>{
  const layout=createStageLayout(defaultStage,1024,576,488);
  const left=24+layout.arenaOffsetX,right=1000+layout.arenaOffsetX;
  for(const positions of [[left,left+40],[left,right],[right-40,right],[right,left]]){
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
