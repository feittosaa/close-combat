// src/engine/collision/intersects.ts
import type { Box } from './types';

/** Interseção retangular com bordas inclusivas. */
export function intersects(a: Box, b: Box): boolean {
  return a.x <= b.x + b.width && a.x + a.width >= b.x &&
    a.y <= b.y + b.height && a.y + a.height >= b.y;
}
