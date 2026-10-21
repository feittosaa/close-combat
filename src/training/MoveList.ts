import type { CharacterDefinition } from '../engine/data/characters';
import type { MoveCategory, ComboRecipe } from '../engine/data/combat/CombatBook';
import type { MoveDefinition } from '../engine/data/moves';
import { moveInputLabel } from '../ui/combatLabels';

export type MoveListCategory = MoveCategory | 'all' | 'combos';
export interface MoveListEntry {
  id: string;
  title: string;
  notation: string;
  categories: readonly MoveListCategory[];
  move?: MoveDefinition;
  combo?: ComboRecipe;
}
export function fighterMoveList(fighter: CharacterDefinition): readonly MoveListEntry[] {
  const moves = fighter.moves.filter(move => !move.legacy).map(move => ({
    id: move.id, title: move.combat?.name ?? move.id.replace(/-/g, ' '), notation: moveInputLabel(move), move,
    categories: move.combat?.categories ?? (move.throw ? ['throws'] : move.kind === 'special' || move.hitLevel === 'special' || move.projectile ? ['specials'] : move.crouching ? ['crouching'] : ['basics']),
  } as MoveListEntry));
  return [...moves, ...(fighter.combos ?? []).map(combo => ({ id: combo.id, title: combo.name,
    notation: combo.notation, categories: ['combos'] as const, combo }))];
}
export function filterMoveList(entries: readonly MoveListEntry[], category: MoveListCategory, query: string): readonly MoveListEntry[] {
  const term = query.trim().toLocaleLowerCase();
  return entries.filter(entry => (category === 'all' || entry.categories.includes(category)) &&
    (!term || `${entry.title} ${entry.notation}`.toLocaleLowerCase().includes(term)));
}
