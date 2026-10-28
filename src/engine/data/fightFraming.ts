/** Fixed framing chosen for fixed zoom, independent fighter size and lateral movement. */
export const FIGHT_WORLD_SCALE = 1.6;
export const FIGHT_SIDE_MARGIN = 70.4;
export function maximumFighterSeparation(viewportWidth: number): number {
  return viewportWidth / FIGHT_WORLD_SCALE - FIGHT_SIDE_MARGIN * 2;
}
