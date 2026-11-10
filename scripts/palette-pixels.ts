/**
 * Applies a fighter's alternate palette to colors, as the game does (sheet correction first, the drawn color choosing
 * what changes): `vite-node scripts/palette-pixels.ts <palette> <colors.json> <saida.json>`, where the input maps
 * `<sheet>` to `[[r, g, b], ...]` and the output keeps the same shape. Used by `verify-character-colors.py --alternativa`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { correctedPixel, palettePixel, type Palette } from '../src/rendering/characterColor';

const [palette, input, output, corrections] = process.argv.slice(2);
const colors = JSON.parse(readFileSync(input, 'utf8')) as Record<string, number[][]>;
const sheetCorrections = JSON.parse(readFileSync(corrections, 'utf8')) as Record<string, number[]>;
const result = Object.fromEntries(Object.entries(colors).map(([sheet, list]) => [sheet, list.map(([r, g, b]) => {
  const drawn: [number, number, number] = [r, g, b];
  return palettePixel(...(sheetCorrections[sheet] ? correctedPixel(r, g, b, sheetCorrections[sheet]) : drawn), palette as Palette, drawn);
})]));
writeFileSync(output, JSON.stringify(result));
