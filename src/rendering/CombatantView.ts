import type Phaser from 'phaser';
import { texasDisplayHeight, texasFootAnchor, getTexasFrameSize, getTexasRoundEndPose, getTexasSpriteLayers, getTexasUltimateActivationPose } from './animations/texasSprites';
import { getShotoSpritePose, getShotoUltimatePose, getShotoResolution, shotoIdleScale, shotoSpriteScale, getShotoRoundEndPose } from './animations/shotoSprites';
import { getGrapplerPose, getGrapplerInbetween, grapplerFrameSize, grapplerAdjustment, GRAPPLER_DISPLAY } from './animations/grapplerSprites';
import type { CharacterState } from '../engine/characters/CharacterState';
import { createHitbox, createHurtbox } from '../engine/collision/combatGeometry';
import { getCharacterById } from '../engine/data/characters';
import { TEXAS_GRAB_SHOTS } from '../engine/combat/texasGrab';
import { CharacterColorEffect, type CharacterColor } from './characterColor';
import { grapplerEffects, type GrapplerEffect } from './grapplerEffects';
import { grapplerHeadbuttImpact } from './grapplerHands';
import { grapplerSpinPhase } from './grapplerCapture';
import { contactFrameGrowth, contactFrameMargin, contactFrameSize } from './contactEffects';
import { grapplerReaction } from './grapplerReaction';

/** A fighter on the way down, lying or losing the round is drawn behind the one still standing; so is the victim of an ippon while thrown. */
export function combatantDepth(state: CharacterState, frame: number, lost = false): number {
  const ipponAge = frame - (state.ipponReceivedFrame ?? -Infinity);
  return lost || state.mode === 'knockdown' || (ipponAge >= 0 && ipponAge < 24) ? 9 : 10;
}

/** Fighters without body artwork retain diagnostic geometry. */
/** Frames after the headbutt grab connects until the head thrusts forward (the drawing after the two held ones). */
const HEADBUTT_IMPACT = 10;

export class CombatantView {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly colorEffect = new CharacterColorEffect();
  private readonly sprites: Phaser.GameObjects.Image[] = [];
  private readonly volleyArms: Phaser.GameObjects.Image[] = [];
  private readonly grabShots: Phaser.GameObjects.Image[] = [];
  private readonly grapplerEffectSprites: Phaser.GameObjects.Image[] = [];
  private ultimatePunchTail?: { frame: number; effect: GrapplerEffect };
  private headbuttHit?: Phaser.GameObjects.Image;
  private dust?: Phaser.GameObjects.Image;
  private ultimateWind?: Phaser.GameObjects.Image;
  private lasso?: Phaser.GameObjects.Image;
  constructor(private readonly scene: Phaser.Scene, private readonly color: number) {
    this.graphics = scene.add.graphics().setDepth(11);
  }
  sync(state: CharacterState & { captureSpin?: { phase: number; depth: number } }, frame: number, activationFrame?: number, result?: {winner: boolean; elapsed: number}, color: CharacterColor = {}, hidden = false, contactPaused = false): void {
    if (hidden) {
      this.graphics.clear();
      for (const image of [...this.sprites, ...this.volleyArms, ...this.grabShots, ...this.grapplerEffectSprites]) image.setVisible(false);
      this.headbuttHit?.setVisible(false); this.dust?.setVisible(false); this.ultimateWind?.setVisible(false); this.lasso?.setVisible(false);
      return;
    }
    const depth = state.captureSpin?.depth ?? combatantDepth(state, frame, result !== undefined && !result.winner);
    const spinning = !state.grounded && (state.spinStartedFrame !== undefined || state.captureSpin !== undefined);
    const authoredGrab = Boolean(grapplerReaction(state, frame));
    // Spinning is flat 2D: the drawing alternates between mirrored and normal as the turn passes, never narrowing.
    const mirror = (phase: number): number => Math.cos(phase) < 0 ? -1 : 1;
    const spinWidth = state.captureSpin ? authoredGrab ? 1 : mirror(state.captureSpin.phase) : spinning ? mirror((frame - state.spinStartedFrame!) * Math.PI / 4) : 1;
    this.graphics.setDepth(depth);
    const grabAge = state.attack?.moveId === 'throw-24' && state.attack.throwConfirmedFrame !== undefined
      ? frame - state.attack.throwConfirmedFrame : -1;
    const shotIndex = TEXAS_GRAB_SHOTS.findIndex(start => grabAge >= start && grabAge < start + 7);
    if (shotIndex >= 0 && this.scene.textures.exists('texas-effect-shot')) {
      const sign = state.facing === 'right' ? 1 : -1;
      const shot = this.grabShots[0] ??= this.scene.add.image(0, 0, 'texas-effect-shot', '0').setDepth(11);
      this.colorEffect.apply(shot, { alternate: color.alternate }, 'magic');
      const travel = grabAge - TEXAS_GRAB_SHOTS[shotIndex];
      const horizontal = shotIndex === 2;
      shot.setTexture('texas-effect-shot', String(Math.min(5, travel)))
        .setDisplaySize(horizontal ? 90 : 54, horizontal ? 70 : 44)
        .setPosition(state.x + sign * (35 + travel * 3), state.y - 114 + (horizontal ? 0 : travel * 3))
        .setFlipX(sign < 0).setAngle(horizontal ? 0 : sign * 45).setVisible(true);
    } else this.grabShots.forEach(shot => shot.setVisible(false));
    const volley = state.fighterId === 'texas' && state.attack?.moveId === 'bulls-eye' && activationFrame === undefined;
    if (volley && this.scene.textures.exists('texas-magic-volley')) {
      const camera = this.scene.cameras.main;
      for (let i = 0; i < 6; i++) {
        const arms = this.volleyArms[i] ??= this.scene.add.image(0, 0, 'texas-magic-volley', '0').setDepth(9);
        this.colorEffect.apply(arms, color, 'magic');
        const elapsed = state.attack!.elapsedFrames;
        const fadeIn = Math.min(1, (elapsed + 10) / 15);
        const fadeOut = Math.max(0, Math.min(1, (112 - elapsed) / 18));
        const shotAge = elapsed - (1 + i * 18);
        const shotFrame = shotAge < 0 || shotAge >= 12 ? 0 : Math.min(5, 1 + Math.floor(shotAge / 2));
        arms.setTexture('texas-magic-volley', String(shotFrame)).setDisplaySize(300, 300)
          .setPosition(state.facing === 'right' ? camera.worldView.left + 100 : camera.worldView.right - 100,
            state.y - (i + .5) * 44 + 56)
          .setFlipX(state.facing === 'left').setAlpha(fadeIn * fadeOut).setVisible(elapsed < 112);
      }
    } else this.volleyArms.forEach(arms => arms.setVisible(false));
    const windActive = state.fighterId === 'shoto' && state.attack?.moveId === 'rake-ultimate' &&
      activationFrame === undefined && (state.mode === 'startup' || state.mode === 'active');
    if (windActive && this.scene.textures.exists('shoto-effect-ultimate-wind')) {
      const wind = this.ultimateWind ??= this.scene.add.image(0, 0, 'shoto-effect-ultimate-wind', '0').setDepth(9);
      wind.setTexture('shoto-effect-ultimate-wind', String(Math.floor(state.attack!.elapsedFrames / 2) % 6))
        .setOrigin(.5, 1).setDisplaySize(285, 280).setPosition(state.x, state.y + 5)
        .setFlipX(state.facing === 'left').setVisible(true);
    } else this.ultimateWind?.setVisible(false);
    if (state.fighterId === 'grappler') {
      const move = state.attack && getCharacterById('grappler')?.moves.find(candidate => candidate.id === state.attack!.moveId);
      const pose = result && state.grounded ? {name:result.winner ? 'victory' : 'defeat', drawing:Math.min(5, Math.floor(result.elapsed / 10))} : getGrapplerPose(state, frame, activationFrame), between = result ? undefined : getGrapplerInbetween(state, frame, activationFrame);
      const textureName = between === undefined ? pose.name : `${pose.name}-between`;
      const texture = `grappler-${textureName}`;
      const headbutt = state.attack && move?.id === 'grab-headbutt' && state.attack.hasHit ? state.attack.elapsedFrames - (state.attack.startupFrames ?? move.startup) - HEADBUTT_IMPACT : -1;
      const forehead = grapplerHeadbuttImpact(state);
      // The blow lands between the two heads when the head moves forward.
      if (headbutt >= 0 && headbutt < 12 && this.scene.textures.exists('contact-hit-heavy')) {
        const growth = contactFrameGrowth('contact-hit-heavy'), sign = state.facing === 'right' ? 1 : -1;
        const hit = this.headbuttHit ??= this.scene.add.image(0,0,'contact-hit-heavy','0');
        hit.setDepth(12).setTexture('contact-hit-heavy',String(Math.min(5,Math.floor(headbutt / 2)))).setDisplaySize(90 * growth.x, 90 * growth.y)
          .setPosition(state.x + forehead.x, state.y + forehead.y).setFlipX(sign < 0).setVisible(true);
      } else this.headbuttHit?.setVisible(false);
      const effects = grapplerEffects(state, activationFrame, contactPaused);
      const punchSmoke = effects.find(effect => effect.name === 'ultimate-soco');
      if (punchSmoke && move && state.attack && state.attack.elapsedFrames >= (state.attack.startupFrames ?? move.startup) + move.activeFrames + (state.attack.recoveryFrames ?? move.recovery) - 1) {
        this.ultimatePunchTail = { frame, effect: punchSmoke };
      } else if (!state.attack && this.ultimatePunchTail && frame === this.ultimatePunchTail.frame + 1) {
        effects.push({ ...this.ultimatePunchTail.effect, frame: 5 });
      } else if (!punchSmoke) this.ultimatePunchTail = undefined;
      effects.forEach((effect, index) => {
        const key = `contact-grappler-${effect.name}`;
        if (!this.scene.textures.exists(key)) return;
        const image = this.grapplerEffectSprites[index] ??= this.scene.add.image(0, 0, key, '0');
        const size = contactFrameSize(key), margin = contactFrameMargin(key);
        image.setDepth(depth + 1).setTexture(key, String(effect.frame))
          .setOrigin((effect.origin.x + margin.x) / size.width, (effect.origin.y + margin.y) / size.height).setScale(effect.scale)
          .setPosition(state.x + effect.x, state.y + effect.y)
          .setFlipX(effect.name === 'ultimate-start' ? state.facing === 'right' : state.facing === 'left').setVisible(true);
      });
      this.grapplerEffectSprites.slice(effects.length).forEach(image => image.setVisible(false));
      const adjustment = grapplerAdjustment(pose.name, pose.drawing);
      if (this.scene.textures?.exists(texture)) {
        const sprite = this.sprites[0] ??= this.scene.add.image(0, 0, texture, String(pose.drawing));
        // Spinning with the victim, he turns his face from side to side: the drawing is mirrored and normal in turn.
        const turn = grapplerSpinPhase(state), turnWidth = turn === undefined ? 1 : mirror(turn);
        this.colorEffect.apply(sprite, color, 'grappler');
        sprite.setDepth(depth).setTexture(texture, String(between ?? pose.drawing)).setOrigin(.5, spinning ? .5 : 465 / 640)
          .setScale(GRAPPLER_DISPLAY * adjustment.scale / grapplerFrameSize(textureName) * spinWidth * turnWidth, GRAPPLER_DISPLAY * adjustment.scale / grapplerFrameSize(textureName))
          .setPosition(state.x + adjustment.center * GRAPPLER_DISPLAY * adjustment.scale * (state.facing === 'left' ? -1 : 1), state.y - (spinning ? 105 : 0))
          .setFlipX(state.facing === 'left').setAngle(0).setAlpha(1).setVisible(true);
        this.sprites.slice(1).forEach(other => other.setVisible(false));
        this.graphics.clear(); this.lasso?.setVisible(false); this.dust?.setVisible(false);
        return;
      }
    }
    const shotoPose = state.fighterId === 'shoto' && (!result || !result.winner || !state.grounded)
      ? activationFrame === undefined ? getShotoSpritePose(state, frame) : getShotoUltimatePose(state, activationFrame, true) : undefined;
    const shotoResult = state.fighterId === 'shoto' && result && state.grounded && (result.winner || state.mode !== 'knockdown')
      ? getShotoRoundEndPose(state, result.winner, result.elapsed) : undefined;
    const shotoDrawing = shotoResult || shotoPose;
    if (shotoDrawing && this.scene.textures?.exists(shotoDrawing.texture)) {
      const sprite = this.sprites[0] ??= this.scene.add.image(0, 0, shotoDrawing.texture, String(shotoDrawing.frame)).setDepth(10);
      this.colorEffect.apply(sprite, color, 'bob');
      sprite.setDepth(depth).setTexture(shotoDrawing.texture, String(shotoDrawing.frame)).setOrigin(.5, spinning ? .5 : shotoDrawing.footAnchor)
        .setScale((shotoDrawing.texture === 'shoto-idle' ? shotoIdleScale : shotoSpriteScale) * ('scale' in shotoDrawing ? shotoDrawing.scale ?? 1 : 1) / getShotoResolution(shotoDrawing.texture) * spinWidth, (shotoDrawing.texture === 'shoto-idle' ? shotoIdleScale : shotoSpriteScale) * ('scale' in shotoDrawing ? shotoDrawing.scale ?? 1 : 1) / getShotoResolution(shotoDrawing.texture)).setAngle(0).setPosition(state.x + shotoDrawing.offsetX, state.y - (spinning ? 90 : 0))
        .setFlipX(shotoDrawing.flipX).setAlpha(1).setVisible(true);
      this.sprites.slice(1).forEach(other => other.setVisible(false));
      this.graphics.clear();
      this.lasso?.setVisible(false);
      this.dust?.setVisible(false);
      return;
    }
    const roundEndPose = result && getTexasRoundEndPose(state, result.winner, result.elapsed);
    const layers=state.fighterId === 'texas' ? roundEndPose ? [roundEndPose] : activationFrame !== undefined ? [getTexasUltimateActivationPose(state,activationFrame)] : getTexasSpriteLayers(state, frame) : [];
    if(layers.length && layers.every(pose=>this.scene.textures?.exists(pose.texture))){
      layers.forEach((pose,index)=>{
        const sprite=this.sprites[index]??=this.scene.add.image(0,0,pose.texture,String(pose.frame)).setDepth(10);
        const magic = pose.texture.startsWith('texas-magic-');
        this.colorEffect.apply(sprite, magic ? { alternate: color.alternate } : color, magic ? 'magic' : 'texas');
        sprite.setDepth(depth).setTexture(pose.texture,String(pose.frame))
          .setOrigin(.5,spinning ? .5 : texasFootAnchor)
          .setScale(texasDisplayHeight / getTexasFrameSize(pose.texture) * pose.scale * spinWidth, texasDisplayHeight / getTexasFrameSize(pose.texture) * pose.scale)
          .setAngle(0)
          .setPosition(state.x+pose.offsetX,state.y+pose.offsetY-(spinning ? 85 : 0)).setFlipX(pose.flipX).setAlpha(pose.alpha).setVisible(true);
      });
      this.sprites.slice(layers.length).forEach(sprite=>sprite.setVisible(false));
      this.graphics.clear();
      const move = state.fighterId === 'texas' && state.attack
        ? getCharacterById(state.fighterId)?.moves.find(candidate => candidate.id === state.attack!.moveId) : undefined;
      const lassoTexture = 'texas-effect-lasso';
      if (move?.id === 'throw-13' && state.mode === 'active' && this.scene.textures.exists(lassoTexture)) {
        const box = createHitbox(state, move);
        const sign = state.facing === 'right' ? 1 : -1;
        const hand = state.x + sign * 58;
        const tip = state.facing === 'right' ? box.x + box.width : box.x;
        const width = Math.max(1, Math.abs(tip - hand)) * 640 / 491 * 1.15;
        const left = state.facing === 'right' ? hand - width * 64 / 640 : tip - width * 85 / 640;
        const lasso = this.lasso ??= this.scene.add.image(0,0,lassoTexture,'2').setDepth(11);
        this.colorEffect.apply(lasso, { alternate: color.alternate }, 'magic');
        lasso.setTexture(lassoTexture, '2').setOrigin(0,.5).setDisplaySize(width,120)
          .setPosition(left,state.y - 109).setFlipX(state.facing === 'left').setVisible(true);
      } else this.lasso?.setVisible(false);
      const dustKind = move?.id === 'power-kick' ? 'power' :
        move && (move.id === 'light-kick' || move.id === 'crouch-light-kick') ? 'light' : undefined;
      const dustAge = move && state.attack ? state.attack.elapsedFrames - (state.attack.startupFrames ?? move.startup) : -1;
      if (dustKind && move && dustAge >= 0 && dustAge < 12 && this.scene.textures.exists(`texas-effect-dust-${dustKind}`)) {
        const box = createHitbox(state, move);
        const effect = this.dust ??= this.scene.add.image(0, 0, `texas-effect-dust-${dustKind}`, '0').setDepth(11);
        this.colorEffect.apply(effect, { alternate: color.alternate }, 'magic');
        const height = box.height * (dustKind === 'power' ? 1.375 : 1.625);
        effect.setTexture(`texas-effect-dust-${dustKind}`, String(Math.min(5, dustKind === 'light' ? 1 + Math.floor(dustAge / 3) : Math.floor(dustAge / 2))))
          .setOrigin(.5, 1).setDisplaySize(box.width * 1.25, height)
          .setPosition(box.x + box.width / 2, state.y + height * (dustKind === 'power' ? .15 : .24) + 4)
          .setFlipX(state.facing === 'left').setVisible(true);
      } else this.dust?.setVisible(false);
      return;
    }
    this.sprites.forEach(sprite=>sprite.setVisible(false));
    this.lasso?.setVisible(false);
    this.dust?.setVisible(false);
    const g = this.graphics;
    const box = createHurtbox(state);
    const sign = state.facing === 'right' ? 1 : -1;
    g.clear();
    g.fillStyle(this.color, .85).fillRect(box.x, box.y, box.width, box.height);
    g.lineStyle(2, 0xe9e4ee, .9).strokeRect(box.x, box.y, box.width, box.height);
    // O marcador de frente não muda as dimensões do corpo por fase do golpe.
    const eyeX = state.x + sign * (box.width / 2 - 10);
    g.fillStyle(0xffffff).fillRect(eyeX - 3, box.y + 16, 6, 6);
    const move = getCharacterById(state.fighterId)?.moves.find(move => move.id === state.attack?.moveId);
    if (move && state.mode === 'active') {
      const contact = createHitbox(state, move);
      g.fillStyle(this.color, .65).fillRect(contact.x, contact.y, contact.width, contact.height);
      g.lineStyle(2, 0xffe0ab).strokeRect(contact.x, contact.y, contact.width, contact.height);
    }
    if (state.mode === 'blocking' || state.mode === 'blockstun') {
      g.lineStyle(4, 0xa6e6ff).lineBetween(state.x + sign * 28, box.y + 12, state.x + sign * 28, box.y + box.height - 12);
    }
  }
  destroy(): void { this.sprites.forEach(sprite=>sprite.destroy()); this.volleyArms.forEach(sprite=>sprite.destroy()); this.grabShots.forEach(sprite=>sprite.destroy()); this.grapplerEffectSprites.forEach(sprite=>sprite.destroy()); this.headbuttHit?.destroy(); this.dust?.destroy(); this.ultimateWind?.destroy(); this.lasso?.destroy(); this.graphics.destroy(); }
}
