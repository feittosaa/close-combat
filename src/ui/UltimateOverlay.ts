import type Phaser from 'phaser';
import { presentationKey, presentationTheme, type PresentationTheme } from '../rendering/stages/stagePresentationAssets';

/** Screen-sized effect between the scenery and combatants. */
export class UltimateOverlay {
  private readonly dimmer: Phaser.GameObjects.Rectangle;
  private readonly image: Phaser.GameObjects.Image;
  private readonly tumbleweed?: Phaser.GameObjects.Image;
  private readonly theme: PresentationTheme;
  private elapsed = 0;

  constructor(private readonly scene: Phaser.Scene, stageId: string) {
    this.theme = presentationTheme(stageId);
    this.dimmer = scene.add.rectangle(0, 0, 1, 1, 0x000000).setScrollFactor(0).setDepth(-0.1).setVisible(false);
    this.image = scene.add.image(0, 0, presentationKey(this.theme, 'ultimate')).setScrollFactor(0).setDepth(0).setVisible(false);
    if (this.theme === 'saloon') this.tumbleweed = scene.add.image(0, 0, presentationKey(this.theme, 'tumbleweed'))
      .setScrollFactor(0).setDepth(1).setVisible(false);
  }

  update(active: boolean, delta: number): void {
    if (!active) { this.elapsed = 0; this.dimmer.setVisible(false); this.image.setVisible(false); this.tumbleweed?.setVisible(false); return; }
    this.elapsed += delta;
    const progress = Math.min(1, this.elapsed / 350);
    const zoom = this.scene.cameras.main.zoom;
    const { width, height } = this.scene.scale;
    const outerWidth = width / zoom, outerHeight = height / zoom;
    this.dimmer.setPosition(width / 2, height / 2).setSize(outerWidth, outerHeight).setAlpha(.9 * progress).setVisible(true);
    this.image.setPosition(width / 2, height / 2).setDisplaySize(outerWidth, outerHeight)
      .setAlpha(.9 * progress).setVisible(true);
    if (this.tumbleweed) {
      const travel = (this.elapsed % 2400) / 2400;
      this.tumbleweed.setPosition(width / 2 + (travel - .5) * width * 1.2 / zoom, height / 2 + height * .3 / zoom)
        .setDisplaySize(width * .085 / zoom, width * .085 / zoom).setRotation(travel * Math.PI * 4)
        .setAlpha(.9 * progress).setVisible(true);
    }
  }

  destroy(): void { this.dimmer.destroy(); this.image.destroy(); this.tumbleweed?.destroy(); }
}
