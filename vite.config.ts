import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Sprite intake while the development server runs: every PNG added, replaced or removed in `src/assets/sprites` goes through
 * `scripts/prepare-sprites.py` (background cleanup, measurement for the automatic animation size and the trimmed
 * layout of character sheets). The same step runs once before `npm run dev` and `npm run build`.
 */
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
    if (!/src\/assets\/sprites\/.*\.png$/.test(file.replaceAll('\\', '/'))) return;
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
  /** Runs a script over the posted JSON and answers with its output. */
  const script = (path: string) => async (request: IncomingMessage, response: ServerResponse) => {
    const folder = mkdtempSync(join(tmpdir(), 'close-combat-')), file = join(folder, 'ajustes.json');
    writeFileSync(file, await body(request));
    let output = '';
    const child = spawn('npx', ['vite-node', path, file]);
    child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { output += chunk; });
    child.on('close', code => {
      rmSync(folder, { recursive: true, force: true });
      response.statusCode = code === 0 ? 200 : 500; response.end(output);
    });
  };
  /** Writes the posted bytes over an existing image of the game. */
  const image = async (request: IncomingMessage, response: ServerResponse) => {
    const path = new URL(request.url ?? '', 'http://localhost').searchParams.get('path') ?? '';
    if (!IMAGE_PATH.test(path) || path.includes('..') || !existsSync(path)) { response.statusCode = 400; response.end(`Imagem inválida: ${path}`); return; }
    writeFileSync(path, await body(request)); response.end(`${path} gravada.`);
  };
  const routes: Record<string, (request: IncomingMessage, response: ServerResponse) => Promise<void>> = {
    '/__dev/sprite-scales': script('scripts/apply-sprite-scales.ts'),
    '/__dev/overrides': script('scripts/apply-dev-overrides.ts'),
    '/__dev/image': image,
  };
  return {
    name: 'close-combat-developer-saving',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const route = routes[(request.url ?? '').split('?')[0]];
        if (!route) { next(); return; }
        if (request.method !== 'POST') { response.statusCode = 405; response.end(); return; }
        route(request, response).catch(error => { response.statusCode = 500; response.end(String(error)); });
      });
    },
  };
}

export default defineConfig({ plugins: [spriteIntake(), developerSaving()] });
