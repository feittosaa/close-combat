import type { StageDefinition, StageLayer } from './StageDefinition';

export interface StageLayout {
  scale: number;
  worldWidth: number;
  worldHeight: number;
  viewportWidth: number;
  floorY: number;
  originY: number;
  arenaOffsetX: number;
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

/** Keep the arena floor at a fixed screen coordinate while zoom changes. */
export function getFightCameraScrollY(viewportHeight: number, floorY: number, zoom: number): number {
  return Math.round(floorY - viewportHeight / zoom);
}

/** Close framing grows the whole world, while wide spacing still keeps both fighters in view. */
export function getFightZoom(viewportWidth: number, fighterPositions: readonly number[]): number {
  const span = fighterPositions.length > 1 ? Math.max(...fighterPositions) - Math.min(...fighterPositions) : 0;
  return Math.min(1.55, viewportWidth / Math.max(1, span + 230));
}
