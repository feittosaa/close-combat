import Phaser from 'phaser';

/** Every image the game ships, by its served URL; replacements are stored per URL and never touch the source files. */
export const gameImages: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(import.meta.glob<string>(
  ['../assets/**/*.{png,jpg,jpeg,webp}', '../../assets/art/**/*.{png,jpg,jpeg,webp}'],
  { eager: true, query: '?url', import: 'default' },
)).map(([path, url]) => [url, path.replace(/^\.\.\/\.\.\//, '').replace(/^\.\.\//, 'src/')]));

const DB = 'close-combat-dev', STORE = 'images';
const replacements = new Map<string, string>();

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise<T>((resolve, reject) => {
    const request = run(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

export const replacedImages = (): ReadonlyMap<string, string> => replacements;
export async function replaceImage(url: string, file: Blob): Promise<void> {
  await transact('readwrite', store => store.put(file, url));
  if (replacements.has(url)) URL.revokeObjectURL(replacements.get(url)!);
  replacements.set(url, URL.createObjectURL(file));
}
export async function restoreImage(url: string): Promise<void> {
  await transact('readwrite', store => store.delete(url));
  if (replacements.has(url)) URL.revokeObjectURL(replacements.get(url)!);
  replacements.delete(url);
}

const swap = (value: string): string => {
  for (const [url, replacement] of replacements) if (value.includes(url)) value = value.split(url).join(replacement);
  return value;
};
function rewrite(node: Element): void {
  if (node instanceof HTMLImageElement && replacements.has(node.getAttribute('src') ?? '')) node.src = replacements.get(node.getAttribute('src')!)!;
  const style = node.getAttribute('style');
  if (style && [...replacements.keys()].some(url => style.includes(url))) node.setAttribute('style', swap(style));
}

/**
 * Loads the stored replacements before the game boots, then serves them in place of the originals: Phaser files are
 * redirected as they are queued, and DOM images or inline styles are rewritten as they appear.
 */
export async function installAssetOverrides(): Promise<void> {
  try {
    const db = await database();
    await new Promise<void>((resolve) => {
      const request = db.transaction(STORE).objectStore(STORE).openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) { resolve(); return; }
        replacements.set(String(cursor.key), URL.createObjectURL(cursor.value as Blob)); cursor.continue();
      };
      request.onerror = () => resolve();
    });
    db.close();
  } catch { /* Without IndexedDB the game simply runs with its own images. */ }
  const addFile = Phaser.Loader.LoaderPlugin.prototype.addFile;
  Phaser.Loader.LoaderPlugin.prototype.addFile = function (this: Phaser.Loader.LoaderPlugin, file: Phaser.Loader.File | Phaser.Loader.File[]) {
    for (const entry of Array.isArray(file) ? file : [file]) if (typeof entry.url === 'string' && replacements.has(entry.url)) entry.url = replacements.get(entry.url)!;
    return addFile.call(this, file);
  };
  new MutationObserver(records => {
    if (!replacements.size) return;
    for (const record of records) {
      if (record.type === 'attributes') rewrite(record.target as Element);
      else record.addedNodes.forEach(node => { if (node instanceof Element) { rewrite(node); node.querySelectorAll('img,[style]').forEach(rewrite); } });
    }
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'style'] });
}
