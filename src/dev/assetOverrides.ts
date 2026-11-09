import Phaser from 'phaser';

/** Every image the game ships, by its served URL; replacements are stored per URL and never touch the source files. */
export const gameImages: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(import.meta.glob<string>(
  ['../assets/**/*.{png,jpg,jpeg,webp}', '../../assets/art/**/*.{png,jpg,jpeg,webp}'],
  { eager: true, query: '?url', import: 'default' },
)).map(([path, url]) => [url, path.replace(/^\.\.\/\.\.\//, '').replace(/^\.\.\//, 'src/')]));

/** Stores: replaced images by URL; alternative art added (by `<fighter>/<kind>/<added at>`) and removed (by project path), not yet saved. */
const DB = 'close-combat-dev', STORE = 'images', ADDED = 'added-alternatives', REMOVED = 'removed-alternatives';
const replacements = new Map<string, string>();

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 2);
    request.onupgradeneeded = () => { for (const store of [STORE, ADDED, REMOVED]) if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>, store = STORE): Promise<T> {
  const db = await database();
  return new Promise<T>((resolve, reject) => {
    const request = run(db.transaction(store, mode).objectStore(store));
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}
/** Every entry of a store, by key. */
async function entries<T>(db: IDBDatabase, store: string): Promise<[string, T][]> {
  return new Promise(resolve => {
    const found: [string, T][] = [], request = db.transaction(store).objectStore(store).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) { resolve(found); return; }
      found.push([String(cursor.key), cursor.value as T]); cursor.continue();
    };
    request.onerror = () => resolve(found);
  });
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

/** An alternative image added in the panel, written to `src/assets/art/characters/<fighter>/<kind>/` only when saved. */
export interface PendingAlternative { key: string; fighter: string; kind: string; blob: Blob; url: string }
const additions = new Map<string, PendingAlternative>(), removals = new Set<string>();
const pending = (key: string, blob: Blob): PendingAlternative => {
  const [fighter, kind] = key.split('/');
  return { key, fighter, kind, blob, url: URL.createObjectURL(blob) };
};
export const pendingAdditions = (): readonly PendingAlternative[] => [...additions.values()];
/** Project paths of saved alternative images marked for removal. */
export const pendingRemovals = (): ReadonlySet<string> => removals;
export async function addAlternatives(fighter: string, kind: string, files: readonly Blob[]): Promise<void> {
  for (const [index, file] of files.entries()) {
    const key = `${fighter}/${kind}/${Date.now()}-${index}`;
    await transact('readwrite', store => store.put(file, key), ADDED);
    additions.set(key, pending(key, file));
  }
}
export async function discardAddition(key: string): Promise<void> {
  await transact('readwrite', store => store.delete(key), ADDED);
  URL.revokeObjectURL(additions.get(key)?.url ?? ''); additions.delete(key);
}
export async function markRemoval(path: string, removed: boolean): Promise<void> {
  if (removed) await transact('readwrite', store => store.put(true, path), REMOVED); else await transact('readwrite', store => store.delete(path), REMOVED);
  if (removed) removals.add(path); else removals.delete(path);
}
/** Drops every pending addition and removal (before a save writes them); `restore` brings back a copy if it fails. */
export async function takePendingAlternatives(): Promise<{ added: readonly PendingAlternative[]; removed: readonly string[]; restore: () => Promise<void> }> {
  const added = pendingAdditions(), removed = [...removals];
  await transact('readwrite', store => store.clear(), ADDED); await transact('readwrite', store => store.clear(), REMOVED);
  additions.clear(); removals.clear();
  return {
    added, removed,
    restore: async () => {
      for (const entry of added) { await transact('readwrite', store => store.put(entry.blob, entry.key), ADDED); additions.set(entry.key, entry); }
      for (const path of removed) await markRemoval(path, true);
    },
  };
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
 * Loads the stored replacements (and the pending alternative art) before the game boots, then serves them in place of the originals: Phaser files are
 * redirected as they are queued, and DOM images or inline styles are rewritten as they appear.
 */
export async function installAssetOverrides(): Promise<void> {
  try {
    const db = await database();
    for (const [url, blob] of await entries<Blob>(db, STORE)) replacements.set(url, URL.createObjectURL(blob));
    for (const [key, blob] of await entries<Blob>(db, ADDED)) additions.set(key, pending(key, blob));
    for (const [path] of await entries(db, REMOVED)) removals.add(path);
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
