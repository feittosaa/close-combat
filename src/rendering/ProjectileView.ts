import type Phaser from 'phaser';
import { getCharacterById } from '../engine/data/characters';
import { createProjectileHitbox } from '../engine/collision/projectileGeometry';
import { createHurtbox } from '../engine/collision/combatGeometry';
import type { ExplosionState } from '../engine/combat/ultimateActivation';
import type { HitEvent } from '../engine/combat/AttackResolver';
import type { CharacterState } from '../engine/characters/CharacterState';
import type { ProjectileState } from '../engine/combat/ProjectileState';
import { getTimedAnimationFrame, type AnimationClip } from './animations/AnimationPlayback';
import { contactEffectKey } from './contactEffects';
import { CharacterColorEffect } from './characterColor';

const effectClips: Readonly<Record<string, AnimationClip>> = {
  shot:{key:'shot',start:0,end:5,frameRate:20,frameDurations:[2,3,3,3,3,3],repeat:-1},
};

/** Cowboy effects follow the existing projectile geometry and simulation clock. */
export class ProjectileView {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly colorEffect = new CharacterColorEffect();
  private readonly sprites = new Map<number, Phaser.GameObjects.Image>();
  private readonly dynamiteExplosions = new Map<number, Phaser.GameObjects.Image>();
  private impacts: { sprite: Phaser.GameObjects.Image; started: number }[] = [];
  private wallEffects = new Map<string, { sprite: Phaser.GameObjects.Image; started: number }>();
  private lastFrame = -1;
  constructor(private readonly scene: Phaser.Scene) { this.graphics = scene.add.graphics().setDepth(12); }
  sync(projectiles: readonly ProjectileState[], explosions: readonly ExplosionState[] = [], frame = 0, hits: readonly HitEvent[] = [], characters: readonly CharacterState[] = [], alternateOwnerIds: ReadonlySet<string> = new Set()): void {
    const g = this.graphics.clear();
    if (frame < this.lastFrame) { this.impacts.forEach(impact => impact.sprite.destroy()); this.impacts = []; }
    if (frame < this.lastFrame) { this.wallEffects.forEach(effect => effect.sprite.destroy()); this.wallEffects.clear(); }
    this.lastFrame = frame;
    for (const character of characters) {
      const effect = character.wallBounceEffect;
      const existing = this.wallEffects.get(character.characterId);
      if (effect && effect.frame <= frame && frame - effect.frame < 12 && existing?.started !== effect.frame) {
        existing?.sprite.destroy();
        const sprite = this.scene.add.image(effect.x + effect.direction * character.collision.bodyWidth / 2, effect.y, 'wall-bounce')
          .setDepth(12).setDisplaySize(90, 180).setFlipX(effect.direction < 0);
        this.wallEffects.set(character.characterId, { sprite, started: effect.frame });
      }
    }
    for (const [id, effect] of this.wallEffects) {
      const age = frame - effect.started;
      if (age >= 12 || age < 0) { effect.sprite.destroy(); this.wallEffects.delete(id); }
      else effect.sprite.setAlpha(1 - age / 12);
    }
    const active = new Set(projectiles.filter(p => p.fighterId === 'cowboy' || p.visual === 'tomato' || p.visual === 'crow').map(p => p.id));
    for (const [id,sprite] of this.sprites) if (!active.has(id)) { sprite.destroy(); this.sprites.delete(id); }
    for (const p of projectiles) {
      const move = getCharacterById(p.fighterId)?.moves.find(m=>m.id===p.attack.moveId);
      if(!move)continue;
      const box=createProjectileHitbox(p,move);
      if (p.visual === 'crow' && this.scene.textures.exists('shoto-crow')) {
        const age = (move.projectile?.life ?? p.remainingFrames) - p.remainingFrames;
        const sprite = this.sprites.get(p.id) ?? this.scene.add.image(0, 0, 'shoto-crow', '0').setDepth(11);
        this.sprites.set(p.id, sprite);
        sprite.setTexture('shoto-crow', String(Math.floor(age / 3) % 6)).setPosition(box.x + box.width / 2, box.y + box.height / 2)
          .setDisplaySize(box.width * .6, box.height * 1.2).setFlipX(p.facing === 'left').setVisible(true);
        continue;
      }
      if (p.visual === 'tomato' && this.scene.textures.exists('shoto-tomato')) {
        const sprite = this.sprites.get(p.id) ?? this.scene.add.image(0, 0, 'shoto-tomato', '0').setDepth(11);
        this.sprites.set(p.id, sprite);
        const age = (move.projectile?.life ?? p.remainingFrames) - p.remainingFrames;
        const size = 66.8;
        const sign = p.facing === 'right' ? 1 : -1;
        sprite.setTexture('shoto-tomato', String(Math.floor(age / 3) % 6))
          .setPosition(box.x + box.width / 2 - sign * size / 4, box.y + box.height / 2)
          .setDisplaySize(size, size).setFlipX(p.facing === 'left').setVisible(true);
        continue;
      }
      if (p.visual === 'volley') {
        const key = 'cowboy-effect-volley';
        if (this.scene.textures.exists(key)) {
          const sprite = this.sprites.get(p.id) ?? this.scene.add.image(0, 0, key, '0').setDepth(11);
          this.sprites.set(p.id, sprite);
          this.colorEffect.apply(sprite, { alternate: alternateOwnerIds.has(p.ownerId) }, 'magic');
          const age = (move.projectile?.life ?? p.remainingFrames) - p.remainingFrames;
          const effectFrame = age < 3 ? 0 : 1 + Math.floor((age - 3) / 4) % 5;
          sprite.setTexture(key, String(effectFrame)).setPosition(box.x + box.width / 2, box.y + box.height / 2)
            .setDisplaySize(box.width * 1.45, box.height * 1.45).setFlipX(p.facing === 'left').setVisible(true);
          continue;
        }
        const y = box.y + box.height / 2;
        g.fillStyle(alternateOwnerIds.has(p.ownerId) ? 0xa45bff : 0x39bfff, .35).fillRoundedRect(box.x,box.y,box.width,box.height,box.height / 2);
        g.fillStyle(alternateOwnerIds.has(p.ownerId) ? 0xe1c4ff : 0xbdefff, .9).fillRoundedRect(box.x, y - box.height * .16, box.width, box.height * .32, box.height * .16);
        continue;
      }
      if (p.fighterId === 'cowboy' && (p.visual === 'bullet' || p.visual === 'dynamite')) {
        const effect = p.visual === 'dynamite' ? 'dynamite' : 'shot';
        const key = `cowboy-effect-${effect}`;
        if (this.scene.textures.exists(key)) {
          const sprite = this.sprites.get(p.id) ?? this.scene.add.image(0,0,key,'0').setDepth(11);
          this.sprites.set(p.id, sprite);
          this.colorEffect.apply(sprite, { alternate: alternateOwnerIds.has(p.ownerId) }, 'magic');
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
      const size = box.width / 30;
      g.save().translateCanvas(box.x + box.width / 2, box.y + box.height / 2).scaleCanvas(size, size);
      g.lineStyle(1.5, 0xf4dfb0, 1);
      if (p.visual === 'bullet') {
        g.fillStyle(alternateOwnerIds.has(p.ownerId) ? 0xa45bff : 0x42c8ff).fillRoundedRect(-12, -5, 24, 10, 5);
      } else if (p.visual === 'tomato') {
        g.fillStyle(0xc62918).fillCircle(0, 0, 12);
      } else {
        g.fillStyle(0x777777).fillRect(-15, -7, 30, 14);
      }
      g.restore();
    }
    for (const contact of hits) {
      const attacker = characters.find(character => character.characterId === contact.attackerId);
      const defender = characters.find(character => character.characterId === contact.targetId);
      if (!attacker || !defender) continue;
      const move = getCharacterById(attacker.fighterId)?.moves.find(candidate => candidate.id === contact.moveId);
      const purpleContact = alternateOwnerIds.has(attacker.characterId) && attacker.fighterId === 'cowboy';
      const purpleBlock = contact.outcome === 'block' && purpleContact &&
        (move?.projectile?.visual === 'bullet' || move?.projectile?.visual === 'dynamite');
      const key = `contact-${purpleBlock && !contact.perfectBlock ? 'block-blue' : contactEffectKey(contact, move)}`;
      if (!this.scene.textures.exists(key)) continue;
      const box = createHurtbox(defender);
      const height = contact.contactHeight ?? move?.hitLevel;
      const x = contact.contactPoint?.x ?? box.x + box.width / 2;
      const y = contact.contactPoint?.y ?? box.y + box.height * (height === 'low' ? .84 : height === 'high' ? .18 : .5);
      const isBlock = contact.outcome === 'block' && !contact.perfectBlock;
      const bodyY = contact.contactBody?.centerY ?? box.y + box.height / 2;
      const bodyHeight = contact.contactBody?.height ?? box.height;
      const sprite = this.scene.add.image(x, isBlock ? bodyY : y, key, 0).setDepth(12)
        .setDisplaySize(isBlock ? 84 : 66, isBlock ? bodyHeight * 1.2 : 66)
        .setFlipX((contact.pushbackDirection ?? attacker.facing) === 'left');
      if (purpleContact) this.colorEffect.apply(sprite, { alternate: true }, purpleBlock && contact.perfectBlock ? 'magic-highlight' : 'magic');
      this.impacts.push({ sprite, started: frame });
    }
    this.impacts = this.impacts.filter(impact => {
      const age = frame - impact.started;
      if (age >= 12 || age < 0) { impact.sprite.destroy(); return false; }
      impact.sprite.setFrame(Math.min(5, Math.floor(age / 2)));
      return true;
    });
    const activeExplosions = new Set(explosions.filter(e => e.kind === 'dynamite').map(e => e.id!));
    for (const [id,sprite] of this.dynamiteExplosions) if (!activeExplosions.has(id)) { sprite.destroy(); this.dynamiteExplosions.delete(id); }
    for (const explosion of explosions) {
      if (explosion.kind === 'dynamite') {
        if (this.scene.textures.exists('cowboy-effect-dynamite-blast')) {
          const sprite = this.dynamiteExplosions.get(explosion.id!) ?? this.scene.add.image(explosion.x, explosion.y, 'cowboy-effect-dynamite-blast', '0').setDepth(11);
          this.dynamiteExplosions.set(explosion.id!, sprite);
          this.colorEffect.apply(sprite, { alternate: Boolean(explosion.ownerId && alternateOwnerIds.has(explosion.ownerId)) }, 'magic');
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
  destroy(): void { this.sprites.forEach(sprite => sprite.destroy()); this.dynamiteExplosions.forEach(sprite => sprite.destroy()); this.impacts.forEach(impact => impact.sprite.destroy()); this.wallEffects.forEach(effect => effect.sprite.destroy()); this.graphics.destroy(); }
}
