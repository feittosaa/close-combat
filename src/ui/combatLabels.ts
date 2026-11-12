import type { CharacterMode } from '../engine/characters/CharacterState';
import type { HitEvent } from '../engine/combat/AttackResolver';
import type { MoveDefinition } from '../engine/data/moves';
import { t } from '../i18n/i18n';
export const stateLabel = (mode: CharacterMode): string => t(`state.${mode}`);
export function signedFrames(value: number): string { return `${value > 0 ? '+' : ''}${value}F`; }
export function moveInputLabel(move: MoveDefinition): string {
  if (move.notation) return move.notation;
  const command = [...(move.input.sequence ?? []).map(direction => direction.toLowerCase()), move.input.buttons.join('+')].join(',');
  return move.airborne ? `no ar + ${command}` : command;
}
export function contactLabel(hit: HitEvent): string {
  const result = t(hit.perfectBlock ? 'contact.perfectBlock' : hit.outcome === 'block' ? 'contact.blocked' : hit.context === 'block-punish' ? 'contact.blockPunish' :
    hit.context === 'whiff-punish' ? 'contact.whiffPunish' : hit.context === 'counter-hit' ? 'contact.counterHit' : 'contact.hit');
  return t('contact.summary', { player: hit.attackerId === 'player-1' ? 'P1' : 'P2', result, damage: hit.damage, advantage: signedFrames(hit.frameAdvantage) });
}
