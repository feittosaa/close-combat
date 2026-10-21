import type Phaser from 'phaser';
import testerManifest from '../../assets/animations/tester.json';
import testerAtlasUrl from '../../assets/sprites/characters/tester/tester-atlas.png';
import { getClipFrames, type CharacterAnimationManifest } from './AnimationPlayback';

const manifests = import.meta.glob('../../assets/animations/*.json', { eager: true, import: 'default' });
const runtimeImages = import.meta.glob('../../assets/sprites/characters/*/runtime/*.png', { eager: true, query: '?url', import: 'default' });
const runtimeAtlases = import.meta.glob('../../assets/sprites/characters/*/runtime/*.atlas.json', { eager: true, import: 'default' });

// Dummy continua sendo um lutador de desenvolvimento; reaproveita a arte de teste explicitamente.
const dummyManifest: CharacterAnimationManifest = {
  ...testerManifest,
  clips: testerManifest.clips.map((clip) => ({ ...clip, key: clip.key.replace(/^tester-/, 'dummy-') })),
  moveClips: { ...testerManifest.moveClips, 'dummy-jab': 'light-punch' },
};

export function getAnimationManifest(fighterId: string): CharacterAnimationManifest {
  if (fighterId === 'dummy') return dummyManifest;
  const manifest = manifests[`../../assets/animations/${fighterId}.json`] as CharacterAnimationManifest | undefined;
  if (!manifest) throw new Error(`Personagem sem manifesto: ${fighterId}`);
  return manifest;
}

export function preloadCharacter(scene: Phaser.Scene, fighterId: string, idleOnly = false): void {
  const manifest = getAnimationManifest(fighterId);
  if (manifest.textureSources) {
    const idle = manifest.clips.find((clip) => clip.key === `${fighterId}-idle`);
    const idleTextures = new Set(idle ? getClipFrames(idle).map((frame) => manifest.frameTextures?.[String(frame)]) : []);
    for (const source of manifest.textureSources) {
      if (idleOnly && !idleTextures.has(source.key)) continue;
      if (scene.textures.exists(source.key)) continue;
      const base = '../../assets/sprites/characters/';
      const url = runtimeImages[`${base}${source.image}`] as string | undefined;
      const atlas = runtimeAtlases[`${base}${source.atlas}`] as object | undefined;
      if (!url || !atlas) throw new Error(`Atlas ausente: ${source.key}`);
      scene.load.atlas(source.key, url, atlas);
    }
    return;
  }
  if (!scene.textures.exists(manifest.textureKey)) scene.load.spritesheet(manifest.textureKey, testerAtlasUrl, {
    frameWidth: manifest.frameSize.width, frameHeight: manifest.frameSize.height,
  });
}
