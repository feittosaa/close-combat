import { defaultStage, trainingStage, getStageById } from '../rendering/stages/stageCatalog';
import { groupsFor, resolveChoice } from '../rendering/stages/stageGroups';
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
/**
 * Enfrenta todos os personagens em ordem aleatória, cada luta em um cenário aleatório sem repetir o anterior.
 * A sala de treino fica bloqueada no Arcade e o Saloon conta como um cenário só: dia, noite e retrô nunca se repetem em sequência.
 */
export function createArcadeRun(random: () => number = Math.random): ArcadeRun {
  const opponents = shuffled(characters.map(fighter => fighter.id), random);
  const groups = groupsFor('arcade');
  const stagesForRun: string[] = [];
  let previousGroup: string | undefined;
  opponents.forEach(() => {
    const options = groups.length > 1 ? groups.filter(group => group.id !== previousGroup) : groups;
    const group = options[Math.min(options.length - 1, Math.floor(random() * options.length))];
    previousGroup = group.id;
    stagesForRun.push(resolveChoice({ groupId: group.id, variantId: group.variants[Math.floor(random() * group.variants.length)] }, groups, random));
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
