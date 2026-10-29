import { configureUiCamera, getUiViewport, projectCameraToOutput, sharpenSceneText } from '../presentation';
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
  private readonly backdrop: Phaser.GameObjects.Image;

  constructor(private readonly scene: Phaser.Scene, stage: StageDefinition, private readonly layout: StageLayout) {
    this.images = [...stage.layers].sort((a, b) => a.depth - b.depth).flatMap((layer) => {
      const key = stageTextureKey(stage, layer);
      const source = scene.textures.get(key).getSourceImage();
      if (source.width !== stage.referenceSize.width || source.height !== stage.referenceSize.height) {
        throw new Error(`A camada ${stage.id}/${layer.id} deve ter ${stage.referenceSize.width}×${stage.referenceSize.height} pixels.`);
      }
      const placement = getLayerPlacement(layer, layout);
      const width = source.width * placement.scale;
      // Mirrored copies extend the scenery past the arena walls without moving them.
      return [-1, 0, 1].map(side => {
        const image = scene.add.image(placement.x + side * width, placement.y, key).setOrigin(0, 0)
          .setScale(placement.scale).setDepth(layer.depth).setScrollFactor(layer.parallax, 1);
        if (side !== 0) image.setFlipX(true);
        return image;
      });
    });
    const backLayer = [...stage.layers].sort((a, b) => a.depth - b.depth)[0];
    this.backdrop = scene.add.image(0, 0, stageTextureKey(stage, backLayer))
      .setOrigin(.5, .5).setDepth(backLayer.depth - 1).setScrollFactor(0);
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
    const output = this.scene.scale ?? { width: this.layout.viewportWidth, height: this.layout.worldHeight };
    this.backdrop.setPosition(output.width / 2, output.height / 2)
      .setScale(Math.max(output.width / this.backdrop.width, output.height / this.backdrop.height) / frame.zoom);
    this.scene.cameras.main.setZoom(frame.zoom);
    this.scene.cameras.main.setScroll(frame.scrollX, frame.scrollY);
  }


  /** A separate unzoomed camera keeps controls/HUD readable while the whole combat world grows together. */
  syncHudCamera(): void {
    if (!this.hudCamera) this.hudCamera = this.scene.cameras.add(0, 0, this.scene.scale.width, this.scene.scale.height, false, 'hud');
    const viewport = getUiViewport(this.scene.scale);
    this.hudCamera.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
    configureUiCamera(this.hudCamera, viewport);
    sharpenSceneText(this.scene);
    const objects = this.scene.children.list;
    const isHud = (object: Phaser.GameObjects.GameObject): boolean => 'depth' in object && typeof object.depth === 'number' && object.depth >= 100;
    this.scene.cameras.main.ignore(objects.filter(isHud));
    this.hudCamera.ignore(objects.filter(object => !isHud(object)));
  }

  destroy(): void {
    this.images.forEach((image) => image.destroy());
    this.backdrop.destroy();
    // Phaser may shut down its camera plugin before the scene's cleanup listener.
    const camera = this.scene.cameras?.main;
    if (this.hudCamera && this.scene.cameras) this.scene.cameras.remove(this.hudCamera);
    this.hudCamera = undefined;
    camera?.setZoom(1); camera?.setOrigin(.5,.5);
    camera?.removeBounds();
    camera?.setScroll(0, 0);
  }
}
