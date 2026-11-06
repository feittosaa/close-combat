import puppetBackground from '../assets/art/characters/puppet/selection-background.png';
import grapplerBackground from '../assets/art/characters/grappler/selection-background.png';
import shotoBackground from '../assets/art/characters/shoto/selection-background.png';
import cowboyBackground from '../assets/art/characters/cowboy/selection-background.png';
import cowboyIcon from '../assets/art/characters/cowboy/selection-icon.png';
import cowboyPortrait from '../assets/art/characters/cowboy/selection-portrait.png';
import shotoIcon from '../assets/art/characters/shoto/selection-icon.png';
import shotoPortrait from '../assets/art/characters/shoto/selection-portrait.png';
import grapplerIcon from '../assets/art/characters/grappler/selection-icon.png';
import grapplerPortrait from '../assets/art/characters/grappler/selection-portrait.png';
import puppetIcon from '../assets/art/characters/puppet/selection-icon.png';
import puppetPortrait from '../assets/art/characters/puppet/selection-portrait.png';
import type Phaser from 'phaser';

/** Square window around the visible art of each icon, so every icon fills the same area of the HUD (the drawings sit differently inside their canvases). */
export interface IconWindow { x: number; y: number; size: number }
export const fighterArt: Readonly<Record<string, {background: string; icon: string; iconWindow: IconWindow; portrait: string; name: string; heightCm: number; imageHeight: number; top: number; bottom: number}>> = {
  shoto: {background:shotoBackground,icon:shotoIcon,iconWindow:{x:7,y:26,size:1228},portrait:shotoPortrait,name:'Bob',heightCm:170,imageHeight:1446,top:22,bottom:1422},
  cowboy: {background:cowboyBackground,icon:cowboyIcon,iconWindow:{x:0,y:13,size:1241},portrait:cowboyPortrait,name:'Texas',heightCm:160,imageHeight:1448,top:11,bottom:1436},
  grappler: {background:grapplerBackground,icon:grapplerIcon,iconWindow:{x:1,y:0,size:1022},portrait:grapplerPortrait,name:'Grappler',heightCm:205,imageHeight:1448,top:30,bottom:1417},
  puppet: {background:puppetBackground,icon:puppetIcon,iconWindow:{x:0,y:0,size:928},portrait:puppetPortrait,name:'Puppet',heightCm:175,imageHeight:1435,top:9,bottom:1412},
};

/** Shows a fighter icon as a square of `size` px centred on (x, y): same width and height for every fighter. */
export function placeFighterIcon(image: Phaser.GameObjects.Image, id: string, x: number, y: number, size: number): void {
  const window = fighterArt[id].iconWindow, scale = size / window.size;
  image.setCrop(window.x, window.y, window.size, window.size).setScale(scale)
    .setPosition(x - (window.x + window.size / 2 - image.width / 2) * scale, y - (window.y + window.size / 2 - image.height / 2) * scale);
}

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
