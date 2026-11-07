import Phaser from 'phaser';

type Rect = { x: number; y: number; w: number; h: number };
/** One frame of a layout written by `scripts/pack-sprites.py`: a trimmed Phaser frame plus where its pixels sit in the original sheet. */
interface PackedFrame { frame: Rect; spriteSourceSize: Rect; sourceSize: { w: number; h: number }; source: { x: number; y: number } }
/** Phaser JSON-hash atlas of the compact sheet; frames keep the original size and pivot through their trim data. */
export interface PackedLayout { frames: Record<string, PackedFrame>; meta: { size: { w: number; h: number } } }

declare global {
  namespace Phaser.Loader {
    interface LoaderPlugin {
      /** A character sheet kept in memory as its trimmed layout: only the drawn part of each frame becomes texture. */
      packedAtlas(key: string, sheetUrl: string, layoutUrl: string): this;
    }
  }
}

/** Copies the drawn part of every frame of the original sheet into a compact canvas, texel for texel. */
export function packSheet(sheet: CanvasImageSource, layout: PackedLayout): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = layout.meta.size.w; canvas.height = layout.meta.size.h;
  const context = canvas.getContext('2d')!;
  context.imageSmoothingEnabled = false;
  for (const { frame, source } of Object.values(layout.frames)) {
    context.drawImage(sheet, source.x, source.y, frame.w, frame.h, frame.x, frame.y, frame.w, frame.h);
  }
  return canvas;
}

/** The original, untrimmed frames of a layout, for an image that is not the drawing the layout was cut from. */
export function fullFrames(layout: PackedLayout): { frames: Record<string, { frame: Rect }> } {
  return { frames: Object.fromEntries(Object.entries(layout.frames).map(([key, { spriteSourceSize: trim, sourceSize, source }]) =>
    [key, { frame: { x: source.x - trim.x, y: source.y - trim.y, w: sourceSize.w, h: sourceSize.h } }])) };
}

/**
 * Adds `load.packedAtlas` to every scene's loader; called once before the game starts. The original sheet is decoded
 * as an `ImageBitmap` (off the main thread) and closed right after its frames are copied, so its pixels are freed under
 * the loading screen. An `<img>` would keep them until the browser discards them on its own, a stall seconds into the round.
 */
export function registerPackedAtlasLoader(): void {
  class SheetFile extends Phaser.Loader.FileTypes.ImageFile {
    override onProcess(): void {
      this.state = Phaser.Loader.FILE_PROCESSING;
      createImageBitmap(this.xhrLoader!.response as Blob).then(bitmap => { this.data = bitmap; this.onProcessComplete(); }, () => this.onProcessError());
    }
  }
  class PackedAtlasFile extends Phaser.Loader.MultiFile {
    constructor(loader: Phaser.Loader.LoaderPlugin, key: string, sheetUrl: string, layoutUrl: string) {
      super(loader, 'packedAtlas', key, [new SheetFile(loader, key, sheetUrl), new Phaser.Loader.FileTypes.JSONFile(loader, key, layoutUrl)]);
    }
    /** Called by the loader once both files are processed (Phaser's typings omit it on `MultiFile`). */
    addToCache(): void {
      if (!this.isReadyToProcess()) return;
      const [sheet, layout] = this.files as [Phaser.Loader.File, Phaser.Loader.File];
      const bitmap = sheet.data as ImageBitmap, data = layout.data as PackedLayout;
      // A developer-mode replacement (a blob URL) is a different drawing: it keeps the full frames of the original atlas.
      const replaced = typeof sheet.url === 'string' && sheet.url.startsWith('blob:');
      const canvas = replaced ? copyImage(bitmap) : packSheet(bitmap, data);
      bitmap.close();
      this.loader.textureManager.addAtlas(sheet.key, canvas as unknown as HTMLImageElement, replaced ? fullFrames(data) : data);
      this.complete = true;
    }
  }
  Phaser.Loader.FileTypesManager.register('packedAtlas', function (this: Phaser.Loader.LoaderPlugin, key: string, sheetUrl: string, layoutUrl: string) {
    this.addFile(new PackedAtlasFile(this, key, sheetUrl, layoutUrl).files);
    return this;
  });
}

function copyImage(image: ImageBitmap): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  canvas.getContext('2d')!.drawImage(image, 0, 0);
  return canvas;
}
