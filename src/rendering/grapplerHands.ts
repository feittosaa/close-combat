import type { CharacterState } from '../engine/characters/CharacterState';
import { GRAPPLER_DISPLAY, grapplerAdjustment } from './animations/grapplerSprites';

/**
 * Where the fists are in each drawing of the animations that grab or strike, as [x, y] in the 640 px frame:
 * x forward from the frame's centre line, y from the feet line (up is negative). Read from the drawings; the
 * captured fighter and the smoke effects follow these points so they stay on the arms.
 */
const HANDS: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
  'grab-headbutt': [[63, -174], [121, -292], [93, -257], [94, -285], [70, -248], [62, -172]],
  'grab-slam': [[75, -194], [105, -275], [-17, -394], [-10, -38], [10, -37], [68, -193]],
  'grab-low': [[90, -235], [50, -110], [85, -5], [35, -405], [120, -45], [82, -235]],
  'grab-launcher': [[93, -160], [105, -289], [98, -274], [143, -285], [111, -415], [93, -159]],
  'grab-throw': [[85, -167], [86, -281], [117, -185], [-85, -290], [147, -301], [100, -174]],
  'air-grab': [[65, -254], [166, -278], [89, -208], [-2, -387], [165, -103], [80, -197]],
  'ultimate-grab': [[185, -265], [62, -212], [54, -211], [78, -237], [67, -211], [150, -405]],
  'hammer-punch': [[75, -256], [58, -300], [47, -284], [78, -138], [71, -144], [74, -254]],
  'ultimate-soco': [[0, -200], [-100, -260], [-100, -310], [-55, -250], [175, -260], [65, -190]],
  'ultimate-start': [[81, -172], [89, -170], [94, -196], [83, -224], [85, -209], [118, -209]],
};

/** The elbows, in the same frame, of the moves whose smoke comes off the arms rather than the fists. */
const ELBOWS: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
  'hammer-punch': [[30, -190], [-15, -260], [-50, -325], [-10, -135], [-30, -125], [30, -190]],
};

/** A point of the drawing shown, in world pixels from the fighter's position, mirrored with its facing. */
function place(state: Pick<CharacterState, 'facing'>, name: string, drawing: number, point: readonly [number, number] | undefined): { x: number; y: number } | undefined {
  if (!point) return undefined;
  const { scale, center } = grapplerAdjustment(name, drawing), unit = GRAPPLER_DISPLAY * scale / 640, sign = state.facing === 'right' ? 1 : -1;
  return { x: sign * (center * GRAPPLER_DISPLAY * scale + point[0] * unit), y: point[1] * unit };
}
export const grapplerHand = (state: Pick<CharacterState, 'facing'>, name: string, drawing: number) => place(state, name, drawing, HANDS[name]?.[drawing]);
export const grapplerElbow = (state: Pick<CharacterState, 'facing'>, name: string, drawing: number) => place(state, name, drawing, ELBOWS[name]?.[drawing]);

/** Forehead of the forward-thrust drawing, where the headbutt makes contact. */
export const grapplerHeadbuttImpact = (state: Pick<CharacterState, 'facing'>) => place(state, 'grab-headbutt', 3, [125, -270])!;
