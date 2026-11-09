/** A scenery in the selector: one entry that may offer variations (the Saloon: day, night, retro). */
export interface StageGroup { id: string; variants: readonly string[]; practice?: boolean }
/** Menu order: the practice room is always the last scenery. */
export const STAGE_GROUPS: readonly StageGroup[] = [
  { id: 'fazenda', variants: ['fazenda'] },
  { id: 'saloon', variants: ['saloon-dia', 'saloon-noite', 'saloon'] },
  { id: 'sala-treino', variants: ['sala-treino'], practice: true },
];
export type StageMode = 'versus' | 'arcade';
/** A player's pick: a scenery and, when it has variations, the chosen one; `random` leaves it to chance. */
export interface StageChoice { groupId: string | 'random'; variantId?: string }
export const RANDOM_STAGE: StageChoice = { groupId: 'random' };

/** Arcade blocks the practice room; versus offers every scenery. */
export const groupsFor = (mode: StageMode): readonly StageGroup[] => STAGE_GROUPS.filter(group => mode === 'versus' || !group.practice);
export const groupOfStage = (stageId: string): StageGroup | undefined => STAGE_GROUPS.find(group => group.variants.includes(stageId));
const pick = <T>(items: readonly T[], random: () => number): T => items[Math.min(items.length - 1, Math.floor(random() * items.length))];

/** The scenery a choice stands for. A random choice picks a scenery, then one of its variations: the Saloon counts once. */
export function resolveChoice(choice: StageChoice, groups: readonly StageGroup[], random: () => number = Math.random): string {
  const group = choice.groupId === 'random' ? pick(groups, random) : groups.find(entry => entry.id === choice.groupId) ?? groups[0];
  return choice.variantId && group.variants.includes(choice.variantId) ? choice.variantId : choice.groupId === 'random' ? pick(group.variants, random) : group.variants[0];
}

export interface StageDraw { stageId: string; candidates: readonly [string, string]; winner: 0 | 1; drawn: boolean }
/** Two players choose different sceneries: a coin flip (50% each) decides. Equal picks need no draw. */
export function drawVersusStage(choices: readonly [StageChoice, StageChoice], groups: readonly StageGroup[], random: () => number = Math.random): StageDraw {
  const candidates = [resolveChoice(choices[0], groups, random), resolveChoice(choices[1], groups, random)] as const;
  if (candidates[0] === candidates[1]) return { stageId: candidates[0], candidates, winner: 0, drawn: false };
  const winner = random() < .5 ? 0 : 1;
  return { stageId: candidates[winner], candidates, winner, drawn: true };
}
