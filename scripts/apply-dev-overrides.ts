/**
 * Writes move (timings, new names), recipe, colour, selection-screen framing (main and alternative art), contact frame (cut and size) and character frame (placement and crop) tuning from the developer mode into the authored sources (the panel's "save to code"
 * buttons run it through the development server): `npm run dev:apply -- close-combat-ajustes.json`.
 * Every edit is checked before any file is written, so a target that is not found leaves all sources untouched.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { characters } from '../src/engine/data/characters';
import { editCss, editFighter, editFighterArt, editHud, editNames } from '../src/dev/sourceEdits';
import type { DevOverrides } from '../src/dev/devOverrides';
import type { FrameAdjustment, FrameAdjustments } from '../src/rendering/animations/frameAdjustments';

const file = process.argv[2];
if (!file) throw new Error('Informe o arquivo com os ajustes do modo desenvolvedor.');
const { moves = {}, moveNames = {}, recipes = {}, combos = {}, colors = {}, frameCuts = {}, frameSizes = {}, frameAdjustments = {}, selection = {}, alternatives = {} } = JSON.parse(readFileSync(file, 'utf8')) as Partial<DevOverrides>;
const edits = new Map<string, string>();
const edit = (path: string, change: (source: string) => string) => {
  const before = edits.get(path) ?? (existsSync(path) ? readFileSync(path, 'utf8') : ''), after = change(before);
  if (after !== before) edits.set(path, after);
};
for (const { id } of characters) edit(`src/engine/data/fighters/${id}.ts`, source => editFighter(source, id, { moves, moveNames, recipes, combos }));
for (const [fighter, names] of Object.entries(moveNames)) {
  for (const locale of readdirSync('src/i18n/locales')) edit(`src/i18n/locales/${locale}`, source => editNames(source, fighter, names));
}
edit('src/style.css', source => editCss(source, colors));
edit('src/ui/fighterArt.ts', source => editFighterArt(source, selection));
edit('src/ui/hudTheme.ts', source => editHud(source, colors));
edit('src/assets/sprites/effects/contact/frames.json', source => {
  if (!Object.keys(frameCuts).length && !Object.keys(frameSizes).length) return source;
  const sheets = JSON.parse(source) as Record<string, { size?: unknown; frames?: Record<string, unknown> }>;
  const sheet = (texture: string) => sheets[texture.replace(/^contact-/, '')] ??= {};
  for (const [texture, frames] of Object.entries(frameCuts)) sheet(texture).frames = { ...sheet(texture).frames, ...frames };
  for (const [texture, size] of Object.entries(frameSizes)) sheet(texture).size = size;
  return `${JSON.stringify(sheets, null, 1)}\n`;
});
for (const [key, adjustment] of Object.entries(frameAdjustments)) {
  const [fighter, sheet, frame] = key.split(':');
  if (!characters.some(({ id }) => id === fighter)) throw new Error(`Personagem de ${key} não encontrado.`);
  edit(`src/assets/sprites/characters/${fighter}/frames.json`, source => {
    const file = JSON.parse(source || '{}') as FrameAdjustments & Record<string, Record<string, FrameAdjustment>>;
    const crop = adjustment.crop && Object.values(adjustment.crop).some(Boolean) ? adjustment.crop : undefined;
    const kept = { ...(adjustment.x ? { x: adjustment.x } : {}), ...(adjustment.y ? { y: adjustment.y } : {}), ...(crop ? { crop } : {}) };
    const frames = { ...file[sheet] };
    if (Object.keys(kept).length) frames[frame] = kept; else delete frames[frame];
    if (Object.keys(frames).length) file[sheet] = frames; else delete file[sheet];
    return `${JSON.stringify(file, null, 1)}\n`;
  });
}
for (const [key, framings] of Object.entries(alternatives)) {
  const [fighter, kind, image] = key.split('/');
  if (!existsSync(`src/assets/art/characters/${fighter}/${kind}/${image}`)) throw new Error(`Arte alternativa ${key} não encontrada.`);
  edit(`src/assets/art/characters/${fighter}/alternatives.json`, source => {
    const file = JSON.parse(source || '{}') as Record<string, Record<string, object>>;
    (file[kind] ??= {})[image] = { ...file[kind][image], ...framings };
    return `${JSON.stringify(file, null, 1)}\n`;
  });
}
for (const [path, source] of edits) { writeFileSync(path, source); console.log(`${path} atualizado.`); }
