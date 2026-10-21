import type Phaser from 'phaser';
import type { ProjectileState } from '../engine/combat/Projectile';
import { getClipFrames } from './animations/AnimationPlayback';
import { getAnimationManifest } from './animations/characterAssets';

/** A arte acompanha a entidade lógica e nunca emite ou aplica dano por conta própria. */
export class ProjectileView {
  private readonly sprites = new Map<number, Phaser.GameObjects.Sprite>();
  constructor(private readonly scene: Phaser.Scene) { }

  sync(projectiles: readonly ProjectileState[]): void {
    const active = new Set(projectiles.map(({ id }) => id));
    for (const [id, sprite] of this.sprites) {
      if (!active.has(id)) { sprite.destroy(); this.sprites.delete(id); }
    }
    for (const projectile of projectiles) {
      const manifest = getAnimationManifest(projectile.fighterId);
      const clip = manifest.clips.find(({ key }) => key === `${projectile.fighterId}-${projectile.definition.animationId}`);
      if (!clip) throw new Error(`Projétil sem animação: ${projectile.fighterId}/${projectile.moveId}`);
      const frames = getClipFrames(clip);
      const frameIndex = projectile.definition.speed === 0
        ? Math.min(frames.length - 1, Math.floor(projectile.ageFrames * frames.length / projectile.definition.lifetimeFrames))
        : Math.floor(projectile.ageFrames * clip.frameRate / 60) % frames.length;
      const frame = frames[frameIndex];
      const texture = manifest.frameTextures?.[String(frame)] ?? manifest.textureKey;
      let sprite = this.sprites.get(projectile.id);
      if (!sprite) {
        sprite = this.scene.add.sprite(projectile.x, projectile.y, texture, frame).setDepth(10);
        this.sprites.set(projectile.id, sprite);
      }
      const transform = manifest.frameTransforms?.[String(frame)];
      const anchor = transform?.footAnchorY ?? manifest.footAnchorY ?? manifest.frameSize.height;
      const size = manifest.displaySize ?? manifest.frameSize;
      const scale = transform?.scale ?? 1;
      sprite.setTexture(texture, frame).setPosition(projectile.x, projectile.y)
        .setOrigin(0.5, anchor / manifest.frameSize.height).setFlipX(projectile.facing === 'left')
        .setDisplaySize(size.width * scale, size.height * scale);
    }
  }

  destroy(): void { this.sprites.forEach((sprite) => sprite.destroy()); this.sprites.clear(); }
}
