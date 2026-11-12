import type Phaser from 'phaser';
import { preloadTexasSprites } from './animations/texasSprites';
import { preloadGrapplerSprites } from './animations/grapplerSprites';
import { preloadShotoSprites } from './animations/shotoSprites';
import { stages } from './stages/stageCatalog';
import type { StageDefinition } from './stages/StageDefinition';
import { preloadStage } from './stages/StageView';
import { preloadPresentations, presentationTheme } from './stages/stagePresentationAssets';
import { CHARACTER_COLOR_PIPELINE } from './characterColor';

/** Sheets of each fighter with body artwork; their texture keys start with `<fighter id>-`. */
const fighterSprites: Readonly<Record<string, (scene: Phaser.Scene) => void>> = { texas: preloadTexasSprites, shoto: preloadShotoSprites, grappler: preloadGrapplerSprites };

/**
 * Only what one match draws stays in memory: its fighters' sheets, its stage and that stage's fight titles. Textures of
 * other fighters and stages are released first, then the missing ones are queued.
 */
export function preloadMatchAssets(scene: Phaser.Scene, fighterIds: readonly string[], stage: StageDefinition): void {
  const theme = presentationTheme(stage.id);
  const unused = (key: string): boolean => {
    const [kind, id] = key.split(':');
    if (kind === 'stage') return id !== stage.id;
    if (kind === 'presentation') return id !== theme;
    const fighter = Object.keys(fighterSprites).find(candidate => key.startsWith(`${candidate}-`));
    return fighter !== undefined && !fighterIds.includes(fighter);
  };
  scene.textures.getTextureKeys().filter(unused).forEach(key => scene.textures.remove(key));
  new Set(fighterIds).forEach(id => fighterSprites[id]?.(scene));
  preloadStage(scene, stage);
  preloadPresentations(scene, [theme]);
}

/** Everything any match can draw, for the developer tools that browse every sheet. */
export function preloadAllMatchAssets(scene: Phaser.Scene): void {
  Object.values(fighterSprites).forEach(preload => preload(scene));
  stages.forEach(stage => preloadStage(scene, stage));
  preloadPresentations(scene);
}

const PRIME_TARGET = '__match-prime';

/**
 * Draws every loaded texture once, off screen, through both sprite shaders, and waits for the GPU. Uploads that drivers
 * defer to the first draw then happen while the loading screen is still up, not when a pose, effect, stage frame or
 * title first appears in a round.
 */
export function primeMatchTextures(scene: Phaser.Scene): void {
  const renderer = scene.game?.renderer as Phaser.Renderer.WebGL.WebGLRenderer | undefined;
  const keys = scene.textures.getTextureKeys().filter(key => !key.startsWith('__'));
  if (!renderer?.gl || !keys.length) return;
  // Not a power of two: Phaser would otherwise generate mipmaps of its empty texture, which the browser must clear first.
  const target = scene.textures.addDynamicTexture(PRIME_TARGET, 3, 3);
  if (!target) return;
  target.beginDraw();
  for (const key of keys) target.batchDrawFrame(key, '__BASE', 0, 0);
  const coloured = scene.make.image({ key: keys[0], add: false }).setPipeline(CHARACTER_COLOR_PIPELINE, { palette: 1, lit: true });
  target.batchDraw(coloured, 0, 0);
  target.endDraw();
  coloured.destroy();
  renderer.gl.finish();
  scene.textures.remove(PRIME_TARGET);
}
