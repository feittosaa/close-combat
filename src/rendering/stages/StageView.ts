import Phaser from 'phaser';
import type { StageDefinition } from './StageDefinition';
import type { StageLayout } from './stageLayout';
import { getLayerPlacement, getStageCameraScroll } from './stageLayout';
import { getStageLayerUrl, stageTextureKey } from './stageCatalog';

export function preloadStage(scene: Phaser.Scene, stage: StageDefinition): void {
  stage.layers.forEach((layer) => {
    const key = stageTextureKey(stage, layer);
    if (!scene.textures.exists(key)) scene.load.image(key, getStageLayerUrl(stage, layer));
  });
}

/** Decorative layers and camera only. Collision and combat remain in the simulation. */
export class StageView {
  private readonly images: Phaser.GameObjects.Image[];

  constructor(private readonly scene: Phaser.Scene, stage: StageDefinition, private readonly layout: StageLayout) {
    this.images = [...stage.layers].sort((a, b) => a.depth - b.depth).map((layer) => {
      const key = stageTextureKey(stage, layer);
      const source = scene.textures.get(key).getSourceImage();
      if (source.width !== stage.referenceSize.width || source.height !== stage.referenceSize.height) {
        throw new Error(`A camada ${stage.id}/${layer.id} deve ter ${stage.referenceSize.width}×${stage.referenceSize.height} pixels.`);
      }
      const placement = getLayerPlacement(layer, layout);
      return scene.add.image(placement.x, placement.y, key).setOrigin(0, 0)
        .setScale(placement.scale).setDepth(layer.depth).setScrollFactor(layer.parallax, 0);
    });
    scene.cameras.main.setBounds(0, 0, layout.worldWidth, layout.worldHeight);
    this.sync([]);
  }

  sync(fighterPositions: readonly number[]): void {
    this.scene.cameras.main.setScroll(getStageCameraScroll(this.layout, fighterPositions), 0);
  }

  destroy(): void {
    this.images.forEach((image) => image.destroy());
    // Phaser may shut down its camera plugin before the scene's cleanup listener.
    const camera = this.scene.cameras?.main;
    camera?.removeBounds();
    camera?.setScroll(0, 0);
  }
}
