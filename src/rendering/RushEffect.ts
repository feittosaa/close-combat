import Phaser from 'phaser';

const DURATION_MS = 520;
const RING_COLORS = [0xff4b3a, 0xffc24a] as const;

/** Onda de choque e chamas da ativação do Rage Rush; usa o relógio da cena, que segue durante a pausa de quadros. */
export class RushEffect {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly active = new Set<{ x: number; y: number; progress: number }>();
  constructor(private readonly scene: Phaser.Scene) { this.graphics = scene.add.graphics().setDepth(13); }

  play(x: number, groundY: number): void {
    const effect = { x, y: groundY, progress: 0 };
    this.active.add(effect);
    this.scene.tweens.add({ targets: effect, progress: 1, duration: DURATION_MS, ease: 'Cubic.out',
      onUpdate: () => this.draw(), onComplete: () => { this.active.delete(effect); this.draw(); } });
  }

  private draw(): void {
    const g = this.graphics.clear();
    for (const { x, y, progress } of this.active) {
      const fade = 1 - progress;
      RING_COLORS.forEach((color, index) => {
        const radius = 40 + progress * (150 + index * 60);
        g.lineStyle(7 - index * 3, color, fade).strokeEllipse(x, y - 8, radius * 2, radius * .38);
      });
      for (let i = -3; i <= 3; i++) {
        const base = x + i * 16, height = (90 + (i % 2 ? 40 : 0)) * (.4 + progress);
        g.fillStyle(i % 2 ? 0xffc24a : 0xff4b3a, fade * .75).fillTriangle(base - 7, y, base + 7, y, base, y - height);
      }
    }
  }

  destroy(): void { this.active.clear(); this.graphics.destroy(); }
}
