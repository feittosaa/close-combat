import type Phaser from 'phaser';

/** Shared ink, cream print and accent colours for the combat HUD, matching the menus' printed-card palette. */
export const HUD = {
  ink: 0x0e0c0b, inset: 0x1a1512, rail: 0x221b16, gold: 0xefe4cc, lightGold: 0xfff4dc,
  ivory: '#efe4cc', muted: '#b8aa90', goldText: '#efe4cc',
  players: [0xc8463a, 0x3b8a84], playerText: ['#f0a493', '#9fd8d1'],
  rage: [0xf4efe2, 0xe8b53a, 0xc41f3f], phases: [0xe8b56d, 0xe88a8f, 0x9ec4d8],
} as const;

/** The menus' print face (declared in style.css); canvas text needs it loaded first, see `loadInterfaceFonts`. */
export const HUD_FONT = "Barlow, 'Helvetica Neue', Arial, 'Noto Sans CJK JP', 'Noto Sans JP', 'Hiragino Sans', 'Noto Sans KR', 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif";
export function loadInterfaceFonts(): Promise<unknown> | undefined {
  if (typeof document === 'undefined' || !document.fonts) return undefined;
  return Promise.all(['500 16px Barlow', '700 16px Barlow'].map(face => document.fonts.load(face))).catch(() => undefined);
}

export function hudText(size: number, title = false, color: string = HUD.ivory): Phaser.Types.GameObjects.Text.TextStyle {
  // A thin ink outline keeps cream print readable over bright stages such as the training room.
  return { fontFamily: HUD_FONT, fontStyle: title ? 'bold' : 'normal', fontSize: `${size}px`, color, resolution: 2, stroke: '#0b0a0a', strokeThickness: title ? 3 : 2, shadow: { offsetX: 0, offsetY: 1, color: '#0b0a0a', blur: 2, fill: true } };
}
/**
 * Phaser redraws a text's canvas and uploads its texture again on every colour call, even an unchanged one;
 * per-frame HUD updates pass through these so only real changes reach it.
 */
export function setTextColor(text: Phaser.GameObjects.Text, color: string): Phaser.GameObjects.Text {
  return text.style.color === color ? text : text.setColor(color);
}
export function setTextBackground(text: Phaser.GameObjects.Text, color: string): Phaser.GameObjects.Text {
  return text.style.backgroundColor === color ? text : text.setBackgroundColor(color);
}
/** A printed ink card: cream border, a fainter inset rule and the owner's colour as a short tab on top. */
export function drawHudPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, accent: number = HUD.gold, alpha = .94): void {
  g.fillStyle(HUD.ink, alpha).fillRect(x, y, w, h);
  g.lineStyle(1, HUD.gold, .85).strokeRect(x, y, w, h);
  g.lineStyle(1, HUD.gold, .3).strokeRect(x + 3, y + 3, w - 6, h - 6);
  g.fillStyle(accent).fillRect(x + 10, y - 1, Math.min(48, w - 20), 3);
}
/** Round won (filled) or still open (ring), drawn as a small printed dot. */
export function drawRoundMarker(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, color: number, won: boolean): void {
  if (won) g.fillStyle(color).fillCircle(x, y, radius);
  g.lineStyle(1.5, HUD.gold, .95).strokeCircle(x, y, radius);
}

/** Health always comes from the simulation; the rail remains meaningful at zero/max. */
export function healthBarFill(health: number, maxHealth: number, x: number, width: number, mirrored: boolean) {
  const ratio = maxHealth > 0 ? Math.max(0,Math.min(1,health/maxHealth)) : 0;
  const fillWidth = width*ratio;
  return { x: mirrored ? x+width-fillWidth : x, width: fillWidth, ratio };
}
