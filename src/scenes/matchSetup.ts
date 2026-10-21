import { playableCharacters, getCharacterById } from '../engine/data/characters';

export type MatchMode = 'versus' | 'training' | 'arcade';
export interface FightSetup {
  fighterId?: string;
  opponentId?: string;
  stageId?: string;
  mode?: MatchMode;
  arcadeIndex?: number;
}

/** P1 escolhe; o adversário de P2 é determinado pelo modo. */
export function arcadeOpponents(playerId: string) {
  return playableCharacters.filter((fighter) => fighter.id !== playerId)
    .sort((left, right) => Number(right.id === 'tester') - Number(left.id === 'tester'));
}

export function opponentFor(playerId: string, mode: MatchMode, arcadeIndex = 0) {
  if (mode === 'training') return getCharacterById('tester')!;
  const ladder = arcadeOpponents(playerId);
  if (mode === 'versus') return playableCharacters.find((fighter) => fighter.id !== playerId && fighter.id !== 'tester') ?? ladder[0];
  return ladder[Math.min(ladder.length - 1, Math.max(0, Math.trunc(arcadeIndex)))];
}
