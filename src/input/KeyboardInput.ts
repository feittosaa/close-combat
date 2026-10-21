// src/input/KeyboardInput.ts
import type { AttackButton, Direction, FrameInput } from './types';

export interface KeyboardLayout {
  directions: { left: string; right: string; up: string; down: string };
  buttons: Record<AttackButton, string>;
}

/** Adaptador mínimo de teclado. O layout configurado é independente dos comandos do motor. */
export class KeyboardInput {
  private readonly pressed = new Set<string>();
  private readonly waitingForRelease = new Set<string>();
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.waitingForRelease.has(event.code)) this.pressed.add(event.code);
  };
  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
    this.waitingForRelease.delete(event.code);
  };
  private readonly onBlur = (): void => {
    this.pressed.clear();
    this.waitingForRelease.clear();
  };

  constructor(
    private readonly layout: KeyboardLayout,
    private readonly target: Window = window,
  ) {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  read(facing: 'left' | 'right' = 'right'): FrameInput {
    const left = this.pressed.has(this.layout.directions.left);
    const right = this.pressed.has(this.layout.directions.right);
    const up = this.pressed.has(this.layout.directions.up);
    const down = this.pressed.has(this.layout.directions.down);
    const towardOpponent = facing === 'right' ? right : left;
    const awayFromOpponent = facing === 'right' ? left : right;
    const horizontal = towardOpponent === awayFromOpponent ? '' : towardOpponent ? 'F' : 'B';
    const vertical = up === down ? '' : up ? 'U' : 'D';
    const direction = (vertical && horizontal ? `${vertical}${horizontal}` : vertical || horizontal || 'N') as Direction;
    const buttons = new Set<AttackButton>();
    for (const button of ['1', '2', '3', '4'] as const) {
      if (this.pressed.has(this.layout.buttons[button])) buttons.add(button);
    }
    return { direction, buttons };
  }

  /** Reset must not carry a held attack/direction into a new exercise. */
  clear(): void {
    this.pressed.forEach((code) => this.waitingForRelease.add(code));
    this.pressed.clear();
  }

  destroy(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
    this.pressed.clear();
    this.waitingForRelease.clear();
  }
}
