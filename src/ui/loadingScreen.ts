import { t } from '../i18n/i18n';
import { createWallpaperShuffle } from './wallpaperShuffle';
import { wallpapers as menuWallpapers } from './wallpapers';

const wallpapers = menuWallpapers.map(wallpaper => wallpaper.url);
/** Matches the fade of `.loading-screen.leaving` in style.css. */
const LEAVE_MS = 600;
const nextWallpaperIndex = createWallpaperShuffle(wallpapers.length);
let shown = 0;

/** Loading screen over the game, showing the wallpapers in random order every twenty seconds; returns the function that fades it out and then removes it. */
export function showLoadingScreen(): () => void {
  if (typeof document === 'undefined') return () => undefined;
  const screen = document.createElement('div');
  screen.className = 'loading-screen';
  screen.setAttribute('role', 'status');
  screen.textContent = t('boot.loading');
  document.body.appendChild(screen);
  const advance = (): void => {
    if (!wallpapers.length) return;
    screen.className = `loading-screen ${shown++ % 2 === 0 ? 'wallpaper-left' : 'wallpaper-right'}`;
    screen.style.setProperty('--loading-wallpaper', `url(${JSON.stringify(wallpapers[nextWallpaperIndex()])})`);
  };
  advance();
  const timer = window.setInterval(advance, 20000);
  return () => {
    window.clearInterval(timer);
    screen.classList.add('leaving');
    window.setTimeout(() => screen.remove(), LEAVE_MS);
  };
}
