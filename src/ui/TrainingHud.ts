import type { AttackButton } from '../input/types';
import { formatCommand } from './commandNotation';
import { getPlayerLayout, keyLabel } from '../input/controlSettings';
import { recoveryFrames } from '../engine/combat/frameData';
import type Phaser from 'phaser';
import { HUD, hudText, drawHudPanel } from './hudTheme';
import { getSystemControls, getTrainingControls } from '../input/controlSettings';
import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import type { TrainingSession } from '../training/TrainingSession';
import { moveInputLabel, signedFrames, stateLabel } from './combatLabels';
import { t } from '../i18n/i18n';
import type { MoveDefinition } from '../engine/data/moves';

/** Read-only training instrumentation, kept below the feet to leave jumps unobstructed. */
export class TrainingHud {
  private readonly root: Phaser.GameObjects.Container;
  private readonly status: Phaser.GameObjects.Text;
  private readonly fighters: Phaser.GameObjects.Text[];
  private readonly progress: Phaser.GameObjects.Graphics;
  private readonly distance: Phaser.GameObjects.Text;
  private readonly contact: Phaser.GameObjects.Text;
  private readonly panelY: number;
  private readonly footer: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, private readonly width: number, height: number) {
    this.panelY = height - 84;
    const background = scene.add.graphics();
    drawHudPanel(background,18,this.panelY,width-36,58,HUD.gold,.96);
    this.status=scene.add.text(32,this.panelY+5,'',hudText(10,false,HUD.goldText));
    this.distance=scene.add.text(width-32,this.panelY+5,'',hudText(10,false,HUD.muted)).setOrigin(1,0);
    this.fighters=[0,1].map(index=>scene.add.text(32+index*(width/2-18),this.panelY+21,'',{
      ...hudText(10,false,HUD.ivory),lineSpacing:2,wordWrap:{width:width/2-64}}));
    this.progress=scene.add.graphics();
    this.contact=scene.add.text(width/2,height-24,'',hudText(9,false,HUD.goldText)).setOrigin(.5,0);
    const footerBackground=scene.add.rectangle(width/2,height-12,width,24,HUD.ink,.95);
    this.footer=scene.add.text(width/2,height-11,'',hudText(8,false,HUD.muted)).setOrigin(.5,0);
    this.root=scene.add.container(0,0,[background,footerBackground,this.status,...this.fighters,
      this.progress,this.distance,this.contact,this.footer]).setDepth(110).setScrollFactor(0);
  }

  update(snapshot: SimulationSnapshot, session: TrainingSession): void {
    const toggle = (on: boolean) => t(on ? 'training.on' : 'training.off');
    const opponent = t(`opponent.${session.opponentMode}`).replace(/\b[1-4]\b/g,button=>keyLabel(getPlayerLayout(1).buttons[button as AttackButton]));
    this.status.setText(t('training.status', { state: t(session.paused ? 'training.paused' : 'training.running'), speed: session.speed * 100, opponent, auto: toggle(session.autoRestore) }));
    const controls=getSystemControls(), keys=getTrainingControls();
    this.footer.setText(t('training.footer', { pause: keyLabel(controls.pause), step: keyLabel(keys.step), speed: keyLabel(keys.speed), reset: keyLabel(controls.reset),
      resetShortcut: keyLabel(keys.reset), autoLife: keyLabel(keys.autoLife), distance: keyLabel(keys.distance), opponent: keyLabel(keys.opponent),
      geometry: keyLabel(keys.geometry), inputs: keyLabel(keys.inputs) }));
    this.progress.clear();
    snapshot.characters.forEach((character, index) => {
      const move = session.lastMoves[index];
      const recovery = move ? recoveryFrames(move, character.attack) : 0;
      const lockedFrames = move && character.attack
        ? move.startup + move.activeFrames + recoveryFrames(move, character.attack) - character.attack.elapsedFrames
        : character.remainingStateFrames;
      const level = (id: MoveDefinition['hitLevel']) => t(`level.${id}`).toLocaleUpperCase();
      const detail = move
        ? t('training.move', { which: t(character.attack ? 'training.current' : 'training.last'), command: formatCommand(moveInputLabel(move),getPlayerLayout(index)),
          startup: move.startup, active: move.activeFrames, recovery, level: `${move.screenVolley?.firstHitLevel ? `${level(move.screenVolley.firstHitLevel)} / ` : ''}${level(move.hitLevel)}`, damage: move.damage })
        : t('training.legend');
      this.fighters[index]?.setText(`${t('training.fighter', { player: index + 1, state: stateLabel(character.mode), lock: lockedFrames > 0 ? t('training.remaining', { frames: lockedFrames }) : t('training.free') })}\n${detail}`);
      const left = 30 + index * (this.width / 2 - 18);
      const barWidth = this.width / 2 - 42;
      const barY = this.panelY + 52;
      this.progress.fillStyle(HUD.rail).fillRect(left, barY, barWidth, 5);
      if (!move) return;
      const total = move.startup + move.activeFrames + recovery;
      let offset = 0;
      for (const [duration, color] of [[move.startup, HUD.phases[0]], [move.activeFrames, HUD.phases[1]], [recovery, HUD.phases[2]]]) {
        const width = duration / total * barWidth;
        this.progress.fillStyle(color).fillRect(left + offset, barY, width, 5);
        offset += width;
      }
      if (character.attack) {
        const cursor = Math.min(1, character.attack.elapsedFrames / total) * barWidth;
        this.progress.fillStyle(HUD.lightGold).fillRect(left + cursor, barY - 2, 2, 9);
      }
    });
    const distance = Math.round(Math.abs(snapshot.characters[0].x - snapshot.characters[1].x));
    this.distance.setText(t('training.frameInfo', { frame: snapshot.frame, distance, boxes: t(session.showGeometry ? 'training.on' : 'training.off') }));
    const contact = snapshot.recentContacts[snapshot.recentContacts.length - 1]?.event;
    this.contact.setText(contact
      ? t('training.contact', { player: contact.attackerId === 'player-1' ? 'P1' : 'P2', damage: contact.damage, recovery: contact.attackerRecoveryFrames, stun: contact.defenderStunFrames, advantage: signedFrames(contact.frameAdvantage) })
      : t('training.legend'));
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
