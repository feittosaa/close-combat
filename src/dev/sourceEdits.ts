import { CSS_COLORS, HUD_COLORS, MOVE_FIELDS, type DevOverrides } from './devOverrides';

/**
 * Writes developer tuning into the authored sources as text edits, so formatting and comments stay as they are:
 * moves and recipes in each fighter's data file, CSS colours in the `:root` of style.css and HUD colours in hudTheme.ts.
 * Run by `scripts/apply-dev-overrides.ts`; unknown targets fail instead of being skipped.
 */
type Range = { start: number; end: number };
const OPEN = '([{', CLOSE = ')]}';

/** Top-level comma-separated parts of the bracket opened at `open`, and the index of its closing bracket. */
function parts(source: string, open: number): { parts: Range[]; close: number } {
  const found: Range[] = [];
  let depth = 0, start = open + 1;
  const push = (end: number) => {
    const text = source.slice(start, end), lead = text.length - text.trimStart().length;
    if (text.trim()) found.push({ start: start + lead, end: start + lead + text.trim().length });
  };
  for (let index = open + 1; index < source.length; index += 1) {
    const char = source[index];
    if (char === '\'' || char === '"' || char === '`') {
      for (index += 1; index < source.length && source[index] !== char; index += 1) if (source[index] === '\\') index += 1;
    } else if (char === '/' && source[index + 1] === '/') index = source.indexOf('\n', index);
    else if (char === '/' && source[index + 1] === '*') index = source.indexOf('*/', index) + 1;
    else if (OPEN.includes(char)) depth += 1;
    else if (CLOSE.includes(char)) {
      if (depth === 0) { push(index); return { parts: found, close: index }; }
      depth -= 1;
    } else if (char === ',' && depth === 0) { push(index); start = index + 1; }
  }
  throw new Error('Colchete sem fechamento.');
}

/** The value of `key` in the object literal opened at `open`. */
function entry(source: string, open: number, key: string): Range | undefined {
  for (const part of parts(source, open).parts) {
    const match = /^([A-Za-z_$][\w$]*|'[^']*')\s*:\s*/.exec(source.slice(part.start, part.end));
    if (match && match[1].replace(/'/g, '') === key) return { start: part.start + match[0].length, end: part.end };
  }
  return undefined;
}

const splice = (source: string, range: Range, text: string) => source.slice(0, range.start) + text + source.slice(range.end);

/** Replaces `key` in the object literal opened at `open`, adding it at the end when absent. */
function setEntry(source: string, open: number, key: string, text: string): string {
  const range = entry(source, open, key);
  if (range) return splice(source, range, text);
  const { parts: found } = parts(source, open), last = found[found.length - 1];
  return last ? splice(source, { start: last.end, end: last.end }, `, ${key}: ${text}`) : splice(source, { start: open + 1, end: open + 1 }, ` ${key}: ${text} `);
}

/** The opening bracket of the array or object assigned to `key`, as `moves: [` or `HUD = {`. */
function opening(source: string, key: string): number {
  const match = new RegExp(`\\b${key}\\s*[:=]\\s*[[{]`).exec(source);
  if (!match) throw new Error(`“${key}” não encontrado.`);
  return match.index + match[0].length - 1;
}

/** The object with `id: '<id>'` inside the array assigned to `key`. */
function item(source: string, key: string, id: string): number {
  const found = parts(source, opening(source, key)).parts.find(part => {
    const range = source[part.start] === '{' ? entry(source, part.start, 'id') : undefined;
    return range && source.slice(range.start, range.end) === `'${id}'`;
  });
  if (!found) throw new Error(`“${id}” não encontrado em ${key}.`);
  return found.start;
}

/** Source literal in the style of the data files: single-quoted strings, inline arrays and objects. */
export function literal(value: unknown): string {
  if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`;
  if (Array.isArray(value)) return `[${value.map(literal).join(', ')}]`;
  if (value && typeof value === 'object') return `{ ${Object.entries(value).filter(([, field]) => field !== undefined).map(([key, field]) => `${key}: ${literal(field)}`).join(', ')} }`;
  return String(value);
}

/** One fighter's data file with its move timings, recipe timings and new recipes written in. */
export function editFighter(source: string, fighterId: string, overrides: Pick<DevOverrides, 'moves' | 'recipes' | 'combos'>): string {
  for (const [moveId, tuning] of Object.entries(overrides.moves[fighterId] ?? {})) {
    for (const field of MOVE_FIELDS) if (tuning[field] !== undefined) source = setEntry(source, item(source, 'moves', moveId), field, String(tuning[field]));
    for (const [field, key] of [['pushbackHit', 'hit'], ['pushbackBlock', 'block']] as const) {
      if (tuning[field] === undefined) continue;
      const pushback = entry(source, item(source, 'moves', moveId), 'pushback');
      if (!pushback || source[pushback.start] !== '{') throw new Error(`Recuo de “${moveId}” não é um objeto literal.`);
      source = setEntry(source, pushback.start, key, String(tuning[field]));
    }
  }
  for (const [recipeId, tuning] of Object.entries(overrides.recipes[fighterId] ?? {})) {
    if (tuning.startupFrames) source = setEntry(source, item(source, 'combos', recipeId), 'startupFrames', literal(tuning.startupFrames));
    if (tuning.recoveryFrames !== undefined) source = setEntry(source, item(source, 'combos', recipeId), 'recoveryFrames', String(tuning.recoveryFrames));
  }
  const added = overrides.combos[fighterId] ?? [];
  if (added.length) {
    // New recipes go after the last one, one per line with its indentation and a trailing comma, like the authored ones.
    const array = opening(source, 'combos'), { parts: found, close } = parts(source, array), last = found[found.length - 1];
    if (!last) throw new Error(`Lista de combos de “${fighterId}” vazia.`);
    const indent = /([ \t]*)$/.exec(source.slice(0, last.start))![1], trailing = source.slice(last.end, close).trimStart().startsWith(',');
    const at = trailing ? source.indexOf(',', last.end) + 1 : last.end;
    source = splice(source, { start: at, end: at }, `${trailing ? '' : ','}${added.map(recipe => `\n${indent}${literal(recipe)},`).join('')}`);
  }
  return source;
}

/** style.css with the `:root` colour tokens written in. */
export function editCss(source: string, colors: DevOverrides['colors']): string {
  const root = source.indexOf(':root {'), end = source.indexOf('}', root);
  if (root < 0) throw new Error(':root não encontrado em style.css.');
  for (const name of CSS_COLORS) {
    const value = colors[`css:${name}`]; if (!value) continue;
    const match = new RegExp(`${name}:\\s*([^;]+);`).exec(source.slice(root, end));
    if (!match) throw new Error(`${name} não encontrado no :root.`);
    const start = root + match.index + match[0].length - match[1].length - 1;
    source = splice(source, { start, end: start + match[1].length }, value);
  }
  return source;
}

/** hudTheme.ts with the HUD colour tokens written in, as Phaser numbers or CSS strings like the originals. */
export function editHud(source: string, colors: DevOverrides['colors']): string {
  for (const token of HUD_COLORS) {
    const value = colors[`hud:${token}`]; if (!value) continue;
    const [key, index] = token.split('.'), hud = opening(source, 'HUD');
    let range = entry(source, hud, key);
    if (range && index !== undefined) range = source[range.start] === '[' ? parts(source, range.start).parts[Number(index)] : undefined;
    if (!range) throw new Error(`HUD.${token} não encontrado.`);
    source = splice(source, range, source[range.start] === '0' ? `0x${value.slice(1).toLowerCase()}` : `'${value}'`);
  }
  return source;
}
