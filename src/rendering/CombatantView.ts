// src/rendering/CombatantView.ts
import Phaser from 'phaser';
import type { CharacterState } from '../engine/characters/CharacterState';

/** Representação temporária de um lutador, sem autoridade sobre a simulação. */
export class CombatantView {
  readonly body: Phaser.GameObjects.Rectangle;

  private readonly color: number;

  constructor(scene: Phaser.Scene, x: number, y: number, color: number) {
    this.color = color;
    this.body = scene.add.rectangle(x, y, 54, 152, color).setOrigin(0.5, 1);
  }

  setPosition(x: number, y: number): void {
    this.body.setPosition(x, y);
  }

  sync(state: CharacterState): void {
    const facingSign = state.facing === 'right' ? 1 : -1;
    const lunge = state.mode === 'active' ? 7 * facingSign : 0;
    this.body.setPosition(state.x + lunge, state.y);

    if (state.hitFlashFrames > 0) {
      this.body.setFillStyle(0xffffff);
      this.body.setDisplaySize(56, state.crouching ? 96 : 152);
    } else if (state.mode === 'active') {
      this.body.setFillStyle(0xffd166);
      this.body.setDisplaySize(66, state.crouching ? 96 : 144);
    } else if (state.mode === 'startup') {
      this.body.setFillStyle(0xffa65b);
      this.body.setDisplaySize(58, state.crouching ? 96 : 152);
    } else if (state.mode === 'recovery') {
      this.body.setFillStyle(0xaaa6b1);
      this.body.setDisplaySize(54, state.crouching ? 96 : 152);
    } else {
      this.body.setFillStyle(this.color);
      this.body.setDisplaySize(54, state.crouching ? 96 : 152);
    }
  }

  destroy(): void {
    this.body.destroy();
  }
}
