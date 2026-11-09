/**
 * Records the current sprite scales as validated: run `npm run calibrate:sprites` only after reviewing the
 * guides (`npm run guides:sprites`) and approving them in game. Each body sheet keeps its scale per frame together
 * with the body size and height it has now, so a later regeneration of the sheet is brought back to this size.
 */
import { writeFileSync } from 'node:fs';
import { autoSpriteScale, sheetKind } from '../src/rendering/animations/spriteScale';
import { spriteFighters } from './sprite-fighters';

for (const { definition, measurements, calibration } of spriteFighters) {
  const validated = Object.fromEntries(Object.entries(measurements)
    .filter(([name]) => calibration[name] || sheetKind(definition, measurements, name))
    .map(([name, measure]) => [name, {
      scales: measure.bodies.map((_, frame) => autoSpriteScale(definition, measurements, name, frame, calibration)),
      bodies: measure.bodies, heights: measure.heights,
    }]));
  writeFileSync(`src/assets/sprites/characters/${definition.id}/calibration.json`, `${JSON.stringify(validated, null, 1)}\n`);
  console.log(`${definition.id}: ${Object.keys(validated).length} folhas validadas`);
}
