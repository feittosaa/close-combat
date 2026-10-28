import { expect, it } from 'vitest';
import { createGameConfig } from '../engine/data/gameConfig';
import { Simulation } from '../engine/simulation/Simulation';
import { createStageLayout, getFightCameraFrame } from '../rendering/stages/stageLayout';
import { defaultStage } from '../rendering/stages/stageCatalog';
import type { FrameInput } from '../input/types';
const neutral:FrameInput={direction:'N',buttons:new Set()};
const backward:FrameInput={...neutral,direction:'B'};
it('limita afastamento sem empurrar o oponente parado nem mudar a escala da câmera',()=>{
  for(const index of [0,1]){
    const config=createGameConfig(1024,576);
    const sim=new Simulation(config,undefined,{training:true,initialDistance:510});
    const anchored=sim.snapshot().characters[1-index].x;
    for(let i=0;i<120;i++){
      const inputs=[neutral,neutral];inputs[index]=backward;sim.stepFrame(inputs);
      const characters=sim.snapshot().characters;
      expect(characters[1-index].x).toBe(anchored);
      expect(Math.abs(characters[1].x-characters[0].x)).toBeLessThanOrEqual(config.arena.maxSeparation!+1e-6);
    }
  }
});
it('mantém ambos visíveis ao recuar juntos e permite aproximação posterior',()=>{
  const config=createGameConfig(1024,576),layout=createStageLayout(defaultStage,1024,576,488);
  const sim=new Simulation(config,undefined,{training:true});
  for(let i=0;i<150;i++)sim.stepFrame([backward,backward]);
  const positions=sim.snapshot().characters.map(c=>c.x+layout.arenaOffsetX);
  const frame=getFightCameraFrame(layout,positions);
  for(const x of positions){
    const projected=512+(x-frame.scrollX-512)*frame.zoom;
    expect(projected).toBeGreaterThan(64);
    expect(projected).toBeLessThan(960);
  }
  const previous=Math.abs(positions[0]-positions[1]);
  for(let i=0;i<10;i++)sim.stepFrame([{...neutral,direction:'F'},neutral]);
  const next=sim.snapshot().characters;
  expect(Math.abs(next[0].x-next[1].x)).toBeLessThan(previous);
});
