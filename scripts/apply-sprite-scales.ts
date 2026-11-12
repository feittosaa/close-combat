/**
 * Writes the animation sizes tried in the developer mode into each fighter's `calibration.json`:
 * `npm run sprites:apply-scales -- close-combat-ajustes.json` (the file exported by the developer mode).
 * Each `<fighter>:<sheet>` multiplier scales that sheet's validated scales, and each `<fighter>:<sheet>:<frame>` one only that drawing; a sheet never validated is recorded from its
 * current automatic scale. Afterwards the adjustment can be cleared in the developer mode.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { autoSpriteScale, type SheetCalibration } from '../src/rendering/animations/spriteScale';
import { spriteFighters } from './sprite-fighters';

const file = process.argv[2];
if (!file) throw new Error('Informe o arquivo exportado pelo modo desenvolvedor.');
const { spriteScales = {}, frameScales = {} } = JSON.parse(readFileSync(file, 'utf8')) as { spriteScales?: Record<string, number>; frameScales?: Record<string, number> };
const sheets = new Set([...Object.keys(spriteScales), ...Object.keys(frameScales).map(key => key.slice(0, key.lastIndexOf(':')))]);
const unknown = [...sheets].filter(key => !spriteFighters.some(({ definition, measurements }) => key.startsWith(`${definition.id}:`) && measurements[key.split(':')[1]]));
if (unknown.length) throw new Error(`Folha sem personagem ou medição conhecidos: ${unknown.join(', ')}.`);
for (const { definition, measurements, calibration } of spriteFighters) {
  const updated: Record<string, SheetCalibration> = { ...calibration };
  let changed = false;
  for (const key of sheets) {
    const [fighter, sheet] = key.split(':'), measure = measurements[sheet], multiplier = spriteScales[key] ?? 1;
    if (fighter !== definition.id || !measure) continue;
    const scales = measure.bodies.map((_, frame) => autoSpriteScale(definition, measurements, sheet, frame, calibration));
    updated[sheet] = { scales: scales.map((scale, frame) => Math.round(scale * multiplier * (frameScales[`${key}:${frame}`] ?? 1) * 10000) / 10000), bodies: measure.bodies, heights: measure.heights };
    console.log(`${definition.id}/${sheet}: ×${multiplier}`); changed = true;
  }
  if (changed) writeFileSync(`src/assets/sprites/characters/${definition.id}/calibration.json`, `${JSON.stringify(updated, null, 1)}\n`);
}
