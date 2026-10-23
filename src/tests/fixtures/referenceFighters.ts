/** Historical imported books are regression fixtures, excluded from live player commands. */
import { ayla as currentAyla, aylaLegacyMoves } from '../../engine/data/fighters/ayla';
import { gris as currentGris, grisLegacyMoves } from '../../engine/data/fighters/gris';
import { aylaCombatMoves, aylaCombatRules, aylaCombos } from '../../engine/data/combat/aylaCombatBook';
import type { CharacterDefinition } from '../../engine/data/characters';
export const ayla: CharacterDefinition = { ...currentAyla, moves: [...aylaCombatMoves, ...aylaLegacyMoves.map(move => ({ ...move, legacy: true }))], combos: aylaCombos, combatRules: aylaCombatRules };
export const gris: CharacterDefinition = { ...currentGris, moves: grisLegacyMoves, combos: undefined, combatRules: undefined };
