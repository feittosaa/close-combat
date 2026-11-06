import puppetBackground from '../assets/art/characters/puppet/selection-background.png';
import grapplerBackground from '../assets/art/characters/grappler/selection-background.png';
import shotoBackground from '../assets/art/characters/shoto/selection-background.png';
import cowboyBackground from '../assets/art/characters/cowboy/selection-background.png';
import cowboyIcon from '../assets/art/characters/cowboy/selection-icon.png';
import shotoIcon from '../assets/art/characters/shoto/selection-icon.png';
import grapplerIcon from '../assets/art/characters/grappler/selection-icon.png';
import puppetIcon from '../assets/art/characters/puppet/selection-icon.png';
import shotoFullbody from '../assets/art/characters/shoto/fullbody.png';
import cowboyFullbody from '../assets/art/characters/cowboy/fullbody.png';
import grapplerFullbody from '../assets/art/characters/grappler/fullbody.png';
import puppetFullbody from '../assets/art/characters/puppet/fullbody.png';
import pirateFullbody from '../assets/art/characters/pirate/fullbody.png';
import stanceFullbody from '../assets/art/characters/stance/fullbody.png';
import pirateBackground from '../assets/art/characters/pirate/selection-background.png';
import pirateIcon from '../assets/art/characters/pirate/selection-icon.png';
import stanceBackground from '../assets/art/characters/stance/selection-background.png';
import stanceIcon from '../assets/art/characters/stance/selection-icon.png';
import randomBackground from '../assets/art/characters/random/selection-background.png';
import type Phaser from 'phaser';

/** Square window around the visible art of each icon, so every icon fills the same area of the HUD (the drawings sit differently inside their canvases). */
export interface IconWindow { x: number; y: number; size: number }
/** Victory-screen framing: the full-body art is drawn `height` times the screen height, its top edge `top` screen heights from the top. Each `top` leaves the head whole just inside the screen; only the legs fall off the bottom. */
export interface VictoryFrame { height: number; top: number }
export interface FighterArt { background: string; icon: string; iconWindow: IconWindow; fullbody: string; victory: VictoryFrame; name: string }
export const fighterArt: Readonly<Record<string, FighterArt>> = {
  shoto: {background:shotoBackground,icon:shotoIcon,iconWindow:{x:7,y:26,size:1228},fullbody:shotoFullbody,victory:{height:1.3,top:0},name:'Bob'},
  cowboy: {background:cowboyBackground,icon:cowboyIcon,iconWindow:{x:0,y:13,size:1241},fullbody:cowboyFullbody,victory:{height:1.28,top:.01},name:'Texas'},
  grappler: {background:grapplerBackground,icon:grapplerIcon,iconWindow:{x:1,y:0,size:1022},fullbody:grapplerFullbody,victory:{height:1.2,top:-.005},name:'Grappler'},
  puppet: {background:puppetBackground,icon:puppetIcon,iconWindow:{x:0,y:0,size:928},fullbody:puppetFullbody,victory:{height:1.34,top:.012},name:'Puppet'},
  pirate: {background:pirateBackground,icon:pirateIcon,iconWindow:{x:0,y:0,size:1152},fullbody:pirateFullbody,victory:{height:1.1,top:.004},name:'Pirate'},
  stance: {background:stanceBackground,icon:stanceIcon,iconWindow:{x:0,y:7,size:2287},fullbody:stanceFullbody,victory:{height:1.38,top:.009},name:'Stance'},
};

/** Selection art shown for a player who picked the random tile; it is not a fighter, so it never appears in the roster. */
export const randomArt = { background: randomBackground } as const;

/** Shows a fighter icon as a square of `size` px centred on (x, y): same width and height for every fighter. */
export function placeFighterIcon(image: Phaser.GameObjects.Image, id: string, x: number, y: number, size: number): void {
  const window = fighterArt[id].iconWindow, scale = size / window.size;
  image.setCrop(window.x, window.y, window.size, window.size).setScale(scale)
    .setPosition(x - (window.x + window.size / 2 - image.width / 2) * scale, y - (window.y + window.size / 2 - image.height / 2) * scale);
}

export function preloadFighterIcons(scene: Phaser.Scene): void {
  for (const [id,art] of Object.entries(fighterArt)) {
    const key = `fighter-icon-${id}`;
    if (!scene.textures.exists(key)) scene.load.image(key,art.icon);
  }
}
