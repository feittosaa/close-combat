/** Fighters, measurements and calibrations shared by the sprite analysis scripts. */
import { shoto } from '../src/engine/data/fighters/shoto';
import { texas } from '../src/engine/data/fighters/texas';
import { grappler } from '../src/engine/data/fighters/grappler';
import type { CharacterDefinition } from '../src/engine/data/characters';
import type { SheetMeasurements, SpriteCalibration } from '../src/rendering/animations/spriteScale';
import { SHOTO_FRAME, shotoSpriteScale } from '../src/rendering/animations/shotoSprites';
import { GRAPPLER_DISPLAY } from '../src/rendering/animations/grapplerSprites';
import { texasDisplayHeight, texasFootAnchor } from '../src/rendering/animations/texasSprites';
import shotoMeasurements from '../src/assets/sprites/characters/shoto/measurements.json';
import texasMeasurements from '../src/assets/sprites/characters/texas/measurements.json';
import grapplerMeasurements from '../src/assets/sprites/characters/grappler/measurements.json';
import shotoCalibration from '../src/assets/sprites/characters/shoto/calibration.json';
import texasCalibration from '../src/assets/sprites/characters/texas/calibration.json';
import grapplerCalibration from '../src/assets/sprites/characters/grappler/calibration.json';

export interface SpriteFighter {
  definition: CharacterDefinition; measurements: SheetMeasurements; calibration: SpriteCalibration;
  /** World size of one frame at scale 1 and the default feet line, as fractions of the frame height. */
  frameWorld: number; footAnchor: number;
}
export const spriteFighters: SpriteFighter[] = [
  { definition: shoto, measurements: shotoMeasurements as SheetMeasurements, calibration: shotoCalibration, frameWorld: SHOTO_FRAME * shotoSpriteScale, footAnchor: 900 / SHOTO_FRAME },
  { definition: texas, measurements: texasMeasurements as SheetMeasurements, calibration: texasCalibration, frameWorld: texasDisplayHeight, footAnchor: texasFootAnchor },
  { definition: grappler, measurements: grapplerMeasurements as SheetMeasurements, calibration: grapplerCalibration, frameWorld: GRAPPLER_DISPLAY, footAnchor: 465 / 640 },
];
