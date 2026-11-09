/**
 * Writes the sprite layout (scale, floor anchor, centring and hurtboxes, in world pixels) for
 * `scripts/render-sprite-guides.py`. Run through `npm run guides:sprites`; the output is generated, not versioned.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { autoSpriteScale, bodyCenterShift, lyingFloorAnchor, sheetKind } from '../src/rendering/animations/spriteScale';
import { spriteFighters } from './sprite-fighters';

const OUTPUT = 'review/sprite-guides';
mkdirSync(OUTPUT, { recursive: true });
const layout = spriteFighters.map(({ definition, measurements, calibration, frameWorld, footAnchor }) => ({
  id: definition.id, name: definition.name, frameWorld, hurtboxes: definition.collision.hurtboxes,
  sheets: Object.fromEntries(Object.entries(measurements).map(([name, measure]) => [name, {
    kind: sheetKind(definition, measurements, name) ?? null,
    validated: Boolean(calibration[name]),
    frames: measure.bottoms.map((_, frame) => ({
      scale: autoSpriteScale(definition, measurements, name, frame, calibration),
      anchor: lyingFloorAnchor(definition, measurements, name, frame) ?? footAnchor,
      shift: bodyCenterShift(definition, measurements, name, frame),
    })),
  }])),
}));
writeFileSync(`${OUTPUT}/layout.json`, JSON.stringify(layout));
console.log(`layout: ${layout.map(fighter => `${fighter.id} ${Object.keys(fighter.sheets).length}`).join(', ')}`);
