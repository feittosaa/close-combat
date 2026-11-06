/** Fighters, measurements and calibrations shared by the sprite analysis scripts. */
import { shoto } from '../src/engine/data/fighters/shoto';
import { cowboy } from '../src/engine/data/fighters/cowboy';
import type { CharacterDefinition } from '../src/engine/data/characters';
import type { SheetMeasurements, SpriteCalibration } from '../src/rendering/animations/spriteScale';
import { SHOTO_FRAME, shotoSpriteScale } from '../src/rendering/animations/shotoSprites';
import { cowboyDisplayHeight, cowboyFootAnchor } from '../src/rendering/animations/cowboySprites';
import shotoMeasurements from '../src/assets/sprites/characters/shoto/measurements.json';
import cowboyMeasurements from '../src/assets/sprites/characters/cowboy/measurements.json';
import shotoCalibration from '../src/assets/sprites/characters/shoto/calibration.json';
import cowboyCalibration from '../src/assets/sprites/characters/cowboy/calibration.json';

export interface SpriteFighter {
  definition: CharacterDefinition; measurements: SheetMeasurements; calibration: SpriteCalibration;
  /** World size of one frame at scale 1 and the default feet line, as fractions of the frame height. */
  frameWorld: number; footAnchor: number;
}
export const spriteFighters: SpriteFighter[] = [
  { definition: shoto, measurements: shotoMeasurements as SheetMeasurements, calibration: shotoCalibration, frameWorld: SHOTO_FRAME * shotoSpriteScale, footAnchor: 900 / SHOTO_FRAME },
  { definition: cowboy, measurements: cowboyMeasurements as SheetMeasurements, calibration: cowboyCalibration, frameWorld: cowboyDisplayHeight, footAnchor: cowboyFootAnchor },
];
