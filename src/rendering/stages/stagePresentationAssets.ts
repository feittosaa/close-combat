import type Phaser from 'phaser';

export type PresentationTheme = 'saloon' | 'fazenda' | 'praia' | 'sala-treino';
export type PresentationImage = 'ready' | 'fight' | 'victory' | 'lose' | 'timeout' | 'ultimate' | 'ko' | 'perfect';

const images = import.meta.glob<string>('../../assets/scenes/*/presentation/*.png', { eager: true, import: 'default', query: '?url' });
const themes: PresentationTheme[] = ['saloon', 'fazenda', 'praia', 'sala-treino'];
const names: PresentationImage[] = ['ready', 'fight', 'victory', 'lose', 'timeout', 'ultimate', 'ko', 'perfect'];

export function presentationTheme(stageId: string): PresentationTheme {
  if (stageId.startsWith('saloon')) return 'saloon';
  return stageId === 'fazenda' || stageId === 'praia' ? stageId : 'sala-treino';
}

export function presentationKey(theme: PresentationTheme, name: PresentationImage | 'tumbleweed'): string {
  return `presentation:${theme}:${name}`;
}

/** Fight titles of the given stage themes (all of them by default). */
export function preloadPresentations(scene: Phaser.Scene, only: readonly PresentationTheme[] = themes): void {
  for (const theme of only) for (const name of [...names, ...(theme === 'saloon' ? ['tumbleweed' as const] : [])]) {
    const key = presentationKey(theme, name);
    const url = images[`../../assets/scenes/${theme}/presentation/${name}.png`];
    if (!url) throw new Error(`Arte de apresentação ausente: ${theme}/${name}`);
    if (!scene.textures.exists(key)) scene.load.image(key, url);
  }
}
