import cowboyIcon from '../assets/art/characters/cowboy/selection-icon.png';
import cowboyPortrait from '../assets/art/characters/cowboy/selection-portrait.png';
import shotoIcon from '../assets/art/characters/shoto/selection-icon.png';
import shotoPortrait from '../assets/art/characters/shoto/selection-portrait.png';
import grapplerIcon from '../assets/art/characters/grappler/selection-icon.png';
import grapplerPortrait from '../assets/art/characters/grappler/selection-portrait.png';
import puppetIcon from '../assets/art/characters/puppet/selection-icon.png';
import puppetPortrait from '../assets/art/characters/puppet/selection-portrait.png';
import type Phaser from 'phaser';

export const fighterArt: Readonly<Record<string, {icon: string; portrait: string; name: string; heightCm: number; imageHeight: number; top: number; bottom: number}>> = {
  shoto: {icon:shotoIcon,portrait:shotoPortrait,name:'Bob',heightCm:170,imageHeight:1446,top:22,bottom:1422},
  cowboy: {icon:cowboyIcon,portrait:cowboyPortrait,name:'Texas',heightCm:160,imageHeight:1448,top:11,bottom:1436},
  grappler: {icon:grapplerIcon,portrait:grapplerPortrait,name:'Grappler',heightCm:205,imageHeight:1448,top:30,bottom:1417},
  puppet: {icon:puppetIcon,portrait:puppetPortrait,name:'Puppet',heightCm:175,imageHeight:1435,top:9,bottom:1412},
};

/** Position the visible artwork on a shared baseline, allowing for transparent margins. */
export function selectionPortraitSize(id: string): {height: number; bottom: number} {
  const art = fighterArt[id];
  const visibleHeight = art.bottom - art.top;
  const scale = art.heightCm / 205 * 1.25;
  return {height: 100 * scale * art.imageHeight / visibleHeight, bottom: -100 * scale * (art.imageHeight - art.bottom) / visibleHeight};
}

export function preloadFighterIcons(scene: Phaser.Scene): void {
  for (const [id,art] of Object.entries(fighterArt)) {
    const key = `fighter-icon-${id}`;
    if (!scene.textures.exists(key)) scene.load.image(key,art.icon);
  }
}
