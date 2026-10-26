/** Fixed framing chosen for readable full-body fighters and the complete jump arc. */
export const FIGHT_WORLD_SCALE = 1.6;
export const FIGHT_SIDE_MARGIN = 88;
export function maximumFighterSeparation(viewportWidth: number): number {
  return viewportWidth / FIGHT_WORLD_SCALE - FIGHT_SIDE_MARGIN * 2;
}
