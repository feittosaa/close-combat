/** The mask is a small copy of the original alpha channel, shared by every selection render. */
export interface AlphaMask { width: number; height: number; alpha: Uint8Array }
export interface HitRect { left: number; top: number; width: number; height: number }
const masks = new Map<string, AlphaMask>();
const pending = new Set<string>();

/** Object-fit: contain, object-position: center top; the rectangle already includes CSS transforms. */
export function silhouetteContains(rect: HitRect, naturalWidth: number, naturalHeight: number, mask: AlphaMask, x: number, y: number): boolean {
  if (!rect.width || !rect.height || !naturalWidth || !naturalHeight) return false;
  const scale = Math.min(rect.width / naturalWidth, rect.height / naturalHeight);
  const width = naturalWidth * scale, height = naturalHeight * scale;
  const localX = x - rect.left - (rect.width - width) / 2, localY = y - rect.top;
  if (localX < 0 || localY < 0 || localX >= width || localY >= height) return false;
  const column = Math.floor(localX / width * mask.width), row = Math.floor(localY / height * mask.height);
  return mask.alpha[row * mask.width + column] >= 32;
}

/** Decode each image once; the original art and its CSS positioning are not changed. */
export function preloadSelectionMask(url: string): void {
  if (masks.has(url) || pending.has(url) || typeof Image === 'undefined') return;
  pending.add(url);
  const image = new Image();
  image.onload = () => {
    const height = 512, width = Math.max(1, Math.round(height * image.naturalWidth / image.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context) {
      context.drawImage(image, 0, 0, width, height);
      const rgba = context.getImageData(0, 0, width, height).data;
      const alpha = new Uint8Array(width * height);
      for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
      masks.set(url, { width, height, alpha });
    }
    pending.delete(url);
  };
  image.onerror = () => { pending.delete(url); };
  image.src = url;
}

/** Topmost visible silhouette receives the pointer; transparent pixels fall through to the next layer. */
export function selectionCharacterAt(collage: HTMLElement, x: number, y: number): string | undefined {
  const layers = [...collage.querySelectorAll<HTMLButtonElement>('.selection-character')]
    .map((tile, order) => ({ tile, order, depth: Number(getComputedStyle(tile).zIndex) || 0 }))
    .sort((a, b) => b.depth - a.depth || b.order - a.order);
  for (const { tile } of layers) {
    const image = tile.querySelector('img');
    if (!image || !image.naturalWidth || !image.naturalHeight) continue;
    const mask = masks.get(image.currentSrc || image.src) ?? masks.get(image.getAttribute('src') ?? '');
    if (mask && silhouetteContains(image.getBoundingClientRect(), image.naturalWidth, image.naturalHeight, mask, x, y)) return tile.dataset.fighter;
  }
  return undefined;
}
