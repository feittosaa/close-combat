import { expect, it } from 'vitest';
import { stages, defaultStage, trainingStage, getStageById, selectableStages } from '../rendering/stages/stageCatalog';
import { isTrainingMode, stageForMatch, type MatchMode } from '../scenes/matchSetup';
import { createStageLayout, getFightCameraFrame } from '../rendering/stages/stageLayout';
it('disponibiliza a sala de treino e o Saloon',()=>{
  expect(stages.map(s=>s.id).sort()).toEqual(['sala-treino','saloon']);
  expect(selectableStages).toEqual(stages);
  expect(defaultStage).toBe(trainingStage);
  expect(getStageById('bar-anoitecer')).toBeUndefined();
  expect(getStageById('salao-treino')).toBeUndefined();
  expect(trainingStage.referenceSize).toEqual({width:1424,height:688});
  expect(trainingStage.layers[0].frames).toHaveLength(4);
  expect(trainingStage.layers[0].frameDuration).toBe(12);
});
it('usa o Saloon nos modos de combate e preserva a sala no treino',()=>{
  const saloon=getStageById('saloon')!;
  expect(saloon.layers[0].highFile).toBe('layers/saloon-high.png');
  expect(saloon.layers[1].frames).toHaveLength(5);
  expect(stageForMatch('versus','saloon')).toBe(saloon);
  expect(stageForMatch('arcade','saloon')).toBe(saloon);
  expect(stageForMatch('training','saloon')).toBe(trainingStage);
});
it.each(['training','tutorial','combo-tutorial','versus','arcade'] as MatchMode[])('%s utiliza a sala',mode=>{
  expect(stageForMatch(mode,'sala-treino')).toBe(trainingStage);
  expect(stageForMatch(mode,'inexistente')).toBe(trainingStage);
  expect(isTrainingMode(mode)).toBe(['training','tutorial','combo-tutorial'].includes(mode));
});
it('alinha o chão e preserva a câmera fixa',()=>{
  const layout=createStageLayout(defaultStage,1024,576,488);
  const frame=getFightCameraFrame(layout,[]);
  const project=(y:number)=>288+(layout.originY+y*layout.scale-frame.scrollY-288)*frame.zoom;
  expect(project(defaultStage.groundY)).toBeCloseTo(488);
  expect(frame.zoom).toBe(1.6);
});
