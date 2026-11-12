/** Menu and loading wallpapers: every image of `assets/art/wallpapers`, in name order, with the texture key the menu uses. */
const files = import.meta.glob<string>('../../assets/art/wallpapers/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' });

export interface Wallpaper { key: string; url: string; file: string; path: string }
export const wallpapers: readonly Wallpaper[] = Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([path, url]) => {
  const file = path.split('/').pop()!;
  return { key: `menu-${file.replace(/\.\w+$/, '').replace(/-menu$/, '')}`, url, file, path: `assets/art/wallpapers/${file}` };
});
