// src/engine/collision/types.ts
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Hitbox extends Box {
  ownerId: string;
  attackId: string;
}

export interface Hurtbox extends Box {
  ownerId: string;
}
