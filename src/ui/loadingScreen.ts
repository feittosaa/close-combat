import { t } from '../i18n/i18n';
import { createWallpaperShuffle } from './wallpaperShuffle';
import { wallpapers as menuWallpapers } from './wallpapers';
import { fighterArt, frameStyle, heroFrame } from './fighterArt';

const wallpapers = menuWallpapers.map(wallpaper => wallpaper.url);
/** Matches the fade of `.loading-screen.leaving` in style.css. */
const LEAVE_MS = 600;
const nextWallpaperIndex = createWallpaperShuffle(wallpapers.length);
let shown = 0;

/** Loading screen over the game, showing the wallpapers in random order every twenty seconds; returns the function that fades it out and then removes it. */
export function showLoadingScreen(fighters?: readonly [string, string]): () => void {
  if (typeof document === 'undefined') return () => undefined;
  const screen = document.createElement('div');
  screen.className = 'loading-screen';
  screen.setAttribute('role', 'status');
  if (fighters) {
    const caption = document.createElement('span'); caption.className = 'loading-caption'; caption.textContent = t('boot.loading');
    screen.appendChild(caption);
    screen.classList.add('match-loading');
    fighters.forEach((id, index) => {
      const art = fighterArt[id]; if (!art) return;
      const side = document.createElement('div'); side.className = `loading-fighter ${index ? 'right' : 'left'}`;
      const portrait = document.createElement('img'); portrait.src = art.background; portrait.alt = ''; portrait.style.cssText = frameStyle(heroFrame(art));
      const name = document.createElement('strong'); name.textContent = art.name;
      side.append(portrait, name); screen.append(side);
    });
  } else screen.textContent = t('boot.loading');
  document.body.appendChild(screen);
  const advance = (): void => {
    if (!wallpapers.length) return;
    screen.className = `loading-screen ${shown++ % 2 === 0 ? 'wallpaper-left' : 'wallpaper-right'}`;
    screen.style.setProperty('--loading-wallpaper', `url(${JSON.stringify(wallpapers[nextWallpaperIndex()])})`);
  };
  if (!fighters) advance();
  const timer = fighters ? undefined : window.setInterval(advance, 20000);
  return () => {
    if (timer !== undefined) window.clearInterval(timer);
    screen.classList.add('leaving');
    window.setTimeout(() => screen.remove(), LEAVE_MS);
  };
}
