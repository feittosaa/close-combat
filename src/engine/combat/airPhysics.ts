/** Exact landing tick for y += velocity; velocity += gravity, without contact pauses. */
export function flightFramesRemaining(y: number, velocity: number, floorY: number, gravity: number): number {
  const linear = velocity - gravity / 2;
  return Math.max(1, Math.ceil((-linear + Math.sqrt(linear * linear + 2 * gravity * Math.max(0, floorY - y))) / gravity));
}
