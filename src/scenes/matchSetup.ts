import { defaultStage, trainingStage, getStageById } from '../rendering/stages/stageCatalog';
import { defaultCharacter, getCharacterById } from '../engine/data/characters';
export type MatchMode = 'versus' | 'training' | 'arcade' | 'tutorial' | 'combo-tutorial';
export interface FightSetup { fighterId?: string; opponentId?: string; stageId?: string; mode?: MatchMode; arcadeIndex?: number }
/** Uma luta espelhada de Arcade até novos personagens serem homologados. */
export function arcadeOpponents(playerId: string) { return [getCharacterById(playerId) ?? defaultCharacter]; }
export function opponentFor(playerId: string, _mode: MatchMode, _arcadeIndex = 0) { return getCharacterById(playerId) ?? defaultCharacter; }

export function isTrainingMode(mode:MatchMode):boolean {
  return mode==='training'||mode==='tutorial'||mode==='combo-tutorial';
}
/** Practice stays in its room, including when a general stage is requested. */
export function stageForMatch(mode:MatchMode,requestedId?:string){
  return isTrainingMode(mode)?trainingStage:(requestedId === trainingStage.id ? defaultStage : getStageById(requestedId??'')??defaultStage);
}
