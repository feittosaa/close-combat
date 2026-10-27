import { configureUiCamera, projectCameraToOutput, sharpenSceneText } from '../presentation';
import Phaser from 'phaser';
import type { StageDefinition } from './StageDefinition';
import type { StageLayout } from './stageLayout';
import { getLayerPlacement, getFightCameraFrame } from './stageLayout';
import { getStageLayerUrl, stageTextureKey } from './stageCatalog';

export function preloadStage(scene: Phaser.Scene, stage: StageDefinition): void {
  stage.layers.forEach((layer) => {
    const key = stageTextureKey(stage, layer);
    if (!scene.textures.exists(key)) scene.load.image(key, getStageLayerUrl(stage, layer));
  });
}

/** Decorative layers and camera only. Collision and combat remain in the simulation. */
export class StageView {
  private hudCamera?: Phaser.Cameras.Scene2D.Camera;
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
        .setScale(placement.scale).setDepth(layer.depth).setScrollFactor(layer.parallax, 1);
    });
    // Bounds are calculated with zoom in getFightCameraFrame; Phaser must not clamp Y afterwards.
    scene.cameras.main.removeBounds();
    scene.cameras.main.setOrigin(.5, .5);
    this.sync([]);
  }

  sync(fighterPositions: readonly number[], fighterYPositions: readonly number[] = []): void {
    const logicalFrame = getFightCameraFrame(this.layout, fighterPositions, fighterYPositions);
    const frame = projectCameraToOutput(logicalFrame,
      { width: this.layout.viewportWidth, height: this.layout.worldHeight },
      this.scene.scale ?? { width: this.layout.viewportWidth, height: this.layout.worldHeight });
    this.scene.cameras.main.setZoom(frame.zoom);
    this.scene.cameras.main.setScroll(frame.scrollX, frame.scrollY);
  }


  /** A separate unzoomed camera keeps controls/HUD readable while the whole combat world grows together. */
  syncHudCamera(): void {
    if (!this.hudCamera) this.hudCamera = this.scene.cameras.add(0, 0, this.scene.scale.width, this.scene.scale.height, false, 'hud');
    configureUiCamera(this.hudCamera, this.scene.scale);
    sharpenSceneText(this.scene);
    const objects = this.scene.children.list;
    const isHud = (object: Phaser.GameObjects.GameObject): boolean => 'depth' in object && typeof object.depth === 'number' && object.depth >= 100;
    this.scene.cameras.main.ignore(objects.filter(isHud));
    this.hudCamera.ignore(objects.filter(object => !isHud(object)));
  }

  destroy(): void {
    this.images.forEach((image) => image.destroy());
    // Phaser may shut down its camera plugin before the scene's cleanup listener.
    const camera = this.scene.cameras?.main;
    if (this.hudCamera && this.scene.cameras) this.scene.cameras.remove(this.hudCamera);
    this.hudCamera = undefined;
    camera?.setZoom(1); camera?.setOrigin(.5,.5);
    camera?.removeBounds();
    camera?.setScroll(0, 0);
  }
}
