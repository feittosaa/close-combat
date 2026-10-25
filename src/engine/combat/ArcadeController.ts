import type { CharacterDefinition } from '../data/characters';
import type { CharacterState } from '../characters/CharacterState';
import type { FrameInput } from '../../input/types';
const neutral = (): FrameInput => ({ direction: 'N', buttons: new Set() });

/** IA determinística que usa somente entradas e os quatro golpes do livro local. */
export class ArcadeController {
  private nextDecisionFrame = 0;
  private seed = 1;
  constructor(private readonly fighter: CharacterDefinition, private readonly opponent: CharacterDefinition) { this.reset(); }
  reset(): void { this.nextDecisionFrame = 0; this.seed = 173; }
  readInput(frame: number, self: CharacterState, opponent: CharacterState): FrameInput {
    if (self.attack || !self.grounded || self.mode === 'hitstun') return neutral();
    const distance = Math.abs(self.x - opponent.x);
    const threat = this.opponent.moves.find(move => move.id === opponent.attack?.moveId);
    if (threat && distance < 140 && (opponent.attack?.elapsedFrames ?? 0) >= 4) return { direction: 'B', buttons: new Set() };
    if (self.mode === 'blockstun') return neutral();
    const candidates = this.fighter.moves.filter(move => distance <= move.hitbox.forward + move.hitbox.width + opponent.collision.bodyWidth / 2);
    if (candidates.length && frame >= this.nextDecisionFrame) {
      this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
      const move = candidates[this.seed % candidates.length];
      this.nextDecisionFrame = frame + move.startup + move.activeFrames + move.recovery + 12;
      return { direction: 'N', buttons: new Set(move.input.buttons) };
    }
    return { direction: distance > 64 ? 'F' : 'N', buttons: new Set() };
  }
}
