import { expect, it } from 'vitest';
import { stages, defaultStage, trainingStage, getStageById, selectableStages } from '../rendering/stages/stageCatalog';
import { isTrainingMode, stageForMatch, type MatchMode } from '../scenes/matchSetup';
import { createStageLayout, getFightCameraFrame } from '../rendering/stages/stageLayout';
it('disponibiliza a sala de treino, as variantes do Saloon e a fazenda',()=>{
  expect(stages.map(s=>s.id).sort()).toEqual(['fazenda','sala-treino','saloon','saloon-dia','saloon-noite']);
  expect(selectableStages).toEqual(stages);
  expect(defaultStage).toBe(trainingStage);
  expect(getStageById('bar-anoitecer')).toBeUndefined();
  expect(getStageById('salao-treino')).toBeUndefined();
  expect(trainingStage.referenceSize).toEqual({width:1804,height:872});
  expect(trainingStage.layers[0].highFile).toBe('layers/sala-high.png');
  expect(trainingStage.layers.slice(1).every(layer => layer.frames?.length === 3 && layer.frameDuration === 12)).toBe(true);
});
it('usa o Saloon nos modos de combate e preserva a sala no treino',()=>{
  const saloon=getStageById('saloon')!;
  expect(saloon.layers[0].highFile).toBe('layers/saloon-high.png');
  expect(saloon.layers[1].frames).toHaveLength(5);
  expect(stageForMatch('versus','saloon')).toBe(saloon);
  expect(stageForMatch('arcade','saloon')).toBe(saloon);
  expect(stageForMatch('training','saloon')).toBe(trainingStage);
});
it.each(['saloon-dia','saloon-noite'])('reutiliza as chamas e compartilha a linha do chão em %s', id => {
  const stage = getStageById(id)!;
  expect(stage.groundY).toBe(getStageById('saloon')!.groundY);
  expect(stage.layers.filter(layer => layer.sourceStage === 'saloon')).toHaveLength(7);
  for (const layer of stage.layers.filter(layer => layer.sourceStage === 'saloon')) {
    expect(layer.frames).toHaveLength(5);
    expect(layer.size).toEqual({width:28,height:50});
  }
});
it('mantém o céu da fazenda alinhado à câmera e anima suas camadas', () => {
  const stage = getStageById('fazenda')!;
  expect(stage.layers.find(layer => layer.id === 'fazenda')?.highFile).toBe('layers/fazenda-high.png');
  const sky = stage.layers.find(layer => layer.id === 'ceu')!;
  expect(sky.parallax).toBe(1);
  expect(sky.motion?.axis).toBe('x');
  expect(sky.motion?.mode).toBe('oscillate');
  expect(sky.repeatWithoutFlip).toBe(true);
  expect(stage.layers.find(layer => layer.id === 'fumaca')?.motion?.axis).toBe('y');
  expect(stage.layers.find(layer => layer.id === 'sombra')?.motion?.axis).toBe('x');
});
it.each(['training','tutorial','versus','arcade'] as MatchMode[])('%s utiliza a sala',mode=>{
  expect(stageForMatch(mode,'sala-treino')).toBe(trainingStage);
  expect(stageForMatch(mode,'inexistente')).toBe(trainingStage);
  expect(isTrainingMode(mode)).toBe(['training','tutorial'].includes(mode));
});
it('alinha o chão e preserva a câmera fixa',()=>{
  const layout=createStageLayout(defaultStage,1024,576,488);
  const frame=getFightCameraFrame(layout,[]);
  const project=(y:number)=>288+(layout.originY+y*layout.scale-frame.scrollY-288)*frame.zoom;
  expect(project(defaultStage.groundY)).toBeCloseTo(488);
  expect(frame.zoom).toBe(1.6);
});
