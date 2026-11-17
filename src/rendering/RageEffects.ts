import Phaser from 'phaser';
import { createHurtbox } from '../engine/collision/combatGeometry';
import type { CharacterState } from '../engine/characters/CharacterState';
import type { EffectNotice } from '../engine/simulation/Simulation';

/** Width and duration of each effect drawn over a fighter; the sheet's regular frame is twice as tall as wide. */
const BODY_EFFECTS: Readonly<Record<'breaker' | 'breaker-fail' | 'buff', { width: number; ms: number }>> = {
  breaker: { width: 190, ms: 600 }, 'breaker-fail': { width: 150, ms: 480 }, buff: { width: 65, ms: 240 },
};
const FRAMES = 6;

/** Effects of rage and defence for every fighter. They follow the scene's clock, which keeps running through the freeze of a rage action. */
export class RageEffects {
  private readonly active = new Set<Phaser.GameObjects.Image>();
  constructor(private readonly scene: Phaser.Scene) {}

  /** Draws a body effect over the fighter that caused it; the ultimate's cost belongs to the HUD bar. */
  play(notice: EffectNotice, fighter: CharacterState | undefined): void {
    const effect = notice.kind === 'ultimate-spend' ? undefined : BODY_EFFECTS[notice.kind];
    const key = `contact-${notice.kind}`;
    if (!effect || !fighter || !this.scene.textures.exists(key)) return;
    const box = createHurtbox(fighter);
    const sprite = this.scene.add.image(box.x + box.width / 2, box.y + box.height / 2, key, 0).setDepth(13)
      .setDisplaySize(effect.width, effect.width * 2);
    this.active.add(sprite);
    const progress = { value: 0 };
    this.scene.tweens.add({ targets: progress, value: 1, duration: effect.ms, ease: 'Linear',
      onUpdate: () => sprite.setFrame(Math.min(FRAMES - 1, Math.floor(progress.value * FRAMES))),
      onComplete: () => { this.active.delete(sprite); sprite.destroy(); } });
  }

  destroy(): void { this.active.forEach(sprite => sprite.destroy()); this.active.clear(); }
}
