import { defaultCharacter, getCharacterById } from '../engine/data/characters';
export type MatchMode = 'versus' | 'training' | 'arcade' | 'tutorial' | 'combo-tutorial';
export interface FightSetup { fighterId?: string; opponentId?: string; stageId?: string; mode?: MatchMode; arcadeIndex?: number }
/** Uma luta espelhada de Arcade até novos personagens serem homologados. */
export function arcadeOpponents(playerId: string) { return [getCharacterById(playerId) ?? defaultCharacter]; }
export function opponentFor(playerId: string, _mode: MatchMode, _arcadeIndex = 0) { return getCharacterById(playerId) ?? defaultCharacter; }
