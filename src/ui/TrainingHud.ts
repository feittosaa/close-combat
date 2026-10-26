import type { AttackButton } from '../input/types';
import { formatCommand } from './commandNotation';
import { getPlayerLayout, keyLabel } from '../input/controlSettings';
import { recoveryFrames } from '../engine/combat/frameData';
import type Phaser from 'phaser';
import { HUD, hudText, drawHudPanel } from './hudTheme';
import { getSystemControls } from '../input/controlSettings';
import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import type { TrainingSession } from '../training/TrainingSession';
import { OPPONENT_LABELS } from '../training/TrainingSession';
import { MODE_LABELS, moveInputLabel, signedFrames } from './combatLabels';

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
    this.status.setText(`TREINO  /  ${session.paused ? 'PAUSADO' : 'EM CURSO'} · ${session.speed * 100}% · ${OPPONENT_LABELS[session.opponentMode].replace(/\b[1-4]\b/g,button=>keyLabel(getPlayerLayout(1).buttons[button as AttackButton]))} · VIDA AUTO ${session.autoRestore ? 'ON' : 'OFF'}`);
    const controls=getSystemControls();
    this.footer.setText(`${keyLabel(controls.pause)} PAUSA · . FRAME · L VELOCIDADE · ${keyLabel(controls.reset)} / F2 RESET · F3 VIDA AUTO · F4 DISTÂNCIA · G ADVERSÁRIO · H COLISÕES · I ENTRADAS · ESC PAUSA`);
    this.progress.clear();
    snapshot.characters.forEach((character, index) => {
      const move = session.lastMoves[index];
      const recovery = move ? recoveryFrames(move) : 0;
      const recoveryLabel = String(recovery);
      const lockedFrames = move && character.attack
        ? move.startup + move.activeFrames + recoveryFrames(move) - character.attack.elapsedFrames
        : character.remainingStateFrames;
      const levels = { high: 'ALTO', mid: 'MÉDIO', low: 'BAIXO', air: 'AÉREO', throw: 'AGARRÃO', special: 'ESPECIAL' };
      const detail = move
        ? `${character.attack ? 'GOLPE' : 'ÚLTIMO'} ${formatCommand(moveInputLabel(move),getPlayerLayout(index))} · S${move.startup} A${move.activeFrames} R${recoveryLabel} · ${levels[move.hitLevel]} · DANO ${move.damage}`
        : 'S: preparo · A: ativo · R: recuperação';
      this.fighters[index]?.setText(`P${index + 1} · ${MODE_LABELS[character.mode]} · ${lockedFrames > 0 ? `RESTAM ${lockedFrames}F` : 'LIVRE'}\n${detail}`);
      const left = 30 + index * (this.width / 2 - 18);
      const barWidth = this.width / 2 - 42;
      const barY = this.panelY + 52;
      this.progress.fillStyle(HUD.rail).fillRect(left, barY, barWidth, 5);
      if (!move) return;
      const total = move.startup + move.activeFrames + recovery;
      let offset = 0;
      for (const [duration, color] of [[move.startup, 0xffb454], [move.activeFrames, 0xff687d], [recovery, 0x76b8e7]]) {
        const width = duration / total * barWidth;
        this.progress.fillStyle(color).fillRect(left + offset, barY, width, 5);
        offset += width;
      }
      if (character.attack) {
        const cursor = Math.min(1, character.attack.elapsedFrames / total) * barWidth;
        this.progress.fillStyle(0xffffff).fillRect(left + cursor, barY - 2, 2, 9);
      }
    });
    const distance = Math.round(Math.abs(snapshot.characters[0].x - snapshot.characters[1].x));
    this.distance.setText(`FRAME ${snapshot.frame} · DISTÂNCIA ${distance} · CAIXAS ${session.showGeometry ? 'ON' : 'OFF'}`);
    const contact = snapshot.recentContacts[snapshot.recentContacts.length - 1]?.event;
    this.contact.setText(contact
      ? `${contact.attackerId === 'player-1' ? 'P1' : 'P2'}: DANO ${contact.damage} · REC ${contact.attackerRecoveryFrames}F · STUN ${contact.defenderStunFrames}F · ADV ${signedFrames(contact.frameAdvantage)}`
      : 'S: preparo · A: ativo · R: recuperação');
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
