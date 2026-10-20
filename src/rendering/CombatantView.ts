import Phaser from 'phaser';
import type { CharacterState } from '../engine/characters/CharacterState';
import { getCharacterAnimationKey } from './animations/CharacterAnimationMap';

/** Visual do lutador; a simulação continua sendo a autoridade sobre o combate. */
export class CombatantView {
  private readonly sprite?: Phaser.GameObjects.Sprite;
  private readonly placeholder?: Phaser.GameObjects.Rectangle;
  private readonly color: number;

  constructor(scene: Phaser.Scene, x: number, y: number, color: number, textureKey: string) {
    this.color = color;
    if (scene.textures.exists(textureKey)) {
      this.sprite = scene.add.sprite(x, y, textureKey).setOrigin(0.5, 1);
      // Atlas cells are 256px square and the drawn figure fills roughly 224px vertically.
      this.sprite.setDisplaySize(174, 174);
    } else {
      this.placeholder = scene.add.rectangle(x, y, 54, 152, color).setOrigin(0.5, 1);
    }
  }

  sync(state: CharacterState): void {
    const facingSign = state.facing === 'right' ? 1 : -1;
    const lunge = state.mode === 'dashing' ? 5 * facingSign : state.mode === 'active' ? 7 * facingSign : 0;
    const x = state.x + lunge;
    if (this.sprite) {
      this.syncSprite(state, x);
      return;
    }

    const body = this.placeholder;
    if (!body) return;
    body.setPosition(x, state.y);
    if (state.hitFlashFrames > 0) {
      body.setFillStyle(0xffffff);
      body.setDisplaySize(56, state.crouching ? 96 : 152);
    } else if (state.mode === 'active') {
      body.setFillStyle(0xffd166);
      body.setDisplaySize(66, state.crouching ? 96 : 144);
    } else if (state.mode === 'startup') {
      body.setFillStyle(state.attack?.preciseExecution ? 0xffd166 : 0xffa65b);
      body.setDisplaySize(58, state.crouching ? 96 : 152);
    } else if (state.mode === 'recovery' || state.mode === 'throwRecovery') {
      body.setFillStyle(0xaaa6b1);
      body.setDisplaySize(54, state.crouching ? 96 : 152);
    } else if (state.mode === 'dashing') {
      body.setFillStyle(0x9b7bff);
      body.setDisplaySize(60, 142);
    } else if (state.mode === 'grabbed') {
      body.setFillStyle(0xdb78d4);
      body.setDisplaySize(58, 152);
    } else if (state.mode === 'blocking' || state.mode === 'blockstun') {
      body.setFillStyle(0x63c7d5);
      body.setDisplaySize(50, state.crouching ? 96 : 152);
    } else if (state.mode === 'hitstun') {
      body.setFillStyle(0xff6b6b);
      body.setDisplaySize(58, state.crouching ? 96 : 152);
    } else if (state.mode === 'airborne') {
      body.setFillStyle(0xf2c14e);
      body.setDisplaySize(54, 144);
    } else {
      body.setFillStyle(this.color);
      body.setDisplaySize(54, state.crouching ? 96 : 152);
    }
  }

  private syncSprite(state: CharacterState, x: number): void {
    const sprite = this.sprite;
    if (!sprite) return;
    sprite.setPosition(x, state.y);
    const artFacesRight = state.fighterId !== 'guilty-gear';
    sprite.setFlipX((state.facing === 'right') !== artFacesRight);

    const desiredKey = getCharacterAnimationKey(state);
    const animationKey = sprite.scene.anims.exists(desiredKey) ? desiredKey : `${state.fighterId}-idle`;
    if (sprite.scene.anims.exists(animationKey) && sprite.anims.getName() !== animationKey) {
      sprite.play(animationKey);
    }

    if (state.hitFlashFrames > 0) sprite.setTint(0xffffff);
    else if (state.mode === 'active') sprite.setTint(0xffd166);
    else if (state.mode === 'startup') sprite.setTint(state.attack?.preciseExecution ? 0xffd166 : 0xffa65b);
    else if (state.mode === 'hitstun') sprite.setTint(0xffb0b0);
    else sprite.clearTint();
  }

  destroy(): void {
    this.sprite?.destroy();
    this.placeholder?.destroy();
  }
}
