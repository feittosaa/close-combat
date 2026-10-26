import type { StageDefinition, StageLayer } from './StageDefinition';

export interface StageLayout {
  scale: number;
  worldWidth: number;
  worldHeight: number;
  viewportWidth: number;
  floorY: number;
  originY: number;
  arenaOffsetX: number;
  minimumZoom: number;
}

/** One uniform scale preserves the proportions of every layer and fills the viewport around the floor. */
export function createStageLayout(stage: StageDefinition, width: number, height: number, floorY: number): StageLayout {
  const scale = Math.max(stage.minimumScale, width / stage.referenceSize.width,
    floorY / stage.groundY, (height - floorY) / (stage.referenceSize.height - stage.groundY));
  const worldWidth = stage.referenceSize.width * scale;
  return {
    scale, worldWidth, worldHeight: height, viewportWidth: width, floorY,
    originY: floorY - stage.groundY * scale,
    arenaOffsetX: (worldWidth - width) / 2,
    minimumZoom: Math.max(width / worldWidth, floorY / (stage.groundY * scale),
      (height - floorY) / ((stage.referenceSize.height - stage.groundY) * scale)),
  };
}

export function getLayerPlacement(layer: StageLayer, layout: StageLayout): { x: number; y: number; scale: number } {
  const contentScale = layer.contentScale ?? 1;
  const pivot = layer.scaleOrigin ?? { x: 0, y: 0 };
  return {
    x: (layer.x + pivot.x * (1 - contentScale)) * layout.scale,
    y: layout.originY + (layer.y + pivot.y * (1 - contentScale)) * layout.scale,
    scale: layout.scale * contentScale,
  };
}

/** The same horizontal framing is used by every stage, with no dependency on renderer or combat rules. */
export function getStageCameraScroll(layout: StageLayout, fighterPositions: readonly number[]): number {
  const center = fighterPositions.length
    ? (Math.min(...fighterPositions) + Math.max(...fighterPositions)) / 2
    : layout.worldWidth / 2;
  return Math.round(Math.max(0, Math.min(layout.worldWidth - layout.viewportWidth, center - layout.viewportWidth / 2)));
}

/** Fixed world scale: only horizontal tracking changes during a fight. */
export function getFightCameraFrame(layout: StageLayout, fighterPositions: readonly number[]): { zoom: number; scrollX: number; scrollY: number } {
  const zoom = 1;
  const halfVisibleWidth = layout.viewportWidth / (2 * zoom);
  const target = fighterPositions.length
    ? (Math.min(...fighterPositions) + Math.max(...fighterPositions)) / 2
    : layout.worldWidth / 2;
  const centerX = Math.max(halfVisibleWidth, Math.min(layout.worldWidth - halfVisibleWidth, target));
  // Phaser zooms around the viewport center: screenY = centerY + (worldY - scrollY - centerY) * zoom.
  return {
    zoom,
    scrollX: centerX - layout.viewportWidth / 2,
    scrollY: (layout.floorY - layout.worldHeight / 2) * (1 - 1 / zoom),
  };
}
