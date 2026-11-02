import type Phaser from 'phaser';
import { getCharacterById } from '../engine/data/characters';
import { createProjectileHitbox } from '../engine/collision/projectileGeometry';
import { createHurtbox } from '../engine/collision/combatGeometry';
import type { ExplosionState } from '../engine/combat/ultimateActivation';
import type { HitEvent } from '../engine/combat/AttackResolver';
import type { CharacterState } from '../engine/characters/CharacterState';
import type { ProjectileState } from '../engine/combat/ProjectileState';
import { getTimedAnimationFrame, type AnimationClip } from './animations/AnimationPlayback';

const effectClips: Readonly<Record<string, AnimationClip>> = {
  shot:{key:'shot',start:0,end:5,frameRate:20,frameDurations:[2,3,3,3,3,3],repeat:-1},
  impact:{key:'impact',start:0,end:5,frameRate:30,frameDurations:[1,2,3,2,2,2],repeat:0},
};

/** Cowboy effects follow the existing projectile geometry and simulation clock. */
export class ProjectileView {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly sprites = new Map<number, Phaser.GameObjects.Image>();
  private readonly dynamiteExplosions = new Map<number, Phaser.GameObjects.Image>();
  private impact?: { sprite: Phaser.GameObjects.Image; started: number; eventFrame: number; texture: string };
  private perfectImpact?: { x: number; y: number; started: number };
  private lastPerfectFrame = -1;
  constructor(private readonly scene: Phaser.Scene) { this.graphics = scene.add.graphics().setDepth(11); }
  sync(projectiles: readonly ProjectileState[], explosions: readonly ExplosionState[] = [], frame = 0, hits: readonly HitEvent[] = [], characters: readonly CharacterState[] = []): void {
    const g = this.graphics.clear();
    if (frame < this.lastPerfectFrame) this.lastPerfectFrame = -1;
    const active = new Set(projectiles.filter(p => p.fighterId === 'cowboy').map(p => p.id));
    for (const [id,sprite] of this.sprites) if (!active.has(id)) { sprite.destroy(); this.sprites.delete(id); }
    for (const p of projectiles) {
      const move = getCharacterById(p.fighterId)?.moves.find(m=>m.id===p.attack.moveId);
      if(!move)continue;
      const box=createProjectileHitbox(p,move);
      if (p.visual === 'volley') {
        const key = 'cowboy-effect-volley';
        if (this.scene.textures.exists(key)) {
          const sprite = this.sprites.get(p.id) ?? this.scene.add.image(0, 0, key, '0').setDepth(11);
          this.sprites.set(p.id, sprite);
          const age = (move.projectile?.life ?? p.remainingFrames) - p.remainingFrames;
          const effectFrame = age < 3 ? 0 : 1 + Math.floor((age - 3) / 4) % 5;
          sprite.setTexture(key, String(effectFrame)).setPosition(box.x + box.width / 2, box.y + box.height / 2)
            .setDisplaySize(box.width * 1.45, box.height * 1.45).setFlipX(p.facing === 'left').setVisible(true);
          continue;
        }
        const y = box.y + box.height / 2;
        g.fillStyle(0x39bfff, .35).fillRoundedRect(box.x,box.y,box.width,box.height,box.height / 2);
        g.fillStyle(0xbdefff, .9).fillRoundedRect(box.x, y - box.height * .16, box.width, box.height * .32, box.height * .16);
        continue;
      }
      if (p.fighterId === 'cowboy' && (p.visual === 'bullet' || p.visual === 'dynamite')) {
        const effect = p.visual === 'dynamite' ? 'dynamite' : 'shot';
        const key = `cowboy-effect-${effect}`;
        if (this.scene.textures.exists(key)) {
          const sprite = this.sprites.get(p.id) ?? this.scene.add.image(0,0,key,'0').setDepth(11);
          this.sprites.set(p.id, sprite);
          const age = (move.projectile?.life ?? p.remainingFrames) - p.remainingFrames;
          const effectFrame = effect === 'dynamite' ? Math.min(5, Math.floor(age / 2)) : getTimedAnimationFrame(effectClips.shot, age);
          sprite.setTexture(key, String(effectFrame))
            .setPosition(box.x + box.width/2,box.y + box.height/2)
            .setDisplaySize(effect === 'dynamite' ? 92 : 96, effect === 'dynamite' ? 92 : 78)
            .setFlipX(p.facing === 'left')
            .setAngle((p.verticalVelocity ?? 0) === 0 ? 0 : Math.sign(p.verticalVelocity!) * (p.facing === 'left' ? -45 : 45)).setVisible(true);
          continue;
        }
      }
      const size = box.width / (p.visual === 'lighter' ? 8 : p.visual === 'glass' ? 22 : 30);
      const x = 0, y = 0;
      g.save().translateCanvas(box.x + box.width / 2, box.y + box.height / 2).scaleCanvas(size, size);
      g.lineStyle(1.5, 0xf4dfb0, 1);
      if (p.visual === 'bullet') {
        g.fillStyle(0x42c8ff).fillRoundedRect(-12, -5, 24, 10, 5);
      } else if (p.visual === 'lighter') {
        g.fillStyle(0xc7b79d).fillRect(x-3,y-5,6,10);
        g.fillStyle(0xffc65c).fillTriangle(x-3,y-6,x+3,y-6,x,y-15);
      } else if (p.visual === 'glass') {
        g.fillStyle(0x862c41).fillRect(x - 6, y - 10, 12, 8);
        g.strokeRect(x - 7, y - 13, 14, 13).lineBetween(x, y, x, y + 9).lineBetween(x - 6, y + 9, x + 6, y + 9);
      } else {
        g.fillStyle(0x354d39).fillRoundedRect(x - 7, y - 14, 14, 27, 3);
        g.fillRect(x - 3, y - 21, 6, 9);
        g.fillStyle(0xd7c49b).fillRect(x - 6, y - 5, 12, 11);
        if (p.visual === 'molotov') g.fillStyle(0xf8a84b).fillTriangle(x - 4, y - 22, x + 7, y - 22, x + 3, y - 39);
      }
      g.restore();
    }
    const hit = hits.find(event => event.perfectBlock) ?? hits[0];
    const shooter = hit && characters.find(character => character.characterId === hit.attackerId);
    const target = hit && characters.find(character => character.characterId === hit.targetId);
    if (hit?.perfectBlock && target && this.lastPerfectFrame !== frame) {
      const box = createHurtbox(target);
      const heightRatio = hit.contactHeight === 'low' ? .84 : hit.contactHeight === 'high' ? .18 : .5;
      this.perfectImpact = { x: box.x + box.width / 2, y: box.y + box.height * heightRatio, started: frame };
      this.lastPerfectFrame = frame;
    }
    if (this.perfectImpact) {
      const age = frame - this.perfectImpact.started;
      if (age >= 12 || age < 0) this.perfectImpact = undefined;
      else {
        const { x, y } = this.perfectImpact;
        const radius = 12 + age * 2;
        g.lineStyle(3, 0xffffff, 1 - age / 12).strokeCircle(x, y, radius);
        for (let i = 0; i < 8; i++) {
          const angle = i * Math.PI / 4;
          g.lineBetween(x + Math.cos(angle) * (radius + 3), y + Math.sin(angle) * (radius + 3),
            x + Math.cos(angle) * (radius + 13), y + Math.sin(angle) * (radius + 13));
        }
      }
    }
    const effect = hit?.perfectBlock ? undefined : hit?.outcome === 'block' ? 'block' : shooter?.fighterId === 'cowboy' ? 'impact' : undefined;
    const texture = `cowboy-effect-${effect}`;
    if (hit && effect && this.impact?.eventFrame !== frame && this.scene.textures.exists(texture)) {
      if (target) {
        this.impact?.sprite.destroy();
        const box = createHurtbox(target);
        const heightRatio = hit.contactHeight === 'low' ? .84 : hit.contactHeight === 'high' ? .18 : .5;
        const sprite = this.scene.add.image(box.x + box.width / 2,box.y + box.height * heightRatio,texture,'0').setDepth(12).setDisplaySize(80,80);
        this.impact = { sprite, started: frame, eventFrame: frame, texture };
      }
    }
    if (this.impact) {
      const age = frame - this.impact.started;
      if (age >= 12) { this.impact.sprite.destroy(); this.impact = undefined; }
      else this.impact.sprite.setTexture(this.impact.texture,String(getTimedAnimationFrame(effectClips.impact,age)));
    }
    const activeExplosions = new Set(explosions.filter(e => e.kind === 'dynamite').map(e => e.id!));
    for (const [id,sprite] of this.dynamiteExplosions) if (!activeExplosions.has(id)) { sprite.destroy(); this.dynamiteExplosions.delete(id); }
    for (const explosion of explosions) {
      if (explosion.kind === 'dynamite') {
        if (this.scene.textures.exists('cowboy-effect-dynamite-blast')) {
          const sprite = this.dynamiteExplosions.get(explosion.id!) ?? this.scene.add.image(explosion.x, explosion.y, 'cowboy-effect-dynamite-blast', '0').setDepth(11);
          this.dynamiteExplosions.set(explosion.id!, sprite);
          sprite.setTexture('cowboy-effect-dynamite-blast', String(Math.min(5, Math.floor((12 - explosion.remainingFrames) / 2))))
            .setPosition(explosion.x, explosion.y).setDisplaySize(130, 130);
        }
        continue;
      }
      const radius = 18 + (10-explosion.remainingFrames)*3;
      g.fillStyle(0xf77b32,explosion.remainingFrames/12).fillCircle(explosion.x,explosion.y,radius);
      g.lineStyle(2,0xffdda0,explosion.remainingFrames/10).strokeCircle(explosion.x,explosion.y,radius+5);
    }
  }
  destroy(): void { this.sprites.forEach(sprite => sprite.destroy()); this.dynamiteExplosions.forEach(sprite => sprite.destroy()); this.impact?.sprite.destroy(); this.graphics.destroy(); }
}
