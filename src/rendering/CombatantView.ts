import type Phaser from 'phaser';
import { getShotoSpritePose, shotoSpriteManifest } from './animations/shotoSprites';
import type { CharacterState } from '../engine/characters/CharacterState';
import { createHitbox, createHurtbox } from '../engine/collision/combatGeometry';
import { getCharacterById } from '../engine/data/characters';

/** Approved locomotion art; unsupported states retain diagnostic geometry. */
export class CombatantView {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private sprite?: Phaser.GameObjects.Image;
  constructor(private readonly scene: Phaser.Scene, private readonly color: number) {
    this.graphics = scene.add.graphics().setDepth(10);
  }
  sync(state: CharacterState, frame: number): void {
    const pose = getShotoSpritePose(state, frame);
    // Missing textures keep the useful fallback, including during loading failures.
    if (pose && this.scene.textures?.exists(pose.texture)) {
      this.sprite ??= this.scene.add.image(0, 0, pose.texture, String(pose.frame)).setDepth(10);
      this.sprite.setTexture(pose.texture, String(pose.frame))
        .setOrigin(.5, shotoSpriteManifest.footAnchorY! / shotoSpriteManifest.frameSize.height)
        .setScale(shotoSpriteManifest.displaySize!.height / shotoSpriteManifest.frameSize.height * pose.scale)
        .setPosition(state.x, state.y).setFlipX(pose.flipX).setVisible(true);
      this.graphics.clear();
      return;
    }
    this.sprite?.setVisible(false);
    const g = this.graphics;
    const box = createHurtbox(state);
    const sign = state.facing === 'right' ? 1 : -1;
    g.clear();
    g.fillStyle(this.color, .85).fillRect(box.x, box.y, box.width, box.height);
    g.lineStyle(2, 0xe9e4ee, .9).strokeRect(box.x, box.y, box.width, box.height);
    // O marcador de frente não muda as dimensões do corpo por fase do golpe.
    const eyeX = state.x + sign * (box.width / 2 - 10);
    g.fillStyle(0xffffff).fillRect(eyeX - 3, box.y + 16, 6, 6);
    const move = getCharacterById(state.fighterId)?.moves.find(move => move.id === state.attack?.moveId);
    if (move && state.mode === 'active') {
      const contact = createHitbox(state, move);
      g.fillStyle(this.color, .65).fillRect(contact.x, contact.y, contact.width, contact.height);
      g.lineStyle(2, 0xffe0ab).strokeRect(contact.x, contact.y, contact.width, contact.height);
    }
    if (state.mode === 'blocking' || state.mode === 'blockstun') {
      g.lineStyle(4, 0xa6e6ff).lineBetween(state.x + sign * 28, box.y + 12, state.x + sign * 28, box.y + box.height - 12);
    }
  }
  destroy(): void { this.sprite?.destroy(); this.graphics.destroy(); }
}
