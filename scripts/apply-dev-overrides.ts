/**
 * Writes move, recipe, colour and contact frame (cut and size) tuning from the developer mode into the authored sources (the panel's "save to code"
 * buttons run it through the development server): `npm run dev:apply -- close-combat-ajustes.json`.
 * Every edit is checked before any file is written, so a target that is not found leaves all sources untouched.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { characters } from '../src/engine/data/characters';
import { editCss, editFighter, editHud } from '../src/dev/sourceEdits';
import type { DevOverrides } from '../src/dev/devOverrides';

const file = process.argv[2];
if (!file) throw new Error('Informe o arquivo com os ajustes do modo desenvolvedor.');
const { moves = {}, recipes = {}, combos = {}, colors = {}, frameCuts = {}, frameSizes = {} } = JSON.parse(readFileSync(file, 'utf8')) as Partial<DevOverrides>;
const edits = new Map<string, string>();
const edit = (path: string, change: (source: string) => string) => {
  const before = edits.get(path) ?? readFileSync(path, 'utf8'), after = change(before);
  if (after !== before) edits.set(path, after);
};
for (const { id } of characters) edit(`src/engine/data/fighters/${id}.ts`, source => editFighter(source, id, { moves, recipes, combos }));
edit('src/style.css', source => editCss(source, colors));
edit('src/ui/hudTheme.ts', source => editHud(source, colors));
edit('src/assets/sprites/effects/contact/frames.json', source => {
  if (!Object.keys(frameCuts).length && !Object.keys(frameSizes).length) return source;
  const sheets = JSON.parse(source) as Record<string, { size?: unknown; frames?: Record<string, unknown> }>;
  const sheet = (texture: string) => sheets[texture.replace(/^contact-/, '')] ??= {};
  for (const [texture, frames] of Object.entries(frameCuts)) sheet(texture).frames = { ...sheet(texture).frames, ...frames };
  for (const [texture, size] of Object.entries(frameSizes)) sheet(texture).size = size;
  return `${JSON.stringify(sheets, null, 1)}\n`;
});
for (const [path, source] of edits) { writeFileSync(path, source); console.log(`${path} atualizado.`); }
