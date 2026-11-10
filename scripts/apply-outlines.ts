/**
 * Writes the outline widths tried in the developer mode (`outlines`, world pixels per fighter) into each fighter's
 * `outline.json`, the width the game trims or grows every frame's outline to: the panel's "save" button runs it through
 * the development server, or `vite-node scripts/apply-outlines.ts close-combat-ajustes.json`. No image changes.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) throw new Error('Informe o arquivo com os ajustes do modo desenvolvedor.');
const { outlines = {} } = JSON.parse(readFileSync(file, 'utf8')) as { outlines?: Record<string, number> };
for (const [fighter, width] of Object.entries(outlines)) {
  const target = `src/assets/sprites/characters/${fighter}/outline.json`;
  if (!existsSync(target)) throw new Error(`${fighter} não tem contorno uniformizado (${target}).`);
  writeFileSync(target, `${JSON.stringify({ width: Math.round(width * 100) / 100 })}\n`);
  console.log(`${fighter}: contorno de ${width} px gravado.`);
}
