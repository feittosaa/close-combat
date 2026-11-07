import { t } from '../i18n/i18n';

const wallpapers = Object.values(import.meta.glob<string>('../../assets/art/wallpapers/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }));
let nextWallpaper = 0;
try { nextWallpaper = Number(sessionStorage.getItem('close-combat-wallpaper') ?? 0) || 0; } catch { /* Storage may be unavailable. */ }

/** Loading screen over the game, rotating the wallpapers every twenty seconds; returns the function that removes it. */
export function showLoadingScreen(): () => void {
  if (typeof document === 'undefined') return () => undefined;
  const screen = document.createElement('div');
  screen.className = 'loading-screen';
  screen.setAttribute('role', 'status');
  screen.textContent = t('boot.loading');
  document.body.appendChild(screen);
  const advance = (): void => {
    if (!wallpapers.length) return;
    const index = nextWallpaper++;
    screen.className = `loading-screen ${index % 2 === 0 ? 'wallpaper-left' : 'wallpaper-right'}`;
    screen.style.setProperty('--loading-wallpaper', `url(${JSON.stringify(wallpapers[index % wallpapers.length])})`);
    try { sessionStorage.setItem('close-combat-wallpaper', String(nextWallpaper)); } catch { /* Keep loading without storage. */ }
  };
  advance();
  const timer = window.setInterval(advance, 20000);
  return () => { window.clearInterval(timer); screen.remove(); };
}
