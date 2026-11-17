/** Fighters, measurements and calibrations shared by the sprite analysis scripts. */
import { bob } from '../src/engine/data/fighters/bob';
import { texas } from '../src/engine/data/fighters/texas';
import { sm0g } from '../src/engine/data/fighters/sm0g';
import type { CharacterDefinition } from '../src/engine/data/characters';
import type { SheetMeasurements, SpriteCalibration } from '../src/rendering/animations/spriteScale';
import { BOB_FRAME, bobSpriteScale } from '../src/rendering/animations/bobSprites';
import { SM0G_DISPLAY } from '../src/rendering/animations/sm0gSprites';
import { texasDisplayHeight, texasFootAnchor } from '../src/rendering/animations/texasSprites';
import bobMeasurements from '../src/assets/sprites/characters/bob/measurements.json';
import texasMeasurements from '../src/assets/sprites/characters/texas/measurements.json';
import sm0gMeasurements from '../src/assets/sprites/characters/sm0g/measurements.json';
import bobCalibration from '../src/assets/sprites/characters/bob/calibration.json';
import texasCalibration from '../src/assets/sprites/characters/texas/calibration.json';
import sm0gCalibration from '../src/assets/sprites/characters/sm0g/calibration.json';

export interface SpriteFighter {
  definition: CharacterDefinition; measurements: SheetMeasurements; calibration: SpriteCalibration;
  /** World size of one frame at scale 1 and the default feet line, as fractions of the frame height. */
  frameWorld: number; footAnchor: number;
}
export const spriteFighters: SpriteFighter[] = [
  { definition: bob, measurements: bobMeasurements as SheetMeasurements, calibration: bobCalibration, frameWorld: BOB_FRAME * bobSpriteScale, footAnchor: 900 / BOB_FRAME },
  { definition: texas, measurements: texasMeasurements as SheetMeasurements, calibration: texasCalibration, frameWorld: texasDisplayHeight, footAnchor: texasFootAnchor },
  { definition: sm0g, measurements: sm0gMeasurements as SheetMeasurements, calibration: sm0gCalibration, frameWorld: SM0G_DISPLAY, footAnchor: 465 / 640 },
];
