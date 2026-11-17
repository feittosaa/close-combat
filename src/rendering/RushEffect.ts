import type Phaser from 'phaser';

/** Matches the Rush freeze (RUSH_FREEZE_FRAMES at 60 fps). */
const DURATION_MS = 800;
const FRAMES = 6;
/** The sheet's frame is twice as tall as wide, with the ground ring 67% of the way down. */
const WIDTH = 190;
const GROUND_ORIGIN_Y = .67;

/** Flames of the Rage Rush activation, drawn from the floor under the fighter; they use the scene clock, which keeps running through the freeze. */
export class RushEffect {
  private readonly active = new Set<Phaser.GameObjects.Image>();
  constructor(private readonly scene: Phaser.Scene) {}

  play(x: number, groundY: number): void {
    if (!this.scene.textures.exists('contact-rush')) return;
    const sprite = this.scene.add.image(x, groundY, 'contact-rush', 0).setOrigin(.5, GROUND_ORIGIN_Y).setDepth(13).setDisplaySize(WIDTH, WIDTH * 2);
    this.active.add(sprite);
    const progress = { value: 0 };
    this.scene.tweens.add({ targets: progress, value: 1, duration: DURATION_MS, ease: 'Linear',
      onUpdate: () => sprite.setFrame(Math.min(FRAMES - 1, Math.floor(progress.value * FRAMES))),
      onComplete: () => { this.active.delete(sprite); sprite.destroy(); } });
  }

  destroy(): void { this.active.forEach(sprite => sprite.destroy()); this.active.clear(); }
}
