// src/input/KeyboardInput.ts
import type { AttackButton, Direction, FrameInput } from './types';

/** Adaptador mínimo de teclado. O remapeamento será configurável em etapa posterior. */
export class KeyboardInput {
  private readonly pressed = new Set<string>();
  private readonly onKeyDown = (event: KeyboardEvent): void => { this.pressed.add(event.code); };
  private readonly onKeyUp = (event: KeyboardEvent): void => { this.pressed.delete(event.code); };

  constructor(private readonly target: Window = window) {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
  }

  read(facing: 'left' | 'right' = 'right'): FrameInput {
    const left = this.pressed.has('KeyA');
    const right = this.pressed.has('KeyD');
    const up = this.pressed.has('KeyW');
    const down = this.pressed.has('KeyS');
    const towardOpponent = facing === 'right' ? right : left;
    const awayFromOpponent = facing === 'right' ? left : right;
    const horizontal = towardOpponent === awayFromOpponent ? '' : (towardOpponent ? 'F' : 'B');
    const vertical = up === down ? '' : (up ? 'U' : 'D');
    const direction = (vertical && horizontal ? `${vertical}${horizontal}` : vertical || horizontal || 'N') as Direction;
    const buttons = new Set<AttackButton>();
    if (this.pressed.has('KeyJ')) buttons.add('1');
    if (this.pressed.has('KeyK')) buttons.add('2');
    if (this.pressed.has('KeyU')) buttons.add('3');
    if (this.pressed.has('KeyI')) buttons.add('4');
    return { direction, buttons };
  }

  destroy(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.pressed.clear();
  }
}
