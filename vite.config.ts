import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, type HotPayload, type Plugin, type ViteDevServer } from 'vite';

/**
 * Sprite intake while the development server runs: every PNG added, replaced or removed in `src/assets/sprites`, and
 * every victory pose, selection art or icon of a fighter (including those saved by the developer mode), goes through
 * `scripts/prepare-sprites.py` (upscale of art in very low resolution, background cleanup, measurement for the automatic
 * animation size, the trimmed layout of character sheets and the trimmed victory pose). The same step runs once before `npm run dev` and `npm run build`.
 */
const PREPARED = /src\/assets\/(sprites\/.*|art\/characters\/[\w-]+\/(fullbody[\w-]*|selection-(icon|background)|(victory-poses|selection-icons|selection-backgrounds)\/[\w-]+))\.png$/;
function spriteIntake(): Plugin {
  let timer: ReturnType<typeof setTimeout> | undefined, running = false, again = false;
  const run = (): void => {
    if (running) { again = true; return; }
    running = true;
    spawn('python3', ['scripts/prepare-sprites.py'], { stdio: 'inherit' }).on('close', () => {
      running = false;
      if (again) { again = false; run(); }
    });
  };
  const queue = (file: string): void => {
    if (!PREPARED.test(file.replaceAll('\\', '/'))) return;
    clearTimeout(timer); timer = setTimeout(run, 500);
  };
  return {
    name: 'close-combat-sprite-intake',
    apply: 'serve',
    configureServer(server) { server.watcher.on('add', queue).on('change', queue).on('unlink', queue); },
  };
}

/** Field naming where an added alternative image goes, and a saved alternative image (fighter, kind, file). */
const ALTERNATIVE_TARGET = /^alternative:[\w-]+\/(victory-poses|selection-backgrounds|selection-icons)$/;
const ALTERNATIVE_IMAGE = /^src\/assets\/art\/characters\/([\w-]+)\/(victory-poses|selection-backgrounds|selection-icons)\/([\w-]+\.png)$/;
const IMAGE_PATH = /^(src\/assets|assets\/art)\/[\w./-]+\.(png|jpe?g|webp)$/;

/**
 * Lets the developer mode save its tuning into the sources: animation sizes into each fighter's `calibration.json`
 * (`scripts/apply-sprite-scales.ts`), moves, recipes and colours into the authored data (`scripts/apply-dev-overrides.ts`),
 * replaced images over the existing files, and alternative art added or removed (all through `/__dev/everything`).
 */
function developerSaving(): Plugin {
  const body = (request: IncomingMessage): Promise<Buffer> => new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk)).on('end', () => resolve(Buffer.concat(chunks))).on('error', reject);
  });
  /** Runs a command and collects what it prints. */
  const run = (command: string, args: string[]): Promise<{ ok: boolean; output: string }> => new Promise(resolve => {
    let output = '';
    const child = spawn(command, args);
    child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { output += chunk; });
    child.on('close', code => resolve({ ok: code === 0, output }));
  });
  /** Runs a tuning script over the adjustments, given as JSON. */
  const applyTuning = async (path: string, json: string | Buffer) => {
    const folder = mkdtempSync(join(tmpdir(), 'close-combat-')), file = join(folder, 'ajustes.json');
    writeFileSync(file, json);
    try { return await run('npx', ['vite-node', path, file]); } finally { rmSync(folder, { recursive: true, force: true }); }
  };
  const script = (path: string) => async (request: IncomingMessage, response: ServerResponse) => {
    const { ok, output } = await applyTuning(path, await body(request));
    response.statusCode = ok ? 200 : 500; response.end(output);
  };
  const form = async (request: IncomingMessage) => new Request('http://localhost', { method: 'POST', headers: { 'content-type': request.headers['content-type'] ?? '' }, body: await body(request) }).formData();
  const invalidImages = (files: [string, FormDataEntryValue][]) => files.map(([path]) => path).filter(path => !IMAGE_PATH.test(path) || path.includes('..') || !existsSync(path));
  /** Writes images (form fields named by their path) over existing images of the game. */
  const writeImages = async (files: [string, FormDataEntryValue][]) => {
    for (const [path, file] of files) writeFileSync(path, Buffer.from(await (file as Blob).arrayBuffer()));
  };
  /** Where an added alternative image goes: `alternative:<fighter>/<kind>` → `src/assets/art/characters/<fighter>/<kind>`. */
  const alternativeFolder = (name: string) => `src/assets/art/characters/${name.slice('alternative:'.length)}`;
  /** Alternative art to add that is not a PNG for an existing fighter and kind, and alternative images to remove that do not exist. */
  const invalidAlternatives = (added: [string, FormDataEntryValue][], removed: string[]) => [
    ...added.filter(([name, file]) => !ALTERNATIVE_TARGET.test(name) || !existsSync(alternativeFolder(name).replace(/\/[\w-]+$/, '')) || (file as Blob).type !== 'image/png')
      .map(([name]) => `${name} (só PNG, de personagem existente)`),
    ...removed.filter(path => !ALTERNATIVE_IMAGE.test(path) || !existsSync(path)),
  ];
  /** Reads, changes and writes a fighter's `alternatives.json` (framings by kind and file), deleting it once empty. */
  const editFramings = (fighter: string, change: (file: Record<string, Record<string, unknown>>) => void) => {
    const path = `src/assets/art/characters/${fighter}/alternatives.json`;
    if (!existsSync(path)) return;
    const file = JSON.parse(readFileSync(path, 'utf8')) as Record<string, Record<string, unknown>>;
    change(file);
    for (const kind of Object.keys(file)) if (!Object.keys(file[kind]).length) delete file[kind];
    if (Object.keys(file).length) writeFileSync(path, `${JSON.stringify(file, null, 1)}\n`); else rmSync(path);
  };
  /** Numbers the images of an alternative folder again from 1, in order, with their framings following them. */
  const renumber = (fighter: string, kind: string) => {
    const folder = `src/assets/art/characters/${fighter}/${kind}`, moved: [string, string][] = [];
    const images = readdirSync(folder).filter(name => /^\d+\.png$/.test(name)).sort((a, b) => parseInt(a) - parseInt(b));
    // Each image moves down to a number already freed, so no rename overwrites another image.
    images.forEach((name, index) => { if (name !== `${index + 1}.png`) { renameSync(`${folder}/${name}`, `${folder}/${index + 1}.png`); moved.push([name, `${index + 1}.png`]); } });
    if (!images.length) rmSync(folder, { recursive: true });
    editFramings(fighter, file => {
      const framings = file[kind] ?? {};
      for (const [from, to] of moved) if (framings[from]) { framings[to] = framings[from]; delete framings[from]; }
    });
  };
  /**
   * Adds alternative art (victory poses, selection art or icons; fields `alternative:<fighter>/<kind>`) as the next
   * `<n>.png` of its folder, and deletes alternative images (fields `remove-alternative`, project paths) with their
   * framings in `alternatives.json`; the images left are numbered again from 1, without gaps.
   */
  const writeAlternatives = async (added: [string, FormDataEntryValue][], removed: string[]) => {
    const emptied = new Set<string>();
    for (const path of removed) {
      rmSync(path);
      const [, fighter, kind, image] = ALTERNATIVE_IMAGE.exec(path)!;
      editFramings(fighter, file => { delete file[kind]?.[image]; });
      emptied.add(`${fighter}/${kind}`);
    }
    for (const folder of emptied) renumber(...folder.split('/') as [string, string]);
    for (const [name, file] of added) {
      const folder = alternativeFolder(name);
      mkdirSync(folder, { recursive: true });
      const next = Math.max(0, ...readdirSync(folder).map(image => Number(/^(\d+)\.png$/.exec(image)?.[1] ?? 0))) + 1;
      writeFileSync(`${folder}/${next}.png`, Buffer.from(await (file as Blob).arrayBuffer()));
    }
  };
  /**
   * Saves adjustments (field `tuning`), alternative art added or removed and replaced images (fields named by their
   * path) in one request and in the order the art needs: the tuning first, with the victory frames set for the
   * untrimmed poses; then the alternative art and the images; then their cleanup and trim, which corrects those frames.
   * Everything is checked before anything is written.
   */
  const everything = async (request: IncomingMessage, response: ServerResponse) => {
    const fields = await form(request), tuning = fields.get('tuning');
    const added = [...fields.entries()].filter(([name]) => name.startsWith('alternative:'));
    const removed = fields.getAll('remove-alternative').map(String);
    const files = [...fields.entries()].filter(([name]) => name !== 'tuning' && name !== 'remove-alternative' && !name.startsWith('alternative:'));
    const invalid = [...invalidImages(files), ...invalidAlternatives(added, removed)];
    if (invalid.length) { response.statusCode = 400; response.end(`Inválido: ${invalid.join(', ')}`); return; }
    let output = '';
    const step = ({ ok, output: printed }: { ok: boolean; output: string }) => {
      output += printed;
      if (!ok) { response.statusCode = 500; response.end(output); }
      return ok;
    };
    if (typeof tuning === 'string') {
      for (const path of ['scripts/apply-sprite-scales.ts', 'scripts/apply-dev-overrides.ts']) if (!step(await applyTuning(path, tuning))) return;
    }
    await writeAlternatives(added, removed);
    await writeImages(files);
    if (files.length || added.length || removed.length) { if (!step(await run('python3', ['scripts/prepare-sprites.py']))) return; }
    response.end(output || 'Tudo gravado.');
  };
  const routes: Record<string, (request: IncomingMessage, response: ServerResponse) => Promise<void>> = {
    '/__dev/sprite-scales': script('scripts/apply-sprite-scales.ts'),
    '/__dev/overrides': script('scripts/apply-dev-overrides.ts'),
    '/__dev/everything': everything,
  };
  return {
    name: 'close-combat-developer-saving',
    apply: 'serve',
    configureServer(server) {
      const hold = holdReloads(server);
      server.middlewares.use((request, response, next) => {
        const route = routes[(request.url ?? '').split('?')[0]];
        if (!route) { next(); return; }
        if (request.method !== 'POST') { response.statusCode = 405; response.end(); return; }
        void hold(() => route(request, response).catch(error => { response.statusCode = 500; response.end(String(error)); }));
      });
    },
  };
}

/**
 * A save writes many files, each of which would reload the page: while one runs (and until its last written files have
 * reached the watcher), Vite's updates and reloads are held back, and the page then reloads once.
 */
function holdReloads(server: ViteDevServer): (save: () => Promise<void>) => Promise<void> {
  const QUIET_MS = 500, hot = server.ws, send = hot.send.bind(hot) as (payload: HotPayload) => void;
  let saves = 0, held = false, lastChange = 0;
  server.watcher.on('all', () => { if (saves) lastChange = Date.now(); });
  hot.send = ((payload: HotPayload | string, ...rest: unknown[]) => {
    if (saves && typeof payload === 'object' && (payload.type === 'update' || payload.type === 'full-reload')) { held = true; return; }
    (send as (...args: unknown[]) => void)(payload, ...rest);
  }) as typeof hot.send;
  return async save => {
    saves++;
    try { await save(); } finally {
      while (Date.now() - lastChange < QUIET_MS) await new Promise(resolve => setTimeout(resolve, QUIET_MS));
      if (--saves === 0 && held) { held = false; send({ type: 'full-reload', path: '*' }); }
    }
  };
}

export default defineConfig({ plugins: [spriteIntake(), developerSaving()] });
