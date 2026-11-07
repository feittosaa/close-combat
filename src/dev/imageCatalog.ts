/** Top-level folders of the developer image browser, in display order. */
export const IMAGE_SECTIONS = ['Personagens', 'Títulos de luta', 'Cenários', 'Efeitos de golpes', 'Menus e wallpapers', 'Outras'] as const;

/**
 * Folder of an image in the developer browser, from its project path (`src/assets/...` or `assets/...`).
 * `labels` names characters and stages by id; unknown ids keep the folder name.
 */
export function imageFolder(path: string, labels: Readonly<Record<string, string>>): string[] {
  const parts = path.split('/'), name = (id: string) => labels[id] ?? id;
  const at = (prefix: string) => path.startsWith(prefix) ? path.slice(prefix.length).split('/') : undefined;
  const scene = at('src/assets/scenes/');
  if (scene) return scene[1] === 'presentation' ? ['Títulos de luta', theme(name(scene[0]))] : ['Cenários', name(scene[0])];
  const sprite = at('src/assets/sprites/characters/');
  if (sprite) return ['Personagens', name(sprite[0]), 'Sprites', ...(sprite.length > 2 ? ['Alta qualidade'] : [])];
  const art = at('src/assets/art/characters/');
  if (art) return ['Personagens', name(art[0])];
  const reference = at('assets/art/characters/');
  if (reference) return ['Personagens', name(reference[0]), 'Referências', ...(reference.length > 2 ? ['Revisão'] : [])];
  const effect = at('src/assets/sprites/effects/');
  if (effect) return ['Efeitos de golpes', effect[0] === 'contact' ? 'Contato' : effect[0]];
  if (path.startsWith('assets/art/wallpapers/')) return ['Menus e wallpapers'];
  return ['Outras', parts.slice(0, -1).join('/')];
}

/** Folder of a loaded Phaser texture in the developer sprite browser, using the same sections as the images. */
export function textureFolder(key: string, labels: Readonly<Record<string, string>>, characterIds: readonly string[]): string[] {
  const name = (id: string) => labels[id] ?? id;
  const [kind, id] = key.split(':');
  if (kind === 'presentation') return ['Títulos de luta', theme(name(id))];
  if (kind === 'stage') return ['Cenários', name(id)];
  if (key.startsWith('fighter-icon-')) return ['Personagens', name(key.slice('fighter-icon-'.length))];
  const fighter = characterIds.find(character => key.startsWith(`${character}-`));
  if (fighter) return ['Personagens', name(fighter), 'Sprites'];
  if (key.startsWith('contact-') || key === 'wall-bounce') return ['Efeitos de golpes', 'Contato'];
  if (key.startsWith('menu-')) return ['Menus e wallpapers'];
  return ['Outras'];
}

/** Fight titles belong to a stage family (every Saloon variation shares them), named without the variation. */
const theme = (stageName: string): string => stageName.split(' · ')[0];
