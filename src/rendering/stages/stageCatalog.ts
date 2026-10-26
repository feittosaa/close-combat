import { validateStage } from './StageDefinition';
import type { StageDefinition, StageLayer } from './StageDefinition';

const manifests = import.meta.glob<StageDefinition>('../../assets/scenes/*/stage.json', { eager: true, import: 'default' });
const images = import.meta.glob<string>('../../assets/scenes/*/layers/*.png', { eager: true, import: 'default', query: '?url' });

export const DEFAULT_STAGE_ID = 'bar-anoitecer';
export const stages: readonly StageDefinition[] = Object.values(manifests);

export function getStageLayerUrl(stage: StageDefinition, layer: StageLayer): string {
  const url = images[`../../assets/scenes/${stage.id}/${layer.file}`];
  if (!url) throw new Error(`Imagem ausente no cenário ${stage.id}: ${layer.file}`);
  return url;
}

const ids = new Set<string>();
stages.forEach((stage) => {
  validateStage(stage);
  if (ids.has(stage.id)) throw new Error(`ID de cenário duplicado: ${stage.id}`);
  ids.add(stage.id);
  stage.layers.forEach((layer) => getStageLayerUrl(stage, layer));
});

export function getStageById(id: string): StageDefinition | undefined {
  return stages.find((stage) => stage.id === id);
}

function requireDefaultStage(): StageDefinition {
  const stage = getStageById(DEFAULT_STAGE_ID);
  if (!stage) throw new Error(`Cenário padrão ausente: ${DEFAULT_STAGE_ID}`);
  return stage;
}

export const defaultStage = requireDefaultStage();

export function stageTextureKey(stage: StageDefinition, layer: StageLayer): string {
  return `stage:${stage.id}:${layer.id}`;
}

/** Permanent training room, independent of the future general stage default. */
export const trainingStage = getStageById('sala-treino')!;
