import type Phaser from 'phaser';

/** Shared ink, parchment and accent colors for menus and combat HUD. */
export const HUD = {
  ink: 0x151114, inset: 0x21191b, rail: 0x281c20, gold: 0xd9c2a2, lightGold: 0xf4e6d0,
  ivory: '#f5e8d5', muted: '#d2bdab', goldText: '#f1d9b9',
  players: [0xc74436, 0x4d9e9e], playerText: ['#f2b19b', '#a1dfda'],
} as const;

export function hudText(size: number, title = false, color: string = HUD.ivory): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: 'Arial, sans-serif', fontStyle: title ? 'bold' : 'normal', fontSize: `${size}px`, color, resolution: 2, shadow: { offsetX: 0, offsetY: 1, color: '#100e12', blur: 2, fill: true } };
}
export function drawHudPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, accent: number = HUD.gold, alpha = .94): void {
  const c = 6;
  const points = [{x:x+c,y},{x:x+w-c,y},{x:x+w,y:y+c},{x:x+w,y:y+h-c},
    {x:x+w-c,y:y+h},{x:x+c,y:y+h},{x,y:y+h-c},{x,y:y+c}];
  g.fillStyle(HUD.ink, alpha).fillPoints(points, true);
  g.lineStyle(1, accent, .85).strokePoints(points, true);
  g.lineStyle(2, accent, .9).lineBetween(x+12,y+3,x+Math.min(64,w-12),y+3);
}
export function drawDiamond(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, color: number, filled: boolean): void {
  const points = [{x,y:y-radius},{x:x+radius,y},{x,y:y+radius},{x:x-radius,y}];
  if (filled) g.fillStyle(color).fillPoints(points, true);
  g.lineStyle(1, color, .9).strokePoints(points, true);
}

/** Health always comes from the simulation; the rail remains meaningful at zero/max. */
export function healthBarFill(health: number, maxHealth: number, x: number, width: number, mirrored: boolean) {
  const ratio = maxHealth > 0 ? Math.max(0,Math.min(1,health/maxHealth)) : 0;
  const fillWidth = width*ratio;
  return { x: mirrored ? x+width-fillWidth : x, width: fillWidth, ratio };
}
