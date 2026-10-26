import { expect, it } from 'vitest';
import { stages, defaultStage, trainingStage, getStageById } from '../rendering/stages/stageCatalog';
import { isTrainingMode, stageForMatch, type MatchMode } from '../scenes/matchSetup';
it('remove o Cais e entrega apenas a sala de treino no catálogo',()=>{
  expect(stages.map(s=>s.id)).toEqual(['sala-treino']);
  expect(getStageById('cais')).toBeUndefined();
  expect(defaultStage).toBe(trainingStage);
  expect(trainingStage.referenceSize).toEqual({width:1774,height:887});
  expect(trainingStage.layers.every(layer=>layer.parallax===1)).toBe(true);
});
it.each(['training','tutorial','combo-tutorial'] as MatchMode[])('%s fixa a sala mesmo quando recebe ID antigo ou externo',mode=>{
  expect(isTrainingMode(mode)).toBe(true);
  for(const requested of [undefined,'cais','outro-cenario','sala-treino'])expect(stageForMatch(mode,requested)).toBe(trainingStage);
});
it.each(['versus','arcade'] as MatchMode[])('%s usa temporariamente a única opção de cenário geral',mode=>{
  expect(isTrainingMode(mode)).toBe(false);
  expect(stageForMatch(mode)).toBe(trainingStage);
  expect(stageForMatch(mode,'cais')).toBe(trainingStage);
});
