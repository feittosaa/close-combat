import { spawn } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';

/**
 * Sprite intake while the development server runs: every PNG added, replaced or removed in `src/assets/sprites` goes through
 * `scripts/prepare-sprites.py` (background cleanup and measurement for the automatic animation size). The same step
 * runs once before `npm run dev` and `npm run build`.
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

export default defineConfig({ plugins: [spriteIntake()] });
