import type Phaser from 'phaser';
import { applyShotoPalettePixels } from './shotoPalette';

const prepared = new WeakSet<Phaser.Textures.Texture>();

/** Prepare each shared atlas once, before menu/fight sprites exist, including Canvas fallback. */
export function prepareShotoPalette(scene: Phaser.Scene, keys: readonly string[]): void {
  for (const key of keys) {
    if (!scene.textures.exists(key)) continue;
    const original = scene.textures.get(key);
    if (prepared.has(original)) continue;
    const image = original.getSourceImage() as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Não foi possível preparar a paleta do Shoto.');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const firstFrame=original.get(original.getFrameNames()[0]);
    applyShotoPalettePixels(pixels.data, canvas.width, canvas.height, firstFrame.cutWidth);
    context.putImageData(pixels, 0, 0);
    const frames = original.getFrameNames().map(name => {
      const frame = original.get(name);
      return { name, x: frame.cutX, y: frame.cutY, width: frame.cutWidth, height: frame.cutHeight };
    });
    scene.textures.remove(key);
    const texture = scene.textures.addCanvas(key, canvas);
    if (!texture) throw new Error(`Não foi possível preparar ${key}.`);
    for (const frame of frames) texture.add(frame.name, 0, frame.x, frame.y, frame.width, frame.height);
    prepared.add(texture);
  }
}
