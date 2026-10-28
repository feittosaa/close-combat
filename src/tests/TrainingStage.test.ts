import { expect, it } from 'vitest';
import { stages, defaultStage, trainingStage, getStageById, selectableStages } from '../rendering/stages/stageCatalog';
import { isTrainingMode, stageForMatch, type MatchMode } from '../scenes/matchSetup';
import { createStageLayout, getFightCameraFrame } from '../rendering/stages/stageLayout';
it('entrega o bar como cenário geral e preserva a sala de prática',()=>{
  expect(stages.map(s=>s.id).sort()).toEqual(['bar-anoitecer','sala-treino','salao-treino']);
  expect(getStageById('cais')).toBeUndefined();
  expect(defaultStage.id).toBe('bar-anoitecer');
  expect(trainingStage.referenceSize).toEqual({width:2172,height:904});
  expect(trainingStage.layers.every(layer=>layer.parallax===1)).toBe(true);
});
it.each(['training','tutorial','combo-tutorial'] as MatchMode[])('%s fixa a sala mesmo com o bar solicitado',mode=>{
  expect(isTrainingMode(mode)).toBe(true);
  for(const requested of [undefined,'cais','outro-cenario','sala-treino','bar-anoitecer'])expect(stageForMatch(mode,requested)).toBe(trainingStage);
});
it.each(['versus','arcade'] as MatchMode[])('%s usa o bar e não oferece sala de treino',mode=>{
  expect(isTrainingMode(mode)).toBe(false);
  for(const requested of [undefined,'cais','outro-cenario','sala-treino','bar-anoitecer'])expect(stageForMatch(mode,requested)).toBe(defaultStage);
});
it('mantém pouco piso visível atrás dos pés sem alterar a câmera ou escala dos lutadores',()=>{
  const layout=createStageLayout(defaultStage,1024,576,488);
  const frame=getFightCameraFrame(layout,[]);
  const project=(sourceY:number)=>288+(layout.originY+sourceY*layout.scale-frame.scrollY-288)*frame.zoom;
  // Authored facade/paving junction, measured on the final source.
  const wallFloorY=project(592 + defaultStage.topExtension!);
  expect(wallFloorY/576).toBeGreaterThan(.75);
  expect(wallFloorY/576).toBeLessThan(.85);
  expect(project(defaultStage.groundY)).toBeCloseTo(488);
  expect(488-wallFloorY).toBeLessThan(45);
  expect(frame.zoom).toBe(1.6);
  expect(defaultStage.layers.map(l=>l.id)).toEqual(['bar']);
  expect(defaultStage.layers.every(l=>l.parallax===1)).toBe(true);
});

it('oferece o Salão de Treino em PvP e Arcade sem substituir a sala de prática', () => {
  const hall = getStageById('salao-treino')!;
  expect(hall.name).toBe('Salão de Treino');
  expect(hall.referenceSize).toEqual({ width: 1942, height: 809 });
  expect(selectableStages.map(stage => stage.id)).toEqual(['bar-anoitecer', 'salao-treino']);
  for (const mode of ['versus', 'arcade'] as const) expect(stageForMatch(mode, hall.id)).toBe(hall);
  for (const mode of ['training', 'tutorial', 'combo-tutorial'] as const) expect(stageForMatch(mode, hall.id)).toBe(trainingStage);
  const layout = createStageLayout(hall, 1024, 576, 488);
  for (const rise of [0, 120, 300]) {
    const frame = getFightCameraFrame(layout, [], [488 - rise]);
    const project = (y: number) => 288 + (layout.originY + y * layout.scale - frame.scrollY - 288) * frame.zoom;
    expect(project(0)).toBeLessThanOrEqual(0);
    expect(project(hall.referenceSize.height)).toBeGreaterThanOrEqual(576);
    expect(frame.zoom).toBe(1.6);
  }
});
