import type Phaser from 'phaser';

/** Output pixels and combat/UI coordinates are intentionally independent. */
export const LOGICAL_VIEW = { width: 1024, height: 576 } as const;
export const RENDER_SIZE = { width: 1920, height: 1080 } as const;
export const TEXT_RESOLUTION = 2;

export function projectCameraToOutput(
  frame: { zoom: number; scrollX: number; scrollY: number },
  logical: { width: number; height: number },
  output: { width: number; height: number },
) {
  const scale = Math.min(output.width / logical.width, output.height / logical.height);
  return { zoom: frame.zoom * scale,
    scrollX: frame.scrollX + (logical.width - output.width) / 2,
    scrollY: frame.scrollY + (logical.height - output.height) / 2 };
}

export function configureUiCamera(camera: Phaser.Cameras.Scene2D.Camera, output: { width: number; height: number }): void {
  const scale = Math.min(output.width / LOGICAL_VIEW.width, output.height / LOGICAL_VIEW.height);
  // HUD objects use scrollFactor=0. A top-left zoom origin avoids a center offset
  // that scroll cannot correct for those objects.
  camera.setOrigin(0, 0).setZoom(scale).setScroll(0, 0);
}

/** Text textures need enough samples for the 1.875x output scale, not CSS enlargement. */
export function sharpenSceneText(scene: Phaser.Scene): void {
  const visit = (objects: readonly Phaser.GameObjects.GameObject[]): void => {
    for (const object of objects) {
      const text = object as Phaser.GameObjects.Text;
      if (typeof text.setResolution === 'function' && text.style.resolution !== TEXT_RESOLUTION) text.setResolution(TEXT_RESOLUTION);
      if ('list' in object && Array.isArray(object.list)) visit(object.list);
    }
  };
  visit(scene.children.list);
}
