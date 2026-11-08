import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, type HotPayload, type Plugin, type ViteDevServer } from 'vite';

/**
 * Sprite intake while the development server runs: every PNG added, replaced or removed in `src/assets/sprites`, and
 * every victory pose or icon of a fighter (including those saved by the developer mode), goes through
 * `scripts/prepare-sprites.py` (background cleanup, measurement for the automatic animation size, the trimmed layout of
 * character sheets and the trimmed victory pose). The same step runs once before `npm run dev` and `npm run build`.
 */
const PREPARED = /src\/assets\/(sprites\/.*|art\/characters\/[\w-]+\/(fullbody[\w-]*|selection-icon))\.png$/;
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

const IMAGE_PATH = /^(src\/assets|assets\/art)\/[\w./-]+\.(png|jpe?g|webp)$/;

/**
 * Lets the developer mode save its tuning into the sources: animation sizes into each fighter's `calibration.json`
 * (`scripts/apply-sprite-scales.ts`), moves, recipes and colours into the authored data (`scripts/apply-dev-overrides.ts`)
 * and replaced images over the existing files.
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
  /**
   * Saves every adjustment (field `tuning`) and replaced image in one request and in the order the art needs: the
   * tuning first, with the victory frames set for the untrimmed poses; then the images; then their cleanup and trim,
   * which corrects those frames. Images alone are saved the same way. The images are checked before anything is written.
   */
  const everything = async (request: IncomingMessage, response: ServerResponse) => {
    const fields = await form(request), tuning = fields.get('tuning');
    const files = [...fields.entries()].filter(([name]) => name !== 'tuning');
    const invalid = invalidImages(files);
    if (invalid.length) { response.statusCode = 400; response.end(`Imagens inválidas: ${invalid.join(', ')}`); return; }
    let output = '';
    const step = ({ ok, output: printed }: { ok: boolean; output: string }) => {
      output += printed;
      if (!ok) { response.statusCode = 500; response.end(output); }
      return ok;
    };
    if (typeof tuning === 'string') {
      for (const path of ['scripts/apply-sprite-scales.ts', 'scripts/apply-dev-overrides.ts']) if (!step(await applyTuning(path, tuning))) return;
    }
    if (files.length) { await writeImages(files); if (!step(await run('python3', ['scripts/prepare-sprites.py']))) return; }
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
