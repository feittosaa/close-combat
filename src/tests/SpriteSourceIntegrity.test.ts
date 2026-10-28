import { expect, it, vi } from 'vitest';
import { preloadShotoSprites } from '../rendering/animations/shotoSprites';
import type Phaser from 'phaser';

const images=import.meta.glob<string>('../assets/sprites/characters/shoto/*.png',{eager:true,import:'default'});
const atlases=import.meta.glob('../assets/sprites/characters/shoto/*.atlas.json',{eager:true,import:'default'});

it('loads every official atlas and original PNG directly, without replacing textures or processing pixels',()=>{
  const cache=new Set<string>();
  const textures={exists:(key:string)=>cache.has(key),remove:vi.fn(),addCanvas:vi.fn()};
  const atlas=vi.fn((key:string,url:string,data:unknown)=>{
    const name=key.replace(/^shoto-/,'');
    expect(url).toBe(images[`../assets/sprites/characters/shoto/${name}.png`]);
    expect(data).toBe(atlases[`../assets/sprites/characters/shoto/${name}.atlas.json`]);
    cache.add(key);
  });
  const createElement=vi.fn(()=>{throw new Error('Sprite loading must never create a pixel-processing canvas');});
  vi.stubGlobal('document',{createElement});
  try {
    const scene={textures,load:{atlas}} as unknown as Phaser.Scene;
    preloadShotoSprites(scene);expect(atlas).toHaveBeenCalledTimes(23);
    for(let match=0;match<10;match++)preloadShotoSprites(scene);
    expect(atlas).toHaveBeenCalledTimes(23);
    expect(createElement).not.toHaveBeenCalled();
    expect(textures.remove).not.toHaveBeenCalled();expect(textures.addCanvas).not.toHaveBeenCalled();
  } finally {vi.unstubAllGlobals();}
});
