import type Phaser from 'phaser';

export type PresentationTheme = 'saloon' | 'fazenda' | 'sala-treino';
export type PresentationImage = 'ready' | 'fight' | 'victory' | 'lose' | 'timeout' | 'ultimate' | 'round-win' | 'round-lose' | 'ko';

const images = import.meta.glob<string>('../../assets/scenes/*/presentation/*.png', { eager: true, import: 'default', query: '?url' });
const themes: PresentationTheme[] = ['saloon', 'fazenda', 'sala-treino'];
const names: PresentationImage[] = ['ready', 'fight', 'victory', 'lose', 'timeout', 'ultimate', 'round-win', 'round-lose', 'ko'];

export function presentationTheme(stageId: string): PresentationTheme {
  if (stageId.startsWith('saloon')) return 'saloon';
  return stageId === 'fazenda' ? 'fazenda' : 'sala-treino';
}

export function presentationKey(theme: PresentationTheme, name: PresentationImage | 'tumbleweed'): string {
  return `presentation:${theme}:${name}`;
}

export function preloadPresentations(scene: Phaser.Scene): void {
  for (const theme of themes) for (const name of [...names, ...(theme === 'saloon' ? ['tumbleweed' as const] : [])]) {
    const key = presentationKey(theme, name);
    const url = images[`../../assets/scenes/${theme}/presentation/${name}.png`];
    if (!url) throw new Error(`Arte de apresentação ausente: ${theme}/${name}`);
    if (!scene.textures.exists(key)) scene.load.image(key, url);
  }
}
