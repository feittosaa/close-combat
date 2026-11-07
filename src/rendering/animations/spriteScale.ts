import type { CharacterDefinition } from '../../engine/data/characters';

/**
 * Facts measured from one sheet by `npm run measure:sprites`, as fractions of the frame height: the
 * silhouette height range, `body` (median square root of the opaque area, which barely changes between an
 * upright, arched, crouched or lying pose of the same fighter) and, per frame, body, body length (longest
 * side of the silhouette), silhouette height, lowest opaque row and horizontal centre of mass (fraction of the frame width).
 * `cleanBody`/`cleanBodies` count only pixels in the idle's own colours, leaving out flames, magic and props.
 */
export interface SheetMeasure {
  minHeight: number; maxHeight: number; body: number; cleanBody: number;
  heights: readonly number[]; cleanBodies: readonly number[]; bodies: readonly number[]; lengths: readonly number[]; bottoms: readonly number[]; centers: readonly number[];
}
export type SheetMeasurements = Readonly<Record<string, SheetMeasure>>;
/**
 * Scales validated by eye, per frame, with the body size and height each frame had when validated
 * (`calibration.json` beside each fighter's sheets, written by `npm run calibrate:sprites`).
 */
export interface SheetCalibration { scales: readonly number[]; bodies: readonly number[]; heights: readonly number[] }
export type SpriteCalibration = Readonly<Record<string, SheetCalibration>>;

/**
 * Parameters learned from the scales approved by eye before this analysis existed (`npm run guides:sprites` shows
 * the result): measured without effects, approved sheets of one posture differ in body size by up to about 5% (arms
 * out or tucked, front or profile view), so only sheets beyond that band are corrected, back to its edge. Approved lying bodies measure about
 * 0.875 of the standing height end to end (bent knees, foreshortening).
 */
export const POSE_BAND = .05;
export const LYING_LENGTH = .875;
/** Lying sheets are often drawn much smaller; the bound only rejects broken measurements. */
export const LYING_LIMIT = 1.5;
/** A crouching move whose silhouette rises this much above the settled crouch leaves the crouch (an uppercut, for instance). */
export const CROUCH_EXIT = 1.4;
const REFERENCE_SHEETS = ['idle-normal', 'idle'] as const;
const CROUCH_REFERENCE = 'crouch';
/** Falls, knockdowns, defeat and getups: the fighter lying or on the way to the floor. */
const LYING = /^(fall|fall-landing|knockdown|push-fall|defeat|getup|ippon-victim)$/;
const AIRBORNE = /^(jump|air-|enter-jump|turn-air|launch-hit|wall-bounce|flying-kick)/;
/** Effects and projectiles drawn apart from the body, and `idle` (Texas's reference, Bob's legacy idle on its own frame grid). */
const NOT_A_BODY = /^(effect-|magic-|crow$|tomato$|dynamite$|idle$)/;

type Kind = 'standing' | 'crouching' | 'airborne' | 'lying';
const referenceOf = (measurements: SheetMeasurements) => REFERENCE_SHEETS.map(name => measurements[name]).find(Boolean);

/** Which reference a sheet is compared with; crouching moves that rise out of the crouch are compared as standing. */
export function sheetKind(definition: CharacterDefinition, measurements: SheetMeasurements, name: string): Kind | undefined {
  if (NOT_A_BODY.test(name)) return undefined;
  if (LYING.test(name)) return 'lying';
  const move = definition.moves.find(entry => entry.id === name);
  if (move?.airborne || AIRBORNE.test(name)) return 'airborne';
  if (!move?.crouching && !/^(crouch|turn-crouch)/.test(name)) return 'standing';
  const crouch = measurements[CROUCH_REFERENCE], measure = measurements[name];
  return crouch && measure && name !== CROUCH_REFERENCE && measure.maxHeight > crouch.minHeight * CROUCH_EXIT ? 'standing' : 'crouching';
}

const median = (values: readonly number[]) => {
  const sorted = values.filter(Boolean).sort((a, b) => a - b), middle = sorted.length / 2;
  return sorted.length % 2 ? sorted[Math.floor(middle)] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const postureBodies = new WeakMap<SheetMeasurements, Map<Kind, number>>();
/** Typical body size of one posture: the median over every sheet of that posture, so no single pose sets the norm. */
export function postureBody(definition: CharacterDefinition, measurements: SheetMeasurements, kind: Exclude<Kind, 'lying'>): number {
  const cache = postureBodies.get(measurements) ?? new Map<Kind, number>();
  postureBodies.set(measurements, cache);
  if (!cache.has(kind)) {
    cache.set(kind, median(Object.entries(measurements).filter(([name]) => sheetKind(definition, measurements, name) === kind).map(([, measure]) => measure.cleanBody)));
  }
  return cache.get(kind)!;
}

const settle = (scale: number) => Math.round(scale * 100) / 100;

/**
 * Multipliers per sheet (`<fighter>:<sheet>`) tried live in the developer mode before they are written into
 * `calibration.json` (`npm run sprites:apply-scales`); always empty in normal play.
 */
export const sheetScaleAdjustments = new Map<string, number>();

/**
 * Multiplier that shows a drawing at the fighter's validated proportions.
 * A validated sheet keeps its validated size: if it was regenerated at another size, it is compared with its own
 * validated version (same pose, so body size and height are directly comparable) and brought back to it.
 * A sheet never validated is compared, by body size (area in the idle's colours), with the typical sheet of its own posture (standing,
 * crouching or airborne), and only a deviation beyond `POSE_BAND` is corrected, back to the band edge. Lying sheets
 * are judged frame by frame: upright frames by body size against the standing norm, horizontal ones also bounded by
 * `LYING_LENGTH` times the standing height end to end.
 */
export function autoSpriteScale(definition: CharacterDefinition, measurements: SheetMeasurements, name: string, frame = 0, calibration: SpriteCalibration = {}): number {
  return measuredSpriteScale(definition, measurements, name, frame, calibration) * (sheetScaleAdjustments.get(`${definition.id}:${name}`) ?? 1);
}

function measuredSpriteScale(definition: CharacterDefinition, measurements: SheetMeasurements, name: string, frame: number, calibration: SpriteCalibration): number {
  const kind = sheetKind(definition, measurements, name), measure = measurements[name], reference = referenceOf(measurements);
  const validated = calibration[name];
  if (validated && measure) return validated.scales[frame] * regenerationRatio(validated, measure, kind === 'lying' ? [frame] : measure.bodies.map((_, index) => index));
  if (!kind || !measure || !reference) return 1;
  if (kind === 'lying') {
    const body = measure.cleanBodies[frame], length = measure.lengths[frame], height = measure.heights[frame];
    if (!body || !length || !height) return 1;
    const byBody = postureBody(definition, measurements, 'standing') / body;
    const scale = height >= length ? byBody : Math.min(byBody, LYING_LENGTH * reference.maxHeight / length);
    return settle(Math.min(1 + LYING_LIMIT, Math.max(1 / (1 + LYING_LIMIT), scale)));
  }
  const ratio = postureBody(definition, measurements, kind) / measure.cleanBody;
  return ratio > 1 + POSE_BAND ? settle(ratio / (1 + POSE_BAND)) : ratio < 1 - POSE_BAND ? settle(ratio / (1 - POSE_BAND)) : 1;
}

/** How much larger the validated drawing was than the current one, over the given frames (1 when unchanged). */
function regenerationRatio(validated: SheetCalibration, measure: SheetMeasure, frames: readonly number[]): number {
  const ratios = frames.filter(frame => measure.bodies[frame] && measure.heights[frame] && validated.bodies[frame] && validated.heights[frame])
    .map(frame => Math.sqrt(validated.bodies[frame] / measure.bodies[frame] * (validated.heights[frame] / measure.heights[frame])));
  return ratios.length ? median(ratios) : 1;
}

/** Lowest opaque row of a lying drawing, as a fraction of the frame height: anchoring there keeps the body on the floor. */
export function lyingFloorAnchor(definition: CharacterDefinition, measurements: SheetMeasurements, name: string, frame: number): number | undefined {
  return sheetKind(definition, measurements, name) === 'lying' ? measurements[name]?.bottoms[frame] || undefined : undefined;
}

/** Loose poses (airborne or lying) sit with their centre of mass on the hurtbox centre; others keep their drawn stance. */
export function bodyCenterShift(definition: CharacterDefinition, measurements: SheetMeasurements, name: string, frame: number): number {
  const kind = sheetKind(definition, measurements, name), center = measurements[name]?.centers[frame];
  return (kind === 'airborne' || kind === 'lying') && center !== undefined ? .5 - center : 0;
}
