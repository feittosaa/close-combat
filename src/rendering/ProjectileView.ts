import type Phaser from 'phaser';
import { getCharacterById } from '../engine/data/characters';
import { createProjectileHitbox } from '../engine/collision/projectileGeometry';
import { createHurtbox } from '../engine/collision/combatGeometry';
import type { ExplosionState } from '../engine/combat/ultimateActivation';
import type { HitEvent } from '../engine/combat/AttackResolver';
import type { CharacterState } from '../engine/characters/CharacterState';
import type { ProjectileState } from '../engine/combat/ProjectileState';
import { getTimedAnimationFrame, type AnimationClip } from './animations/AnimationPlayback';

function cowboyProjectile(id: string): boolean { return ['light-punch','heavy-punch','air-light-punch','air-heavy-punch','anti-air','quick-shot','heavy-shot','crouch-combo-shot','bulls-eye'].includes(id); }
const effectClips: Readonly<Record<string, AnimationClip>> = {
  close:{key:'close',start:0,end:4,frameRate:30,frameDurations:[1,2,2,2,3],repeat:0},
  shot:{key:'shot',start:0,end:5,frameRate:20,frameDurations:[2,3,3,3,3,3],repeat:-1},
  down:{key:'down',start:0,end:5,frameRate:18,frameDurations:[3,3,3,3,3,3],repeat:-1},
  up:{key:'up',start:0,end:5,frameRate:18,frameDurations:[3,3,3,3,3,3],repeat:-1},
  impact:{key:'impact',start:0,end:5,frameRate:30,frameDurations:[1,2,3,2,2,2],repeat:0},
};

/** Cowboy effects follow the existing projectile geometry and simulation clock. */
export class ProjectileView {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly sprites = new Map<number, Phaser.GameObjects.Image>();
  private impact?: { sprite: Phaser.GameObjects.Image; started: number; eventFrame: number; texture: string };
  constructor(private readonly scene: Phaser.Scene) { this.graphics = scene.add.graphics().setDepth(11); }
  sync(projectiles: readonly ProjectileState[], explosions: readonly ExplosionState[] = [], frame = 0, hits: readonly HitEvent[] = [], characters: readonly CharacterState[] = []): void {
    const g = this.graphics.clear();
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
          const effectFrame = age < 3 ? 0 : 1 + Math.floor((age - 3) / 4) % 3;
          sprite.setTexture(key, String(effectFrame)).setPosition(box.x + box.width / 2, box.y + box.height / 2)
            .setDisplaySize(box.width, box.height).setFlipX(p.facing === 'left').setVisible(true);
          continue;
        }
        const y = box.y + box.height / 2;
        g.fillStyle(0x39bfff, .35).fillRoundedRect(box.x,box.y,box.width,box.height,box.height / 2);
        g.fillStyle(0xbdefff, .9).fillRoundedRect(box.x, y - box.height * .16, box.width, box.height * .32, box.height * .16);
        continue;
      }
      if (p.fighterId === 'cowboy' && p.visual === 'bullet') {
        const effect = move.id === 'quick-shot' || move.id === 'heavy-shot' ? 'close' :
          (p.verticalVelocity ?? 0) > 0 ? 'down' : (p.verticalVelocity ?? 0) < 0 ? 'up' : 'shot';
        const key = `cowboy-effect-${effect}`;
        if (this.scene.textures.exists(key)) {
          const sprite = this.sprites.get(p.id) ?? this.scene.add.image(0,0,key,'0').setDepth(11);
          this.sprites.set(p.id, sprite);
          const age = (move.projectile?.life ?? p.remainingFrames) - p.remainingFrames;
          const effectFrame = getTimedAnimationFrame(effectClips[effect], age);
          sprite.setTexture(key, String(effectFrame))
            .setPosition(box.x + box.width/2,box.y + box.height/2)
            .setDisplaySize(effect === 'close' ? 110 : 80, effect === 'close' ? 90 : 65)
            .setFlipX(p.facing === 'left')
            .setAngle(effect === 'close' && (p.verticalVelocity ?? 0) < 0 ? (p.facing === 'left' ? 45 : -45) : 0).setVisible(true);
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
    const hit = hits[0];
    const shooter = hit && characters.find(character => character.characterId === hit.attackerId);
    const effect = hit?.outcome === 'block' ? 'block' : shooter?.fighterId === 'cowboy' && cowboyProjectile(hit?.moveId ?? '') ? 'impact' : undefined;
    const texture = `cowboy-effect-${effect}`;
    if (hit && effect && this.impact?.eventFrame !== frame && this.scene.textures.exists(texture)) {
      const target = characters.find(character => character.characterId === hit.targetId);
      if (target) {
        this.impact?.sprite.destroy();
        const box = createHurtbox(target);
        const sprite = this.scene.add.image(box.x + box.width / 2,box.y + box.height / 2,texture,'0').setDepth(12).setDisplaySize(80,80);
        this.impact = { sprite, started: frame, eventFrame: frame, texture };
      }
    }
    if (this.impact) {
      const age = frame - this.impact.started;
      if (age >= 12) { this.impact.sprite.destroy(); this.impact = undefined; }
      else this.impact.sprite.setTexture(this.impact.texture,String(getTimedAnimationFrame(effectClips.impact,age)));
    }
    for (const explosion of explosions) {
      const radius = 18 + (10-explosion.remainingFrames)*3;
      g.fillStyle(0xf77b32,explosion.remainingFrames/12).fillCircle(explosion.x,explosion.y,radius);
      g.lineStyle(2,0xffdda0,explosion.remainingFrames/10).strokeCircle(explosion.x,explosion.y,radius+5);
    }
  }
  destroy(): void { this.sprites.forEach(sprite => sprite.destroy()); this.impact?.sprite.destroy(); this.graphics.destroy(); }
}
