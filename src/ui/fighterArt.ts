import mrappleBackground from '../assets/art/characters/mrapple/selection-background.png';
import grapplerBackground from '../assets/art/characters/grappler/selection-background.png';
import shotoBackground from '../assets/art/characters/shoto/selection-background.png';
import texasBackground from '../assets/art/characters/texas/selection-background.png';
import texasIcon from '../assets/art/characters/texas/selection-icon.png';
import shotoIcon from '../assets/art/characters/shoto/selection-icon.png';
import grapplerIcon from '../assets/art/characters/grappler/selection-icon.png';
import mrappleIcon from '../assets/art/characters/mrapple/selection-icon.png';
import shotoFullbody from '../assets/art/characters/shoto/fullbody.png';
import texasFullbody from '../assets/art/characters/texas/fullbody.png';
import grapplerFullbody from '../assets/art/characters/grappler/fullbody.png';
import mrappleFullbody from '../assets/art/characters/mrapple/fullbody.png';
import gimmickFullbody from '../assets/art/characters/gimmick/fullbody.png';
import rushdownFullbody from '../assets/art/characters/rushdown/fullbody.png';
import stanceFullbody from '../assets/art/characters/stance/fullbody-2.png';
import gimmickBackground from '../assets/art/characters/gimmick/selection-background.png';
import gimmickIcon from '../assets/art/characters/gimmick/selection-icon.png';
import rushdownBackground from '../assets/art/characters/rushdown/selection-background.png';
import rushdownIcon from '../assets/art/characters/rushdown/selection-icon.png';
import stanceBackground from '../assets/art/characters/stance/selection-background.png';
import stanceIcon from '../assets/art/characters/stance/selection-icon.png';
import randomBackground from '../assets/art/characters/random/selection-background.png';
import type Phaser from 'phaser';

/** Square window around the visible art of each icon, so every icon fills the same area of the HUD (the drawings sit differently inside their canvases). */
export interface IconWindow { x: number; y: number; size: number }
/** Victory-screen framing: the full-body art is drawn `height` times the screen height, its top edge `top` screen heights from the top. Each `top` leaves the head whole just inside the screen; only the legs fall off the bottom. */
export interface VictoryFrame { height: number; top: number }
/** Framing of a selection image inside its box: `zoom` (1 = fills the box) magnifies around the focal point `x`/`y`, given in percent of the box (0 = left/top). */
export interface SelectionFrame { zoom: number; x: number; y: number }
export const DEFAULT_HERO_FRAME: SelectionFrame = { zoom: 1, x: 0, y: 50 };
export const DEFAULT_TILE_FRAME: SelectionFrame = { zoom: 1, x: 50, y: 50 };
export const DEFAULT_ARCADE_FRAME: SelectionFrame = { zoom: 1, x: 50, y: 50 };
export interface FighterArt {
  background: string; icon: string; iconWindow: IconWindow; fullbody: string; victory: VictoryFrame; name: string;
  /** Framing of `background` in the big selection panel; the default shows it from the left edge. */
  hero?: SelectionFrame;
  /** Framing of `background` over the whole screen in the arcade select; the default centres it. */
  arcade?: SelectionFrame;
  /** Framing of `icon` in the selection grid tile; the default centres it. */
  tile?: SelectionFrame;
}
export const fighterArt: Readonly<Record<string, FighterArt>> = {
  shoto: {background:shotoBackground,icon:shotoIcon,iconWindow:{x:7,y:26,size:1228},fullbody:shotoFullbody,victory:{height:1.4557,top:.0441},name:'Bob', hero: { zoom: 1, x: 25, y: 50 }, arcade: { zoom: 1.15, x: 100, y: 0 }, tile: { zoom: 1.15, x: 50, y: 50 }},
  texas: {background:texasBackground,icon:texasIcon,iconWindow:{x:0,y:13,size:1241},fullbody:texasFullbody,victory:{height:1.4639,top:.0455},name:'Texas', arcade: { zoom: 1.15, x: 10, y: 0 }},
  grappler: {background:grapplerBackground,icon:grapplerIcon,iconWindow:{ x: 10, y: 0, size: 1228 },fullbody:grapplerFullbody,victory:{ height: 1.4922, top: .0934 },name:'Grappler', arcade: { zoom: 1.15, x: 30, y: 0 }},
  mrapple: {background:mrappleBackground,icon:mrappleIcon,iconWindow:{x:0,y:0,size:928},fullbody:mrappleFullbody,victory:{height:1.4709,top:.052},name:'Mr. Apple', arcade: { zoom: 1, x: 50, y: 0 }},
  gimmick: {background:gimmickBackground,icon:gimmickIcon,iconWindow:{x:0,y:0,size:1254},fullbody:gimmickFullbody,victory:{height:1.1435,top:.0405},name:'Gimmick', arcade: { zoom: 1.05, x: 70, y: 0 }},
  rushdown: {background:rushdownBackground,icon:rushdownIcon,iconWindow:{x:0,y:0,size:1254},fullbody:rushdownFullbody,victory:{height:1.3624,top:.0504},name:'Rushdown', hero: { zoom: 1, x: 16, y: 50 }, arcade: { zoom: 1.15, x: 70, y: 0 }},
  stance: {background:stanceBackground,icon:stanceIcon,iconWindow:{x:0,y:0,size:1254},fullbody:stanceFullbody,victory:{ height: 1.2616, top: .0739 },name:'Stance', hero: { zoom: 1, x: 3, y: 50 }, arcade: { zoom: 1, x: 50, y: 0 }},
};

export const heroFrame = (art: FighterArt): SelectionFrame => art.hero ?? DEFAULT_HERO_FRAME;
export const arcadeFrame = (art: FighterArt): SelectionFrame => art.arcade ?? DEFAULT_ARCADE_FRAME;
export const tileFrame = (art: FighterArt): SelectionFrame => art.tile ?? DEFAULT_TILE_FRAME;
/** Inline custom properties that `menu.css` turns into the image's zoom and focal point. */
export const frameStyle = (frame: SelectionFrame): string => `--zoom:${frame.zoom};--x:${frame.x}%;--y:${frame.y}%`;

/** Selection art shown for a player who picked the random tile; it is not a fighter, so it never appears in the roster. */
export const randomArt = { background: randomBackground } as const;

/** Decoded selection art, kept only while the character select is open so switching fighters never waits for a large image. */
let selectionArt: HTMLImageElement[] | undefined;
/** Fetches and decodes every selection image (panel art and icons, the random silhouette included) once per visit to the character select. */
export function holdSelectionArt(): void {
  if (selectionArt || typeof Image === 'undefined') return;
  const urls = [...Object.values(fighterArt).flatMap(art => [art.background, art.icon]), randomArt.background];
  selectionArt = urls.map(url => { const image = new Image(); image.src = url; void image.decode().catch(() => undefined); return image; });
}
/** Lets the decoded selection art go when the character select closes (main menu, stage select, combat). */
export function releaseSelectionArt(): void { selectionArt = undefined; }

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
