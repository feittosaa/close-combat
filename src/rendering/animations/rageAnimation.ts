import type { CharacterState } from '../../engine/characters/CharacterState';

/** Drawing at the height of the breaker, held during its pause. */
const BREAKER_PEAK_DRAWING = 3;

/** Drawing of the combo breaker or air recovery pose shown right after the rage action, if it is still playing. */
export function rageDrawing(state: CharacterState, frame: number): { name: string; drawing: number } | undefined {
  const rage = state.rageAnimation, age = frame - (rage?.startedFrame ?? -Infinity);
  if (!rage || age < 0 || age >= 24 || state.attack || ['hitstun', 'knockdown'].includes(state.mode)) return undefined;
  if (rage.kind === 'air-recovery') return { name: 'air-recovery', drawing: Math.min(5, Math.floor(age / 4)) };
  // The pause freezes the clock at the breaker's first frame, so the pause shows the peak drawing and the rest plays out after it.
  return { name: rage.airborne ? 'combo-breaker-air' : 'combo-breaker', drawing: age < 1 ? BREAKER_PEAK_DRAWING : Math.min(5, BREAKER_PEAK_DRAWING + 1 + Math.floor((age - 1) / 8)) };
}

/** Only the combo breaker has drawings for every fighter; air recovery exists for SM0G-000 alone. */
export const breakerDrawing = (state: CharacterState, frame: number) => state.rageAnimation?.kind === 'breaker' ? rageDrawing(state, frame) : undefined;
