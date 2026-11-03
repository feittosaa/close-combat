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
    layer.frames?.forEach((file, index) => {
      const frameKey = `${key}:frame:${index + 1}`;
      if (!scene.textures.exists(frameKey)) scene.load.image(frameKey, getStageLayerUrl(stage, layer, file));
    });
  });
}

/** Decorative layers and camera only. Collision and combat remain in the simulation. */
export class StageView {
  private hudCamera?: Phaser.Cameras.Scene2D.Camera;
  private readonly images: Phaser.GameObjects.Image[];
  private readonly backdrop: Phaser.GameObjects.Image;
  private readonly backdropKey: string;
  private readonly animated: { images: Phaser.GameObjects.Image[]; key: string; duration: number; count: number; current: number }[] = [];
  private readonly moving: { images: Phaser.GameObjects.Image[]; origins: {x:number; y:number}[]; axis:'x'|'y'; amplitude:number; period:number; mode?:'linear'|'oscillate' }[] = [];

  constructor(private readonly scene: Phaser.Scene, stage: StageDefinition, private readonly layout: StageLayout) {
    this.images = [...stage.layers].sort((a, b) => a.depth - b.depth).flatMap((layer) => {
      const key = stageTextureKey(stage, layer);
      const source = scene.textures.get(key).getSourceImage();
      const resolutionScale = source.width / stage.referenceSize.width;
      if (!layer.size && (![1, 2].includes(resolutionScale) || source.height !== stage.referenceSize.height * resolutionScale)) {
        throw new Error(`A camada ${stage.id}/${layer.id} deve ter ${stage.referenceSize.width}×${stage.referenceSize.height} pixels.`);
      }
      const placement = getLayerPlacement(layer, layout);
      const width = (layer.size?.width ?? stage.referenceSize.width) * placement.scale;
      // Mirrored copies extend the scenery past the arena walls without moving them.
      const images = [-1, 0, 1].map(side => {
        const mirror = side !== 0 && !layer.repeatWithoutFlip && layer.motion?.mode !== 'linear';
        const panoramaWidth = stage.referenceSize.width * layout.scale;
        const x = mirror && layer.size ? (side < 0 ? -placement.x - width : 2 * panoramaWidth - placement.x - width)
          : placement.x + side * panoramaWidth;
        const image = scene.add.image(x, placement.y, key).setOrigin(0, 0)
          .setDepth(layer.depth).setScrollFactor(layer.parallax, 1);
        if (layer.size) image.setDisplaySize(width, layer.size.height * placement.scale);
        else image.setScale(placement.scale / resolutionScale);
        if (layer.crop) image.setCrop(layer.crop.x * resolutionScale, layer.crop.y * resolutionScale, layer.crop.width * resolutionScale, layer.crop.height * resolutionScale);
        if (mirror) image.setFlipX(true);
        return image;
      });
      if (layer.frames) this.animated.push({ images, key, duration: layer.frameDuration!, count: layer.frames.length + 1, current: 0 });
      if (layer.motion) this.moving.push({ images, origins:images.map(image=>({x:image.x,y:image.y})), axis:layer.motion.axis,
        amplitude:layer.motion.amplitude * layout.scale, period:layer.motion.period, mode:layer.motion.mode });
      return images;
    });
    const backLayer = [...stage.layers].sort((a, b) => a.depth - b.depth)[0];
    this.backdropKey = stageTextureKey(stage, backLayer);
    this.backdrop = scene.add.image(0, 0, stageTextureKey(stage, backLayer))
      .setOrigin(.5, .5).setDepth(backLayer.depth - 1).setScrollFactor(0);
    // Bounds are calculated with zoom in getFightCameraFrame; Phaser must not clamp Y afterwards.
    scene.cameras.main.removeBounds();
    scene.cameras.main.setOrigin(.5, .5);
    this.sync([]);
  }

  sync(fighterPositions: readonly number[], fighterYPositions: readonly number[] = [], animationFrame = 0): void {
    this.moving.forEach(motion => {
      const shift = motion.mode === 'linear' ? ((animationFrame % motion.period) / motion.period) * motion.amplitude :
        Math.sin(animationFrame * Math.PI * 2 / motion.period) * motion.amplitude;
      motion.images.forEach((image,index) => image.setPosition(motion.origins[index].x + (motion.axis === 'x' ? shift : 0), motion.origins[index].y + (motion.axis === 'y' ? shift : 0)));
    });
    this.animated.forEach(animation => {
      const index = Math.floor(animationFrame / animation.duration) % animation.count;
      if (index === animation.current) return;
      const key = index ? `${animation.key}:frame:${index}` : animation.key;
      animation.images.forEach(image => image.setTexture(key));
      if (animation.key === this.backdropKey) this.backdrop.setTexture(key);
      animation.current = index;
    });
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
    this.hudCamera.ignore(objects.filter(object => !isHud(object) || object.name === 'stage-presentation-dimmer'));
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
