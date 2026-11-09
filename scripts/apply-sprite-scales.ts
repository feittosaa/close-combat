/**
 * Writes the animation sizes tried in the developer mode into each fighter's `calibration.json`:
 * `npm run sprites:apply-scales -- close-combat-ajustes.json` (the file exported by the developer mode).
 * Each `<fighter>:<sheet>` multiplier scales that sheet's validated scales; a sheet never validated is recorded from its
 * current automatic scale. Afterwards the adjustment can be cleared in the developer mode.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { autoSpriteScale, type SheetCalibration } from '../src/rendering/animations/spriteScale';
import { spriteFighters } from './sprite-fighters';

const file = process.argv[2];
if (!file) throw new Error('Informe o arquivo exportado pelo modo desenvolvedor.');
const { spriteScales = {} } = JSON.parse(readFileSync(file, 'utf8')) as { spriteScales?: Record<string, number> };
for (const { definition, measurements, calibration } of spriteFighters) {
  const updated: Record<string, SheetCalibration> = { ...calibration };
  let changed = false;
  for (const [key, multiplier] of Object.entries(spriteScales)) {
    const [fighter, sheet] = key.split(':'), measure = measurements[sheet];
    if (fighter !== definition.id || !measure) continue;
    const scales = measure.bodies.map((_, frame) => autoSpriteScale(definition, measurements, sheet, frame, calibration));
    updated[sheet] = { scales: scales.map(scale => Math.round(scale * multiplier * 10000) / 10000), bodies: measure.bodies, heights: measure.heights };
    console.log(`${definition.id}/${sheet}: ×${multiplier}`); changed = true;
  }
  if (changed) writeFileSync(`src/assets/sprites/characters/${definition.id}/calibration.json`, `${JSON.stringify(updated, null, 1)}\n`);
}
