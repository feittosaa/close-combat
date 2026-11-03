import { expect, it } from 'vitest';
import { contactEffectKey } from '../rendering/contactEffects';
import { shoto } from '../engine/data/fighters/shoto';
import type { HitEvent } from '../engine/combat/AttackResolver';

it('selects dedicated images for a perfect block', () => {
  const event: HitEvent = {attackerId:'player-1',targetId:'player-2',moveId:'light-punch',damage:0,outcome:'block',
    perfectBlock:true,pushback:0,attackerRecoveryFrames:0,defenderStunFrames:0,frameAdvantage:0};
  expect(contactEffectKey(event,shoto.moves.find(move=>move.id==='light-punch'))).toBe('block-perfect');
  expect(contactEffectKey(event,shoto.moves.find(move=>move.id==='heavy-punch'))).toBe('block-perfect-heavy');
});
