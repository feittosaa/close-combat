import type { AttackButton } from '../input/types';
import { formatCommand } from './commandNotation';
import { getPlayerLayout, keyLabel } from '../input/controlSettings';
import { recoveryFrames } from '../engine/combat/frameData';
import Phaser from 'phaser';
import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import type { TrainingSession } from '../training/TrainingSession';
import { DUMMY_LABELS } from '../training/TrainingSession';
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

  constructor(scene: Phaser.Scene, private readonly width: number, height: number) {
    const left = 18;
    this.panelY = height - 85;
    const background = scene.add.rectangle(width / 2, this.panelY + 35, width - 36, 70, 0x14151e, 0.96)
      .setStrokeStyle(1, 0x686271);
    this.status = scene.add.text(width / 2, this.panelY + 4, '', {
      color: '#ffd166', fontSize: '12px', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.fighters = [0, 1].map((index) => scene.add.text(left + 12 + index * (width / 2 - 18), this.panelY + 19, '', {
      color: '#f4f0e8', fontSize: '11px', lineSpacing: 2,
    }));
    this.progress = scene.add.graphics();
    this.distance = scene.add.text(left + 12, this.panelY + 59, '', {
      color: '#b7b2c5', fontSize: '10px',
    });
    this.contact = scene.add.text(width / 2 + 12, this.panelY + 59, '', {
      color: '#ffd166', fontSize: '10px',
    });
    const footerBackground = scene.add.rectangle(width / 2, height - 8, width, 16, 0x14151e, 0.94);
    const footer = scene.add.text(width / 2, height - 8,
      'P PAUSA · . FRAME · L VELOCIDADE · F2 RESET · F3 VIDA AUTO · F4 DISTÂNCIA · G ADVERSÁRIO · H COLISÕES · I ENTRADAS · ESC PAUSA', {
        color: '#e9e4ee', fontSize: '9px',
      }).setOrigin(0.5);
    this.root = scene.add.container(0, 0, [background, this.status, ...this.fighters,
      this.progress, this.distance, this.contact, footerBackground, footer]).setDepth(110).setScrollFactor(0);
  }

  update(snapshot: SimulationSnapshot, session: TrainingSession): void {
    this.status.setText(`TREINO · ${session.paused ? 'PAUSADO' : 'EM CURSO'} · ${session.speed * 100}% · ${DUMMY_LABELS[session.dummyMode].replace(/\b[1-4]\b/g,button=>keyLabel(getPlayerLayout(1).buttons[button as AttackButton]))} · VIDA AUTO ${session.autoRestore ? 'ON' : 'OFF'} · RESET ${session.initialDistance}`);
    this.progress.clear();
    snapshot.characters.forEach((character, index) => {
      const move = session.lastMoves[index];
      const recovery = move ? recoveryFrames(move, Boolean(character.attack?.hitOutcome)) : 0;
      const recoveryLabel = !character.attack && move?.combat?.recoveryOnContact !== undefined ? `${move.combat.recoveryOnContact}/${move.recovery}` : String(recovery);
      const lockedFrames = move && character.attack
        ? move.startup + move.activeFrames + recoveryFrames(move, Boolean(character.attack.hitOutcome)) - character.attack.elapsedFrames
        : character.remainingStateFrames;
      const levels = { high: 'ALTO', mid: 'MÉDIO', low: 'BAIXO', air: 'AÉREO', throw: 'AGARRÃO', special: 'ESPECIAL' };
      const combo = character.combo ?? character.lastCombo;
      const comboLabel = combo ? ` · COMBO ${combo.hits} / ${combo.damage}` : '';
      const detail = move
        ? `${character.attack ? 'GOLPE' : 'ÚLTIMO'} ${formatCommand(moveInputLabel(move),getPlayerLayout(index))} · S${move.startup} A${move.activeFrames} R${recoveryLabel} · ${levels[move.hitLevel]} · DANO ${move.damage}`
        : 'S: preparo · A: ativo · R: recuperação';
      this.fighters[index]?.setText(`P${index + 1} · ${MODE_LABELS[character.mode]}${comboLabel} · ${character.combo && !character.grounded ? 'JUGGLE · ATÉ ATERRISSAR' : lockedFrames > 0 ? `RESTAM ${lockedFrames}F` : 'LIVRE'}\n${detail}`);
      const left = 30 + index * (this.width / 2 - 18);
      const barWidth = this.width / 2 - 42;
      const barY = this.panelY + 48;
      this.progress.fillStyle(0x34313f).fillRect(left, barY, barWidth, 5);
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
    this.distance.setText(`FRAME ${snapshot.frame} · DISTÂNCIA ${distance} · COLISÕES ${session.showGeometry ? 'VISÍVEIS' : 'OCULTAS'}`);
    const contact = snapshot.recentContacts[snapshot.recentContacts.length - 1]?.event;
    this.contact.setText(contact?.frameAdvantage !== undefined
      ? `${contact.attackerId === 'player-1' ? 'P1' : 'P2'}: DANO ${contact.damage} · REC ${contact.attackerRecoveryFrames}F · STUN ${contact.defenderStunFrames}F · ADV ${signedFrames(contact.frameAdvantage)}`
      : contact?.reaction === 'launch' ? `DANO ${contact.damage} · REC ${contact.attackerRecoveryFrames}F · REAÇÃO AÉREA` : 'S: preparo · A: ativo · R: recuperação');
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
