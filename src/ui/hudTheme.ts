import type Phaser from 'phaser';

/** Shared ink, parchment and warm metal language of the approved menu. */
export const HUD = {
  ink: 0x17131a, inset: 0x251d23, rail: 0x433039, gold: 0xb78c58, lightGold: 0xf1c98c,
  ivory: '#f6e6ce', muted: '#c5ae94', goldText: '#e8bf81',
  players: [0xc96b53, 0x65aaa2], playerText: ['#eca58a', '#8dd5ca'],
} as const;

export function hudText(size: number, title = false, color: string = HUD.ivory): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: title ? 'Georgia, serif' : 'Arial, sans-serif', fontSize: `${size}px`, color, resolution: 2 };
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
