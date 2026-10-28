import { expect, it, vi } from 'vitest';
import { prepareShotoPalette } from '../rendering/animations/prepareShotoPalette';
import type Phaser from 'phaser';

it('never regrades or recreates a prepared atlas when entering or restarting a match',()=>{
  const context={drawImage:vi.fn(),getImageData:vi.fn(()=>({data:new Uint8ClampedArray([100,60,40,255])})),putImageData:vi.fn()};
  const canvas={width:0,height:0,getContext:()=>context};
  const original={getSourceImage:vi.fn(()=>({width:1,height:1})),getFrameNames:()=>['0'],get:()=>({cutX:0,cutY:0,cutWidth:1,cutHeight:1})};
  const prepared={add:vi.fn()};
  let texture:unknown=original;
  const textures={exists:()=>true,get:()=>texture,remove:vi.fn(),addCanvas:vi.fn(()=>{texture=prepared;return prepared;})};
  vi.stubGlobal('document',{createElement:vi.fn(()=>canvas)});
  try {
    prepareShotoPalette({textures} as unknown as Phaser.Scene,['shoto-idle']);
    for(let match=0;match<10;match++)prepareShotoPalette({textures} as unknown as Phaser.Scene,['shoto-idle']);
    expect(original.getSourceImage).toHaveBeenCalledTimes(1);
    expect(context.getImageData).toHaveBeenCalledTimes(1);
    expect(textures.remove).toHaveBeenCalledTimes(1);
    expect(textures.addCanvas).toHaveBeenCalledTimes(1);
    expect(prepared.add).toHaveBeenCalledWith('0',0,0,0,1,1);
  } finally {vi.unstubAllGlobals();}
});
