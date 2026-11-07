import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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

/**
 * Lets the developer mode save its animation sizes into each fighter's `calibration.json`: the posted adjustments go
 * through `scripts/apply-sprite-scales.ts`, the same step as `npm run sprites:apply-scales`.
 */
function spriteScaleSaving(): Plugin {
  return {
    name: 'close-combat-sprite-scale-saving',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__dev/sprite-scales', (request, response) => {
        if (request.method !== 'POST') { response.statusCode = 405; response.end(); return; }
        let body = '';
        request.on('data', chunk => { body += chunk; }).on('end', () => {
          const folder = mkdtempSync(join(tmpdir(), 'close-combat-')), file = join(folder, 'ajustes.json');
          writeFileSync(file, body);
          let output = '';
          const child = spawn('npx', ['vite-node', 'scripts/apply-sprite-scales.ts', file]);
          child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { output += chunk; });
          child.on('close', code => {
            rmSync(folder, { recursive: true, force: true });
            response.statusCode = code === 0 ? 200 : 500; response.end(output);
          });
        });
      });
    },
  };
}

export default defineConfig({ plugins: [spriteIntake(), spriteScaleSaving()] });
