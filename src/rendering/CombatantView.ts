import type Phaser from 'phaser';
import { cowboyDisplayHeight, cowboyFootAnchor, cowboyFrameSize, getCowboyRoundEndPose, getCowboyRoundEndPresentation, getCowboySpriteLayers, getCowboyUltimateActivationPose } from './animations/cowboySprites';
import type { CharacterState } from '../engine/characters/CharacterState';
import { createHitbox, createHurtbox } from '../engine/collision/combatGeometry';
import { getCharacterById } from '../engine/data/characters';

/** Fighters without body artwork retain diagnostic geometry. */
export class CombatantView {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly sprites: Phaser.GameObjects.Image[] = [];
  private readonly volleyArms: Phaser.GameObjects.Image[] = [];
  private readonly grabShots: Phaser.GameObjects.Image[] = [];
  private dust?: Phaser.GameObjects.Image;
  private lasso?: Phaser.GameObjects.Image;
  constructor(private readonly scene: Phaser.Scene, private readonly color: number) {
    this.graphics = scene.add.graphics().setDepth(11);
  }
  sync(state: CharacterState, frame: number, activationFrame?: number, result?: {winner: boolean; elapsed: number; floorY: number; gravity: number}): void {
    const presentation = result ? getCowboyRoundEndPresentation(state, result.elapsed, result.floorY, result.gravity) : undefined;
    if (presentation) state = presentation.state;
    const grabAge = state.attack?.moveId === 'throw-24' && state.attack.throwConfirmedFrame !== undefined
      ? frame - state.attack.throwConfirmedFrame : -1;
    if (grabAge >= 0 && grabAge < 8 && this.scene.textures.exists('cowboy-effect-shot')) {
      const sign = state.facing === 'right' ? 1 : -1;
      for (let i = 0; i < 2; i++) {
        const shot = this.grabShots[i] ??= this.scene.add.image(0, 0, 'cowboy-effect-shot', '0').setDepth(11);
        const travel = grabAge;
        shot.setTexture('cowboy-effect-shot', String(Math.min(5, travel)))
          .setDisplaySize(54, 44).setPosition(state.x + sign * (35 + i * 15 + travel * 3), state.y - 114 + i * 10 + travel * 3)
          .setFlipX(sign < 0).setAngle(sign * 45).setVisible(true);
      }
    } else this.grabShots.forEach(shot => shot.setVisible(false));
    const volley = state.fighterId === 'cowboy' && state.attack?.moveId === 'bulls-eye' && activationFrame === undefined;
    if (volley && this.scene.textures.exists('cowboy-magic-volley')) {
      const camera = this.scene.cameras.main;
      for (let i = 0; i < 6; i++) {
        const arms = this.volleyArms[i] ??= this.scene.add.image(0, 0, 'cowboy-magic-volley', '0').setDepth(9);
        const elapsed = state.attack!.elapsedFrames;
        const fadeIn = Math.min(1, (elapsed + 10) / 15);
        const fadeOut = Math.max(0, Math.min(1, (112 - elapsed) / 18));
        const shotAge = elapsed - (1 + i * 18);
        const shotFrame = shotAge < 0 || shotAge >= 12 ? 0 : Math.min(5, 1 + Math.floor(shotAge / 2));
        arms.setTexture('cowboy-magic-volley', String(shotFrame)).setDisplaySize(300, 300)
          .setPosition(state.facing === 'right' ? camera.worldView.left + 100 : camera.worldView.right - 100,
            state.y - (i + .5) * 44 + 56)
          .setFlipX(state.facing === 'left').setAlpha(fadeIn * fadeOut).setVisible(elapsed < 112);
      }
    } else this.volleyArms.forEach(arms => arms.setVisible(false));
    const roundEndPose = result && getCowboyRoundEndPose(state, result.winner, presentation!.elapsed);
    const layers=state.fighterId === 'cowboy' ? roundEndPose ? [roundEndPose] : activationFrame !== undefined ? [getCowboyUltimateActivationPose(state,activationFrame)] : getCowboySpriteLayers(state, frame) : [];
    if(layers.length && layers.every(pose=>this.scene.textures?.exists(pose.texture))){
      layers.forEach((pose,index)=>{
        const sprite=this.sprites[index]??=this.scene.add.image(0,0,pose.texture,String(pose.frame)).setDepth(10);
        sprite.setTexture(pose.texture,String(pose.frame))
          .setOrigin(.5,cowboyFootAnchor)
          .setScale(cowboyDisplayHeight / cowboyFrameSize * pose.scale)
          .setAngle(0)
          .setPosition(state.x+pose.offsetX,state.y+pose.offsetY).setFlipX(pose.flipX).setAlpha(pose.alpha).setVisible(true);
      });
      this.sprites.slice(layers.length).forEach(sprite=>sprite.setVisible(false));
      this.graphics.clear();
      const move = state.fighterId === 'cowboy' && state.attack
        ? getCharacterById(state.fighterId)?.moves.find(candidate => candidate.id === state.attack!.moveId) : undefined;
      const lassoTexture = 'cowboy-effect-lasso';
      if (move?.id === 'throw-13' && state.mode === 'active' && this.scene.textures.exists(lassoTexture)) {
        const box = createHitbox(state, move);
        const sign = state.facing === 'right' ? 1 : -1;
        const hand = state.x + sign * 58;
        const tip = state.facing === 'right' ? box.x + box.width : box.x;
        const width = Math.max(1, Math.abs(tip - hand)) * 640 / 491 * 1.15;
        const left = state.facing === 'right' ? hand - width * 64 / 640 : tip - width * 85 / 640;
        const lasso = this.lasso ??= this.scene.add.image(0,0,lassoTexture,'2').setDepth(11);
        lasso.setTexture(lassoTexture, '2').setOrigin(0,.5).setDisplaySize(width,120)
          .setPosition(left,state.y - 99).setFlipX(state.facing === 'left').setVisible(true);
      } else this.lasso?.setVisible(false);
      const dustKind = move?.id === 'power-kick' ? 'power' :
        move && (move.id === 'light-kick' || move.id === 'crouch-light-kick') ? 'light' : undefined;
      const dustAge = move && state.attack ? state.attack.elapsedFrames - (state.attack.startupFrames ?? move.startup) : -1;
      if (dustKind && move && dustAge >= 0 && dustAge < 12 && this.scene.textures.exists(`cowboy-effect-dust-${dustKind}`)) {
        const box = createHitbox(state, move);
        const effect = this.dust ??= this.scene.add.image(0, 0, `cowboy-effect-dust-${dustKind}`, '0').setDepth(11);
        const height = box.height * (dustKind === 'power' ? 1.375 : 1.625);
        effect.setTexture(`cowboy-effect-dust-${dustKind}`, String(Math.min(5, dustKind === 'light' ? 1 + Math.floor(dustAge / 3) : Math.floor(dustAge / 2))))
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
  destroy(): void { this.sprites.forEach(sprite=>sprite.destroy()); this.volleyArms.forEach(sprite=>sprite.destroy()); this.grabShots.forEach(sprite=>sprite.destroy()); this.dust?.destroy(); this.lasso?.destroy(); this.graphics.destroy(); }
}
