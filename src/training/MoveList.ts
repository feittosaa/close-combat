import type { CharacterDefinition, ComboRecipe } from '../engine/data/characters';
import type { MoveDefinition } from '../engine/data/moves';
export type MoveListCategory = 'all' | 'basics' | 'combos' | 'crouching' | 'power' | 'throw' | 'special' | 'ultimate';
export interface MoveListEntry {
  id: string; title: string; notation: string; categories: readonly MoveListCategory[];
  move?: MoveDefinition; combo?: ComboRecipe;
}
export function fighterMoveList(fighter: CharacterDefinition): readonly MoveListEntry[] {
  return [...fighter.moves.map(move => ({ id: move.id, title: move.name, notation: move.notation ?? move.input.buttons.join('+'), categories: [move.category === 'basic' || !move.category ? 'basics' : move.category] as readonly MoveListCategory[], move })),
    ...(fighter.combos ?? []).map(combo => ({ id: combo.id, title: combo.name, notation: combo.notation, categories: ['combos'] as const, combo }))];
}
export function filterMoveList(entries: readonly MoveListEntry[], category: MoveListCategory, query: string): readonly MoveListEntry[] {
  const term = query.trim().toLocaleLowerCase();
  return entries.filter(entry => (category === 'all' || entry.categories.includes(category)) &&
    (!term || `${entry.title} ${entry.notation}`.toLocaleLowerCase().includes(term)));
}
