import { defaultStage, trainingStage, getStageById, selectableStages } from '../rendering/stages/stageCatalog';
import { characters, defaultCharacter, getCharacterById } from '../engine/data/characters';
import type { ArcadeDifficulty } from '../engine/combat/ArcadeController';
export type MatchMode = 'versus' | 'training' | 'arcade' | 'tutorial';
export interface FightSetup { fighterId?: string; opponentId?: string; stageId?: string; mode?: MatchMode; arcadeIndex?: number; arcadeRun?: ArcadeRun; difficulty?: ArcadeDifficulty; fighterPalette?: 0 | 1; opponentPalette?: 0 | 1 }
/** Adversários e cenários de uma jornada de Arcade, sorteados uma única vez e preservados entre as lutas. */
export interface ArcadeRun { opponents: string[]; stages: string[] }
function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
/** Enfrenta todos os personagens em ordem aleatória, cada luta em um cenário aleatório sem repetir o anterior. */
export function createArcadeRun(random: () => number = Math.random): ArcadeRun {
  const opponents = shuffled(characters.map(fighter => fighter.id), random);
  const stageIds = selectableStages.map(stage => stage.id);
  const stagesForRun: string[] = [];
  opponents.forEach(() => {
    const previous = stagesForRun[stagesForRun.length - 1];
    const options = stageIds.length > 1 ? stageIds.filter(id => id !== previous) : stageIds;
    stagesForRun.push(options[Math.floor(random() * options.length)]);
  });
  return { opponents, stages: stagesForRun };
}
export function opponentFor(playerId: string) { return getCharacterById(playerId) ?? defaultCharacter; }

export function isTrainingMode(mode:MatchMode):boolean {
  return mode==='training'||mode==='tutorial';
}
/** Practice stays in its room, including when a general stage is requested. */
export function stageForMatch(mode:MatchMode,requestedId?:string){
  return isTrainingMode(mode)?trainingStage:(getStageById(requestedId??'')??defaultStage);
}

export function matchPalettes(setup: FightSetup, sameFighter: boolean): [boolean, boolean] {
  const player = setup.fighterPalette === 1;
  return [player, setup.opponentPalette === undefined ? sameFighter && !player : setup.opponentPalette === 1];
}

export function selectsOpponent(mode: MatchMode): boolean {
  return mode === 'versus' || mode === 'training';
}
