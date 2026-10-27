import { FIGHT_WORLD_SCALE } from '../../engine/data/fightFraming';
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
  const scale = Math.max(stage.minimumScale / FIGHT_WORLD_SCALE, width / (FIGHT_WORLD_SCALE * stage.referenceSize.width),
    floorY / (FIGHT_WORLD_SCALE * (stage.groundY - (stage.topExtension ?? 0))), (height - floorY) / (FIGHT_WORLD_SCALE * (stage.referenceSize.height - stage.groundY)));
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

/** Fixed zoom; track the highest fighter while keeping grounded feet inside the viewport. */
export function getFightCameraFrame(layout: StageLayout, fighterPositions: readonly number[], fighterYPositions: readonly number[] = []): { zoom: number; scrollX: number; scrollY: number } {
  const zoom = FIGHT_WORLD_SCALE;
  const halfVisibleWidth = layout.viewportWidth / (2 * zoom);
  const target = fighterPositions.length
    ? (Math.min(...fighterPositions) + Math.max(...fighterPositions)) / 2
    : layout.worldWidth / 2;
  const centerX = Math.max(halfVisibleWidth, Math.min(layout.worldWidth - halfVisibleWidth, target));
  const highestRise = fighterYPositions.length ? Math.max(0, layout.floorY - Math.min(...fighterYPositions)) : 0;
  const verticalTravel = Math.min(highestRise * 0.4, Math.max(0, (layout.worldHeight - layout.floorY - 16) / zoom));
  // Phaser zooms around the viewport center: screenY = centerY + (worldY - scrollY - centerY) * zoom.
  return {
    zoom,
    scrollX: centerX - layout.viewportWidth / 2,
    scrollY: (layout.floorY - layout.worldHeight / 2) * (1 - 1 / zoom) - verticalTravel,
  };
}

/** Physical walls are the complete panorama edges, not a centered viewport-sized sub-arena. */
export function getStageArenaBounds(layout: StageLayout): { left: number; right: number } {
  return { left: 0, right: layout.worldWidth };
}
