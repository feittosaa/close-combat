// src/input/types.ts
/** Notação independente do dispositivo físico, conforme base.md. */
export type Direction = 'F' | 'B' | 'U' | 'D' | 'DF' | 'DB' | 'UF' | 'UB' | 'N';
export type AttackButton = '1' | '2' | '3' | '4';

export interface FrameInput {
  direction: Direction;
  buttons: ReadonlySet<AttackButton>;
}
